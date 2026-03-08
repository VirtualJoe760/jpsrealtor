#!/usr/bin/env ts-node
/**
 * Generate MDX Files from MongoDB
 *
 * This script runs during Vercel builds (prebuild phase) to:
 * 1. Connect to MongoDB
 * 2. Fetch all published articles
 * 3. Generate MDX files in src/posts/
 * 4. Enable static site generation from database content
 *
 * Usage:
 *   npm run generate-mdx
 *   npx ts-node scripts/generate-mdx-from-db.ts
 */

import fs from 'fs/promises';
import path from 'path';
import connectDB from '../src/lib/mongodb';
import { getPublishedArticles } from '../src/lib/services/article.service';
import type { IArticle } from '../src/models/article';

async function main() {

  console.log('\n🚀 Starting MDX generation from MongoDB...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Fetch all published articles
    console.log('📚 Fetching published articles...');
    const articles = await getPublishedArticles();
    console.log(`✅ Found ${articles.length} published articles\n`);

    if (articles.length === 0) {
      console.log('⚠️  No published articles found in database');
      console.log('   This is expected if you haven\'t migrated articles yet.\n');
      process.exit(0);
    }

    // Ensure src/posts directory exists
    const postsDir = path.join(process.cwd(), 'src/posts');
    await fs.mkdir(postsDir, { recursive: true });
    console.log(`📁 Ensured posts directory exists: ${postsDir}\n`);

    // Generate MDX files
    let successCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        const mdxContent = generateMDXContent(article);
        const filePath = path.join(postsDir, `${article.slug}.mdx`);

        await fs.writeFile(filePath, mdxContent, 'utf-8');
        console.log(`✅ Generated: ${article.slug}.mdx`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate ${article.slug}.mdx:`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Generation Summary:');
    console.log(`   ✅ Success: ${successCount} files`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors:  ${errorCount} files`);
    }
    console.log(`   📁 Output:  ${postsDir}`);
    console.log('='.repeat(50) + '\n');

    if (errorCount > 0) {
      console.error('⚠️  Some files failed to generate. Check errors above.');
      process.exit(1);
    }

    console.log('🎉 MDX generation complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error during MDX generation:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Generate MDX file content from MongoDB article document
 */
function generateMDXContent(article: IArticle): string {
  // Format date as MM/DD/YYYY
  const date = new Date(article.publishedAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  // Build frontmatter YAML
  const frontmatter = [
    `title: "${escapeYAML(article.title)}"`,
    `slugId: "${article.slug}"`,
    `date: "${formattedDate}"`,
    `section: "${article.category}"`,
  ];

  // Add optional fields
  if (article.status === 'draft') {
    frontmatter.push('draft: true');
  }

  if (article.author?.id) {
    frontmatter.push(`authorId: "${article.author.id}"`);
  }

  if (article.author?.name) {
    frontmatter.push(`authorName: "${escapeYAML(article.author.name)}"`);
  }

  // Add images
  frontmatter.push(`image: "${article.featuredImage.url}"`);

  // Add SEO fields
  frontmatter.push(`metaTitle: "${escapeYAML(article.seo.title)}"`);
  frontmatter.push(`metaDescription: "${escapeYAML(article.seo.description)}"`);
  frontmatter.push(`ogImage: "${article.featuredImage.url}"`);
  frontmatter.push(`altText: "${escapeYAML(article.featuredImage.alt)}"`);

  // Add keywords
  frontmatter.push('keywords:');
  article.seo.keywords.forEach((keyword: string) => {
    frontmatter.push(`  - ${keyword}`);
  });

  // Combine frontmatter + content
  return `---
${frontmatter.join('\n')}
---

${article.content}`;
}

/**
 * Escape special characters in YAML strings
 */
function escapeYAML(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"');   // Escape quotes
}

// Run the script
main();
