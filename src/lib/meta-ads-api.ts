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

const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface MetaAdsConfig {
  adAccountId: string; // format: act_XXXXXXXXX
  accessToken: string;
}

/**
 * Get config from user profile (per-agent) or fall back to env vars (single-tenant).
 * Pass userAdAccounts from the User model's adAccounts.meta field.
 */
function getConfig(userAdAccounts?: any): MetaAdsConfig {
  const adAccountId = userAdAccounts?.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
  const accessToken = userAdAccounts?.accessToken || process.env.META_ADS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || '';

  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID is not configured. Connect your Meta Ads account in Settings.');
  if (!accessToken) throw new Error('META_ADS_ACCESS_TOKEN is not configured. Connect your Meta Ads account in Settings.');

  return { adAccountId, accessToken };
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
  // Audience
  customAudienceId?: string;
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

  // Custom audience for retargeting
  if (params.customAudienceId) {
    targeting.custom_audiences = [{ id: params.customAudienceId }];
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

  // Image or video
  if (params.imageUrl) {
    objectStorySpec.link_data.image_url = params.imageUrl;
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
