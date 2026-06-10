/**
 * Google Ads API Client
 *
 * Uses the Google Ads REST API (v18) for campaign management.
 * Requires: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
 *           GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *
 * Docs: https://developers.google.com/google-ads/api/rest/overview
 */

import { AsyncLocalStorage } from 'async_hooks';

const GOOGLE_ADS_API_VERSION = 'v18';
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface GoogleAdsConfig {
  developerToken: string;
  customerId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  /** Manager (MCC) account id that owns the operating customer. Sent as the
   *  `login-customer-id` header so a single MCC + dev token can operate on each
   *  agent's linked client account. Empty when not operating via a manager. */
  loginCustomerId: string;
}

/** Per-agent Google Ads credentials (from User.adAccounts.google, threaded at launch). */
export interface GoogleUserCreds {
  /** The agent's operating Google Ads account (the campaign lands here). */
  customerId?: string;
  /** Optional per-agent refresh token; falls back to the platform (MCC) token. */
  refreshToken?: string;
  /** Optional per-agent developer token; agents under the MCC use the platform token. */
  developerToken?: string;
  /** Manager account id; defaults to the platform MCC env var. */
  loginCustomerId?: string;
}

// Request-scoped storage for per-agent Google Ads credentials. Set by
// runWithGoogleCreds() at the launch route, read by getConfig() inside every
// Google Ads API call. Mirrors the runWithMetaCreds() pattern in meta-ads-api.ts.
const googleCredsStore = new AsyncLocalStorage<GoogleUserCreds>();

/**
 * Run an async function with per-agent Google Ads credentials bound to the call
 * stack. Inside `fn`, any Google Ads API helper uses these creds instead of env.
 */
export function runWithGoogleCreds<T>(creds: GoogleUserCreds | undefined, fn: () => Promise<T>): Promise<T> {
  if (!creds) return fn();
  return googleCredsStore.run(creds, fn);
}

/**
 * Get config from (in priority order):
 *   1. explicit userAdAccounts param
 *   2. AsyncLocalStorage (set by runWithGoogleCreds — the per-request mechanism)
 *   3. env vars (platform / single-tenant fallback)
 *
 * Under the MCC model: customerId is the agent's account; developerToken,
 * refreshToken and loginCustomerId default to the platform's (ChatRealty's MCC).
 */
function getConfig(userAdAccounts?: GoogleUserCreds): GoogleAdsConfig {
  const stored = googleCredsStore.getStore();
  const config: GoogleAdsConfig = {
    developerToken: userAdAccounts?.developerToken || stored?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    customerId: userAdAccounts?.customerId || stored?.customerId || process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    refreshToken: userAdAccounts?.refreshToken || stored?.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    loginCustomerId: userAdAccounts?.loginCustomerId || stored?.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
  };

  // loginCustomerId is optional (only needed for MCC-managed sub-accounts).
  const required = { ...config, loginCustomerId: 'ok' };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Google Ads API not configured. Missing: ${missing.join(', ')}`);
  }

  return config;
}

/** Exchange refresh token for access token */
async function getAccessToken(config: GoogleAdsConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/** Make authenticated request to Google Ads API */
async function googleAdsRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const config = getConfig();
  const accessToken = await getAccessToken(config);
  const customerId = config.customerId.replace(/-/g, '');

  const loginCustomerId = config.loginCustomerId.replace(/-/g, '') || '';

  const url = `${GOOGLE_ADS_BASE}/customers/${customerId}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': config.developerToken,
    'Content-Type': 'application/json',
  };
  // Required when using a Manager Account (MCC) to manage sub-accounts
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${errBody}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleSearchCampaignParams {
  name: string;
  dailyBudgetMicros: number; // Budget in micros ($10 = 10_000_000)
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  geoTargeting?: {
    type: 'radius';
    centerLat: number;
    centerLng: number;
    radiusMiles: number;
  } | {
    type: 'proximity';
    locationIds: string[];
  };
}

export interface GoogleAdGroupParams {
  campaignResourceName: string;
  name: string;
  keywords: string[];
}

export interface GoogleResponsiveSearchAdParams {
  adGroupResourceName: string;
  finalUrl: string;
  headlines: string[]; // max 15, each max 30 chars
  descriptions: string[]; // max 4, each max 90 chars
}

// ---------------------------------------------------------------------------
// Campaign Operations
// ---------------------------------------------------------------------------

/**
 * Create a Search campaign with a daily budget.
 */
export async function createSearchCampaign(
  params: GoogleSearchCampaignParams
): Promise<{ campaignResourceName: string; budgetResourceName: string }> {
  const config = getConfig();
  const customerId = config.customerId.replace(/-/g, '');

  // Step 1: Create campaign budget
  const budgetRes = await googleAdsRequest('/campaignBudgets:mutate', {
    method: 'POST',
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${params.name} Budget`,
          amountMicros: String(params.dailyBudgetMicros),
          deliveryMethod: 'STANDARD',
        },
      }],
    }),
  });
  const budgetResourceName = budgetRes.results[0].resourceName;

  // Step 2: Create campaign
  const campaignRes = await googleAdsRequest('/campaigns:mutate', {
    method: 'POST',
    body: JSON.stringify({
      operations: [{
        create: {
          name: params.name,
          advertisingChannelType: 'SEARCH',
          status: 'PAUSED', // Start paused so agent can review
          campaignBudget: budgetResourceName,
          biddingStrategyType: 'MAXIMIZE_CLICKS',
          startDate: params.startDate.replace(/-/g, ''),
          endDate: params.endDate?.replace(/-/g, '') || undefined,
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: true,
            targetContentNetwork: false,
          },
        },
      }],
    }),
  });
  const campaignResourceName = campaignRes.results[0].resourceName;

  // Step 3: Apply geo targeting (if provided)
  if (params.geoTargeting?.type === 'radius') {
    await googleAdsRequest('/campaignCriteria:mutate', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          create: {
            campaign: campaignResourceName,
            type: 'PROXIMITY',
            proximity: {
              geoPoint: {
                latitudeInMicroDegrees: Math.round(params.geoTargeting.centerLat * 1_000_000),
                longitudeInMicroDegrees: Math.round(params.geoTargeting.centerLng * 1_000_000),
              },
              radius: params.geoTargeting.radiusMiles,
              radiusUnits: 'MILES',
            },
          },
        }],
      }),
    });
  }

  return { campaignResourceName, budgetResourceName };
}

/**
 * Create an ad group with keywords.
 */
export async function createAdGroup(
  params: GoogleAdGroupParams
): Promise<{ adGroupResourceName: string }> {
  // Create ad group
  const adGroupRes = await googleAdsRequest('/adGroups:mutate', {
    method: 'POST',
    body: JSON.stringify({
      operations: [{
        create: {
          name: params.name,
          campaign: params.campaignResourceName,
          type: 'SEARCH_STANDARD',
          cpcBidMicros: '2000000', // $2.00 default max CPC
          status: 'ENABLED',
        },
      }],
    }),
  });
  const adGroupResourceName = adGroupRes.results[0].resourceName;

  // Add keywords
  if (params.keywords.length > 0) {
    const keywordOps = params.keywords.map((kw) => ({
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: kw,
          matchType: 'PHRASE',
        },
      },
    }));

    await googleAdsRequest('/adGroupCriteria:mutate', {
      method: 'POST',
      body: JSON.stringify({ operations: keywordOps }),
    });
  }

  return { adGroupResourceName };
}

/**
 * Create a responsive search ad.
 */
export async function createResponsiveSearchAd(
  params: GoogleResponsiveSearchAdParams
): Promise<{ adResourceName: string }> {
  const headlines = params.headlines.slice(0, 15).map((text, i) => ({
    text,
    pinnedField: i < 3 ? undefined : undefined, // Let Google optimize positions
  }));

  const descriptions = params.descriptions.slice(0, 4).map((text) => ({
    text,
  }));

  const adRes = await googleAdsRequest('/adGroupAds:mutate', {
    method: 'POST',
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: params.adGroupResourceName,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines,
              descriptions,
            },
            finalUrls: [params.finalUrl],
          },
        },
      }],
    }),
  });

  return { adResourceName: adRes.results[0].resourceName };
}

// ---------------------------------------------------------------------------
// Full Campaign Creation (convenience wrapper)
// ---------------------------------------------------------------------------

export interface CreateFullSearchCampaignParams {
  name: string;
  dailyBudget: number; // in dollars
  landingPageUrl: string;
  keywords: string[];
  headlines: string[];
  descriptions: string[];
  startDate?: string;
  endDate?: string;
  geoTargeting?: {
    centerLat: number;
    centerLng: number;
    radiusMiles: number;
  };
}

/**
 * Creates a complete Search campaign: Budget → Campaign → Ad Group → Keywords → Ad
 * Returns all resource names for tracking.
 */
export async function createFullSearchCampaign(
  params: CreateFullSearchCampaignParams
): Promise<{
  campaignResourceName: string;
  adGroupResourceName: string;
  adResourceName: string;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Create campaign + budget
  const { campaignResourceName } = await createSearchCampaign({
    name: params.name,
    dailyBudgetMicros: Math.round(params.dailyBudget * 1_000_000),
    startDate: params.startDate || today,
    endDate: params.endDate,
    geoTargeting: params.geoTargeting ? {
      type: 'radius',
      centerLat: params.geoTargeting.centerLat,
      centerLng: params.geoTargeting.centerLng,
      radiusMiles: params.geoTargeting.radiusMiles,
    } : undefined,
  });

  // Create ad group with keywords
  const { adGroupResourceName } = await createAdGroup({
    campaignResourceName,
    name: `${params.name} - Ad Group`,
    keywords: params.keywords,
  });

  // Create responsive search ad
  const { adResourceName } = await createResponsiveSearchAd({
    adGroupResourceName,
    finalUrl: params.landingPageUrl,
    headlines: params.headlines,
    descriptions: params.descriptions,
  });

  return { campaignResourceName, adGroupResourceName, adResourceName };
}

// ---------------------------------------------------------------------------
// List campaigns (for Manage tab parity with Meta)
// ---------------------------------------------------------------------------

export interface GoogleAdsCampaignListItem {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  dailyBudgetMicros?: number;
}

/**
 * List all campaigns in the connected Google Ads customer account.
 * Uses the searchStream endpoint with GAQL. Mirrors the Meta list-campaigns
 * call in /api/campaigns/[id]/ad-runs so we can match-by-name and detect
 * orphans (Google campaigns not tracked in AdCampaignRecord).
 */
export async function listCampaigns(): Promise<GoogleAdsCampaignListItem[]> {
  const query = `
    SELECT
      campaign.resource_name,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.start_date,
      campaign.end_date,
      campaign_budget.amount_micros
    FROM campaign
    ORDER BY campaign.id DESC
    LIMIT 500
  `;

  const res = await googleAdsRequest('/googleAds:searchStream', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });

  // searchStream returns an array of response chunks, each with `.results`
  const chunks: any[] = Array.isArray(res) ? res : [res];
  const out: GoogleAdsCampaignListItem[] = [];
  for (const chunk of chunks) {
    const results: any[] = chunk?.results || [];
    for (const r of results) {
      const c = r.campaign || {};
      const b = r.campaignBudget || {};
      out.push({
        resourceName: c.resourceName || '',
        id: String(c.id || ''),
        name: c.name || '',
        status: c.status || 'UNKNOWN',
        startDate: c.startDate,
        endDate: c.endDate,
        dailyBudgetMicros: b.amountMicros ? Number(b.amountMicros) : undefined,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Check if Google Ads is configured
// ---------------------------------------------------------------------------

export function isGoogleAdsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}
