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

    // Must be a real estate agent
    if (!user.roles?.includes("realEstateAgent")) {
      return NextResponse.json(
        { error: "Only real estate agents can subscribe" },
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

    // Validate tier
    if (!tier || !["starter", "professional", "enterprise"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be starter, professional, or enterprise." },
        { status: 400 }
      );
    }

    // Validate billing interval
    const interval = billingInterval === "annual" ? "annual" : "monthly";

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

    const baseUrl = process.env.NEXTAUTH_URL || "https://jpsrealtor.com";

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
