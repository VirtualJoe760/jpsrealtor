// src/app/api/agent/ad-runs/route.ts
//
// GET — global, agent-scoped rollup of every ad run (AdCampaignRecord) across
//       all of the current user's parent campaigns. No external Meta/Google
//       calls; pure DB. Used by the agent dashboard's "what's running right
//       now across everything" view.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import AdCampaignRecord from '@/models/AdCampaignRecord';

type Platform = 'meta' | 'google' | 'youtube';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platformParam = searchParams.get('platform');
    const statusParam = searchParams.get('status');
    const parentCampaignIdParam = searchParams.get('parentCampaignId');

    await dbConnect();

    let userId: Types.ObjectId;
    try {
      userId = new Types.ObjectId(String(session.user.id));
    } catch {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    // Build the AdCampaignRecord query.
    const query: Record<string, any> = { userId };

    if (platformParam) {
      const p = platformParam.toLowerCase();
      if (p !== 'meta' && p !== 'google' && p !== 'youtube') {
        return NextResponse.json({ error: 'Invalid platform filter' }, { status: 400 });
      }
      query.platform = p;
    }

    // Case-insensitive status match: anchored regex so "Active" matches "active"
    // without partial substring hits ("paused" must not match "pending_review").
    if (statusParam) {
      query.status = { $regex: `^${escapeRegex(statusParam)}$`, $options: 'i' };
    }

    if (parentCampaignIdParam) {
      if (!Types.ObjectId.isValid(parentCampaignIdParam)) {
        return NextResponse.json({ error: 'Invalid parentCampaignId' }, { status: 400 });
      }
      query.campaignId = new Types.ObjectId(parentCampaignIdParam);
    }

    const records = await AdCampaignRecord.find(query)
      .sort({ snapshotDate: -1 })
      .lean();

    // Parallel parent-name lookup.
    const campaignIds = Array.from(
      new Set(records.map((r: any) => String(r.campaignId)))
    ).map((id) => new Types.ObjectId(id));

    const parents = campaignIds.length
      ? await Campaign.find({ _id: { $in: campaignIds } }, { name: 1 }).lean()
      : [];

    const nameById = new Map<string, string>();
    for (const p of parents as any[]) {
      nameById.set(String(p._id), p.name || '');
    }

    const runs = records.map((r: any) => {
      const m = r.metrics || {};
      return {
        id: String(r._id),
        platform: r.platform,
        externalCampaignId: r.externalCampaignId,
        parentCampaignId: String(r.campaignId),
        parentCampaignName: nameById.get(String(r.campaignId)) || '',
        status: r.status,
        dailyBudget: typeof r.dailyBudget === 'number' ? r.dailyBudget : 0,
        metrics: {
          impressions: m.impressions || 0,
          clicks: m.clicks || 0,
          spend: m.spend || 0,
          ctr: m.ctr || 0,
          cpc: m.cpc || 0,
          conversions: m.conversions || 0,
        },
        snapshotDate: r.snapshotDate,
      };
    });

    // Summary rollup.
    let totalDailyBudget = 0;
    let activeCount = 0;
    const byPlatform: Record<string, number> = {};

    for (const run of runs) {
      totalDailyBudget += run.dailyBudget || 0;
      if (typeof run.status === 'string' && run.status.toLowerCase() === 'active') {
        activeCount += 1;
      }
      byPlatform[run.platform] = (byPlatform[run.platform] || 0) + 1;
    }

    return NextResponse.json({
      runs,
      summary: {
        totalDailyBudget,
        activeCount,
        byPlatform,
      },
    });
  } catch (err: any) {
    console.error('[agent/ad-runs GET] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list agent ad runs' },
      { status: 500 }
    );
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
