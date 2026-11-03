// scripts/test-site-setup-flow.ts
//
// End-to-end check of the $300 custom-site setup (P5) against Stripe TEST mode:
// eligibility (no sub / admin refused; active Basic allowed) → real test-mode
// Checkout session → test PaymentIntent paid with pm_card_visa → signed
// checkout.session.completed to /api/webhooks/stripe (+ a duplicate) → order
// paid once → intake saved → marked live → refund handling. Cleans up.
//
//   npx tsx scripts/test-site-setup-flow.ts [--base http://localhost:3005]
//
// All mail goes to Resend's sink (delivered@resend.dev). REFUSES live keys.

import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envFile = [process.env.ENV_FILE, resolve(process.cwd(), ".env.local"), resolve(process.cwd(), "../../../.env.local")]
  .filter(Boolean)
  .find((p) => existsSync(p as string)) as string | undefined;
if (envFile) config({ path: envFile });
process.env.ADMIN_EMAIL = "delivered@resend.dev"; // never mail Joseph from a test

const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : null;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) throw new Error("Refusing to run: not a test-mode Stripe key.");

  const mongoose = (await import("mongoose")).default;
  const dbConnect = (await import("@/lib/mongoose")).default;
  const User = (await import("@/models/User")).default;
  const AgentSubscription = (await import("@/models/AgentSubscription")).default;
  const SiteSetupOrder = (await import("@/models/SiteSetupOrder")).default;
  const lib = await import("@/lib/site-setup");
  const { getStripe } = await import("@/lib/stripe-subscription");
  const { STRIPE_PRICES } = await import("@/config/stripe-prices");

  await dbConnect();
  const stripe = getStripe();
  const tag = `setuptest${Date.now()}`;
  const made = { users: [] as any[], customers: [] as string[], subs: [] as string[] };

  try {
    console.log("5.1 eligibility");
    const noSub = await User.create({ email: `delivered+${tag}-nosub@resend.dev`, name: "No Sub", roles: ["endUser"] /* never realEstateAgent: that role registers a real Vercel subdomain */ });
    made.users.push(noSub._id);
    const e1 = await lib.checkSiteSetupEligibility(String(noSub._id));
    assert(!e1.eligible && e1.reason === "no_subscription", "agent without a subscription refused");

    const admin = await User.create({ email: `delivered+${tag}-admin@resend.dev`, name: "Admin", roles: ["endUser", "admin"], isAdmin: true });
    made.users.push(admin._id);
    const e2 = await lib.checkSiteSetupEligibility(String(admin._id));
    assert(!e2.eligible && e2.reason === "admin", "admin refused");

    const agent = await User.create({ email: `delivered+${tag}-agent@resend.dev`, name: "Setup Agent", roles: ["endUser"] /* never realEstateAgent: that role registers a real Vercel subdomain */ });
    made.users.push(agent._id);
    const customer = await stripe.customers.create({ email: agent.email, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" }, metadata: { test: tag } });
    made.customers.push(customer.id);
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: STRIPE_PRICES.beginner.monthly }], metadata: { userId: String(agent._id), tier: "beginner", test: tag } });
    made.subs.push(sub.id);
    await AgentSubscription.create({ agentId: agent._id, tier: "beginner", status: "past_due", billingInterval: "monthly", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), stripeSubscriptionId: sub.id, stripeCustomerId: customer.id });
    const e3 = await lib.checkSiteSetupEligibility(String(agent._id));
    assert(!e3.eligible && e3.reason === "not_active", "past-due Basic refused");
    await AgentSubscription.updateOne({ agentId: agent._id }, { $set: { status: "active" } });
    const e4 = await lib.checkSiteSetupEligibility(String(agent._id));
    assert(e4.eligible, "active paid Basic allowed");

    console.log("\n5.1 checkout + webhook");
    const { url, orderId } = await lib.createSiteSetupCheckout(String(agent._id), BASE || "http://localhost:3005");
    assert(url.startsWith("https://checkout.stripe.com/"), "test-mode Checkout session created");
    const order0 = await SiteSetupOrder.findById(orderId).lean<any>();
    assert(order0.status === "awaiting_payment" && order0.livemode === false, "order awaiting payment (test mode)");
    const cs = await stripe.checkout.sessions.retrieve(order0.stripeCheckoutSessionId);
    assert(cs.mode === "payment" && cs.amount_total === 30000 && cs.metadata?.type === "site_setup", "session is $300 one-time with site_setup metadata");
    let blocked = false; // a paid, open setup blocks a second purchase — checked below

    const pi = await stripe.paymentIntents.create({ amount: 30000, currency: "usd", customer: customer.id, payment_method: "pm_card_visa", confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, metadata: { type: "site_setup", orderId, test: tag } });
    assert(pi.status === "succeeded", "test PaymentIntent succeeded");
    const paidSession = { ...cs, payment_status: "paid", status: "complete", payment_intent: pi.id };

    async function deliver(type: string, object: any) {
      if (!BASE) {
        if (type === "checkout.session.completed") return lib.fulfillSiteSetupCheckout(object, false);
        if (type === "charge.refunded") return lib.markSiteSetupRefunded(object.payment_intent);
        return;
      }
      const payload = JSON.stringify({ id: `evt_${tag}_${Math.random().toString(36).slice(2)}`, object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object } });
      const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
      const res = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "stripe-signature": header, "Content-Type": "application/json" }, body: payload });
      assert(res.ok, `webhook accepted ${type} (${res.status})`);
    }
    await deliver("checkout.session.completed", paidSession);
    await deliver("checkout.session.completed", paidSession);
    const order1 = await SiteSetupOrder.findById(orderId).lean<any>();
    assert(order1.status === "intake_pending" && order1.stripePaymentIntentId === pi.id, "order paid → intake_pending");
    assert(order1.history.filter((h: any) => h.status === "intake_pending").length === 1, "duplicate delivery did not double-process");
    try { await lib.createSiteSetupCheckout(String(agent._id), "http://x"); } catch (e: any) { blocked = e.status === 409; }
    assert(blocked, "second purchase blocked while one is open");

    console.log("\n5.2 intake + 5.4 live");
    const order = await SiteSetupOrder.findById(orderId);
    order!.intake = { style: "modern", serviceAreas: ["Palm Desert", "La Quinta"], exampleSites: ["https://example.com"], logoUrl: "https://res.cloudinary.com/x/logo.png", submittedAt: new Date() } as any;
    order!.status = "intake_received";
    order!.history.push({ status: "intake_received", at: new Date(), by: "test" });
    await order!.save();
    const saved = await SiteSetupOrder.findById(orderId).lean<any>();
    assert(saved.intake.serviceAreas.length === 2 && saved.intake.style === "modern", "intake persisted (schema declared)");
    const { sendSiteSetupLiveEmail } = await import("@/lib/site-setup-emails");
    const sent = await sendSiteSetupLiveEmail(agent.email, agent.name!, "https://setup-agent.chatrealty.io");
    assert(!!sent, "handoff email accepted by Resend (sink address)");

    console.log("\nRefund");
    await stripe.refunds.create({ payment_intent: pi.id });
    const charges = await stripe.charges.list({ payment_intent: pi.id, limit: 1 });
    await deliver("charge.refunded", charges.data[0]);
    const refunded = await SiteSetupOrder.findById(orderId).lean<any>();
    assert(refunded.status === "refunded", "full refund marks order refunded");

    console.log(`\nALL CHECKS PASSED (${tag})`);
  } finally {
    for (const s of made.subs) await stripe.subscriptions.cancel(s).catch(() => {});
    for (const c of made.customers) await stripe.customers.del(c).catch(() => {});
    await SiteSetupOrder.deleteMany({ agentId: { $in: made.users } });
    await AgentSubscription.deleteMany({ agentId: { $in: made.users } });
    await User.deleteMany({ _id: { $in: made.users } });
    console.log("cleaned up");
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
