/**
 * Google Business Profile API Client
 *
 * Handles authentication and API calls to GBP for local posts.
 * Supports per-user credentials (refresh token from user profile)
 * with fallback to env vars for the platform owner:
 *   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN
 *
 * Client ID and Client Secret are always from env vars (app-level credentials).
 * Only the refresh token and account/location IDs are per-user.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CallToActionType =
  | 'ACTION_TYPE_UNSPECIFIED'
  | 'BOOK'
  | 'ORDER'
  | 'SHOP'
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'CALL';

export type PostTopicType =
  | 'LOCAL_POST_TOPIC_TYPE_UNSPECIFIED'
  | 'STANDARD'
  | 'EVENT'
  | 'OFFER';

export interface CallToAction {
  actionType: CallToActionType;
  url: string;
}

export interface MediaItem {
  mediaFormat: 'PHOTO' | 'VIDEO';
  sourceUrl: string;
}

export interface LocalPost {
  name?: string; // Resource name (returned by API)
  languageCode?: string;
  summary: string;
  callToAction?: CallToAction;
  media?: MediaItem[];
  topicType?: PostTopicType;
  state?: string;
  createTime?: string;
  updateTime?: string;
}

export interface LocalPostResponse {
  name: string;
  languageCode: string;
  summary: string;
  callToAction?: CallToAction;
  media?: MediaItem[];
  topicType: PostTopicType;
  state: string;
  createTime: string;
  updateTime: string;
}

export interface ListLocalPostsResponse {
  localPosts?: LocalPostResponse[];
  nextPageToken?: string;
}

/** GBP media item (photo) from the Business Information API */
export interface GBPMediaItem {
  name?: string;
  mediaFormat: 'PHOTO' | 'VIDEO';
  sourceUrl: string;
  locationAssociation?: {
    category: 'COVER' | 'PROFILE' | 'LOGO' | 'ADDITIONAL' | 'CATEGORY_UNSPECIFIED';
  };
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime?: string;
  description?: string;
}

export interface ListMediaResponse {
  mediaItems?: GBPMediaItem[];
  nextPageToken?: string;
}

/** GBP business hours period */
export interface TimePeriod {
  openDay: string;
  openTime: { hours: number; minutes: number };
  closeDay: string;
  closeTime: { hours: number; minutes: number };
}

/** GBP location info from the Business Information API */
export interface GBPLocationInfo {
  name?: string;
  title?: string;
  phoneNumbers?: { primaryPhone?: string; additionalPhones?: string[] };
  websiteUri?: string;
  regularHours?: { periods: TimePeriod[] };
  specialHours?: { specialHourPeriods: any[] };
  profile?: { description?: string };
}

/** Credentials object for per-user GBP API calls */
export interface GBPCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/** GBP account and location identifiers */
export interface GBPAccount {
  accountId: string;  // e.g., "accounts/101108799337549000917"
  locationId: string; // e.g., "locations/7725888369257069197"
}

// ── GBP API Client ────────────────────────────────────────────────────────────

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const GBP_API_BASE = 'https://mybusiness.googleapis.com/v4';
const GBP_BIZ_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

// Cache access tokens per refresh token (keyed by refresh token hash)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Get a short hash for cache key purposes (not cryptographic).
 */
function tokenCacheKey(refreshToken: string): string {
  // Use last 16 chars of the refresh token as cache key
  return refreshToken.slice(-16);
}

/**
 * Resolve GBP credentials from explicit params or env vars (fallback).
 * Client ID and secret always come from env vars (app-level).
 * Refresh token can be per-user or from env var (platform owner fallback).
 */
export function resolveCredentials(credentials?: Partial<GBPCredentials>): GBPCredentials {
  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  const refreshToken = credentials?.refreshToken || process.env.GBP_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GBP app credentials. Ensure GBP_CLIENT_ID and GBP_CLIENT_SECRET are set in .env.local'
    );
  }

  if (!refreshToken) {
    throw new Error(
      'Missing GBP refresh token. Either pass credentials or set GBP_REFRESH_TOKEN in .env.local'
    );
  }

  return { clientId, clientSecret, refreshToken };
}

/**
 * Refresh the OAuth2 access token using a refresh token.
 * Caches the token per refresh token for its lifetime minus a 60-second buffer.
 */
export async function refreshAccessToken(credentials?: Partial<GBPCredentials>): Promise<string> {
  const creds = resolveCredentials(credentials);
  const cacheKey = tokenCacheKey(creds.refreshToken);

  // Return cached token if still valid
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token',
  });

  const resp = await fetch(TOKEN_URI, { method: 'POST', body: params });
  const data = await resp.json();

  if (data.error) {
    throw new Error(`GBP token refresh failed: ${data.error_description || data.error}`);
  }

  // Cache with 60s buffer before expiry
  const expiresInMs = (data.expires_in || 3600) * 1000;
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs - 60_000,
  });

  return data.access_token;
}

/**
 * Make an authenticated API call to the GBP API.
 */
async function gbpFetch(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET',
  body?: Record<string, unknown>,
  credentials?: Partial<GBPCredentials>
): Promise<any> {
  const accessToken = await refreshAccessToken(credentials);

  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(url, opts);

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(
      `GBP API error (${resp.status}): ${JSON.stringify(errorData)}`
    );
  }

  // DELETE returns 204 with no body
  if (resp.status === 204) return null;

  return resp.json();
}

/**
 * Create a local post on a GBP location.
 */
export async function createLocalPost(
  accountId: string,
  locationId: string,
  post: LocalPost,
  credentials?: Partial<GBPCredentials>
): Promise<LocalPostResponse> {
  const url = `${GBP_API_BASE}/${accountId}/${locationId}/localPosts`;
  return gbpFetch(url, 'POST', post as unknown as Record<string, unknown>, credentials);
}

/**
 * Delete a local post from a GBP location.
 */
export async function deleteLocalPost(
  accountId: string,
  locationId: string,
  postName: string,
  credentials?: Partial<GBPCredentials>
): Promise<void> {
  // postName is the full resource name e.g. accounts/.../locations/.../localPosts/...
  const url = `${GBP_API_BASE}/${postName}`;
  await gbpFetch(url, 'DELETE', undefined, credentials);
}

/**
 * List local posts for a GBP location.
 */
export async function listLocalPosts(
  accountId: string,
  locationId: string,
  pageToken?: string,
  credentials?: Partial<GBPCredentials>
): Promise<ListLocalPostsResponse> {
  let url = `${GBP_API_BASE}/${accountId}/${locationId}/localPosts`;
  if (pageToken) {
    url += `?pageToken=${encodeURIComponent(pageToken)}`;
  }
  return gbpFetch(url, 'GET', undefined, credentials);
}

/**
 * List GBP accounts accessible by the authenticated user.
 * Used during OAuth callback to auto-discover accountId.
 */
export async function listAccounts(
  credentials?: Partial<GBPCredentials>
): Promise<{ accounts?: Array<{ name: string; accountName: string; type: string }> }> {
  const url = `${GBP_API_BASE}/accounts`;
  return gbpFetch(url, 'GET', undefined, credentials);
}

/**
 * List locations for a GBP account.
 * Used during OAuth callback to auto-discover locationId.
 */
export async function listLocations(
  accountId: string,
  credentials?: Partial<GBPCredentials>
): Promise<{ locations?: Array<{ name: string; locationName: string; storeCode?: string }> }> {
  const url = `${GBP_API_BASE}/${accountId}/locations`;
  return gbpFetch(url, 'GET', undefined, credentials);
}

// ── Business Information API (v1) ────────────────────────────────────────────
// These use the mybusinessbusinessinformation.googleapis.com/v1 endpoint.
// Location name format is "locations/XXXX" (no account prefix).

/**
 * List media items (photos) for a GBP location.
 */
export async function listMedia(
  _accountId: string,
  locationId: string,
  credentials?: Partial<GBPCredentials>
): Promise<ListMediaResponse> {
  const url = `${GBP_BIZ_INFO_BASE}/${locationId}/media`;
  return gbpFetch(url, 'GET', undefined, credentials);
}

/**
 * Upload a media item (photo) to a GBP location.
 */
export async function uploadMedia(
  _accountId: string,
  locationId: string,
  mediaData: {
    mediaFormat: 'PHOTO';
    sourceUrl: string;
    locationAssociation?: { category: 'COVER' | 'PROFILE' | 'LOGO' | 'ADDITIONAL' };
  },
  credentials?: Partial<GBPCredentials>
): Promise<GBPMediaItem> {
  const url = `${GBP_BIZ_INFO_BASE}/${locationId}/media`;
  return gbpFetch(url, 'POST', mediaData as unknown as Record<string, unknown>, credentials);
}

/**
 * Delete a media item (photo) from a GBP location.
 * mediaName is the full resource name e.g. "locations/.../media/..."
 */
export async function deleteMedia(
  _accountId: string,
  _locationId: string,
  mediaName: string,
  credentials?: Partial<GBPCredentials>
): Promise<void> {
  const url = `${GBP_BIZ_INFO_BASE}/${mediaName}`;
  await gbpFetch(url, 'DELETE', undefined, credentials);
}

/**
 * Get full business info for a GBP location.
 */
export async function getLocationInfo(
  _accountId: string,
  locationId: string,
  credentials?: Partial<GBPCredentials>
): Promise<GBPLocationInfo> {
  const readMask = 'name,title,phoneNumbers,websiteUri,regularHours,specialHours,profile';
  const url = `${GBP_BIZ_INFO_BASE}/${locationId}?readMask=${encodeURIComponent(readMask)}`;
  return gbpFetch(url, 'GET', undefined, credentials);
}

/**
 * Update business info for a GBP location.
 * updateMask specifies which fields to update (comma-separated).
 */
export async function updateLocationInfo(
  _accountId: string,
  locationId: string,
  updateData: Partial<GBPLocationInfo>,
  updateMask: string,
  credentials?: Partial<GBPCredentials>
): Promise<GBPLocationInfo> {
  const url = `${GBP_BIZ_INFO_BASE}/${locationId}?updateMask=${encodeURIComponent(updateMask)}`;
  return gbpFetch(url, 'PATCH', updateData as unknown as Record<string, unknown>, credentials);
}
