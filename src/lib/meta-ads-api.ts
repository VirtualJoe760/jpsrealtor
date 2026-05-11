/**
 * Meta Marketing API Client
 *
 * Creates campaigns on Facebook/Instagram via the Marketing API (v21.0).
 * Auto-applies Housing Special Ad Category for all real estate campaigns.
 *
 * Requires: META_AD_ACCOUNT_ID, META_ADS_ACCESS_TOKEN (system user with ads_management)
 *
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

import { AsyncLocalStorage } from 'async_hooks';

const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface MetaAdsConfig {
  adAccountId: string; // format: act_XXXXXXXXX
  accessToken: string;
  pageId?: string;
  pageAccessToken?: string;
}

/** User-scoped Meta credentials (from User.adAccounts.meta) */
export interface MetaUserCreds {
  adAccountId?: string;
  accessToken?: string;
  pageId?: string;
  pageAccessToken?: string;
}

// Request-scoped storage for per-user Meta credentials. Set by runWithMetaCreds()
// at the launch route, read by getConfig() inside every Meta API call.
const metaCredsStore = new AsyncLocalStorage<MetaUserCreds>();

/**
 * Run an async function with per-user Meta credentials bound to the call stack.
 * Inside `fn`, any call to a Meta API helper will use these creds instead of env vars.
 */
export function runWithMetaCreds<T>(creds: MetaUserCreds | undefined, fn: () => Promise<T>): Promise<T> {
  if (!creds) return fn();
  return metaCredsStore.run(creds, fn);
}

/**
 * Get config from (in priority order):
 *   1. explicit userAdAccounts param
 *   2. AsyncLocalStorage (set by runWithMetaCreds — the per-request mechanism)
 *   3. env vars (single-tenant fallback)
 */
function getConfig(userAdAccounts?: MetaUserCreds): MetaAdsConfig {
  const stored = metaCredsStore.getStore();
  const adAccountId = userAdAccounts?.adAccountId || stored?.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
  const accessToken = userAdAccounts?.accessToken || stored?.accessToken || process.env.META_ADS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || '';
  const pageId = userAdAccounts?.pageId || stored?.pageId || process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = userAdAccounts?.pageAccessToken || stored?.pageAccessToken;

  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID is not configured. Connect your Meta Ads account in Settings.');
  if (!accessToken) throw new Error('META_ADS_ACCESS_TOKEN is not configured. Connect your Meta Ads account in Settings.');

  return { adAccountId, accessToken, pageId, pageAccessToken };
}

/** Public helper for callers that need the resolved Page ID for the current user. */
export function getResolvedPageId(): string | undefined {
  const stored = metaCredsStore.getStore();
  return stored?.pageId || process.env.FACEBOOK_PAGE_ID;
}

/** Make authenticated request to Meta Marketing API */
async function metaRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const config = getConfig();
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${META_BASE}${endpoint}${separator}access_token=${config.accessToken}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Meta Marketing API error (${res.status}): ${errBody}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetaObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES';

export type MetaPlacement =
  | 'facebook_feed'
  | 'instagram_feed'
  | 'instagram_stories'
  | 'instagram_reels'
  | 'audience_network';

export interface MetaCampaignParams {
  name: string;
  objective: MetaObjective;
  dailyBudget: number; // in dollars
  status?: 'PAUSED' | 'ACTIVE';
}

export interface MetaAdSetParams {
  campaignId: string;
  name: string;
  dailyBudget: number; // in cents
  startTime?: string; // ISO 8601
  endTime?: string;
  // Geo targeting
  geoTargeting?: {
    type: 'radius';
    lat: number;
    lng: number;
    radiusMiles: number;
  };
  // Audience — pass one or more Meta Custom Audience IDs
  customAudienceId?: string;       // legacy single-ID field
  customAudienceIds?: string[];    // preferred multi-ID field
  placements: MetaPlacement[];
  // Retargeting
  audienceType?: 'website_visitors' | 'custom_audience';
}

export interface MetaAdCreativeParams {
  name: string;
  pageId: string;
  imageUrl?: string;
  videoId?: string;
  headline: string;
  primaryText: string;
  description?: string;
  linkUrl: string;
  callToAction: 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US';
}

export interface MetaAdParams {
  adSetId: string;
  creativeId: string;
  name: string;
  status?: 'PAUSED' | 'ACTIVE';
}

// ---------------------------------------------------------------------------
// Campaign Operations
// ---------------------------------------------------------------------------

/**
 * Create a campaign with Housing Special Ad Category auto-applied.
 */
export async function createCampaign(
  params: MetaCampaignParams
): Promise<{ campaignId: string }> {
  const config = getConfig();

  const res = await metaRequest(`/${config.adAccountId}/campaigns`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      objective: params.objective,
      status: params.status || 'PAUSED',
      // CRITICAL: Housing SAC is mandatory for all real estate ads
      special_ad_categories: ['HOUSING'],
      special_ad_category_country: ['US'],
      // Required when not using campaign-level budget (we use ad-set-level budget).
      // false = each ad set spends its own budget independently.
      is_adset_budget_sharing_enabled: false,
    }),
  });

  return { campaignId: res.id };
}

/**
 * Create an ad set with targeting.
 * Housing SAC restrictions are enforced:
 * - No age/gender targeting
 * - Minimum 15-mile radius for location
 * - No ZIP code targeting
 */
export async function createAdSet(
  params: MetaAdSetParams
): Promise<{ adSetId: string }> {
  const config = getConfig();

  const targeting: any = {};

  // Geo targeting (minimum 15mi radius under Housing SAC)
  if (params.geoTargeting) {
    const radiusKm = Math.max(params.geoTargeting.radiusMiles, 15) * 1.60934; // Convert to km, enforce 15mi min
    targeting.geo_locations = {
      custom_locations: [{
        latitude: params.geoTargeting.lat,
        longitude: params.geoTargeting.lng,
        radius: Math.round(radiusKm),
        distance_unit: 'kilometer',
      }],
    };
  }

  // Custom audiences for retargeting (one or more)
  const audienceIds = [
    ...(params.customAudienceIds || []),
    ...(params.customAudienceId ? [params.customAudienceId] : []),
  ].filter(Boolean);
  if (audienceIds.length > 0) {
    targeting.custom_audiences = audienceIds.map((id) => ({ id }));
  }

  // Build publisher platforms from placements
  const publisherPlatforms: string[] = [];
  const facebookPositions: string[] = [];
  const instagramPositions: string[] = [];

  for (const p of params.placements) {
    if (p === 'facebook_feed') {
      publisherPlatforms.push('facebook');
      facebookPositions.push('feed');
    } else if (p === 'instagram_feed') {
      publisherPlatforms.push('instagram');
      instagramPositions.push('stream');
    } else if (p === 'instagram_stories') {
      publisherPlatforms.push('instagram');
      instagramPositions.push('story');
    } else if (p === 'instagram_reels') {
      publisherPlatforms.push('instagram');
      instagramPositions.push('reels');
    } else if (p === 'audience_network') {
      publisherPlatforms.push('audience_network');
    }
  }

  const targetingSpec: any = {
    ...targeting,
    publisher_platforms: [...new Set(publisherPlatforms)],
  };

  if (facebookPositions.length > 0) {
    targetingSpec.facebook_positions = [...new Set(facebookPositions)];
  }
  if (instagramPositions.length > 0) {
    targetingSpec.instagram_positions = [...new Set(instagramPositions)];
  }

  const res = await metaRequest(`/${config.adAccountId}/adsets`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      campaign_id: params.campaignId,
      daily_budget: Math.round(params.dailyBudget * 100), // Meta expects cents
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: targetingSpec,
      status: 'PAUSED',
      start_time: params.startTime || undefined,
      end_time: params.endTime || undefined,
    }),
  });

  return { adSetId: res.id };
}

/**
 * Create ad creative with image or video.
 */
export async function createAdCreative(
  params: MetaAdCreativeParams
): Promise<{ creativeId: string }> {
  const config = getConfig();

  const objectStorySpec: any = {
    page_id: params.pageId,
    link_data: {
      link: params.linkUrl,
      message: params.primaryText,
      name: params.headline,
      description: params.description || undefined,
      call_to_action: {
        type: params.callToAction,
        value: { link: params.linkUrl },
      },
    },
  };

  // Image: Meta v21 dropped `image_url` in link_data. Must upload first → use image_hash.
  if (params.imageUrl) {
    const { imageHash } = await uploadImageFromUrl(params.imageUrl, `${params.name} - image`);
    objectStorySpec.link_data.image_hash = imageHash;
  }
  if (params.videoId) {
    objectStorySpec.link_data.video_id = params.videoId;
  }

  const res = await metaRequest(`/${config.adAccountId}/adcreatives`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      object_story_spec: objectStorySpec,
    }),
  });

  return { creativeId: res.id };
}

/**
 * Create an ad linking creative to ad set.
 */
export async function createAd(
  params: MetaAdParams
): Promise<{ adId: string }> {
  const config = getConfig();

  const res = await metaRequest(`/${config.adAccountId}/ads`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status: params.status || 'PAUSED',
    }),
  });

  return { adId: res.id };
}

// ---------------------------------------------------------------------------
// Upload image to Meta (from URL)
// ---------------------------------------------------------------------------

/**
 * Upload an image from a URL to Meta's ad account.
 * Required before using in ad creative.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  name?: string
): Promise<{ imageHash: string }> {
  const config = getConfig();

  const res = await metaRequest(`/${config.adAccountId}/adimages`, {
    method: 'POST',
    body: JSON.stringify({
      url: imageUrl,
      name: name || `ad-image-${Date.now()}`,
    }),
  });

  // Response structure: { images: { [hash]: { hash, url, ... } } }
  const images = res.images;
  const hash = Object.keys(images)[0];
  return { imageHash: hash };
}

// ---------------------------------------------------------------------------
// Full Campaign Creation (convenience wrapper)
// ---------------------------------------------------------------------------

export interface CreateFullMetaCampaignParams {
  name: string;
  pageId: string;
  landingPageUrl: string;
  dailyBudget: number; // in dollars
  imageUrl?: string;
  headline: string;
  primaryText: string;
  placements: MetaPlacement[];
  callToAction?: 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US';
  geoTargeting?: {
    lat: number;
    lng: number;
    radiusMiles: number;
  };
  customAudienceId?: string;
  customAudienceIds?: string[];
  startTime?: string;
  endTime?: string;
}

/**
 * Creates a complete Meta campaign: Campaign → Ad Set → Creative → Ad
 * All created PAUSED so agent can review in Ads Manager before going live.
 */
export async function createFullMetaCampaign(
  params: CreateFullMetaCampaignParams
): Promise<{
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}> {
  // Create campaign (with Housing SAC)
  const { campaignId } = await createCampaign({
    name: params.name,
    objective: 'OUTCOME_TRAFFIC',
    dailyBudget: params.dailyBudget,
    status: 'PAUSED',
  });

  // Create ad set with targeting
  const { adSetId } = await createAdSet({
    campaignId,
    name: `${params.name} - Ad Set`,
    dailyBudget: params.dailyBudget,
    geoTargeting: params.geoTargeting ? {
      type: 'radius',
      lat: params.geoTargeting.lat,
      lng: params.geoTargeting.lng,
      radiusMiles: params.geoTargeting.radiusMiles,
    } : undefined,
    customAudienceId: params.customAudienceId,
    customAudienceIds: params.customAudienceIds,
    placements: params.placements,
    startTime: params.startTime,
    endTime: params.endTime,
  });

  // Create ad creative
  const { creativeId } = await createAdCreative({
    name: `${params.name} - Creative`,
    pageId: params.pageId,
    imageUrl: params.imageUrl,
    headline: params.headline,
    primaryText: params.primaryText,
    linkUrl: params.landingPageUrl,
    callToAction: params.callToAction || 'LEARN_MORE',
  });

  // Create ad
  const { adId } = await createAd({
    adSetId,
    creativeId,
    name: `${params.name} - Ad`,
    status: 'PAUSED',
  });

  return { campaignId, adSetId, creativeId, adId };
}

// ---------------------------------------------------------------------------
// Custom Audiences
// ---------------------------------------------------------------------------

export interface MetaCustomAudience {
  id: string;
  name: string;
  subtype: string;             // CUSTOM | WEBSITE | LOOKALIKE | ENGAGEMENT | etc.
  customer_file_source?: string;
}

/** List all Custom Audiences in the ad account. */
export async function listCustomAudiences(): Promise<MetaCustomAudience[]> {
  const config = getConfig();
  const res = await metaRequest(
    `/${config.adAccountId}/customaudiences?fields=id,name,subtype,customer_file_source&limit=200`
  );
  return res.data || [];
}

/**
 * Create a Website Custom Audience capturing all visitors over the past 180 days,
 * sourced from the agent's Meta Pixel.
 */
export async function createWebsiteCustomAudience(params: {
  name: string;
  pixelId: string;
  retentionDays?: number;
}): Promise<{ audienceId: string }> {
  const config = getConfig();
  const retentionDays = params.retentionDays ?? 180;

  // "All visitors" rule: match every PageView event from this Pixel.
  // PageView fires on every page load, so this captures all site traffic.
  const rule = {
    inclusions: {
      operator: 'or',
      rules: [{
        event_sources: [{ id: params.pixelId, type: 'pixel' }],
        retention_seconds: retentionDays * 86400,
        filter: {
          operator: 'and',
          filters: [
            { field: 'event', operator: '=', value: 'PageView' },
          ],
        },
      }],
    },
  };

  // Meta API v21+: do not pass `subtype` — it's inferred from `pixel_id`.
  const res = await metaRequest(`/${config.adAccountId}/customaudiences`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      description: `All website visitors (past ${retentionDays} days) — auto-created by ChatRealty`,
      pixel_id: params.pixelId,
      retention_days: retentionDays,
      rule: JSON.stringify(rule),
    }),
  });

  return { audienceId: res.id };
}

/**
 * Resolve wizard audience-type selections ('visitors' / 'contacts') into actual
 * Meta Custom Audience IDs by looking up existing audiences in the ad account.
 * For 'visitors', auto-creates a Website Custom Audience from the Pixel if none exists.
 *
 * Returns { audienceIds, warnings } — warnings are non-fatal notes (e.g. "no CRM audience found").
 */
export async function resolveAudienceIdsForLaunch(params: {
  audienceTypes: Array<'visitors' | 'contacts'>;
  pixelId?: string;
}): Promise<{ audienceIds: string[]; warnings: string[] }> {
  const audienceIds = new Set<string>();
  const warnings: string[] = [];

  const existing = await listCustomAudiences();

  for (const type of params.audienceTypes) {
    if (type === 'visitors') {
      // Preference: WEBSITE (true Pixel visitors) → ENGAGEMENT (Page/IG/Video engagers,
      // a reasonable "people who know the brand" audience) → any non-CUSTOM audience.
      const pick =
        existing.find((a) => a.subtype === 'WEBSITE') ||
        existing.find((a) => a.subtype === 'ENGAGEMENT') ||
        existing.find((a) => a.subtype === 'IG_BUSINESS') ||
        existing.find((a) => a.subtype !== 'CUSTOM');
      if (pick) {
        audienceIds.add(pick.id);
      } else {
        warnings.push(
          'No Website / Engagement Custom Audience found in your ad account. Create one in Meta Ads Manager → Audiences.'
        );
      }
    } else if (type === 'contacts') {
      // CRM Contacts → CUSTOM-subtype audience (customer-file uploads).
      const crm = existing.find((a) => a.subtype === 'CUSTOM');
      if (crm) {
        audienceIds.add(crm.id);
      } else {
        warnings.push(
          'No CRM Custom Audience found in your ad account. Upload your contacts to Meta as a Custom Audience to use this option.'
        );
      }
    }
  }

  return { audienceIds: Array.from(audienceIds), warnings };
}

// ---------------------------------------------------------------------------
// Campaign Insights (Performance Metrics)
// ---------------------------------------------------------------------------

export interface MetaCampaignInsights {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversions: number;
  reach: number;
  frequency: number;
  dateStart: string;
  dateStop: string;
}

/**
 * Fetch campaign-level insights from Meta Marketing API.
 * Returns lifetime metrics by default, or a specific date range.
 */
export async function getCampaignInsights(
  campaignId: string,
  dateRange?: { since: string; until: string }
): Promise<MetaCampaignInsights | null> {
  const fields = 'impressions,clicks,spend,ctr,cpc,actions,reach,frequency,date_start,date_stop';
  const timeRange = dateRange
    ? `&time_range=${encodeURIComponent(JSON.stringify({ since: dateRange.since, until: dateRange.until }))}`
    : '&date_preset=maximum';

  const data = await metaRequest(
    `/${campaignId}/insights?fields=${fields}${timeRange}`
  );

  if (!data.data || data.data.length === 0) return null;

  const row = data.data[0];
  const conversions = (row.actions || [])
    .filter((a: any) => a.action_type === 'offsite_conversion.fb_pixel_lead' || a.action_type === 'lead')
    .reduce((sum: number, a: any) => sum + parseInt(a.value || '0'), 0);

  return {
    impressions: parseInt(row.impressions || '0'),
    clicks: parseInt(row.clicks || '0'),
    spend: parseFloat(row.spend || '0'),
    ctr: parseFloat(row.ctr || '0'),
    cpc: parseFloat(row.cpc || '0'),
    conversions,
    reach: parseInt(row.reach || '0'),
    frequency: parseFloat(row.frequency || '0'),
    dateStart: row.date_start,
    dateStop: row.date_stop,
  };
}

// ---------------------------------------------------------------------------
// Campaign Status Management
// ---------------------------------------------------------------------------

export type MetaCampaignStatusUpdate = 'ACTIVE' | 'PAUSED' | 'DELETED';

/**
 * Update a campaign's effective status.
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: MetaCampaignStatusUpdate
): Promise<{ success: boolean }> {
  await metaRequest(`/${campaignId}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
  return { success: true };
}

/**
 * Get current campaign status and details from Meta.
 */
export async function getCampaignDetails(
  campaignId: string
): Promise<{ id: string; name: string; status: string; effectiveStatus: string; dailyBudget: string; startTime?: string; createdTime: string }> {
  return metaRequest(
    `/${campaignId}?fields=id,name,status,effective_status,daily_budget,start_time,created_time`
  );
}

// ---------------------------------------------------------------------------
// Check if Meta Ads is configured
// ---------------------------------------------------------------------------

export function isMetaAdsConfigured(): boolean {
  return !!(
    process.env.META_AD_ACCOUNT_ID &&
    (process.env.META_ADS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN)
  );
}
