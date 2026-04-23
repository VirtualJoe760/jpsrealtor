// src/app/api/user/subscription/route.ts
// User (non-agent) subscription management — Free / Pro ($10/month)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-18.acacia" as any,
});

// User Pro plan price — replace with real Stripe Price ID after creating in dashboard
const USER_PRO_PRICE_ID = process.env.USER_PRO_STRIPE_PRICE_ID || "price_PLACEHOLDER_user_pro_monthly";

// GET — current subscription status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      tier: user.subscriptionTier || "free",
      status: user.subscriptionStatus || "active",
      expiresAt: user.subscriptionExpiresAt,
      features: {
        free: {
          aiQueriesPerDay: 10,
          savedSearches: 3,
          favorites: 50,
        },
        pro: {
          aiQueriesPerDay: 100,
          savedSearches: "Unlimited",
          favorites: "Unlimited",
          priceAlerts: true,
          prioritySupport: true,
          advancedFilters: true,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

// POST — create checkout session for Pro upgrade
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Already pro
    if (user.subscriptionTier === "pro" && user.subscriptionStatus === "active") {
      return NextResponse.json({ error: "Already subscribed to Pro" }, { status: 400 });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const { origin } = new URL(request.url);
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: USER_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?upgraded=true`,
      cancel_url: `${origin}/dashboard/settings`,
      metadata: { userId: user._id.toString(), tier: "pro" },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}

// DELETE — cancel subscription
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    // Cancel at end of billing period
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    user.subscriptionStatus = "cancelled";
    await user.save();

    return NextResponse.json({ success: true, message: "Subscription will cancel at end of billing period" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
