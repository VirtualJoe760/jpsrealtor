import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateMDX } from './mdx-processor';
import {
  IS_PRODUCTION,
  IS_LOCALHOST,
  DEPLOY_HOOK_URL,
  isDeployHookConfigured,
  getEnvironmentName
} from './environment';
import { createArticle, deleteArticle, articleExists } from './services/article.service';

const execAsync = promisify(exec);

/**
 * Layer 5: Dual-Environment Publishing Pipeline
 *
 * LOCALHOST: Writes MDX files to src/posts/ + git operations
 * PRODUCTION: Saves to MongoDB + triggers Vercel rebuild
 *
 * This enables article publishing from ANY environment (localhost or production)
 */

export interface PublishValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  draft?: boolean;  // Optional draft flag
  authorId?: string;  // User ID of article author (for agent scoping)
  authorName?: string;  // Display name of article author
  featuredImage: {
    url: string;
    publicId: string;
    alt: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

/**
 * Validate article before publishing
 * Ensures all required fields meet criteria
 */
export async function validateForPublish(
  article: ArticleFormData
): Promise<PublishValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (!article.title || article.title.length < 10) {
    errors.push('Title must be at least 10 characters');
  }
  if (article.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  // Excerpt validation
  if (!article.excerpt || article.excerpt.length < 50) {
    errors.push('Excerpt must be at least 50 characters');
  }
  if (article.excerpt.length > 300) {
    errors.push('Excerpt must be less than 300 characters');
  }

  // Content validation
  if (!article.content || article.content.length < 500) {
    errors.push('Content must be at least 500 characters (~100 words)');
  }

  // Featured image validation
  if (!article.featuredImage?.url) {
    errors.push('Featured image is required');
  }

  // SEO validation
  if (!article.seo.title) {
    warnings.push('SEO title is empty (will use article title)');
  } else if (article.seo.title.length > 60) {
    errors.push('SEO title must be less than 60 characters');
  }

  if (!article.seo.description) {
    warnings.push('SEO description is empty (will use excerpt)');
  } else if (article.seo.description.length > 300) {
    warnings.push('SEO description is over 300 characters - consider shortening for better search results');
  }

  if (article.seo.keywords.length < 3) {
    warnings.push('Add at least 3 keywords for better SEO');
  }

  // MDX validation
  const mdxValidation = await validateMDX(article.content);
  if (!mdxValidation.isValid) {
    errors.push(...mdxValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Publish article to MongoDB database (Production environment)
 * Saves article data to MongoDB for later MDX generation during build
 */
export async function publishArticleToDatabase(
  article: ArticleFormData,
  slugId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<{ _id: string; slug: string }> {
  console.log(`[PUBLISH] Saving article to MongoDB: ${slugId}`);

  // Add slug to article data
  const articleWithSlug = { ...article, slug: slugId };

  // Save to MongoDB
  const doc = await createArticle(articleWithSlug, userId, userName, userEmail);

  console.log(`✅ Article saved to MongoDB: ${doc.slug} (${doc._id})`);

  return {
    _id: doc._id.toString(),
    slug: doc.slug,
  };
}

/**
 * Trigger Vercel rebuild via deploy hook
 * This causes production site to rebuild and pick up new articles from MongoDB
 */
export async function triggerVercelRebuild(
  reason: string
): Promise<{ success: boolean; message: string; jobId?: string }> {
  if (!isDeployHookConfigured()) {
    return {
      success: false,
      message: 'Deploy hook not configured. Article saved to database but site rebuild required.',
    };
  }

  try {
    console.log(`[DEPLOY] Triggering Vercel rebuild: ${reason}`);

    const response = await fetch(DEPLOY_HOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Deploy hook failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jobId = data.job?.id;

    console.log(`✅ Vercel rebuild triggered! Job ID: ${jobId}`);

    return {
      success: true,
      message: 'Deployment triggered! Site will rebuild in 2-3 minutes.',
      jobId,
    };
  } catch (error) {
    console.error('[DEPLOY] Failed to trigger rebuild:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to trigger rebuild',
    };
  }
}

/**
 * Main publish article function - Unified CMS workflow
 *
 * WORKFLOW (both localhost and production):
 * 1. Save article to MongoDB (source of truth)
 * 2. Generate MDX file from MongoDB data
 * 3. Commit and push MDX to main branch (regardless of current branch)
 * 4. Trigger Vercel rebuild (production) or rely on auto-deploy (localhost)
 */
export async function publishArticle(
  article: ArticleFormData,
  slugId: string,
  options: {
    autoDeploy?: boolean;
    userId?: string;
    userName?: string;
    userEmail?: string;
  } = {}
): Promise<void> {
  // Validate before publishing
  const validation = await validateForPublish(article);
  if (!validation.isValid) {
    throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
  }

  const environment = getEnvironmentName();
  console.log(`[PUBLISH] Environment: ${environment}`);
  console.log(`[PUBLISH] Article: ${slugId}`);
  console.log('[PUBLISH] Method: MongoDB + MDX generation + Git push to main');

  if (!options.userId || !options.userName || !options.userEmail) {
    throw new Error('User information required for publishing');
  }

  // STEP 1: Save to MongoDB (source of truth)
  console.log('[PUBLISH] Step 1/4: Saving to MongoDB...');
  const dbResult = await publishArticleToDatabase(
    article,
    slugId,
    options.userId,
    options.userName,
    options.userEmail
  );

  // STEP 2: Generate MDX file from MongoDB data
  console.log('[PUBLISH] Step 2/4: Generating MDX file...');
  await writeArticleToFilesystem(article, slugId);

  // STEP 3: Commit and push to main branch (even if on different branch)
  console.log('[PUBLISH] Step 3/4: Pushing to main branch...');
  if (options.autoDeploy !== false) {
    await deployToMain(article, slugId);
  }

  // STEP 4: Trigger rebuild (production only, localhost relies on auto-deploy)
  if (IS_PRODUCTION) {
    console.log('[PUBLISH] Step 4/4: Triggering Vercel rebuild...');
    const deployResult = await triggerVercelRebuild(`Article: ${article.title}`);

    if (deployResult.success) {
      console.log(`✅ Article published to production! ${deployResult.message}`);
    } else {
      console.warn(`⚠️ Article saved but rebuild failed: ${deployResult.message}`);
    }
  } else {
    console.log('[PUBLISH] Step 4/4: Waiting for Vercel auto-deploy...');
    console.log(`✅ Article published! Pushed to main branch (${dbResult._id})`);
  }
}

/**
 * Write article as MDX file to src/posts/ directory
 * This is how articles appear on /insights pages
 */
export async function writeArticleToFilesystem(
  article: ArticleFormData,
  slugId: string
): Promise<void> {
  // Format frontmatter to match existing structure
  const frontmatter = formatFrontmatter(article, slugId);

  // Combine frontmatter + content
  const fullContent = `---
${frontmatter}
---

${article.content}`;

  // Define file path: src/posts/{slugId}.mdx
  const postsDirectory = path.join(process.cwd(), 'src/posts');
  const filePath = path.join(postsDirectory, `${slugId}.mdx`);

  // Check if file already exists
  try {
    await fs.access(filePath);
    console.log(`Updating existing article: ${slugId}.mdx`);
  } catch {
    console.log(`Creating new article: ${slugId}.mdx`);
  }

  // Ensure directory exists
  await fs.mkdir(postsDirectory, { recursive: true });

  // Write file
  await fs.writeFile(filePath, fullContent, 'utf-8');

  console.log(`✅ Article written to: ${filePath}`);
}

/**
 * Format article data into YAML frontmatter
 * Matches structure from existing posts (e.g., coachella-valley-energy-costs.mdx)
 */
function formatFrontmatter(article: ArticleFormData, slugId: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }); // Format: MM/DD/YYYY

  // Build frontmatter YAML
  const lines = [
    `title: "${escapeYAML(article.title)}"`,
    `slugId: "${slugId}"`,
    `date: "${date}"`,
    `section: "${article.category}"`, // category → section mapping
    article.draft ? `draft: true` : null,  // Add draft flag if true
    article.authorId ? `authorId: "${article.authorId}"` : null,  // Agent scoping
    article.authorName ? `authorName: "${escapeYAML(article.authorName)}"` : null,  // Display name
    `image: "${article.featuredImage.url}"`,
    `metaTitle: "${escapeYAML(article.seo.title || article.title)}"`,
    `metaDescription: "${escapeYAML(article.seo.description || article.excerpt)}"`,
    `ogImage: "${article.featuredImage.url}"`,
    `altText: "${escapeYAML(article.featuredImage.alt || article.title)}"`,
    `keywords:`,
  ].filter(line => line !== null);  // Filter out null values

  // Add keywords as YAML array
  article.seo.keywords.forEach((keyword) => {
    lines.push(`  - ${keyword}`);
  });

  return lines.join('\n');
}

/**
 * Escape special characters in YAML strings
 */
function escapeYAML(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"'); // Escape quotes
}

/**
 * Unpublish article - Unified CMS workflow
 *
 * WORKFLOW (both localhost and production):
 * 1. Delete article from MongoDB
 * 2. Delete MDX file from filesystem
 * 3. Commit and push deletion to main branch
 * 4. Trigger Vercel rebuild (production) or rely on auto-deploy (localhost)
 */
export async function unpublishArticle(slugId: string): Promise<void> {
  const environment = getEnvironmentName();
  console.log(`[UNPUBLISH] Environment: ${environment}`);
  console.log(`[UNPUBLISH] Article: ${slugId}`);
  console.log('[UNPUBLISH] Method: MongoDB deletion + MDX removal + Git push to main');

  // STEP 1: Delete from MongoDB
  console.log('[UNPUBLISH] Step 1/4: Deleting from MongoDB...');
  const deleted = await deleteArticle(slugId);

  if (!deleted) {
    throw new Error(`Failed to unpublish article: ${slugId} not found in database`);
  }

  console.log(`✅ Article deleted from MongoDB: ${slugId}`);

  // STEP 2: Delete MDX file from filesystem
  console.log('[UNPUBLISH] Step 2/4: Deleting MDX file...');
  const filePath = path.join(process.cwd(), 'src/posts', `${slugId}.mdx`);

  try {
    await fs.unlink(filePath);
    console.log(`✅ MDX file deleted: ${slugId}.mdx`);
  } catch (error) {
    console.warn('File not found or already deleted:', filePath);
    // Continue anyway - file might already be deleted
  }

  // STEP 3: Commit and push deletion to main branch
  console.log('[UNPUBLISH] Step 3/4: Pushing deletion to main branch...');
  await unpublishFromMain(slugId);

  // STEP 4: Trigger rebuild (production only)
  if (IS_PRODUCTION) {
    console.log('[UNPUBLISH] Step 4/4: Triggering Vercel rebuild...');
    const deployResult = await triggerVercelRebuild(`Unpublish: ${slugId}`);

    if (deployResult.success) {
      console.log(`✅ Rebuild triggered! Article will be removed in 2-3 minutes.`);
    } else {
      console.warn(`⚠️ Article deleted but rebuild failed: ${deployResult.message}`);
    }
  } else {
    console.log('[UNPUBLISH] Step 4/4: Waiting for Vercel auto-deploy...');
    console.log(`✅ Article unpublished! Deletion pushed to main branch.`);
  }
}

/**
 * Check if article is already published
 * LOCALHOST: Checks if MDX file exists
 * PRODUCTION: Checks if article exists in MongoDB
 */
export async function isArticlePublished(slugId: string): Promise<boolean> {
  if (IS_PRODUCTION) {
    // PRODUCTION: Check MongoDB
    return articleExists(slugId);
  } else {
    // LOCALHOST: Check filesystem
    const filePath = path.join(process.cwd(), 'src/posts', `${slugId}.mdx`);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Deploy article to main branch (regardless of current branch)
 * This ensures CMS articles always go to production
 */
export async function deployToMain(
  article: ArticleFormData,
  slugId: string
): Promise<{
  success: boolean;
  message: string;
  commitHash?: string;
}> {
  try {
    const fileName = `${slugId}.mdx`;
    const filePath = `src/posts/${fileName}`;

    // Save current branch name
    const { stdout: currentBranch } = await execAsync('git branch --show-current');
    const originalBranch = currentBranch.trim();
    console.log(`📍 Current branch: ${originalBranch}`);

    // Check if there are changes to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain');

    if (!statusOutput.includes(filePath)) {
      return {
        success: true,
        message: 'No changes to deploy (file already up to date)',
      };
    }

    // Stage the file
    console.log(`📝 Staging ${filePath}...`);
    await execAsync(`git add "${filePath}"`);

    // Stash any other uncommitted changes
    console.log('💼 Stashing other changes...');
    await execAsync('git stash push -m "CMS publish temp stash"').catch(() => {
      // Ignore errors if nothing to stash
    });

    // Switch to main branch
    console.log('🔀 Switching to main branch...');
    await execAsync('git checkout main');

    // Pull latest changes
    console.log('⬇️ Pulling latest changes...');
    await execAsync('git pull origin main');

    // Cherry-pick the staged file to main
    console.log(`📦 Moving ${filePath} to main...`);
    // Create a temporary commit on original branch, then cherry-pick
    await execAsync(`git checkout ${originalBranch}`);

    // Create commit message
    const isDraft = article.draft ? ' [DRAFT]' : '';
    const commitMessage = `Update article: ${article.title}${isDraft}

- Category: ${article.category}
- Slug: ${slugId}
- Auto-deployed via CMS

🤖 Generated with Claude Code CMS`;

    // Commit the changes on original branch
    console.log('💾 Committing changes...');
    const { stdout: commitOutput } = await execAsync(
      `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`
    );

    // Extract commit hash
    const commitHashMatch = commitOutput.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = commitHashMatch ? commitHashMatch[1] : undefined;

    // Switch to main and cherry-pick
    await execAsync('git checkout main');
    await execAsync(`git cherry-pick ${commitHash}`);

    // Push to main
    console.log('🚀 Pushing to main branch...');
    await execAsync('git push origin main');

    // Switch back to original branch
    console.log(`🔙 Returning to ${originalBranch}...`);
    await execAsync(`git checkout ${originalBranch}`);

    // Restore stashed changes if any
    await execAsync('git stash pop').catch(() => {
      // Ignore errors if nothing was stashed
    });

    console.log('✅ Deployed to main!');

    return {
      success: true,
      message: `Article deployed to main branch! Vercel will auto-deploy in ~2 minutes.`,
      commitHash,
    };

  } catch (error) {
    console.error('❌ Deploy failed:', error);

    // Parse git error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('nothing to commit')) {
      return {
        success: true,
        message: 'No changes to deploy (file already up to date)',
      };
    }

    if (errorMessage.includes('failed to push')) {
      throw new Error('Failed to push to GitHub. Check your git credentials and network connection.');
    }

    throw new Error(`Deploy failed: ${errorMessage}`);
  }
}

/**
 * Remove article from main branch (regardless of current branch)
 * This ensures article deletions always remove from production
 */
export async function unpublishFromMain(slugId: string): Promise<void> {
  try {
    const fileName = `${slugId}.mdx`;
    const filePath = `src/posts/${fileName}`;

    // Save current branch name
    const { stdout: currentBranch } = await execAsync('git branch --show-current');
    const originalBranch = currentBranch.trim();
    console.log(`📍 Current branch: ${originalBranch}`);

    // Stash any uncommitted changes
    console.log('💼 Stashing other changes...');
    await execAsync('git stash push -m "CMS unpublish temp stash"').catch(() => {
      // Ignore errors if nothing to stash
    });

    // Switch to main branch
    console.log('🔀 Switching to main branch...');
    await execAsync('git checkout main');

    // Pull latest changes
    console.log('⬇️ Pulling latest changes...');
    await execAsync('git pull origin main');

    // Check if file exists on main
    try {
      await execAsync(`git ls-files --error-unmatch "${filePath}"`);
    } catch {
      console.log('⚠️ File not found on main branch, skipping deletion');
      await execAsync(`git checkout ${originalBranch}`);
      await execAsync('git stash pop').catch(() => {});
      return;
    }

    // Delete the file
    console.log(`🗑️ Deleting ${filePath}...`);
    await execAsync(`git rm "${filePath}"`);

    // Create commit message
    const commitMessage = `Delete article: ${slugId}

- Unpublished via CMS
- Removed from production

🤖 Generated with Claude Code CMS`;

    // Commit the deletion
    console.log('💾 Committing deletion...');
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

    // Push to main
    console.log('🚀 Pushing to main branch...');
    await execAsync('git push origin main');

    // Switch back to original branch
    console.log(`🔙 Returning to ${originalBranch}...`);
    await execAsync(`git checkout ${originalBranch}`);

    // Also delete from current branch if it exists
    try {
      await fs.unlink(path.join(process.cwd(), filePath));
      await execAsync(`git rm "${filePath}"`).catch(() => {});
    } catch {
      // File doesn't exist on current branch, that's fine
    }

    // Restore stashed changes if any
    await execAsync('git stash pop').catch(() => {
      // Ignore errors if nothing was stashed
    });

    console.log('✅ Removed from main!');

  } catch (error) {
    console.error('❌ Unpublish failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to remove from main: ${errorMessage}`);
  }
}

/**
 * Deploy article to production by committing and pushing to GitHub
 * Vercel will auto-deploy when it detects the push
 * @deprecated Use deployToMain instead for unified CMS workflow
 */
export async function deployToProduction(
  article: ArticleFormData,
  slugId: string
): Promise<{
  success: boolean;
  message: string;
  commitHash?: string;
}> {
  // Redirect to deployToMain for unified workflow
  return deployToMain(article, slugId);
}
