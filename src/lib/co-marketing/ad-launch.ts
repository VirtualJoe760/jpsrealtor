// src/lib/co-marketing/ad-launch.ts
//
// Shared ad-launch execution, extracted verbatim from the launch-ads route so
// that BOTH a direct launch and a co-marketing funded launch run the exact same
// path. Runs on the agent's own ad account (multi-tenant Phase 1) and records an
// AdCampaignRecord per platform (with optional co-marketing attribution).
//
// Mutates the passed campaign doc's *Config + activeStrategies; the CALLER saves
// the campaign. Never throws — per-platform errors are captured in the result.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import AdCampaignRecord from "@/models/AdCampaignRecord";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignFunding from "@/models/CampaignFunding";
import { createFullSearchCampaign, isGoogleAdsConfigured, runWithGoogleCreds } from "@/lib/google-ads-api";
import {
  createFullMetaCampaign,
  isMetaAdsConfigured,
  resolveAudienceIdsForLaunch,
  runWithMetaCreds,
} from "@/lib/meta-ads-api";

export interface AdLaunchParams {
  campaign: any;                 // Campaign mongoose doc (mutated, NOT saved here)
  userId: string;                // lead agent — whose AdCampaignRecord this is
  userGoogleAds?: any;
  userMetaAds?: any;
  google?: any;
  meta?: any;
  pageUrl?: string;
  pageName?: string;
  // Co-marketing attribution (optional)
  fundingId?: mongoose.Types.ObjectId | string;
  contributors?: Array<{ userId: any; shareCredits: number }>;
}

export interface AdLaunchResults {
  google?: { success: boolean; campaignResourceName?: string; error?: string };
  meta?: { success: boolean; campaignId?: string; error?: string };
}

export async function executeAdLaunch(p: AdLaunchParams): Promise<AdLaunchResults> {
  const { campaign, userId, userGoogleAds, userMetaAds, google, meta, pageUrl, pageName } = p;
  const attribution = p.fundingId
    ? { fundingId: typeof p.fundingId === "string" ? new mongoose.Types.ObjectId(p.fundingId) : p.fundingId, contributors: p.contributors }
    : {};
  const results: AdLaunchResults = {};

  // ------- Google Ads -------
  if (google) {
    const agentConnectedGoogle = !!(userGoogleAds && (userGoogleAds.refreshToken || userGoogleAds.status === "connected"));
    const googleConfigured = isGoogleAdsConfigured() || (userGoogleAds?.refreshToken && userGoogleAds?.customerId);
    if (agentConnectedGoogle && !userGoogleAds?.customerId) {
      results.google = { success: false, error: "Select your Google Ads account in Settings → Integrations before launching." };
    } else if (!googleConfigured) {
      results.google = { success: false, error: "Google Ads not connected. Go to Settings → Ad Accounts to connect your Google Ads account." };
    } else {
      try {
        const campaignName = `${pageName || "Campaign"} — PPC — ${new Date().toLocaleDateString()}`;
        const googleResult = await runWithGoogleCreds(
          { customerId: userGoogleAds?.customerId, refreshToken: userGoogleAds?.refreshToken },
          () => createFullSearchCampaign({
            name: campaignName,
            dailyBudget: google.budget || 10,
            landingPageUrl: pageUrl as string,
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

        campaign.googleAdsConfig = {
          campaignId: googleResult.campaignResourceName,
          adGroupId: googleResult.adGroupResourceName,
          landingPageUrl: pageUrl,
          budget: google.budget,
          bidStrategy: "maximize_clicks",
          adType: "search",
          headlines: google.headlines,
          descriptions: google.descriptions,
          geoTargeting: google.geoTargeting,
        };
        campaign.activeStrategies.googleAds = true;

        await AdCampaignRecord.create({
          campaignId: campaign._id,
          userId,
          platform: "google",
          externalCampaignId: googleResult.campaignResourceName,
          externalAdGroupId: googleResult.adGroupResourceName,
          dailyBudget: google.budget || 0,
          status: "active",
          snapshotDate: new Date(),
          ...attribution,
        });

        results.google = { success: true, campaignResourceName: googleResult.campaignResourceName };
      } catch (err: any) {
        console.error("[ad-launch] Google Ads error:", err);
        results.google = { success: false, error: err.message };
      }
    }
  }

  // ------- Meta Ads -------
  if (meta) {
    const agentConnectedMeta = !!userMetaAds?.accessToken;
    const metaConfigured = isMetaAdsConfigured() || (userMetaAds?.accessToken && userMetaAds?.adAccountId);
    if (agentConnectedMeta && !userMetaAds?.adAccountId) {
      results.meta = { success: false, error: "Select your Meta ad account in Settings → Integrations before launching." };
    } else if (!metaConfigured) {
      results.meta = { success: false, error: "Meta Ads not connected. Go to Settings → Ad Accounts to connect your Meta Ads account." };
    } else {
      try {
        const campaignName = `${pageName || "Campaign"} — Retargeting — ${new Date().toLocaleDateString()}`;
        const pageId = userMetaAds?.pageId || process.env.FACEBOOK_PAGE_ID || "";
        if (!pageId) {
          throw new Error("No Facebook Page connected. Go to Settings → Integrations and connect your Meta Business account.");
        }

        const resolvedAdAccountId = userMetaAds?.adAccountId || process.env.META_AD_ACCOUNT_ID || "";
        const resolvedPageId = userMetaAds?.pageId || process.env.FACEBOOK_PAGE_ID || pageId;
        const isPlatformOwnAccount = !!process.env.META_AD_ACCOUNT_ID && resolvedAdAccountId === process.env.META_AD_ACCOUNT_ID;
        const useSystemUserToken = isPlatformOwnAccount && !!process.env.META_ADS_ACCESS_TOKEN;

        if (!resolvedAdAccountId) {
          throw new Error("No Meta ad account connected. Go to Settings → Integrations and connect your Meta Business account.");
        }
        if (!useSystemUserToken && !userMetaAds?.accessToken) {
          throw new Error("Meta account connected but no access token found. Reconnect your Meta Business account in Settings → Integrations.");
        }

        const metaResult = await runWithMetaCreds(
          {
            adAccountId: resolvedAdAccountId,
            accessToken: useSystemUserToken ? undefined : userMetaAds?.accessToken,
            pageId: resolvedPageId,
            pageAccessToken: useSystemUserToken ? undefined : userMetaAds?.pageAccessToken,
          },
          async () => {
            const audienceTypes: Array<"visitors" | "contacts"> =
              meta.audienceTypes && meta.audienceTypes.length > 0
                ? meta.audienceTypes
                : meta.audienceType ? [meta.audienceType] : [];
            const { audienceIds, warnings } = await resolveAudienceIdsForLaunch({
              audienceTypes,
              pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID,
            });
            if (audienceIds.length === 0) {
              throw new Error(
                warnings.length > 0
                  ? warnings.join(" ")
                  : "No Meta Custom Audiences could be resolved for this campaign. Please upload contacts to Meta or ensure your Pixel is firing."
              );
            }
            return createFullMetaCampaign({
              name: campaignName,
              pageId: resolvedPageId,
              landingPageUrl: pageUrl as string,
              dailyBudget: meta.budget || 8,
              imageUrl: meta.imageUrl || undefined,
              headline: meta.headline || pageName || "Learn More",
              primaryText: meta.primaryText || "",
              placements: meta.placements || ["facebook_feed", "instagram_feed"],
              callToAction: "LEARN_MORE",
              customAudienceIds: audienceIds,
              startTime: meta.schedule?.startDate || undefined,
              endTime: meta.schedule?.endDate || undefined,
            });
          }
        );

        campaign.metaAdsConfig = {
          campaignId: metaResult.campaignId,
          adSetId: metaResult.adSetId,
          adId: metaResult.adId,
          landingPageUrl: pageUrl,
          budget: meta.budget,
          objective: "OUTCOME_TRAFFIC",
          geoTargeting: { type: "radius" as const },
          headline: meta.headline,
          primaryText: meta.primaryText,
          imageUrl: meta.imageUrl,
          placements: meta.placements,
          callToAction: "LEARN_MORE",
        };
        campaign.activeStrategies.metaAds = true;

        await AdCampaignRecord.create({
          campaignId: campaign._id,
          userId,
          platform: "meta",
          externalCampaignId: metaResult.campaignId,
          externalAdSetId: metaResult.adSetId,
          externalAdId: metaResult.adId,
          dailyBudget: meta.budget || 0,
          status: "active",
          snapshotDate: new Date(),
          ...attribution,
        });

        results.meta = { success: true, campaignId: metaResult.campaignId };
      } catch (err: any) {
        console.error("[ad-launch] Meta Ads error:", err);
        results.meta = { success: false, error: err.message };
      }
    }
  }

  return results;
}

/**
 * Launch the ads for a fully-funded co-marketing campaign: replays the stored
 * launchPayload on the LEAD AGENT's ad account, attributing the AdCampaignRecord
 * to all contributors. Called by the approval route when the last required party
 * funds. Best-effort — returns null if not ready / no payload.
 */
export async function launchFundedCampaign(fundingId: string): Promise<AdLaunchResults | null> {
  await dbConnect();
  const funding = await CampaignFunding.findById(fundingId);
  if (!funding || funding.status !== "funded" || !funding.launchPayload) return null;

  const campaign = await Campaign.findById(funding.campaignId);
  if (!campaign) return null;
  const agent = await User.findById(funding.agentId, { adAccounts: 1 }).lean();
  const lp = funding.launchPayload as any;

  const results = await executeAdLaunch({
    campaign,
    userId: funding.agentId.toString(),
    userGoogleAds: (agent as any)?.adAccounts?.google,
    userMetaAds: (agent as any)?.adAccounts?.meta,
    google: lp.google,
    meta: lp.meta,
    pageUrl: lp.pageUrl,
    pageName: lp.pageName,
    fundingId: funding._id,
    contributors: funding.participants.map((p) => ({ userId: p.userId, shareCredits: p.shareCredits })),
  });

  campaign.status = "active";
  await campaign.save();
  return results;
}
