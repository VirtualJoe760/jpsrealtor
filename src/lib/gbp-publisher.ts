/**
 * GBP Publisher — Formats and publishes articles as Google Business Profile posts.
 *
 * Supports per-user GBP credentials:
 * - If userId is provided, looks up the user's GBP creds from their profile
 * - If no userId or user has no GBP connected, falls back to env var credentials (platform owner)
 * - Non-blocking: failures are logged but don't prevent article publishing
 */

import dbConnect from './mongoose';
import User from '@/models/User';
import {
  createLocalPost,
  type LocalPost,
  type LocalPostResponse,
  type GBPCredentials,
} from './gbp-api';

// ── Configuration ─────────────────────────────────────────────────────────────

// Platform owner fallback account/location (used when no userId or env var flow)
const FALLBACK_ACCOUNT_ID = 'accounts/101108799337549000917';
const FALLBACK_LOCATION_ID = 'locations/7725888369257069197';
const SITE_URL = 'https://chatrealty.io';

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
  skipped?: boolean; // True if user has no GBP connected and no fallback
}

interface UserGBPConfig {
  accountId: string;
  locationId: string;
  credentials: Partial<GBPCredentials>;
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
 * Look up a user's GBP configuration from their profile.
 * Returns null if user has no GBP connected.
 */
async function getUserGBPConfig(userId: string): Promise<UserGBPConfig | null> {
  try {
    await dbConnect();
    const user = await User.findById(userId, { adAccounts: 1 }).lean();

    const gbp = (user as any)?.adAccounts?.gbp;
    if (!gbp?.refreshToken || !gbp?.accountId || !gbp?.locationId) {
      return null;
    }

    if (gbp.status === 'disconnected') {
      return null;
    }

    return {
      accountId: gbp.accountId,
      locationId: gbp.locationId,
      credentials: { refreshToken: gbp.refreshToken },
    };
  } catch (error) {
    console.error(`[GBP] Failed to look up GBP config for user ${userId}:`, error);
    return null;
  }
}

/**
 * Publish an article to Google Business Profile.
 *
 * This is the main entry point called by the publishing pipeline.
 *
 * @param article - Article data to format as a GBP post
 * @param userId - Optional user ID to look up per-user GBP credentials.
 *                 If omitted or user has no GBP connected, falls back to env var credentials.
 *
 * Returns a result object — never throws (errors are captured in the result).
 */
export async function publishArticleToGBP(
  article: ArticleForGBP,
  userId?: string
): Promise<GBPPublishResult> {
  try {
    let accountId: string;
    let locationId: string;
    let credentials: Partial<GBPCredentials> | undefined;

    // Try per-user credentials first
    if (userId) {
      const userConfig = await getUserGBPConfig(userId);
      if (userConfig) {
        accountId = userConfig.accountId;
        locationId = userConfig.locationId;
        credentials = userConfig.credentials;
        console.log(`[GBP] Using per-user GBP credentials for user ${userId}`);
      } else {
        // User has no GBP connected — fall back to platform owner
        console.log(`[GBP] User ${userId} has no GBP connected, falling back to platform owner`);
        accountId = FALLBACK_ACCOUNT_ID;
        locationId = FALLBACK_LOCATION_ID;
        // credentials undefined = will use env vars
      }
    } else {
      // No userId — use platform owner env vars
      accountId = FALLBACK_ACCOUNT_ID;
      locationId = FALLBACK_LOCATION_ID;
    }

    // Check that credentials are available (either per-user or env var fallback)
    if (!credentials?.refreshToken && !process.env.GBP_REFRESH_TOKEN) {
      console.warn('[GBP] Skipping GBP post — no credentials available');
      return {
        success: false,
        skipped: true,
        error: 'GBP credentials not configured',
      };
    }

    console.log(`[GBP] Publishing to GBP: "${article.title}"`);

    const post = formatArticleAsPost(article);
    const response: LocalPostResponse = await createLocalPost(
      accountId,
      locationId,
      post,
      credentials
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
