// src/app/api/points/topup/route.ts
// POST: Create a Stripe checkout session to purchase additional points
// Top-up rate is based on the user's current subscription tier.
// Pricing uses the canonical purchase-time markup policy.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import CreditBillingCustomer from '@/models/CreditBillingCustomer';
import { creditWalletForMode } from '@/lib/credit-wallet-mode';
import { stripeConfiguration, requireStripeMode } from '@/lib/stripe-mode';
import { quoteCreditTopup } from "@/lib/credit-topup-quote";
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = stripeConfiguration();
    if (!config.checkoutConfigured) return NextResponse.json({ error: 'Stripe checkout needs matching keys and a webhook signing secret', configuration: config }, { status: 503 });
    const mode = requireStripeMode();
    const CreditLedger = creditWalletForMode(mode);

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select("_id name email roles")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const ledger = await CreditLedger.findOne({ userId: user._id }).lean();
    let quote: ReturnType<typeof quoteCreditTopup>;
    try { quote = quoteCreditTopup(body?.amount, ledger?.tier || null, user.roles?.includes('admin')); }
    catch { return NextResponse.json({ error: 'Top-up must be $10–$10,000 in whole cents' }, { status: 400 }); }
    const { points, tier: effectiveTier, amount, amountCents, adSpendValue: adValue } = quote;
    const requestKey = request.headers.get('Idempotency-Key');
    if (requestKey && !/^[\w-]{16,80}$/.test(requestKey)) return NextResponse.json({ error: 'Invalid request key' }, { status: 400 });

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";

    // Create or get Stripe customer
    let customerId = (await CreditBillingCustomer.findOne({ userId: user._id, mode }).lean())?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user._id.toString(), purpose: 'credit_wallet', mode },
      }, { idempotencyKey: `credit-customer:${mode}:${user._id}` });
      customerId = customer.id;
      // Do not overwrite a legacy subscription customer with a test-mode ID.
      await CreditBillingCustomer.findOneAndUpdate({ userId: user._id, mode }, { $setOnInsert: { userId: user._id, mode, customerId } }, { upsert: true });
    }

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${points.toLocaleString()} Platform Credits`,
              description: `${points.toLocaleString()} credits — $${adValue.toFixed(2)} in platform spend value`,
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
        pricingVersion: quote.pricingVersion,
        markupPercent: String(Math.round(quote.markup * 100)),
        billingMode: mode,
      },
      // Fixed server-priced packs: do not silently discount the funded value.
      success_url: `${baseUrl}/agent/dashboard?topup=success&points=${points}`,
      cancel_url: `${baseUrl}/agent/dashboard?topup=cancelled`,
    }, requestKey ? { idempotencyKey: `credit-checkout:${mode}:${user._id}:${requestKey}` } : undefined);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      points,
      tier: effectiveTier,
      adSpendValue: Math.round(adValue * 100) / 100,
      pricingVersion: quote.pricingVersion,
      mode,
    });
  } catch (error: any) {
    console.error("Error creating points top-up:", error);
    return NextResponse.json(
      { error: "Unable to create credit checkout" },
      { status: 500 }
    );
  }
}
