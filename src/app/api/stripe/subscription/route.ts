// src/app/api/stripe/subscription/route.ts
// GET — Return current subscription status, tier, features, and usage
// Syncs from Stripe if DB is stale (e.g., webhook didn't fire locally)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { TIER_DETAILS, tierFromPriceId } from "@/config/stripe-prices";
import Stripe from "stripe";
import PointsLedger, { POINTS_TIERS } from "@/models/PointsLedger";
import type { PointsTier } from "@/models/PointsLedger";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

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
    let sub = await AgentSubscription.findOne({
      agentId: user._id,
    }).sort({ status: 1, updatedAt: -1 });

    // If no subscription in DB but user has a Stripe customer ID, check Stripe directly
    // This handles the case where webhook didn't fire (e.g., local dev without Stripe CLI)
    if (!sub && user.stripeCustomerId) {
      try {
        const stripe = getStripe();
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const stripeSub = subscriptions.data[0];
          const priceId = stripeSub.items.data[0]?.price?.id;
          const mapped = priceId ? tierFromPriceId(priceId) : null;

          if (mapped) {
            const periodEnd = (stripeSub as any).current_period_end
              ? new Date((stripeSub as any).current_period_end * 1000)
              : new Date();
            const periodStart = (stripeSub as any).current_period_start
              ? new Date((stripeSub as any).current_period_start * 1000)
              : new Date();

            // Create the AgentSubscription record
            sub = await AgentSubscription.findOneAndUpdate(
              { agentId: user._id },
              {
                $set: {
                  tier: mapped.tier,
                  status: stripeSub.cancel_at_period_end ? "cancelled" : "active",
                  billingInterval: mapped.interval,
                  stripeCustomerId: user.stripeCustomerId,
                  stripeSubscriptionId: stripeSub.id,
                  stripePriceId: priceId,
                  currentPeriodStart: periodStart,
                  currentPeriodEnd: periodEnd,
                  isTrialing: stripeSub.status === "trialing",
                },
                $setOnInsert: {
                  startDate: new Date((stripeSub as any).start_date * 1000),
                },
              },
              { upsert: true, new: true }
            );

            // Also credit points if not already done
            const pointsTier = mapped.tier as string as PointsTier;
            const tierConfig = POINTS_TIERS[pointsTier];
            if (tierConfig && tierConfig.monthlyPoints > 0) {
              let ledger = await PointsLedger.findOne({ userId: user._id });
              if (!ledger) {
                ledger = new PointsLedger({
                  userId: user._id,
                  balance: 0,
                  totalEarned: 0,
                  totalSpent: 0,
                  tier: pointsTier,
                  stripeCustomerId: user.stripeCustomerId,
                  transactions: [],
                });
                ledger.creditPoints(
                  tierConfig.monthlyPoints,
                  "subscription_credit",
                  `${tierConfig.name} plan — ${tierConfig.monthlyPoints.toLocaleString()} credits`,
                  { adSpendValue: tierConfig.monthlyPoints * tierConfig.adValuePerPoint }
                );
                ledger.lastSubscriptionCredit = new Date();
                await ledger.save();
                console.log(`[stripe/subscription] Synced from Stripe: ${mapped.tier}, credited ${tierConfig.monthlyPoints} points`);
              }
            }
          }
        }
      } catch (err) {
        console.error("[stripe/subscription] Stripe sync failed:", err);
      }
    }

    if (!sub) {
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
