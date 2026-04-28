// src/app/api/points/route.ts
// GET: Current points balance and recent transactions
// POST: Spend points on a campaign

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import mongoose from "mongoose";
import User from "@/models/User";
import PointsLedger, { pointsToAdSpend, POINTS_TIERS } from "@/models/PointsLedger";
import type { CampaignChannel, TransactionType } from "@/models/PointsLedger";

export const dynamic = "force-dynamic";

// GET: Fetch points balance + recent transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let ledger = await PointsLedger.findOne({ userId: user._id }).lean();

    // If no ledger exists yet, return defaults
    if (!ledger) {
      return NextResponse.json({
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: "beginner",
        tierConfig: POINTS_TIERS.beginner,
        transactions: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Sort transactions newest first and paginate
    const sortedTransactions = (ledger.transactions || [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    const tierConfig = POINTS_TIERS[ledger.tier] || POINTS_TIERS.beginner;

    return NextResponse.json({
      balance: ledger.balance,
      totalEarned: ledger.totalEarned,
      totalSpent: ledger.totalSpent,
      tier: ledger.tier,
      tierConfig,
      adSpendAvailable: pointsToAdSpend(ledger.balance, ledger.tier),
      transactions: sortedTransactions,
      totalTransactions: (ledger.transactions || []).length,
    });
  } catch (error: any) {
    console.error("Error fetching points:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Spend points on a campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { points, channel, campaignId, description } = body as {
      points: number;
      channel: CampaignChannel;
      campaignId?: string;
      description?: string;
    };

    if (!points || points <= 0) {
      return NextResponse.json({ error: "points must be a positive number" }, { status: 400 });
    }

    const validChannels: CampaignChannel[] = ["google_ads", "meta_ads", "direct_mail", "voicemail_drop"];
    if (!channel || !validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      );
    }

    const ledger = await PointsLedger.findOne({ userId: user._id });
    if (!ledger) {
      return NextResponse.json({ error: "No points account found. Subscribe to a plan first." }, { status: 404 });
    }

    if (ledger.balance < points) {
      return NextResponse.json(
        {
          error: "Insufficient points",
          balance: ledger.balance,
          requested: points,
        },
        { status: 400 }
      );
    }

    const adSpendValue = pointsToAdSpend(points, ledger.tier);
    const channelLabel = channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    ledger.debitPoints(
      points,
      "campaign_spend" as TransactionType,
      description || `${channelLabel} campaign spend`,
      {
        channel,
        campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : undefined,
        adSpendValue,
      }
    );

    await ledger.save();

    return NextResponse.json({
      success: true,
      pointsSpent: points,
      adSpendValue,
      newBalance: ledger.balance,
    });
  } catch (error: any) {
    if (error.message === "Insufficient points balance") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error spending points:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
