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
  resolveAudienceIdsForLaunch,
  runWithMetaCreds,
} from '@/lib/meta-ads-api';
import PointsLedger from '@/models/PointsLedger';
import { adBudgetToCredits } from '@/config/credit-costs';
import mongoose from 'mongoose';

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

    // --- Credit balance check ---
    // Campaigns launch PAUSED, so we don't debit credits now.
    // Instead, verify the user has enough credits to cover at least one day of
    // combined ad spend so they aren't surprised when the campaigns go live.
    const googleDailyBudget = google?.budget || 0;
    const metaDailyBudget = meta?.budget || 0;
    const totalDailyBudget = googleDailyBudget + metaDailyBudget;
    const creditsEstimatedDaily = adBudgetToCredits(totalDailyBudget);
    const creditsEstimatedMonthly = adBudgetToCredits(totalDailyBudget, 30);

    const userId = (session.user as any).id;

    if (totalDailyBudget > 0) {
      // Cast string userId → ObjectId; some Mongoose hot-reload paths skip auto-cast
      const userIdObj = mongoose.isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(String(userId))
        : userId;
      const ledger = await PointsLedger.findOne({ userId: userIdObj });
      const currentBalance = ledger?.balance || 0;

      // Diagnostic: also do a raw collection lookup to confirm storage
      const rawCount = await PointsLedger.collection.countDocuments({ userId: userIdObj });

      console.log('[launch-ads] Credit check:', {
        userId,
        userIdType: typeof userId,
        modelCollection: PointsLedger.collection.collectionName,
        rawCount,
        ledgerFound: !!ledger,
        currentBalance,
        creditsEstimatedDaily,
        totalDailyBudget,
      });

      if (currentBalance < creditsEstimatedDaily) {
        return NextResponse.json({
          success: false,
          error: `Insufficient credits. You need at least ${creditsEstimatedDaily} credits to cover one day of ad spend ($${totalDailyBudget}/day). You have ${currentBalance} credits.`,
          creditsRequired: creditsEstimatedDaily,
          creditsEstimatedMonthly,
          creditsAvailable: currentBalance,
        }, { status: 400 });
      }
    }
    // TODO: Add a daily cron job to debit credits for active (non-paused) ad campaigns.
    // Campaigns launch PAUSED — credits are debited daily once the agent enables them.

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
            userId,
            platform: 'google',
            externalCampaignId: googleResult.campaignResourceName,
            externalAdGroupId: googleResult.adGroupResourceName,
            dailyBudget: google.budget || 0,
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

          // Page ID priority: agent's connected Page → env fallback (single-tenant dev)
          const pageId = userMetaAds?.pageId || process.env.FACEBOOK_PAGE_ID || '';
          if (!pageId) {
            throw new Error(
              'No Facebook Page connected. Go to Settings → Integrations and connect your Meta Business account.'
            );
          }

          // Use the agent's ad account + page for targeting, but prefer the platform
          // system-user token (META_ADS_ACCESS_TOKEN env) for the actual API calls.
          // Why: OAuth user tokens hit a "(#3) Application does not have the capability"
          // wall on write operations (image upload, ad creative) until the app is granted
          // Advanced Access on ads_management — which is a separate Meta review process.
          // System-user tokens already carry these capabilities for assets they own.
          // For multi-tenant later: assign chatRealty's system user as a Partner on each
          // agent's ad account so the same path keeps working across accounts.
          const useSystemUserToken = !!process.env.META_ADS_ACCESS_TOKEN;
          // When using the system-user token, ALSO use the env ad account it owns.
          // Otherwise the system user can't reach the OAuth-selected ad account and the
          // image upload (act-scoped) fails with "Application does not have the capability".
          const resolvedAdAccountId = useSystemUserToken
            ? (process.env.META_AD_ACCOUNT_ID || userMetaAds?.adAccountId)
            : userMetaAds?.adAccountId;
          const resolvedPageId = useSystemUserToken
            ? (process.env.FACEBOOK_PAGE_ID || pageId)
            : pageId;

          console.log('[launch-ads] Meta token + asset resolution:', {
            useSystemUserToken,
            resolvedAdAccountId,
            resolvedPageId,
            envAdAccount: process.env.META_AD_ACCOUNT_ID,
            envPageId: process.env.FACEBOOK_PAGE_ID,
            userOAuthAdAccount: userMetaAds?.adAccountId,
            userOAuthPageId: userMetaAds?.pageId,
          });

          const metaResult = await runWithMetaCreds(
            {
              adAccountId: resolvedAdAccountId,
              accessToken: useSystemUserToken ? undefined : userMetaAds?.accessToken,
              pageId: resolvedPageId,
              pageAccessToken: useSystemUserToken ? undefined : userMetaAds?.pageAccessToken,
            },
            async () => {
              // Resolve wizard audience selections → actual Meta Custom Audience IDs.
              const audienceTypes: Array<'visitors' | 'contacts'> =
                (meta.audienceTypes && meta.audienceTypes.length > 0)
                  ? meta.audienceTypes
                  : (meta.audienceType ? [meta.audienceType] : []);

              const { audienceIds, warnings } = await resolveAudienceIdsForLaunch({
                audienceTypes,
                pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID,
              });

              console.log('[launch-ads] Meta audience resolution:', { audienceTypes, audienceIds, warnings });

              if (audienceIds.length === 0) {
                throw new Error(
                  warnings.length > 0
                    ? warnings.join(' ')
                    : 'No Meta Custom Audiences could be resolved for this campaign. Please upload contacts to Meta or ensure your Pixel is firing.'
                );
              }

              return createFullMetaCampaign({
                name: campaignName,
                pageId: resolvedPageId,
                landingPageUrl: pageUrl,
                dailyBudget: meta.budget || 8,
                imageUrl: meta.imageUrl || undefined,
                headline: meta.headline || pageName || 'Learn More',
                primaryText: meta.primaryText || '',
                placements: meta.placements || ['facebook_feed', 'instagram_feed'],
                callToAction: 'LEARN_MORE',
                customAudienceIds: audienceIds,
                startTime: meta.schedule?.startDate || undefined,
                endTime: meta.schedule?.endDate || undefined,
              });
            }
          );

          // Save config to campaign
          campaign.metaAdsConfig = {
            campaignId: metaResult.campaignId,
            adSetId: metaResult.adSetId,
            adId: metaResult.adId,
            landingPageUrl: pageUrl,
            budget: meta.budget,
            objective: 'OUTCOME_TRAFFIC',
            geoTargeting: { type: 'radius' as const },
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
            userId,
            platform: 'meta',
            externalCampaignId: metaResult.campaignId,
            externalAdSetId: metaResult.adSetId,
            externalAdId: metaResult.adId,
            dailyBudget: meta.budget || 0,
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
      credits: {
        estimatedDaily: creditsEstimatedDaily,
        estimatedMonthly: creditsEstimatedMonthly,
        dailyBudget: totalDailyBudget,
        note: 'Campaigns launch PAUSED. Credits will be debited daily once campaigns are enabled.',
      },
    });
  } catch (error: any) {
    console.error('[launch-ads] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to launch campaigns' },
      { status: 500 }
    );
  }
}
