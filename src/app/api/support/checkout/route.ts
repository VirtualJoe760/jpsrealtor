// POST /api/support/checkout — Stripe Checkout for a one-time contribution
// to ChatRealty (/support).
//
// A contribution is a GIFT: no equity, no credits, no rewards, and not tax
// deductible (ChatRealty is not a charity). It is kept off /invest on purpose —
// the investor page carries Reg CF testing-the-waters language that says no
// money is being solicited, and a payment button beside it would contradict that.
//
// The Stripe webhook needs no case for this: metadata.type is not
// "points_topup" and mode is not "subscription", so it records the event and
// does nothing else. The Stripe dashboard is the ledger.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { stripeConfiguration, requireStripeMode } from "@/lib/stripe-mode";

export const dynamic = "force-dynamic";

const MIN_CENTS = 500; // $5
const MAX_CENTS = 1_000_000; // $10,000

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = stripeConfiguration();
  if (!config.checkoutConfigured) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const cents = Math.round(Number(body?.amount) * 100);
  if (!Number.isFinite(cents) || cents < MIN_CENTS || cents > MAX_CENTS) {
    return NextResponse.json({ error: "Contribution must be between $5 and $10,000" }, { status: 400 });
  }

  try {
    const mode = requireStripeMode();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      customer_email: session.user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: "Contribution to ChatRealty",
              description: "A one-time gift to fund ChatRealty's development. Not an investment; no equity or rewards. Not tax deductible.",
            },
          },
        },
      ],
      metadata: { type: "support_contribution", userId: session.user.id, billingMode: mode },
      payment_intent_data: { metadata: { type: "support_contribution", userId: session.user.id } },
      success_url: `${baseUrl}/support?status=thanks`,
      cancel_url: `${baseUrl}/support?status=cancelled`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[support] checkout failed:", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
