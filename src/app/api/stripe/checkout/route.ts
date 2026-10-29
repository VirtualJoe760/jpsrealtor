// src/app/api/stripe/checkout/route.ts
// POST — Create a Stripe Checkout session for agent subscription

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import {
  createOrGetStripeCustomer,
  createCheckoutSession,
} from "@/lib/stripe-subscription";
import type { SubscriptionTier, BillingInterval } from "@/models/AgentSubscription";
import PointsLedger, { POINTS_TIERS } from "@/models/PointsLedger";
import type { PointsTier } from "@/models/PointsLedger";
import { sendSubscriptionEmail } from "@/lib/email-resend";
import { SELLABLE_TIERS, SELLABLE_INTERVALS } from "@/config/stripe-prices";

export async function POST(request: NextRequest) {
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

    // Agents, or applicants paying to become one: since 2026-10-28 paying for
    // Basic IS how an applicant becomes an agent (the webhook grants the role
    // — src/lib/agent-onboarding.ts).
    const isApplicant = (user as any).agentApplication?.phase === "awaiting_payment";
    if (!user.roles?.includes("realEstateAgent") && !isApplicant) {
      return NextResponse.json(
        { error: "Apply to become an agent first." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tier, billingInterval, successUrl, cancelUrl } = body as {
      tier: string;
      billingInterval: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    // Validate tier — only plans currently for sale (Basic, monthly). The other
    // tiers have no LIVE Stripe price, so letting them through would send the
    // buyer to a broken checkout.
    if (!tier || !(SELLABLE_TIERS as string[]).includes(tier)) {
      return NextResponse.json(
        { error: "That plan isn't available. ChatRealty currently offers the Basic plan." },
        { status: 400 }
      );
    }

    // Validate billing interval — monthly only for now (no annual price exists).
    const interval: BillingInterval = SELLABLE_INTERVALS.includes(billingInterval as BillingInterval)
      ? (billingInterval as BillingInterval)
      : "monthly";

    // Check for existing active subscription
    const existingSub = await AgentSubscription.findOne({
      agentId: user._id,
      status: { $in: ["active", "trialing"] },
    });

    if (existingSub?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          error: "You already have an active subscription. Use the billing portal to manage it.",
        },
        { status: 409 }
      );
    }

    // Admin/direct partner: Top Agent tier free, no Stripe checkout needed
    const isAdmin = user.roles?.includes("admin");
    if (isAdmin) {
      const adminTier: Exclude<SubscriptionTier, "free"> = "topagent";
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 10); // 10-year "subscription"

      await AgentSubscription.findOneAndUpdate(
        { agentId: user._id },
        {
          $set: {
            tier: adminTier,
            status: "active",
            billingInterval: "monthly",
            startDate: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            isTrialing: false,
            monthlyPrice: 0,
          },
          $setOnInsert: { agentId: user._id },
        },
        { upsert: true, new: true }
      );

      // Credit points
      const tierConfig = POINTS_TIERS.topagent;
      let ledger = await PointsLedger.findOne({ userId: user._id });
      if (!ledger) {
        ledger = new PointsLedger({
          userId: user._id,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          tier: "topagent" as PointsTier,
          transactions: [],
        });
      }
      ledger.tier = "topagent" as PointsTier;
      ledger.creditPoints(
        tierConfig.monthlyPoints,
        "subscription_credit",
        `Admin — ${tierConfig.name} plan (complimentary)`,
        { adSpendValue: tierConfig.monthlyPoints * tierConfig.adValuePerPoint }
      );
      ledger.lastSubscriptionCredit = now;
      await ledger.save();

      // Send email
      sendSubscriptionEmail(user.email, user.name || "", "subscribed")
        .catch((err) => console.error("[checkout] Admin email failed:", err));

      const redirectUrl = successUrl || `${process.env.NEXTAUTH_URL || "https://chatrealty.io"}/subscription/success?plan=agent`;
      return NextResponse.json({ url: redirectUrl, admin: true });
    }

    // Create or retrieve Stripe customer
    const stripeCustomerId = await createOrGetStripeCustomer({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      stripeCustomerId: existingSub?.stripeCustomerId,
    });

    // Save customer ID on subscription doc if we created a new one
    if (existingSub && !existingSub.stripeCustomerId) {
      existingSub.stripeCustomerId = stripeCustomerId;
      await existingSub.save();
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://chatrealty.io";

    const checkoutSession = await createCheckoutSession({
      userId: user._id.toString(),
      customerId: stripeCustomerId,
      tier: tier as Exclude<SubscriptionTier, "free">,
      billingInterval: interval as BillingInterval,
      successUrl: successUrl || `${baseUrl}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${baseUrl}/dashboard/billing?cancelled=true`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("[stripe/checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
