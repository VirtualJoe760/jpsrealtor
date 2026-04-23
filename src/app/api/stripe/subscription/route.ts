// src/app/api/stripe/subscription/route.ts
// GET — Return current subscription status, tier, features, and usage

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { TIER_DETAILS } from "@/config/stripe-prices";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the most relevant subscription (active/trialing first, then most recent)
    const sub = await AgentSubscription.findOne({
      agentId: user._id,
    }).sort({ status: 1, updatedAt: -1 }); // active sorts before cancelled alphabetically

    if (!sub) {
      // No subscription — return free tier defaults
      return NextResponse.json({
        tier: "free",
        status: "active",
        tierDetails: TIER_DETAILS.free,
        features: TIER_DETAILS.free.features,
        billingInterval: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        usage: null,
      });
    }

    return NextResponse.json({
      tier: sub.tier,
      status: sub.status,
      tierDetails: TIER_DETAILS[sub.tier],
      features: sub.features,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAt: sub.cancelAt ?? null,
      cancelAtPeriodEnd: !!sub.cancelAt,
      isTrialing: sub.isTrialing,
      trialEndDate: sub.trialEndDate ?? null,
      usage: sub.usage ?? null,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
    });
  } catch (error: unknown) {
    console.error("[stripe/subscription] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
