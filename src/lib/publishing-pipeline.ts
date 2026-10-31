import { validateMDX } from './mdx-processor';
import { getEnvironmentName } from './environment';
import { createArticle, deleteArticle, articleExists } from './services/article.service';

/**
 * Article publishing: validate, then ONE database write.
 *
 * The database is the only copy of an article. Every page that shows articles
 * reads it on request (home feed, article page, category index, RSS, sitemap,
 * topics, AI search, landing pages), so a publish is live as soon as the write
 * returns — no file, no git commit, no rebuild.
 *
 * Until 2026-10-29 a publish also wrote an MDX file to src/posts/ and committed
 * it to the public GitHub repo (Contents API in production, `git push` to main
 * from localhost), then fired a Vercel deploy hook. A dead GITHUB_TOKEN 500'd a
 * publish whose database write had already succeeded, the editor's fallback
 * then created a duplicate, and every agent's content was committed to a
 * public repo. Don't bring a file mirror back into this path.
 *
 * Where the write goes per agent (Mongo for admins, the agent's Neon tenant DB
 * for everyone else) is planned in docs/cms/multi-tenant-articles.md.
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
 * Publish an article: validate, upsert by slug, then best-effort follow-ups.
 *
 * Returns warnings for follow-up steps that didn't finish. Only validation and
 * the database write can fail a publish.
 */
export async function publishArticle(
  article: ArticleFormData,
  slugId: string,
  options: {
    userId?: string;
    userName?: string;
    userEmail?: string;
  } = {}
): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];

  const validation = await validateForPublish(article);
  if (!validation.isValid) {
    throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
  }

  if (!options.userId || !options.userName || !options.userEmail) {
    throw new Error('User information required for publishing');
  }

  console.log(`[PUBLISH] ${getEnvironmentName()}: ${slugId}`);

  // Upsert by slug, so a retry never creates a second copy.
  const doc = await createArticle(
    { ...article, slug: slugId } as any,
    options.userId,
    options.userName,
    options.userEmail
  );
  console.log(`[PUBLISH] Saved: ${doc.slug} (${doc._id})`);

  // Tell Bing and Yandex immediately, rather than waiting to be crawled.
  // Google does not participate in IndexNow — for Google the signal is the
  // sitemap's lastmod, from `articles.updatedAt` (lib/sitemap-sources.ts).
  // Never fails a publish.
  await pingIndexNowForArticle(article, slugId, options.userId);

  return { warnings };
}

/**
 * Resolve the author's own domain and submit the new article URL.
 *
 * The host matters and cannot be hardcoded: one deployment serves many agents,
 * so submitting every article to jpsrealtor.com would ask Bing to index one
 * agent's URL for another agent's content. No resolvable domain means no ping.
 */
async function pingIndexNowForArticle(
  article: ArticleFormData,
  slugId: string,
  userId?: string,
): Promise<void> {
  try {
    if (!process.env.INDEXNOW_KEY || !userId) return;

    const dbConnect = (await import('@/lib/mongoose')).default;
    await dbConnect();
    const User = (await import('@/models/User')).default;
    const author: any = await User.findById(userId)
      .select('agentProfile.customDomain agentProfile.subdomain')
      .lean();

    const custom = author?.agentProfile?.customDomain;
    const subdomain = author?.agentProfile?.subdomain;
    const bareHost = custom
      ? String(custom).replace(/^www\./, '')
      : subdomain
        ? `${subdomain}.chatrealty.io`
        : null;
    if (!bareHost) return;

    // getBaseUrl applies the supplementary→primary alias, so an article on
    // josephsardella.com is submitted as its jpsrealtor.com canonical rather
    // than as the domain the canonicals are consolidating away from.
    const { getBaseUrl } = await import('@/lib/domain-utils');
    const baseUrl = getBaseUrl(bareHost);
    const canonicalHost = new URL(baseUrl).host;

    const section = (article as any).section || (article as any).category;
    if (!section) return;
    const url =
      section === 'landing-page'
        ? `${baseUrl}/lp/${slugId}`
        : `${baseUrl}/insights/${section}/${slugId}`;

    const { submitToIndexNow } = await import('@/lib/indexnow');
    await submitToIndexNow([url], canonicalHost);
  } catch (error) {
    console.warn('[PUBLISH] IndexNow ping failed (publish unaffected):', error);
  }
}

/** Unpublish = delete the article from the database. */
export async function unpublishArticle(slugId: string): Promise<void> {
  const deleted = await deleteArticle(slugId);
  if (!deleted) {
    throw new Error(`Failed to unpublish article: ${slugId} not found in database`);
  }
  console.log(`[UNPUBLISH] Deleted: ${slugId}`);
}

/** Whether an article with this slug exists in the database. */
export async function isArticlePublished(slugId: string): Promise<boolean> {
  return articleExists(slugId);
}
