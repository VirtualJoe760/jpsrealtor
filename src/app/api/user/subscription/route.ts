// src/app/api/user/subscription/route.ts
// User (non-agent) subscription management — Free / Pro ($9.99/month)
// GET: current tier (checks Stripe if customer exists)
// POST: create checkout for Pro upgrade
// DELETE: cancel subscription at end of billing period

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Stripe from "stripe";
import { sendSubscriptionEmail, sendCancellationNotification } from "@/lib/email-resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const USER_PRO_PRICE_ID = process.env.USER_PRO_STRIPE_PRICE_ID || "price_1SW75eGI9m3f5P10p8Ht99dn";

// GET — current subscription status (syncs from Stripe if needed)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let tier = user.subscriptionTier || "free";
    let status = user.subscriptionStatus || "active";
    let expiresAt = user.subscriptionExpiresAt || null;

    // If user has a Stripe customer ID, check Stripe for active subscriptions
    // This handles the case where webhook hasn't fired (e.g., local dev)
    if (user.stripeCustomerId && tier === "free") {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          tier = "pro";
          status = sub.cancel_at_period_end ? "cancelled" : "active";
          expiresAt = new Date((sub as any).current_period_end * 1000);

          // Sync to DB
          user.subscriptionTier = "pro";
          user.subscriptionStatus = status;
          user.subscriptionExpiresAt = expiresAt;
          user.stripeSubscriptionId = sub.id;
          await user.save();
        }
      } catch (err) {
        console.error("[subscription] Stripe sync check failed:", err);
      }
    }

    // Also check if a "cancelled" sub is still actually active in Stripe
    if (user.stripeSubscriptionId && tier === "pro") {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (sub.status === "active" || sub.status === "trialing") {
          status = sub.cancel_at_period_end ? "cancelled" : "active";
          expiresAt = new Date((sub as any).current_period_end * 1000);
        } else if (sub.status === "canceled") {
          tier = "free";
          status = "active";
          expiresAt = null;
          user.subscriptionTier = "free";
          user.subscriptionStatus = "active";
          user.subscriptionExpiresAt = undefined;
          user.stripeSubscriptionId = undefined;
          await user.save();
        }
      } catch {
        // Subscription may have been deleted
      }
    }

    return NextResponse.json({
      tier,
      status,
      expiresAt,
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

    // Already pro — check Stripe too
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
      success_url: `${origin}/subscription/success`,
      cancel_url: `${origin}/dashboard/settings`,
      metadata: { userId: user._id.toString(), tier: "pro" },
      subscription_data: {
        metadata: { userId: user._id.toString(), tier: "pro" },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}

// DELETE — cancel subscription at end of billing period
export async function DELETE(request: NextRequest) {
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

    // Parse reason and feedback from body
    let reason = "";
    let feedback = "";
    try {
      const body = await request.json();
      reason = body?.reason || "";
      feedback = body?.feedback || "";
    } catch {
      // No body — that's fine
    }

    // Cancel at end of billing period
    const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const expiresAt = new Date((sub as any).current_period_end * 1000);
    user.subscriptionStatus = "cancelled";
    user.subscriptionExpiresAt = expiresAt;
    user.cancellationReason = reason || undefined;
    user.cancellationFeedback = feedback || undefined;
    user.cancelledAt = new Date();
    await user.save();

    // Send cancellation email to user
    sendSubscriptionEmail(
      user.email,
      user.name || "",
      "cancelled",
      expiresAt,
    ).catch((err) => console.error("[subscription] Cancel email failed:", err));

    // Notify admin with reason
    sendCancellationNotification(
      user.email,
      user.name || "",
      reason,
      feedback,
      expiresAt,
    ).catch((err) => console.error("[subscription] Cancel notification failed:", err));

    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at end of billing period",
      expiresAt,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
