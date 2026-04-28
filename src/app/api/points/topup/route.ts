// src/app/api/points/topup/route.ts
// POST: Create a Stripe checkout session to purchase additional points
// Top-up rate is based on the user's current subscription tier.
// Above $999, always uses top agent rate (0.85).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import PointsLedger, { POINTS_TIERS, dollarsToPoints } from "@/models/PointsLedger";
import type { PointsTier } from "@/models/PointsLedger";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("_id name email stripeCustomerId")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount } = body as { amount: number };

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: "Minimum top-up amount is $10" },
        { status: 400 }
      );
    }

    // Determine rate based on subscriber tier + purchase amount
    // Non-subscribers or amounts below tier thresholds use amount-based rates:
    //   <$125:      35% margin ($0.65/$1 ad spend)
    //   $125-$499:  25% margin ($0.75/$1 ad spend) = Beginner rate
    //   $500-$999:  20% margin ($0.80/$1 ad spend) = Experienced rate
    //   $1,000+:    15% margin ($0.85/$1 ad spend) = Top Agent rate
    const ledger = await PointsLedger.findOne({ userId: user._id }).lean();
    const subscriberTier: PointsTier | null = ledger?.tier || null;

    // Pick the best rate: subscriber's tier rate OR the amount-based rate
    let effectiveTier: PointsTier;
    let adSpendRate: number;

    if (amount >= 1000) {
      effectiveTier = "topagent";
      adSpendRate = 0.85;
    } else if (amount >= 500) {
      effectiveTier = subscriberTier === "topagent" ? "topagent" : "experienced";
      adSpendRate = POINTS_TIERS[effectiveTier].adSpendRate;
    } else if (amount >= 125) {
      effectiveTier = subscriberTier === "topagent" ? "topagent"
        : subscriberTier === "experienced" ? "experienced"
        : "beginner";
      adSpendRate = POINTS_TIERS[effectiveTier].adSpendRate;
    } else {
      // Under $125 — use subscriber tier if they have one, otherwise 35% margin
      if (subscriberTier) {
        effectiveTier = subscriberTier;
        adSpendRate = POINTS_TIERS[effectiveTier].adSpendRate;
      } else {
        effectiveTier = "beginner";
        adSpendRate = 0.65; // Non-subscriber rate for small purchases
      }
    }

    // Calculate credits: amount × adSpendRate = ad value, then ad value / adValuePerPoint = credits
    const adValuePerPoint = 0.125;
    const adValue = amount * adSpendRate;
    const points = Math.floor(adValue / adValuePerPoint);
    const tierConfig = POINTS_TIERS[effectiveTier];

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://www.jpsrealtor.com";

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    }

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100), // cents
            product_data: {
              name: `${points.toLocaleString()} Marketing Credits`,
              description: `${points.toLocaleString()} credits — $${adValue.toFixed(2)} in ad buying power`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user._id.toString(),
        type: "points_topup",
        points: points.toString(),
        tier: effectiveTier,
        amount: amount.toString(),
      },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/agent/dashboard?topup=success&points=${points}`,
      cancel_url: `${baseUrl}/agent/dashboard?topup=cancelled`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      points,
      tier: effectiveTier,
      adSpendValue: Math.round(adValue * 100) / 100,
    });
  } catch (error: any) {
    console.error("Error creating points top-up:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
