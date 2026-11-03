// src/lib/site-setup.ts
// $300 custom-site setup (site-platform plan P5): eligibility, Stripe checkout,
// webhook fulfilment and refunds. Routes and the Stripe webhook call these.
// Docs: docs/commerce/site-setup.md.
//
// Not built here: 5.3, the agent-approved build grant that lets Joseph's
// Claude act on the agent's account. It waits on P3 (ChatRealty-hosted custom
// sites). Until then Joseph builds with the agent's own MCP access.

import type Stripe from "stripe";
import dbConnect from "@/lib/mongoose";
import { getStripe } from "@/lib/stripe-subscription";
import { requireStripeMode } from "@/lib/stripe-mode";
import AgentSubscription from "@/models/AgentSubscription";
import SiteSetupOrder, { type ISiteSetupOrder } from "@/models/SiteSetupOrder";
import User from "@/models/User";
import {
  SITE_SETUP_CHECKOUT_TYPE,
  SITE_SETUP_DESCRIPTION,
  SITE_SETUP_ELIGIBLE_TIERS,
  SITE_SETUP_PRICE_CENTS,
  SITE_SETUP_PRICE_ID,
  SITE_SETUP_PRODUCT_NAME,
} from "@/config/site-setup";
import { sendSiteSetupPaidEmail, sendSiteSetupAdminNotification } from "@/lib/site-setup-emails";

/** Orders that are paid and not finished — one at a time per agent. */
export const OPEN_PAID_STATUSES = ["intake_pending", "intake_received", "in_progress"] as const;

// One flat shape: the repo's tsconfig doesn't narrow on `eligible: true/false`.
export interface Eligibility {
  eligible: boolean;
  stripeCustomerId?: string;
  reason?: "admin" | "no_subscription" | "not_basic" | "not_active";
  message?: string;
}

/**
 * Only an agent with an ACTIVE, PAID Basic subscription can buy. Admins are
 * excluded: their "subscription" is a complimentary Top Agent record with no
 * Stripe customer, and Joseph builds his own sites anyway.
 */
export async function checkSiteSetupEligibility(userId: string): Promise<Eligibility> {
  await dbConnect();
  const user = await User.findById(userId).select("roles isAdmin").lean<any>();
  if (user?.isAdmin || user?.roles?.includes("admin")) {
    return { eligible: false, reason: "admin", message: "Admin accounts don't need to buy a setup." };
  }
  const sub = await AgentSubscription.findOne({ agentId: userId }).lean<any>();
  if (!sub || !sub.stripeSubscriptionId || !sub.stripeCustomerId) {
    return { eligible: false, reason: "no_subscription", message: "Subscribe to the Basic plan first." };
  }
  if (!(SITE_SETUP_ELIGIBLE_TIERS as readonly string[]).includes(sub.tier)) {
    return { eligible: false, reason: "not_basic", message: "The custom site setup is available on the Basic plan." };
  }
  if (sub.status !== "active") {
    return { eligible: false, reason: "not_active", message: "Your subscription must be active to buy a setup." };
  }
  return { eligible: true, stripeCustomerId: sub.stripeCustomerId };
}

/** Create the order and a Stripe Checkout session (mode: payment). */
export async function createSiteSetupCheckout(
  userId: string,
  baseUrl: string
): Promise<{ url: string; orderId: string }> {
  const eligibility = await checkSiteSetupEligibility(userId);
  if (!eligibility.eligible) throw Object.assign(new Error(eligibility.message), { status: 403 });

  const open = await SiteSetupOrder.exists({ agentId: userId, status: { $in: OPEN_PAID_STATUSES } });
  if (open) throw Object.assign(new Error("You already have a site setup in progress."), { status: 409 });

  const livemode = requireStripeMode() === "live";
  const order = await SiteSetupOrder.create({
    agentId: userId,
    status: "awaiting_payment",
    amount: SITE_SETUP_PRICE_CENTS / 100,
    livemode,
    history: [{ status: "awaiting_payment", at: new Date(), by: "agent" }],
  });

  const metadata = { type: SITE_SETUP_CHECKOUT_TYPE, orderId: String(order._id), userId: String(userId) };
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = SITE_SETUP_PRICE_ID
    ? { price: SITE_SETUP_PRICE_ID, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SITE_SETUP_PRICE_CENTS,
          product_data: { name: SITE_SETUP_PRODUCT_NAME, description: SITE_SETUP_DESCRIPTION },
        },
      };

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: eligibility.stripeCustomerId!,
    line_items: [lineItem],
    metadata,
    payment_intent_data: { metadata, description: SITE_SETUP_PRODUCT_NAME },
    success_url: `${baseUrl}/agent/site-setup?paid=1&order=${order._id}`,
    cancel_url: `${baseUrl}/agent/site-setup?cancelled=1`,
  });

  order.stripeCheckoutSessionId = session.id;
  await order.save();
  return { url: session.url!, orderId: String(order._id) };
}

export function isSiteSetupCheckout(metadata?: Stripe.Metadata | null): boolean {
  return metadata?.type === SITE_SETUP_CHECKOUT_TYPE;
}

/**
 * Webhook: checkout.session.completed / async_payment_succeeded for a setup.
 * Idempotent — only an "awaiting_payment" order moves, so a retried event is
 * a no-op. Emails are sent once, by whichever delivery moved the order.
 */
export async function fulfillSiteSetupCheckout(session: Stripe.Checkout.Session, livemode: boolean): Promise<boolean> {
  await dbConnect();
  if (session.payment_status !== "paid") return false;
  const orderId = session.metadata?.orderId;
  const order = orderId
    ? await SiteSetupOrder.findById(orderId).catch(() => null)
    : await SiteSetupOrder.findOne({ stripeCheckoutSessionId: session.id });
  if (!order) {
    console.error("[site-setup] paid checkout with no order:", session.id);
    return false;
  }
  if (order.livemode !== livemode) throw new Error("Stripe mode mismatch for site setup order");

  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const now = new Date();
  const res = await SiteSetupOrder.updateOne(
    { _id: order._id, status: "awaiting_payment" },
    {
      $set: {
        status: "intake_pending",
        paidAt: now,
        stripePaymentIntentId: pi,
        stripeCheckoutSessionId: session.id,
        amount: (session.amount_total ?? SITE_SETUP_PRICE_CENTS) / 100,
      },
      $push: { history: { status: "intake_pending", at: now, by: "stripe" } },
    }
  );
  if (res.modifiedCount !== 1) return false;

  const agent = await User.findById(order.agentId).select("name email").lean<any>();
  if (agent?.email) {
    sendSiteSetupPaidEmail(agent.email, agent.name || "").catch(() => {});
    sendSiteSetupAdminNotification(agent.name || agent.email, agent.email, "paid").catch(() => {});
  }
  return true;
}

/** Webhook: a full refund of a setup payment marks the order refunded. */
export async function markSiteSetupRefunded(paymentIntentId: string): Promise<boolean> {
  await dbConnect();
  const now = new Date();
  const res = await SiteSetupOrder.updateOne(
    { stripePaymentIntentId: paymentIntentId, status: { $nin: ["refunded"] } },
    { $set: { status: "refunded" }, $push: { history: { status: "refunded", at: now, by: "stripe" } } }
  );
  return res.modifiedCount === 1;
}

/** Shape sent to the agent's page and the admin queue. */
export function serializeOrder(o: ISiteSetupOrder | any) {
  return {
    id: String(o._id),
    status: o.status,
    amount: o.amount,
    livemode: o.livemode,
    paidAt: o.paidAt,
    intake: {
      style: o.intake?.style || "",
      styleNotes: o.intake?.styleNotes || "",
      serviceAreas: o.intake?.serviceAreas || [],
      logoUrl: o.intake?.logoUrl || "",
      exampleSites: o.intake?.exampleSites || [],
      colors: o.intake?.colors || "",
      notes: o.intake?.notes || "",
      submittedAt: o.intake?.submittedAt,
    },
    liveUrl: o.liveUrl,
    liveAt: o.liveAt,
    createdAt: o.createdAt,
  };
}
