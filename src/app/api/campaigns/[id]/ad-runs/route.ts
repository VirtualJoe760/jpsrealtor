// src/app/api/campaigns/[id]/ad-runs/route.ts
//
// GET    — list ad campaigns linked to this parent (Meta API live + AdCampaignRecord DB).
//          Catches orphans: Meta campaigns from failed launches that never persisted to DB.
// DELETE — delete a specific external campaign on Meta/Google AND any matching DB record.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import AdCampaignRecord from '@/models/AdCampaignRecord';
import User from '@/models/User';
import { runWithMetaCreds } from '@/lib/meta-ads-api';
import { listCampaigns as listGoogleCampaigns, isGoogleAdsConfigured } from '@/lib/google-ads-api';

/** GET — list ad campaigns matching this parent campaign. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const campaign = await Campaign.findOne({ _id: id, userId: (session.user as any).id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const user = await User.findOne({ email: session.user.email }, { adAccounts: 1 }).lean();
    const userMetaAds = (user as any)?.adAccounts?.meta;
    const userGoogleAds = (user as any)?.adAccounts?.google;

    // Name prefix we use to match Meta campaigns to this parent. The launch route
    // generates names like `${pageName} — Retargeting — ${date}`, so anything that
    // starts with the neighborhood/pageName is one of ours.
    const namePrefix = (campaign.neighborhood || (campaign as any).pageName || '').trim();

    // Pull DB records first — these are the "known" launches.
    const dbRecords = await AdCampaignRecord.find({ campaignId: id }).lean();
    const knownExternalIds = new Set(dbRecords.map((r: any) => r.externalCampaignId));

    // Live Meta lookup — uses the platform system-user token so we can see ALL
    // campaigns in the connected ad account, including orphans.
    const adAccountId = userMetaAds?.adAccountId || process.env.META_AD_ACCOUNT_ID;
    let metaCampaigns: any[] = [];
    let metaError: string | null = null;

    if (adAccountId) {
      try {
        metaCampaigns = await runWithMetaCreds(
          { adAccountId, accessToken: undefined },
          async () => {
            const config = { accessToken: process.env.META_ADS_ACCESS_TOKEN || '' };
            const url = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,created_time,effective_status&limit=200&access_token=${config.accessToken}`;
            const res = await fetch(url);
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Meta list campaigns ${res.status}: ${errBody}`);
            }
            const j = await res.json();
            return j.data || [];
          }
        );
      } catch (err: any) {
        console.error('[ad-runs GET] Meta list error:', err.message);
        metaError = err.message;
      }
    }

    // Filter Meta campaigns by name prefix (this parent campaign's neighborhood/page)
    const matchedMeta = namePrefix
      ? metaCampaigns.filter((c: any) =>
          (c.name || '').toLowerCase().startsWith(namePrefix.toLowerCase())
        )
      : metaCampaigns;

    const metaRuns = matchedMeta.map((c: any) => ({
      platform: 'meta' as const,
      externalCampaignId: c.id,
      name: c.name,
      status: c.effective_status || c.status,
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
      createdTime: c.created_time,
      isOrphan: !knownExternalIds.has(c.id),
      adAccountId,
      adsManagerUrl: `https://www.facebook.com/adsmanager/manage/campaigns?act=${(adAccountId || '').replace('act_', '')}&selected_campaign_ids=${c.id}`,
    }));

    // ---- Google Ads list (parallel to Meta) ----
    const googleConfigured =
      isGoogleAdsConfigured() ||
      (userGoogleAds?.refreshToken && userGoogleAds?.customerId);
    let googleCampaigns: any[] = [];
    let googleError: string | null = null;
    let googleCustomerId: string | undefined;

    if (googleConfigured) {
      try {
        googleCampaigns = await listGoogleCampaigns();
        googleCustomerId = (
          userGoogleAds?.customerId ||
          process.env.GOOGLE_ADS_CUSTOMER_ID ||
          ''
        ).replace(/-/g, '');
      } catch (err: any) {
        console.error('[ad-runs GET] Google list error:', err.message);
        googleError = err.message;
      }
    }

    const matchedGoogle = namePrefix
      ? googleCampaigns.filter((c: any) =>
          (c.name || '').toLowerCase().startsWith(namePrefix.toLowerCase())
        )
      : googleCampaigns;

    const googleRuns = matchedGoogle.map((c: any) => {
      // Track orphans against EITHER the resourceName or numeric id — launch
      // route stores resourceName as externalCampaignId.
      const isKnown =
        knownExternalIds.has(c.resourceName) || knownExternalIds.has(c.id);
      return {
        platform: 'google' as const,
        externalCampaignId: c.resourceName || c.id,
        name: c.name,
        status: c.status,
        dailyBudget:
          typeof c.dailyBudgetMicros === 'number'
            ? c.dailyBudgetMicros / 1_000_000
            : null,
        lifetimeBudget: null,
        createdTime: c.startDate || null,
        isOrphan: !isKnown,
        adAccountId: googleCustomerId,
        adsManagerUrl: googleCustomerId
          ? `https://ads.google.com/aw/campaigns?ocid=&__c=&authuser=0&__u=&euid=&customerId=${googleCustomerId}`
          : 'https://ads.google.com/aw/campaigns',
      };
    });

    const runs = [...metaRuns, ...googleRuns];

    return NextResponse.json({
      runs,
      meta: { error: metaError, listedCount: metaCampaigns.length, matchedCount: matchedMeta.length },
      google: { error: googleError, listedCount: googleCampaigns.length, matchedCount: matchedGoogle.length },
      namePrefix,
    });
  } catch (err: any) {
    console.error('[ad-runs GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list ad runs' }, { status: 500 });
  }
}

/**
 * PATCH — update a campaign on Meta.
 *   ?platform=meta&externalId=XXX
 *   body: { status?: 'ACTIVE'|'PAUSED', endTime?: ISO_string }
 *
 * status — POSTs to /{campaignId} with the new status. Cascades to ad sets/ads.
 * endTime — Meta stores end times on the AD SET, not the Campaign. We list the
 *           ad sets under the campaign and update end_time on each.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const externalId = searchParams.get('externalId');
    const body = await request.json();

    if (platform !== 'meta') {
      return NextResponse.json({ error: 'Only meta supported for now' }, { status: 400 });
    }
    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const token = process.env.META_ADS_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const results: Record<string, any> = {};

    // ----- Status (pause/resume) on the campaign object -----
    if (body.status) {
      if (body.status !== 'ACTIVE' && body.status !== 'PAUSED') {
        return NextResponse.json({ error: 'status must be ACTIVE or PAUSED' }, { status: 400 });
      }
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${externalId}?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: body.status }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        return NextResponse.json({ error: `Meta status update failed: ${errBody}` }, { status: res.status });
      }
      results.status = body.status;
    }

    // ----- End time — update each ad set under this campaign -----
    if (body.endTime) {
      // List ad sets under this campaign
      const listRes = await fetch(
        `https://graph.facebook.com/v21.0/${externalId}/adsets?fields=id,name,end_time,start_time&access_token=${token}`
      );
      if (!listRes.ok) {
        const errBody = await listRes.text();
        return NextResponse.json({ error: `Failed to list ad sets: ${errBody}` }, { status: listRes.status });
      }
      const listJson = await listRes.json();
      const adSets: any[] = listJson.data || [];

      const adSetResults: any[] = [];
      for (const adSet of adSets) {
        const updateRes = await fetch(
          `https://graph.facebook.com/v21.0/${adSet.id}?access_token=${token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ end_time: body.endTime }),
          }
        );
        adSetResults.push({
          adSetId: adSet.id,
          name: adSet.name,
          ok: updateRes.ok,
          error: updateRes.ok ? undefined : await updateRes.text(),
        });
      }
      results.adSetUpdates = adSetResults;

      if (adSetResults.every((r) => !r.ok)) {
        return NextResponse.json(
          { error: 'All ad set end_time updates failed', details: adSetResults },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[ad-runs PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 });
  }
}

/** DELETE — remove a specific ad campaign from Meta + clean up DB references. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const externalId = searchParams.get('externalId');

    if (platform !== 'meta' && platform !== 'google') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    if (!externalId) {
      return NextResponse.json({ error: 'externalId is required' }, { status: 400 });
    }

    await dbConnect();
    const campaign = await Campaign.findOne({ _id: id, userId: (session.user as any).id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (platform === 'meta') {
      const token = process.env.META_ADS_ACCESS_TOKEN;
      if (!token) {
        return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN not configured' }, { status: 500 });
      }
      // Meta DELETE on the campaign cascades to ad sets, ads, and creatives.
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${externalId}?access_token=${token}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const errBody = await res.text();
        return NextResponse.json({ error: `Meta delete failed: ${errBody}` }, { status: res.status });
      }
    }
    // TODO: Google delete path when we wire google ad-runs cleanup.

    // Clean up DB references
    await AdCampaignRecord.deleteOne({ campaignId: id, externalCampaignId: externalId });

    // If this was the campaign tracked on Campaign.metaAdsConfig, clear it.
    // Using updateOne with $unset because assigning `undefined` on a Mongoose
    // subdocument doesn't reliably persist — the field stays in the document.
    let clearedActiveLink = false;
    if (platform === 'meta' && (campaign as any).metaAdsConfig?.campaignId === externalId) {
      await Campaign.updateOne(
        { _id: id },
        {
          $unset: { metaAdsConfig: '' },
          $set: { 'activeStrategies.metaAds': false },
        }
      );
      clearedActiveLink = true;
    }

    return NextResponse.json({ success: true, clearedActiveLink });
  } catch (err: any) {
    console.error('[ad-runs DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}
