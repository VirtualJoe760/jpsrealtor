// src/app/api/campaigns/[id]/spend-summary/route.ts
//
// GET — aggregate live ad spend for a parent campaign from AdCampaignRecord.
//
// This is the source of truth for the "Daily Ad Spend" tile on the Strategy tab.
// We deliberately DO NOT read Campaign.metaAdsConfig.budget or googleAdsConfig.budget
// because those linger as stale drafts after the user deletes/archives ad runs.
// AdCampaignRecord goes away when the ad run goes away, so summing here is accurate.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AdCampaignRecord from '@/models/AdCampaignRecord';
import Campaign from '@/models/Campaign';
import mongoose from 'mongoose';

interface PlatformBreakdown {
  meta: number;
  google: number;
  youtube: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid campaign id' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify the campaign exists and belongs to the requesting user before
    // exposing its ad spend (IDOR guard — ad records are queried by campaign id).
    const userId = (session.user as any).id;
    const campaign = await Campaign.findOne({ _id: id, userId }, { _id: 1 }).lean();
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignObjectId = new mongoose.Types.ObjectId(id);

    // Aggregate active ad records for this campaign.
    // Status filter handles legacy inconsistency: some records use 'active', some 'ACTIVE'.
    const rows = await AdCampaignRecord.aggregate([
      {
        $match: {
          campaignId: campaignObjectId,
          status: { $in: ['active', 'ACTIVE'] },
        },
      },
      {
        $group: {
          _id: '$platform',
          dailyBudget: { $sum: { $ifNull: ['$dailyBudget', 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const byPlatform: PlatformBreakdown = { meta: 0, google: 0, youtube: 0 };
    let totalDailyBudget = 0;
    let activeCount = 0;

    for (const row of rows) {
      const platform = row._id as keyof PlatformBreakdown;
      const budget = Number(row.dailyBudget) || 0;
      const count = Number(row.count) || 0;
      if (platform in byPlatform) {
        byPlatform[platform] = budget;
      }
      totalDailyBudget += budget;
      activeCount += count;
    }

    return NextResponse.json({
      success: true,
      totalDailyBudget,
      activeCount,
      byPlatform,
    });
  } catch (error: any) {
    console.error('[spend-summary] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compute spend summary' },
      { status: 500 }
    );
  }
}
