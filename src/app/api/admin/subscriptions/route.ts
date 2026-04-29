// src/app/api/admin/subscriptions/route.ts
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import PointsLedger from "@/models/PointsLedger";

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Get all subscriptions with populated user info
    const subscriptions = await AgentSubscription.find({})
      .populate("agentId", "name email image")
      .sort({ createdAt: -1 })
      .lean();

    // Get all point ledgers for balance info
    const ledgers = await PointsLedger.find({})
      .select("userId balance totalEarned totalSpent")
      .lean();

    const ledgerMap = new Map(
      ledgers.map((l: any) => [l.userId.toString(), l])
    );

    // Attach ledger info to subscriptions
    const subscriptionsWithCredits = subscriptions.map((sub: any) => ({
      ...sub,
      creditsBalance: ledgerMap.get(sub.agentId?._id?.toString())?.balance ?? 0,
      totalEarned: ledgerMap.get(sub.agentId?._id?.toString())?.totalEarned ?? 0,
      totalSpent: ledgerMap.get(sub.agentId?._id?.toString())?.totalSpent ?? 0,
    }));

    // Revenue breakdown by tier
    const activeSubscriptions = subscriptions.filter(
      (s: any) => s.status === "active" || s.status === "trialing"
    );

    const revenueByTier: Record<string, { count: number; mrr: number }> = {};
    for (const sub of activeSubscriptions) {
      const tier = (sub as any).tier || "free";
      if (!revenueByTier[tier]) revenueByTier[tier] = { count: 0, mrr: 0 };
      revenueByTier[tier].count += 1;
      revenueByTier[tier].mrr += (sub as any).monthlyPrice || 0;
    }

    // MRR calculation
    const mrr = activeSubscriptions.reduce(
      (sum: number, s: any) => sum + (s.monthlyPrice || 0),
      0
    );

    // Credits aggregation
    const totalCreditsOutstanding = ledgers.reduce(
      (sum: number, l: any) => sum + (l.balance || 0),
      0
    );
    const totalCreditsSpent = ledgers.reduce(
      (sum: number, l: any) => sum + (l.totalSpent || 0),
      0
    );

    // Cancellation reasons from User model
    const cancellationReasons = await User.aggregate([
      { $match: { cancellationReason: { $exists: true, $nin: [null, ""] } } },
      { $group: { _id: "$cancellationReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({
      subscriptions: subscriptionsWithCredits,
      stats: {
        mrr,
        totalSubscribers: activeSubscriptions.length,
        totalCreditsOutstanding,
        totalCreditsSpent,
        revenueByTier,
      },
      cancellationReasons: cancellationReasons.map((r: any) => ({
        reason: r._id,
        count: r.count,
      })),
    });
  } catch (error: any) {
    console.error("[Admin Subscriptions GET]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
