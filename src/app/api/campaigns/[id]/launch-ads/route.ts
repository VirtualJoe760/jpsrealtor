import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import AdCampaignRecord from '@/models/AdCampaignRecord';
import User from '@/models/User';
import {
  createFullSearchCampaign,
  isGoogleAdsConfigured,
} from '@/lib/google-ads-api';
import {
  createFullMetaCampaign,
  isMetaAdsConfigured,
} from '@/lib/meta-ads-api';

/**
 * POST /api/campaigns/[id]/launch-ads
 *
 * Launches Google PPC and/or Meta retargeting campaigns via their APIs.
 * Saves config to Campaign document and creates AdCampaignRecord entries.
 * Campaigns are created PAUSED so the agent can review before going live.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const body = await request.json();
    const { pageUrl, pageName, google, meta } = body;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Load agent's ad account credentials from their profile
    const user = await User.findOne({ email: session.user.email }, { adAccounts: 1 }).lean();
    const userGoogleAds = (user as any)?.adAccounts?.google;
    const userMetaAds = (user as any)?.adAccounts?.meta;

    const results: {
      google?: { success: boolean; campaignResourceName?: string; error?: string };
      meta?: { success: boolean; campaignId?: string; error?: string };
    } = {};

    // ------- Google Ads -------
    if (google) {
      const googleConfigured = isGoogleAdsConfigured() || (userGoogleAds?.refreshToken && userGoogleAds?.customerId);
      if (!googleConfigured) {
        results.google = {
          success: false,
          error: 'Google Ads not connected. Go to Settings → Ad Accounts to connect your Google Ads account.',
        };
      } else {
        try {
          const campaignName = `${pageName || 'Campaign'} — PPC — ${new Date().toLocaleDateString()}`;

          const googleResult = await createFullSearchCampaign({
            name: campaignName,
            dailyBudget: google.budget || 10,
            landingPageUrl: pageUrl,
            keywords: google.keywords || [],
            headlines: google.headlines || [],
            descriptions: google.descriptions || [],
            geoTargeting: google.geoTargeting?.center ? {
              centerLat: google.geoTargeting.center.lat,
              centerLng: google.geoTargeting.center.lng,
              radiusMiles: google.geoTargeting.radiusMiles || 10,
            } : undefined,
          });

          // Save config to campaign
          campaign.googleAdsConfig = {
            campaignId: googleResult.campaignResourceName,
            adGroupId: googleResult.adGroupResourceName,
            landingPageUrl: pageUrl,
            budget: google.budget,
            bidStrategy: 'maximize_clicks',
            adType: 'search',
            headlines: google.headlines,
            descriptions: google.descriptions,
            geoTargeting: google.geoTargeting,
          };
          campaign.activeStrategies.googleAds = true;

          // Create tracking record
          await AdCampaignRecord.create({
            campaignId: campaign._id,
            userId: (session.user as any).id,
            platform: 'google',
            externalCampaignId: googleResult.campaignResourceName,
            externalAdGroupId: googleResult.adGroupResourceName,
            status: 'active',
            snapshotDate: new Date(),
          });

          results.google = {
            success: true,
            campaignResourceName: googleResult.campaignResourceName,
          };
        } catch (err: any) {
          console.error('[launch-ads] Google Ads error:', err);
          results.google = { success: false, error: err.message };
        }
      }
    }

    // ------- Meta Ads -------
    if (meta) {
      const metaConfigured = isMetaAdsConfigured() || (userMetaAds?.accessToken && userMetaAds?.adAccountId);
      if (!metaConfigured) {
        results.meta = {
          success: false,
          error: 'Meta Ads not connected. Go to Settings → Ad Accounts to connect your Meta Ads account.',
        };
      } else {
        try {
          const campaignName = `${pageName || 'Campaign'} — Retargeting — ${new Date().toLocaleDateString()}`;

          // Get Facebook Page ID from env or default
          const pageId = process.env.FACEBOOK_PAGE_ID || '';
          if (!pageId) {
            throw new Error('FACEBOOK_PAGE_ID not configured');
          }

          const metaResult = await createFullMetaCampaign({
            name: campaignName,
            pageId,
            landingPageUrl: pageUrl,
            dailyBudget: meta.budget || 8,
            imageUrl: meta.imageUrl || undefined,
            headline: meta.headline || pageName || 'Learn More',
            primaryText: meta.primaryText || '',
            placements: meta.placements || ['facebook_feed', 'instagram_feed'],
            callToAction: 'LEARN_MORE',
          });

          // Save config to campaign
          campaign.metaAdsConfig = {
            campaignId: metaResult.campaignId,
            adSetId: metaResult.adSetId,
            adId: metaResult.adId,
            landingPageUrl: pageUrl,
            budget: meta.budget,
            objective: 'OUTCOME_TRAFFIC',
            headline: meta.headline,
            primaryText: meta.primaryText,
            imageUrl: meta.imageUrl,
            placements: meta.placements,
            callToAction: 'LEARN_MORE',
          };
          campaign.activeStrategies.metaAds = true;

          // Create tracking record
          await AdCampaignRecord.create({
            campaignId: campaign._id,
            userId: (session.user as any).id,
            platform: 'meta',
            externalCampaignId: metaResult.campaignId,
            externalAdSetId: metaResult.adSetId,
            externalAdId: metaResult.adId,
            status: 'active',
            snapshotDate: new Date(),
          });

          results.meta = {
            success: true,
            campaignId: metaResult.campaignId,
          };
        } catch (err: any) {
          console.error('[launch-ads] Meta Ads error:', err);
          results.meta = { success: false, error: err.message };
        }
      }
    }

    // Save campaign updates
    if (pageName) campaign.neighborhood = pageName;
    campaign.status = 'active';
    await campaign.save();

    // Build response message
    const googleOk = results.google?.success;
    const metaOk = results.meta?.success;
    const allOk = (!google || googleOk) && (!meta || metaOk);

    let message = '';
    if (allOk) {
      message = 'Campaigns launched successfully! They are created PAUSED — review in Google Ads Manager and Meta Ads Manager, then enable when ready.';
    } else {
      const parts: string[] = [];
      if (google && !googleOk) parts.push(`Google: ${results.google?.error}`);
      if (meta && !metaOk) parts.push(`Meta: ${results.meta?.error}`);
      message = parts.join(' | ');
    }

    return NextResponse.json({
      success: allOk,
      message,
      results,
    });
  } catch (error: any) {
    console.error('[launch-ads] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to launch campaigns' },
      { status: 500 }
    );
  }
}
