/**
 * GBP Publisher — Formats and publishes articles as Google Business Profile posts.
 *
 * Integrates with the CMS publishing pipeline to automatically create GBP posts
 * when articles are published. Non-blocking: failures are logged but don't
 * prevent article publishing.
 */

import {
  createLocalPost,
  type LocalPost,
  type LocalPostResponse,
} from './gbp-api';

// ── Configuration ─────────────────────────────────────────────────────────────

const GBP_ACCOUNT_ID = 'accounts/101108799337549000917';
const GBP_LOCATION_ID = 'locations/7725888369257069197';
const SITE_URL = 'https://jpsrealtor.com';

// GBP summary has a 1500 character limit
const MAX_SUMMARY_LENGTH = 1500;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArticleForGBP {
  title: string;
  excerpt: string;
  image?: string; // Featured image URL
  url?: string; // Full article URL or slug
  category?: string;
}

export interface GBPPublishResult {
  success: boolean;
  postName?: string; // GBP resource name for the created post
  error?: string;
}

// ── Publisher ─────────────────────────────────────────────────────────────────

/**
 * Build the article URL from a slug or full URL.
 */
function resolveArticleUrl(urlOrSlug?: string): string {
  if (!urlOrSlug) return SITE_URL;
  if (urlOrSlug.startsWith('http')) return urlOrSlug;

  // Strip leading slash if present
  const slug = urlOrSlug.replace(/^\//, '');
  return `${SITE_URL}/insights/${slug}`;
}

/**
 * Format an article into a GBP LocalPost.
 *
 * GBP standard posts do NOT have a title field, so we put the title
 * as the first line of the summary text, followed by the excerpt.
 */
function formatArticleAsPost(article: ArticleForGBP): LocalPost {
  // Build summary: title on first line, then excerpt
  let summary = `${article.title}\n\n${article.excerpt}`;

  // Truncate if over the GBP limit
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.substring(0, MAX_SUMMARY_LENGTH - 3) + '...';
  }

  const articleUrl = resolveArticleUrl(article.url);

  const post: LocalPost = {
    languageCode: 'en-US',
    topicType: 'STANDARD',
    summary,
    callToAction: {
      actionType: 'LEARN_MORE',
      url: articleUrl,
    },
  };

  // Attach featured image if provided
  if (article.image) {
    post.media = [
      {
        mediaFormat: 'PHOTO',
        sourceUrl: article.image,
      },
    ];
  }

  return post;
}

/**
 * Publish an article to Google Business Profile.
 *
 * This is the main entry point called by the publishing pipeline.
 * Returns a result object — never throws (errors are captured in the result).
 */
export async function publishArticleToGBP(
  article: ArticleForGBP
): Promise<GBPPublishResult> {
  try {
    // Check that GBP credentials are configured
    if (!process.env.GBP_CLIENT_ID || !process.env.GBP_CLIENT_SECRET || !process.env.GBP_REFRESH_TOKEN) {
      console.warn('[GBP] Skipping GBP post — credentials not configured');
      return {
        success: false,
        error: 'GBP credentials not configured',
      };
    }

    console.log(`[GBP] Publishing to GBP: "${article.title}"`);

    const post = formatArticleAsPost(article);
    const response: LocalPostResponse = await createLocalPost(
      GBP_ACCOUNT_ID,
      GBP_LOCATION_ID,
      post
    );

    console.log(`[GBP] Post created: ${response.name}`);

    return {
      success: true,
      postName: response.name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown GBP error';
    console.error(`[GBP] Failed to publish to GBP: ${message}`);

    return {
      success: false,
      error: message,
    };
  }
}
