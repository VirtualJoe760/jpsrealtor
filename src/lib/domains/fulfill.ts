// src/lib/domains/fulfill.ts
//
// Turns a PAID domain checkout into a live domain — or a refund.
//
//   startDomainOrder()   webhook: checkout.session.completed (type domain_registration)
//   advanceDomainOrder() polls Vercel's async order; called by the webhook, the
//                        agent's settings page and the cron backstop
//   endDomainRenewal()   webhook: customer.subscription.deleted — the agent
//                        stopped paying, so Vercel must stop renewing
//
// Money rules:
//   - The registrar is only called after Stripe says the invoice is paid.
//   - Exactly one buy per checkout: DomainOrder.checkoutSessionId is unique and
//     the paid→purchasing transition is a conditional update.
//   - A failed buy refunds the first-year payment and cancels the yearly
//     subscription. If the refund itself fails the order goes to
//     needs_attention — never silently kept.
//   - TEST-mode payments never reach the registrar: a test card must not buy a
//     real domain on ChatRealty's Vercel bill.

import Stripe from "stripe";
import DomainOrder, { IDomainOrder } from "@/models/DomainOrder";
import DomainMapping from "@/models/DomainMapping";
import User from "@/models/User";
import { buyDomain, getOrder, setAutoRenew, RegistrantContact } from "@/lib/domains/registrar";
import { addDomainToProject, VercelApiError } from "@/lib/vercel-domains";
import { runDomainOnboarding } from "@/lib/domain-onboarding";
import { pointDomainAtAgent } from "@/lib/domains/point";
import { DOMAIN_CHECKOUT_TYPE } from "@/config/domain-pricing";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id);

export function isDomainCheckout(meta?: Stripe.Metadata | null): boolean {
  return meta?.type === DOMAIN_CHECKOUT_TYPE;
}

/** ICANN registrant contact from what Stripe Checkout collected. */
function contactFrom(checkout: Stripe.Checkout.Session): RegistrantContact | null {
  const d = checkout.customer_details;
  const a = d?.address;
  if (!d?.email || !d.phone || !a?.line1 || !a.city || !a.postal_code || !a.country) return null;
  const parts = (d.name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || d.email.split("@")[0];
  const last = parts.slice(1).join(" ") || first;
  return {
    firstName: first,
    lastName: last,
    email: d.email,
    phone: d.phone.replace(/[^\d+]/g, ""),
    address1: a.line1,
    ...(a.line2 ? { address2: a.line2 } : {}),
    city: a.city,
    state: a.state || a.city,
    zip: a.postal_code,
    country: a.country,
  };
}

/** Webhook entry point. Safe to call more than once for the same checkout. */
export async function startDomainOrder(checkout: Stripe.Checkout.Session, livemode: boolean): Promise<IDomainOrder | null> {
  if (checkout.payment_status !== "paid") return null; // async payment: wait for async_payment_succeeded
  const m = checkout.metadata || {};

  const order = await DomainOrder.findOneAndUpdate(
    { checkoutSessionId: checkout.id },
    {
      $setOnInsert: {
        userId: m.domainUserId,
        domain: m.domain,
        status: "paid",
        checkoutSessionId: checkout.id,
        stripeSubscriptionId: idOf(checkout.subscription as any),
        stripeCustomerId: idOf(checkout.customer as any),
        stripeInvoiceId: idOf(checkout.invoice as any),
        purchasePriceUsd: Number(m.purchasePrice),
        renewalPriceUsd: Number(m.renewalPrice),
        firstYearChargeUsd: Number(m.firstYearCharge),
        yearlyChargeUsd: Number(m.yearlyCharge),
        livemode,
      },
    },
    { upsert: true, new: true }
  );
  if (!order) return null;
  if (order.status !== "paid") return advanceDomainOrder(order); // replayed webhook

  if (!livemode) {
    return markNeedsAttention(order, "Test-mode payment — no domain was purchased (test cards never buy real domains).");
  }

  const contact = contactFrom(checkout);
  if (!contact) return refundAndCancel(order, "Checkout didn't collect a full registrant address and phone.");

  // Claim the buy. Only one caller can move paid → purchasing.
  const claimed = await DomainOrder.findOneAndUpdate(
    { _id: order._id, status: "paid", vercelOrderId: { $exists: false } },
    { $set: { status: "purchasing" } },
    { new: true }
  );
  if (!claimed) return DomainOrder.findById(order._id);

  try {
    const { orderId } = await buyDomain(claimed.domain, {
      expectedPrice: claimed.purchasePriceUsd,
      contact,
      autoRenew: true, // the agent's yearly Stripe subscription pays for it
    });
    claimed.vercelOrderId = orderId;
    await claimed.save();
  } catch (error) {
    return refundAndCancel(claimed, `Registrar refused the purchase: ${(error as Error).message}`);
  }
  return advanceDomainOrder(claimed, 8_000);
}

/** Checks Vercel's order; finishes (attach + point) or refunds. Idempotent. */
export async function advanceDomainOrder(order: IDomainOrder, waitMs = 0): Promise<IDomainOrder> {
  if (order.status !== "purchasing" || !order.vercelOrderId) return order;
  const deadline = Date.now() + waitMs;
  for (;;) {
    let vo;
    try {
      vo = await getOrder(order.vercelOrderId);
    } catch (error) {
      console.error(`[domains] order ${order.vercelOrderId} status check failed:`, (error as Error).message);
      return order; // try again on the next poll
    }
    if (vo.status === "completed") return activate(order);
    if (vo.status === "failed") {
      const code = vo.error?.code || vo.domains?.[0]?.status || "unknown";
      return refundAndCancel(order, `Registrar order failed (${code}).`);
    }
    if (Date.now() >= deadline) return order;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function activate(order: IDomainOrder): Promise<IDomainOrder> {
  const won = await DomainOrder.findOneAndUpdate(
    { _id: order._id, status: "purchasing" },
    { $set: { status: "active", activatedAt: new Date() } },
    { new: true }
  );
  if (!won) return (await DomainOrder.findById(order._id))!;

  // Serve it from this project, apex + www. 409 = already attached.
  for (const host of [won.domain, `www.${won.domain}`]) {
    try {
      await addDomainToProject(host);
    } catch (error) {
      if (!(error instanceof VercelApiError && error.status === 409)) {
        console.error(`[domains] attach ${host} failed:`, (error as Error).message);
      }
    }
  }

  // Point it at the agent (never overwrites a domain they already use).
  await pointDomainAtAgent(won.domain, won.userId);
  const user = await User.findById(won.userId).select("email");
  await DomainMapping.findOneAndUpdate(
    { domain: won.domain },
    {
      $set: {
        agentId: won.userId,
        agentEmail: user?.email || "",
        targetPath: "/",
        mappingType: "agent_landing",
        status: "active",
        purchasedViaVercel: true,
        dnsConfigured: true,
        vercelVerified: true,
        sslStatus: "pending",
      },
    },
    { upsert: true }
  );

  runDomainOnboarding(String(won.userId), won.domain).catch((err) =>
    console.error("[domains] onboarding error:", err?.message)
  );
  return won;
}

/** Refund the first-year payment and stop the yearly charge. */
export async function refundAndCancel(order: IDomainOrder, reason: string): Promise<IDomainOrder> {
  const s = stripe();
  try {
    const invoiceId =
      order.stripeInvoiceId ||
      (order.stripeSubscriptionId
        ? idOf((await s.subscriptions.retrieve(order.stripeSubscriptionId)).latest_invoice as any)
        : undefined);
    if (!invoiceId) throw new Error("no invoice to refund");
    const invoice = await s.invoices.retrieve(invoiceId, { expand: ["payments"] });
    const pi = idOf(invoice.payments?.data?.find((p) => p.payment?.payment_intent)?.payment?.payment_intent as any);
    if (!pi) throw new Error(`no payment found on invoice ${invoiceId}`);
    await s.refunds.create(
      { payment_intent: pi, metadata: { type: DOMAIN_CHECKOUT_TYPE, domain: order.domain } },
      { idempotencyKey: `domain-refund:${order._id}` }
    );
    if (order.stripeSubscriptionId) {
      await s.subscriptions.cancel(order.stripeSubscriptionId).catch((e) => {
        if (!/already been canceled|No such subscription/i.test(e?.message || "")) throw e;
      });
    }
  } catch (error) {
    return markNeedsAttention(order, `${reason} Refund FAILED: ${(error as Error).message}`);
  }
  order.status = "refunded";
  order.error = reason;
  await order.save();
  console.warn(`[domains] refunded ${order.domain}: ${reason}`);
  return order;
}

async function markNeedsAttention(order: IDomainOrder, reason: string): Promise<IDomainOrder> {
  order.status = "needs_attention";
  order.error = reason;
  await order.save();
  console.error(`[domains] NEEDS ATTENTION ${order.domain} (order ${order._id}): ${reason}`);
  return order;
}

/** The agent's yearly domain subscription ended: stop Vercel renewing it. */
export async function endDomainRenewal(sub: Stripe.Subscription): Promise<void> {
  const order = await DomainOrder.findOne({ stripeSubscriptionId: sub.id });
  if (!order || order.status !== "active") return;
  try {
    await setAutoRenew(order.domain, false);
  } catch (error) {
    // A domain left on auto-renew keeps billing ChatRealty — surface it.
    await markNeedsAttention(order, `Subscription ended but auto-renew could not be turned off: ${(error as Error).message}`);
    return;
  }
  order.status = "cancelled";
  await order.save();
}
