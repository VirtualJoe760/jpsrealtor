// POST /api/domains/checkout — start a Stripe Checkout to register a domain.
//
// The agent pays registrar price + $10 (src/config/domain-pricing.ts) as a
// YEARLY Stripe subscription, so renewals bill them automatically. Nothing is
// bought here: the domain is purchased on ChatRealty's Vercel account only
// after Stripe confirms payment (webhook → src/lib/domains/fulfill.ts), and a
// failed purchase is refunded there. This replaced /api/domains/purchase, which
// bought on ChatRealty's bill without charging anyone.
//
// Stripe collects the agent's name, billing address and phone: ICANN needs a
// registrant contact, and registering in the agent's name means they own it.
//
// The subscription's metadata deliberately has NO `userId`: the Stripe webhook
// treats a deleted subscription carrying `userId` as a cancelled BASIC plan
// and drops the agent to Free. Domain subscriptions use `domainUserId`.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import DomainOrder from "@/models/DomainOrder";
import { isFreeTier } from "@/lib/subscription-helpers";
import { stripeConfiguration } from "@/lib/stripe-mode";
import { checkAvailability, getPrice } from "@/lib/domains/registrar";
import {
  normalizeDomain,
  quoteDomain,
  tldOf,
  SELF_SERVE_TLDS,
  MAX_REGISTRAR_PRICE_USD,
  DOMAIN_CHECKOUT_TYPE,
} from "@/config/domain-pricing";

export const dynamic = "force-dynamic";

const toCents = (usd: number) => Math.round(usd * 100);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id name email isAdmin roles").lean<{
    _id: any; name?: string; email: string; isAdmin?: boolean; roles?: string[];
  }>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.isAdmin && !user.roles?.includes("realEstateAgent")) {
    return NextResponse.json({ error: "Only agents can buy domains" }, { status: 403 });
  }
  if (!user.isAdmin && (await isFreeTier(String(user._id)))) {
    return NextResponse.json({ error: "Custom domains come with the Basic plan." }, { status: 403 });
  }

  const config = stripeConfiguration();
  if (!config.checkoutConfigured) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const domain = normalizeDomain(body?.domain);
  if (!domain || !SELF_SERVE_TLDS.includes(tldOf(domain))) {
    return NextResponse.json({ error: "That domain can't be bought here." }, { status: 400 });
  }

  // Someone already paid for it (or is mid-purchase): don't take a second payment.
  const inFlight = await DomainOrder.exists({ domain, status: { $in: ["paid", "purchasing", "active"] } });
  if (inFlight) return NextResponse.json({ error: "That domain is already being registered." }, { status: 409 });

  // Re-quote on the server — never trust a price from the browser.
  let quote;
  try {
    const [available, price] = await Promise.all([checkAvailability(domain), getPrice(domain)]);
    if (!available) return NextResponse.json({ error: "That domain is taken." }, { status: 409 });
    if (price.purchasePrice > MAX_REGISTRAR_PRICE_USD) {
      return NextResponse.json({ error: "That's a premium domain. Contact us to buy it." }, { status: 400 });
    }
    quote = quoteDomain(price.purchasePrice, price.renewalPrice);
  } catch (error) {
    console.error("[domains/checkout] quote failed:", (error as Error).message);
    return NextResponse.json({ error: "Couldn't price that domain right now" }, { status: 502 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://www.chatrealty.io";

  // Reuse the agent's Basic-plan Stripe customer when it exists in this mode,
  // so the billing portal shows the plan and the domain together.
  let customer: string | undefined;
  const sub = await AgentSubscription.findOne({ agentId: user._id }).select("stripeCustomerId").lean<{ stripeCustomerId?: string }>();
  if (sub?.stripeCustomerId) {
    try {
      const c = await stripe.customers.retrieve(sub.stripeCustomerId);
      if (!(c as Stripe.DeletedCustomer).deleted) customer = c.id;
    } catch {
      /* customer from the other Stripe mode, or deleted — fall back to email */
    }
  }

  const yearlyCents = toCents(quote.yearlyCharge);
  const firstYearCents = toCents(quote.firstYearCharge);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: yearlyCents,
        recurring: { interval: "year" },
        product_data: {
          name: `Domain: ${domain}`,
          description: "Yearly domain registration, set up and pointed at your ChatRealty site.",
          metadata: { type: DOMAIN_CHECKOUT_TYPE, domain },
        },
      },
    },
  ];
  // Year 1 can cost more or less than renewals at the registrar.
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (firstYearCents > yearlyCents) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: firstYearCents - yearlyCents,
        product_data: { name: `First-year registration — ${domain}` },
      },
    });
  } else if (firstYearCents < yearlyCents) {
    const coupon = await stripe.coupons.create({
      amount_off: yearlyCents - firstYearCents,
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: `First-year price — ${domain}`,
    });
    discounts = [{ coupon: coupon.id }];
  }

  const meta = {
    type: DOMAIN_CHECKOUT_TYPE,
    domainUserId: String(user._id),
    domain,
    purchasePrice: String(quote.purchasePrice),
    renewalPrice: String(quote.renewalPrice),
    firstYearCharge: String(quote.firstYearCharge),
    yearlyCharge: String(quote.yearlyCharge),
  };

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customer ? { customer } : { customer_email: user.email }),
      line_items: lineItems,
      ...(discounts ? { discounts } : {}),
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      metadata: meta,
      subscription_data: {
        description: `Domain registration: ${domain}`,
        metadata: { type: DOMAIN_CHECKOUT_TYPE, domainUserId: String(user._id), domain },
      },
      success_url: `${baseUrl}/agent/settings?section=domain&domainOrder={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/agent/settings?section=domain`,
    });
    return NextResponse.json({ url: checkout.url, quote });
  } catch (error) {
    console.error("[domains/checkout] Stripe error:", (error as Error).message);
    return NextResponse.json({ error: "Couldn't start checkout" }, { status: 500 });
  }
}
