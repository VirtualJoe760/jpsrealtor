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
  runWithGoogleCreds,
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
      // Multi-tenant safety: an agent who connected Google but hasn't selected a
      // customer account must NOT silently fall back to the platform's env
      // account. Require their customerId before we run anything on their behalf.
      const agentConnectedGoogle = !!(userGoogleAds && (userGoogleAds.refreshToken || userGoogleAds.status === 'connected'));
      const googleConfigured = isGoogleAdsConfigured() || (userGoogleAds?.refreshToken && userGoogleAds?.customerId);
      if (agentConnectedGoogle && !userGoogleAds?.customerId) {
        results.google = {
          success: false,
          error: 'Select your Google Ads account in Settings → Integrations before launching.',
        };
      } else if (!googleConfigured) {
        results.google = {
          success: false,
          error: 'Google Ads not connected. Go to Settings → Ad Accounts to connect your Google Ads account.',
        };
      } else {
        try {
          const campaignName = `${pageName || 'Campaign'} — PPC — ${new Date().toLocaleDateString()}`;

          // Multi-tenant: run on the AGENT's Google Ads account. Under the MCC
          // model the platform's manager account (GOOGLE_ADS_LOGIN_CUSTOMER_ID)
          // + platform developer token operate on the agent's customerId. The
          // refresh token falls back to the platform's when the agent doesn't
          // have their own. customerId = undefined → getConfig() uses env
          // (single-tenant / platform-owner path) so Joseph's launches are unchanged.
          console.log('[launch-ads] Google account resolution:', {
            agentCustomerId: userGoogleAds?.customerId,
            hasAgentRefreshToken: !!userGoogleAds?.refreshToken,
            envLoginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
          });

          const googleResult = await runWithGoogleCreds(
            {
              customerId: userGoogleAds?.customerId,
              refreshToken: userGoogleAds?.refreshToken,
              // developerToken + loginCustomerId intentionally omitted → platform
              // (ChatRealty MCC) env values are used for agents under management.
            },
            () => createFullSearchCampaign({
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
            })
          );

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
      // Multi-tenant safety: an agent who connected Meta but has no resolved ad
      // account must NOT silently fall back to the platform's env account.
      const agentConnectedMeta = !!userMetaAds?.accessToken;
      const metaConfigured = isMetaAdsConfigured() || (userMetaAds?.accessToken && userMetaAds?.adAccountId);
      if (agentConnectedMeta && !userMetaAds?.adAccountId) {
        results.meta = {
          success: false,
          error: 'Select your Meta ad account in Settings → Integrations before launching.',
        };
      } else if (!metaConfigured) {
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

          // Multi-tenant Meta: run on the AGENT's connected ad account + page,
          // granted via the OAuth "Connect Meta Business" flow in Settings →
          // Integrations. Fall back to the platform's env account only when no
          // agent account is connected (single-tenant dev / platform owner).
          const resolvedAdAccountId = userMetaAds?.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
          const resolvedPageId = userMetaAds?.pageId || process.env.FACEBOOK_PAGE_ID || pageId;

          // The platform's OWN ad account can use the system-user token, which
          // carries full write capability (image upload, ad creative). A real
          // agent's account uses THEIR OAuth token.
          // NOTE: until Meta grants this app Advanced Access on `ads_management`,
          // agent OAuth tokens may hit the "(#3) Application does not have the
          // capability" wall on write ops. Securing that approval is the next step
          // after this lands — see docs/campaigns/README.md.
          const isPlatformOwnAccount =
            !!process.env.META_AD_ACCOUNT_ID &&
            resolvedAdAccountId === process.env.META_AD_ACCOUNT_ID;
          const useSystemUserToken = isPlatformOwnAccount && !!process.env.META_ADS_ACCESS_TOKEN;

          if (!resolvedAdAccountId) {
            throw new Error(
              'No Meta ad account connected. Go to Settings → Integrations and connect your Meta Business account.'
            );
          }
          if (!useSystemUserToken && !userMetaAds?.accessToken) {
            throw new Error(
              'Meta account connected but no access token found. Reconnect your Meta Business account in Settings → Integrations.'
            );
          }

          console.log('[launch-ads] Meta token + asset resolution:', {
            isPlatformOwnAccount,
            useSystemUserToken,
            resolvedAdAccountId,
            resolvedPageId,
            envAdAccount: process.env.META_AD_ACCOUNT_ID,
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
