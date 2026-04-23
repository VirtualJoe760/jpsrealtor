/**
 * Google Business Profile API Client
 *
 * Handles authentication and API calls to GBP for local posts.
 * Uses OAuth2 refresh token flow with credentials from env vars:
 *   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN
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

// ── GBP API Client ────────────────────────────────────────────────────────────

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const GBP_API_BASE = 'https://mybusiness.googleapis.com/v4';

// Cache the access token with its expiry
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Refresh the OAuth2 access token using the stored refresh token.
 * Caches the token for its lifetime minus a 60-second buffer.
 */
export async function refreshAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  const refreshToken = process.env.GBP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing GBP credentials. Ensure GBP_CLIENT_ID, GBP_CLIENT_SECRET, and GBP_REFRESH_TOKEN are set in .env.local'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const resp = await fetch(TOKEN_URI, { method: 'POST', body: params });
  const data = await resp.json();

  if (data.error) {
    throw new Error(`GBP token refresh failed: ${data.error_description || data.error}`);
  }

  // Cache with 60s buffer before expiry
  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs - 60_000,
  };

  return data.access_token;
}

/**
 * Make an authenticated API call to the GBP API.
 */
async function gbpFetch(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET',
  body?: Record<string, unknown>
): Promise<any> {
  const accessToken = await refreshAccessToken();

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
  post: LocalPost
): Promise<LocalPostResponse> {
  const url = `${GBP_API_BASE}/${accountId}/${locationId}/localPosts`;
  return gbpFetch(url, 'POST', post as unknown as Record<string, unknown>);
}

/**
 * Delete a local post from a GBP location.
 */
export async function deleteLocalPost(
  accountId: string,
  locationId: string,
  postName: string
): Promise<void> {
  // postName is the full resource name e.g. accounts/.../locations/.../localPosts/...
  const url = `${GBP_API_BASE}/${postName}`;
  await gbpFetch(url, 'DELETE');
}

/**
 * List local posts for a GBP location.
 */
export async function listLocalPosts(
  accountId: string,
  locationId: string,
  pageToken?: string
): Promise<ListLocalPostsResponse> {
  let url = `${GBP_API_BASE}/${accountId}/${locationId}/localPosts`;
  if (pageToken) {
    url += `?pageToken=${encodeURIComponent(pageToken)}`;
  }
  return gbpFetch(url, 'GET');
}
