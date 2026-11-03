// scripts/test-affiliate-flow.ts
//
// End-to-end check of the affiliate program against Stripe TEST mode:
//   apply → approve (code + approval email rendered, not sent) → link click
//   (POST /api/affiliate/track, cookie) → agent signup captures the referral →
//   real test-mode Basic subscription paid with pm_card_visa → signed
//   invoice.paid to /api/webhooks/stripe → commission at the right tier →
//   tier lift at 10+ paying agents → full refund reverses → dashboard summary.
//
//   npx tsx scripts/test-affiliate-flow.ts [--base http://localhost:3000] [--keep]
//
// Needs a dev server whose STRIPE_WEBHOOK_SECRET matches this process's
// (both read the same .env.local). Without --base it skips the HTTP steps
// and calls the library directly. REFUSES to run with live Stripe keys.
// Cleans up every record and Stripe subscription it made unless --keep.
//
// ENV_FILE overrides which env file is loaded (default: .env.local here, then
// the main checkout's).

import { config } from "dotenv";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const envCandidates = [
  process.env.ENV_FILE,
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../../.env.local"), // worktree → main checkout
].filter(Boolean) as string[];
const envFile = envCandidates.find((p) => existsSync(p));
if (envFile) config({ path: envFile });

const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : null;
const KEEP = args.includes("--keep");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test-mode key.");
  }
  console.log(`env: ${envFile ? "loaded" : "none"} · stripe: test mode · base: ${BASE || "(direct calls)"}`);

  const mongoose = (await import("mongoose")).default;
  const dbConnect = (await import("@/lib/mongoose")).default;
  const User = (await import("@/models/User")).default;
  const Affiliate = (await import("@/models/Affiliate")).default;
  const AffiliateCommission = (await import("@/models/AffiliateCommission")).default;
  const AgentSubscription = (await import("@/models/AgentSubscription")).default;
  const lib = await import("@/lib/affiliates");
  const cfg = await import("@/config/affiliates");
  const { getStripe } = await import("@/lib/stripe-subscription");
  const { STRIPE_PRICES } = await import("@/config/stripe-prices");
  const { renderBrandedEmail } = await import("@/lib/email-brand");

  await dbConnect();
  const stripe = getStripe();
  const tag = `afftest-${Date.now()}`;
  const made = { users: [] as any[], affiliates: [] as any[], subs: [] as string[], customers: [] as string[] };

  try {
    // ── 6.1 apply + approve ────────────────────────────────────────────────
    console.log("\n6.1 apply → approve");
    const affUser = await User.create({ email: `${tag}-aff@example.test`, name: "Test Affiliate", roles: ["endUser"] });
    made.users.push(affUser._id);
    const aff = await Affiliate.create({
      userId: affUser._id,
      name: "Test Affiliate",
      email: affUser.email,
      promotionPlan: "Newsletter to agents",
      termsVersion: cfg.AFFILIATE_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      ftcDisclosureAcknowledged: true,
    });
    made.affiliates.push(aff._id);
    assert(aff.status === "pending", "application starts pending");
    assert((await lib.findEarningAffiliateByCode("ANY")) === null, "pending affiliate has no working code");

    aff.code = await lib.generateUniqueCode(aff.name);
    aff.status = "approved";
    aff.approvedAt = new Date();
    aff.approvedBy = "test-script";
    await aff.save();
    assert(cfg.AFFILIATE_CODE_RE.test(aff.code!), `approved with code ${aff.code}`);
    const link = cfg.affiliateLink(aff.code!);
    assert(link === `https://chatrealty.io/?ref=${aff.code}`, `link ${link}`);
    // Render the approval email body the same way the sender does (not sent).
    const html = renderBrandedEmail({ title: "You're a ChatRealty affiliate", bodyHtml: `<p>${aff.code}</p><p>${link}</p>` });
    const out = resolve(tmpdir(), `affiliate-approval-${tag}.html`);
    writeFileSync(out, html);
    assert(html.includes(aff.code!), "approval email renders with code");

    // ── 6.2 click + attribution ────────────────────────────────────────────
    console.log("\n6.2 click → cookie → signup");
    let cookieCode: string | null = null;
    if (BASE) {
      const res = await fetch(`${BASE}/api/affiliate/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: aff.code!.toLowerCase() }),
      });
      const setCookie = res.headers.get("set-cookie") || "";
      assert(res.status === 200, "track route is public (200, not 401)");
      const m = setCookie.match(new RegExp(`${cfg.AFFILIATE_COOKIE}=([^;]+)`));
      cookieCode = m?.[1] || null;
      assert(cookieCode === aff.code, `cookie ${cfg.AFFILIATE_COOKIE}=${cookieCode}`);
      assert(/Max-Age=7776000/i.test(setCookie) && /HttpOnly/i.test(setCookie), "cookie is httpOnly, 90 days");
    } else {
      cookieCode = await lib.recordClick(aff.code, null);
    }
    const afterClick = await Affiliate.findById(aff._id).lean<any>();
    assert(afterClick.clicks === 1, "click counted");
    assert((await lib.recordClick(aff.code, cookieCode)) === null, "repeat click with same cookie not double-counted");

    const agent = await User.create({ email: `${tag}-agent1@example.test`, name: "Agent One", roles: ["endUser"] /* never realEstateAgent: that role registers a real Vercel subdomain */ });
    made.users.push(agent._id);
    await lib.captureReferral(agent._id, cookieCode, "signup");
    const agentRef = (await User.findById(agent._id).lean<any>()).affiliateReferral;
    assert(String(agentRef?.affiliateId) === String(aff._id) && agentRef.source === "signup", "referral stored on User at signup");
    assert((await lib.captureReferral(affUser._id, cookieCode, "signup")) === null, "self-referral refused");

    // ── 6.3 real test-mode subscription → signed invoice.paid ─────────────
    console.log("\n6.3 test-mode subscription → invoice.paid → commission");
    async function payingSubscription(agentId: string, email: string) {
      const customer = await stripe.customers.create({ email, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" }, metadata: { test: tag } });
      made.customers.push(customer.id);
      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: STRIPE_PRICES.beginner.monthly }],
        metadata: { userId: agentId, tier: "beginner", billingInterval: "monthly", affiliateId: String(aff._id), test: tag },
        expand: ["latest_invoice"],
      });
      made.subs.push(sub.id);
      const invoice = sub.latest_invoice as any;
      return { sub, invoice: await stripe.invoices.retrieve(invoice.id) };
    }

    async function deliver(type: string, object: any) {
      if (!BASE) {
        if (type === "invoice.paid") return lib.recordInvoiceCommission(object, false);
        if (type === "charge.refunded") return lib.reverseCommissionForPayment({ paymentIntentId: object.payment_intent, chargeId: object.id, reason: "refund" });
        return;
      }
      const payload = JSON.stringify({ id: `evt_${tag}_${Math.random().toString(36).slice(2)}`, object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object } });
      const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
      const res = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "stripe-signature": header, "Content-Type": "application/json" }, body: payload });
      assert(res.ok, `webhook accepted ${type} (${res.status})`);
    }

    const first = await payingSubscription(String(agent._id), agent.email);
    assert(first.invoice.status === "paid" && first.invoice.amount_paid === 12500, `test invoice paid $${first.invoice.amount_paid / 100}`);
    // Deliver invoice.paid BEFORE the AgentSubscription row exists (the real race).
    await deliver("invoice.paid", first.invoice);
    await deliver("invoice.paid", first.invoice); // duplicate delivery
    const rows1 = await AffiliateCommission.find({ affiliateId: aff._id }).lean<any[]>();
    assert(rows1.length === 1, "one commission despite duplicate delivery");
    assert(rows1[0].amount === 5 && rows1[0].ratePerAgent === 5 && rows1[0].payingAgentsAtInvoice === 1, "$5 at 1 paying agent");
    assert(rows1[0].status === "pending", "commission is pending");
    const holdDays = Math.round((new Date(rows1[0].payableAt).getTime() - new Date(rows1[0].earnedAt).getTime()) / 86400000);
    assert(holdDays === cfg.REFUND_HOLD_DAYS, `payable after ${holdDays} days`);
    assert(!!rows1[0].stripePaymentIntentId, "payment intent recorded for refunds");
    const sub1 = await AgentSubscription.findOne({ stripeSubscriptionId: first.sub.id }).lean<any>();
    // The commission path locks referredBy only if the row exists; create it as checkout.session.completed would.
    if (!sub1) {
      await AgentSubscription.create({ agentId: agent._id, tier: "beginner", status: "active", billingInterval: "monthly", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), stripeSubscriptionId: first.sub.id, stripeCustomerId: first.sub.customer as string, referredBy: aff.userId });
    }

    // ── tier lift (A7/A8): 10 more paying agents → $8 for the next invoice ──
    console.log("\nTier: 11 paying agents → $8");
    for (let i = 0; i < 9; i++) {
      const u = await User.create({ email: `${tag}-filler${i}@example.test`, name: `Filler ${i}`, roles: ["endUser"] });
      made.users.push(u._id);
      await AgentSubscription.create({ agentId: u._id, tier: "beginner", status: "active", billingInterval: "monthly", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), referredBy: aff.userId });
    }
    // one churned agent must NOT count
    const churned = await User.create({ email: `${tag}-churned@example.test`, name: "Churned", roles: ["endUser"] });
    made.users.push(churned._id);
    await AgentSubscription.create({ agentId: churned._id, tier: "free", status: "cancelled", billingInterval: "monthly", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), referredBy: aff.userId });
    assert((await lib.countPayingAgents(aff.userId)) === 10, "10 currently paying (cancelled one excluded)");

    const agent2 = await User.create({ email: `${tag}-agent2@example.test`, name: "Agent Two", roles: ["endUser"] /* never realEstateAgent: that role registers a real Vercel subdomain */ });
    made.users.push(agent2._id);
    await lib.captureReferral(agent2._id, cookieCode, "checkout");
    const second = await payingSubscription(String(agent2._id), agent2.email);
    await deliver("invoice.paid", second.invoice);
    const row2 = await AffiliateCommission.findOne({ stripeInvoiceId: second.invoice.id }).lean<any>();
    assert(row2?.amount === 8 && row2.payingAgentsAtInvoice === 11, "$8 at 11 paying agents");

    // ── refund reverses ────────────────────────────────────────────────────
    console.log("\nRefund → reversal");
    const pi = rows1[0].stripePaymentIntentId;
    await stripe.refunds.create({ payment_intent: pi });
    const charges = await stripe.charges.list({ payment_intent: pi, limit: 1 });
    await deliver("charge.refunded", charges.data[0]);
    const reversed = await AffiliateCommission.findById(rows1[0]._id).lean<any>();
    assert(reversed.status === "reversed", "refunded commission reversed");

    // ── payouts gate + dashboard ───────────────────────────────────────────
    console.log("\nPayout job + dashboard");
    const prevFlag = process.env.AFFILIATE_PAYOUTS_ENABLED;
    delete process.env.AFFILIATE_PAYOUTS_ENABLED;
    const run = await lib.runAffiliatePayouts({ now: new Date(Date.now() + 31 * 86400000), force: true });
    if (prevFlag !== undefined) process.env.AFFILIATE_PAYOUTS_ENABLED = prevFlag;
    assert(!run.ran && run.promoted >= 1, `matured rows promoted (${run.promoted}); transfers gated off`);
    const freshAff = await Affiliate.findById(aff._id);
    const summary = await lib.getAffiliateSummary(freshAff!);
    console.log("  summary:", JSON.stringify({ clicks: summary.clicks, signups: summary.signups, payingAgents: summary.payingAgents, currentRate: summary.currentRate, totals: summary.totals }));
    assert(summary.signups === 2 && summary.payingAgents >= 10, "dashboard: signups + paying agents");
    assert(summary.totals.payable === 8 && summary.totals.earned === 8, "dashboard: $8 earned and payable (refunded $5 excluded)");

    console.log(`\nALL CHECKS PASSED (${tag})`);
    if (KEEP) console.log(`--keep: left affiliate ${aff._id} (code ${aff.code}) and test records in place.`);
  } finally {
    for (const s of made.subs) await stripe.subscriptions.cancel(s).catch(() => {});
    for (const c of made.customers) await stripe.customers.del(c).catch(() => {});
    if (!KEEP) {
      await AffiliateCommission.deleteMany({ affiliateId: { $in: made.affiliates } });
      await (await import("@/models/AffiliatePayout")).default.deleteMany({ affiliateId: { $in: made.affiliates } });
      await AgentSubscription.deleteMany({ $or: [{ agentId: { $in: made.users } }, { stripeSubscriptionId: { $in: made.subs } }] });
      await Affiliate.deleteMany({ _id: { $in: made.affiliates } });
      await User.deleteMany({ _id: { $in: made.users } });
      console.log("cleaned up test records + test-mode Stripe objects");
    }
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
