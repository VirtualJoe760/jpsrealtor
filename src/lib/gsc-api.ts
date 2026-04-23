/**
 * Google Search Console API Client
 *
 * Manages site properties and sitemap submissions via the GSC API.
 * Uses the same OAuth2 credentials as GBP (GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN)
 * since both APIs share the Google OAuth2 infrastructure.
 *
 * IMPORTANT: Adding a site via the API only creates a property in GSC.
 * Full verification still requires one of:
 *   1. DNS TXT record (recommended for domain properties)
 *   2. HTML file upload at /.well-known/
 *   3. Meta tag in <head>
 *   4. Google Analytics / Tag Manager (if already connected)
 *
 * The API can check verification status but cannot complete DNS-based verification
 * automatically — the domain owner must add the TXT record manually.
 */

const GSC_API_BASE = 'https://searchconsole.googleapis.com/v1';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';

// Token cache (separate from GBP since scopes may differ)
let cachedToken: { token: string; expiresAt: number } | null = null;

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Get an access token using the same OAuth2 credentials as GBP.
 * The refresh token must have the webmasters scope:
 *   https://www.googleapis.com/auth/webmasters
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  const refreshToken = process.env.GBP_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google OAuth credentials. Ensure GBP_CLIENT_ID, GBP_CLIENT_SECRET, and GBP_REFRESH_TOKEN are set.'
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
    throw new Error(`GSC token refresh failed: ${data.error_description || data.error}`);
  }

  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs - 60_000,
  };

  return data.access_token;
}

/**
 * Make an authenticated request to the GSC API.
 */
async function gscFetch(
  url: string,
  method: 'GET' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<any> {
  const accessToken = await getAccessToken();

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

  // 204 No Content (successful PUT with no body)
  if (resp.status === 204) return null;

  // For GET on a missing site, GSC returns 404
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(`GSC API error (${resp.status}): ${JSON.stringify(errorData)}`);
  }

  return resp.json();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a site property to Google Search Console.
 *
 * This creates a URL-prefix property (sc-domain requires DNS verification first).
 * The site will appear as "unverified" until the owner completes verification.
 *
 * GSC API: PUT https://searchconsole.googleapis.com/v1/sites/{siteUrl}
 */
export async function addSite(siteUrl: string): Promise<void> {
  const encoded = encodeURIComponent(siteUrl);
  await gscFetch(`${GSC_API_BASE}/sites/${encoded}`, 'PUT');
}

/**
 * Submit a sitemap to Google Search Console for a verified site.
 *
 * GSC API: PUT https://searchconsole.googleapis.com/v1/sites/{siteUrl}/sitemaps/{feedpath}
 *
 * @param siteUrl - The site URL (e.g., "https://example.com")
 * @param sitemapUrl - Full URL to the sitemap (e.g., "https://example.com/sitemap.xml")
 */
export async function submitSitemap(siteUrl: string, sitemapUrl: string): Promise<void> {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedSitemap = encodeURIComponent(sitemapUrl);
  await gscFetch(
    `${GSC_API_BASE}/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
    'PUT'
  );
}

/**
 * Get the verification status of a site property in GSC.
 *
 * GSC API: GET https://searchconsole.googleapis.com/v1/sites/{siteUrl}
 *
 * @returns Site resource with permissionLevel and siteUrl, or null if not found.
 */
export async function getSiteStatus(
  siteUrl: string
): Promise<{ siteUrl: string; permissionLevel: string } | null> {
  const encoded = encodeURIComponent(siteUrl);
  try {
    return await gscFetch(`${GSC_API_BASE}/sites/${encoded}`, 'GET');
  } catch (err: any) {
    // 404 means site not found / not verified
    if (err.message?.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * List all sitemaps submitted for a site.
 *
 * GSC API: GET https://searchconsole.googleapis.com/v1/sites/{siteUrl}/sitemaps
 */
export async function listSitemaps(
  siteUrl: string
): Promise<{ sitemap?: Array<{ path: string; lastSubmitted?: string; isPending?: boolean }> }> {
  const encoded = encodeURIComponent(siteUrl);
  return await gscFetch(`${GSC_API_BASE}/sites/${encoded}/sitemaps`, 'GET');
}

/**
 * Delete a site property from GSC.
 *
 * GSC API: DELETE https://searchconsole.googleapis.com/v1/sites/{siteUrl}
 */
export async function deleteSite(siteUrl: string): Promise<void> {
  const encoded = encodeURIComponent(siteUrl);
  await gscFetch(`${GSC_API_BASE}/sites/${encoded}`, 'DELETE');
}
