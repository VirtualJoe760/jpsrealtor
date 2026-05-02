import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import AdCampaignRecord from '@/models/AdCampaignRecord';
import {
  getCampaignInsights,
  getCampaignDetails,
  isMetaAdsConfigured,
} from '@/lib/meta-ads-api';

/**
 * GET /api/campaigns/[id]/ad-metrics
 *
 * Fetches live ad performance metrics from Meta Marketing API (and Google Ads
 * when available). Returns unified metrics + platform status for the Analytics tab.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const campaign = await Campaign.findById(id).lean() as any;
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const platforms: any[] = [];

    // ------- Meta Ads Metrics -------
    if (campaign.metaAdsConfig?.campaignId && isMetaAdsConfigured()) {
      try {
        const [details, insights] = await Promise.all([
          getCampaignDetails(campaign.metaAdsConfig.campaignId),
          getCampaignInsights(campaign.metaAdsConfig.campaignId),
        ]);

        const dailyBudget = details.dailyBudget
          ? parseFloat(details.dailyBudget) / 100 // Meta returns cents
          : campaign.metaAdsConfig.budget || 0;

        const startDate = details.startTime || details.createdTime;
        const daysRunning = startDate
          ? Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000))
          : 0;

        platforms.push({
          platform: 'meta',
          externalCampaignId: campaign.metaAdsConfig.campaignId,
          adSetId: campaign.metaAdsConfig.adSetId,
          adId: campaign.metaAdsConfig.adId,
          status: details.effectiveStatus || details.status || 'UNKNOWN',
          name: details.name,
          dailyBudget,
          startDate,
          daysRunning,
          metrics: insights
            ? {
                impressions: insights.impressions,
                clicks: insights.clicks,
                spend: insights.spend,
                ctr: insights.ctr,
                cpc: insights.cpc,
                conversions: insights.conversions,
                reach: insights.reach,
                frequency: insights.frequency,
              }
            : {
                impressions: 0,
                clicks: 0,
                spend: 0,
                ctr: 0,
                cpc: 0,
                conversions: 0,
                reach: 0,
                frequency: 0,
              },
          // Ad creative info for preview
          creative: {
            headline: campaign.metaAdsConfig.headline,
            primaryText: campaign.metaAdsConfig.primaryText,
            imageUrl: campaign.metaAdsConfig.imageUrl,
            landingPageUrl: campaign.metaAdsConfig.landingPageUrl,
            placements: campaign.metaAdsConfig.placements,
          },
          managerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.META_AD_ACCOUNT_ID?.replace('act_', '')}&campaign_ids=${campaign.metaAdsConfig.campaignId}`,
        });
      } catch (err: any) {
        console.error('[ad-metrics] Meta API error:', err.message);
        // Return what we have from the DB record
        platforms.push({
          platform: 'meta',
          externalCampaignId: campaign.metaAdsConfig.campaignId,
          status: 'ERROR',
          error: err.message,
          creative: {
            headline: campaign.metaAdsConfig.headline,
            primaryText: campaign.metaAdsConfig.primaryText,
            imageUrl: campaign.metaAdsConfig.imageUrl,
            landingPageUrl: campaign.metaAdsConfig.landingPageUrl,
            placements: campaign.metaAdsConfig.placements,
          },
        });
      }
    }

    // ------- Google Ads Metrics -------
    if (campaign.googleAdsConfig?.campaignId) {
      // Google Ads API integration is read-only for now — pull from AdCampaignRecord
      const latestRecord = await AdCampaignRecord.findOne({
        campaignId: campaign._id,
        platform: 'google',
      })
        .sort({ snapshotDate: -1 })
        .lean() as any;

      platforms.push({
        platform: 'google',
        externalCampaignId: campaign.googleAdsConfig.campaignId,
        adGroupId: campaign.googleAdsConfig.adGroupId,
        status: latestRecord?.status || 'active',
        dailyBudget: campaign.googleAdsConfig.budget || 0,
        metrics: latestRecord?.metrics || {
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          conversions: 0,
        },
        creative: {
          headlines: campaign.googleAdsConfig.headlines,
          descriptions: campaign.googleAdsConfig.descriptions,
          landingPageUrl: campaign.googleAdsConfig.landingPageUrl,
        },
        managerUrl: `https://ads.google.com/aw/campaigns`,
      });
    }

    return NextResponse.json({
      campaignId: id,
      platforms,
      totalDailyBudget: platforms.reduce((sum, p) => sum + (p.dailyBudget || 0), 0),
      totalSpend: platforms.reduce((sum, p) => sum + (p.metrics?.spend || 0), 0),
    });
  } catch (error: any) {
    console.error('[ad-metrics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad metrics' },
      { status: 500 }
    );
  }
}
