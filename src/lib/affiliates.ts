// src/lib/affiliates.ts
// Affiliate program logic: click tracking, attribution, the commission ledger,
// reversals, and Stripe Connect payouts. Routes and the Stripe webhook call
// these; nothing else should compute affiliate money.
//
// Rules (rates, windows, minimums) come from src/config/affiliates.ts.
// Docs: docs/commerce/affiliates.md.
//
// COMPLIANCE GUARD: commissions are computed ONLY from ChatRealty agent
// subscription invoices. Never call recordInvoiceCommission for credit
// top-ups, ad spend, domains, or anything tied to a real-estate transaction,
// lead or closing — that would turn a SaaS revenue share into a DRE / RESPA §8
// referral fee.

import crypto from "crypto";
import type Stripe from "stripe";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { getStripe } from "@/lib/stripe-subscription";
import { requireStripeMode } from "@/lib/stripe-mode";
import Affiliate, { type IAffiliate } from "@/models/Affiliate";
import AffiliateCommission from "@/models/AffiliateCommission";
import AffiliatePayout from "@/models/AffiliatePayout";
import AgentSubscription from "@/models/AgentSubscription";
import User from "@/models/User";
import {
  ATTRIBUTION_MODEL,
  PAYOUT_DAY_OF_MONTH,
  PAYOUT_MINIMUM_USD,
  REFUND_HOLD_DAYS,
  AFFILIATE_TIERS,
  normalizeAffiliateCode,
  rateForCount,
  tierForCount,
} from "@/config/affiliates";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Statuses whose links still attribute and whose agents still earn. Paused accrues but does not pay out. */
const EARNING_STATUSES = ["approved", "paused"] as const;
const AGENT_TIERS = new Set(["beginner", "experienced", "topagent"]);

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

/** A unique share code from the affiliate's name, e.g. "JOSEPH-4821". */
export async function generateUniqueCode(name: string, preferred?: string): Promise<string> {
  await dbConnect();
  const wanted = normalizeAffiliateCode(preferred);
  if (wanted && !(await Affiliate.exists({ code: wanted }))) return wanted;

  const stem = (name || "PARTNER").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PARTNER";
  for (let i = 0; i < 20; i++) {
    const code = `${stem.length >= 2 ? stem : "CR" + stem}-${crypto.randomInt(1000, 9999)}`;
    if (!(await Affiliate.exists({ code }))) return code;
  }
  return `CR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/** The affiliate whose link a code belongs to, if that link should still attribute. */
export async function findEarningAffiliateByCode(rawCode: unknown): Promise<IAffiliate | null> {
  const code = normalizeAffiliateCode(rawCode);
  if (!code) return null;
  await dbConnect();
  return Affiliate.findOne({ code, status: { $in: EARNING_STATUSES } });
}

// ---------------------------------------------------------------------------
// Clicks + attribution
// ---------------------------------------------------------------------------

/**
 * Count a link visit. Returns the code the cookie should hold afterwards, or
 * null when the cookie should be left alone. A repeat visit with the same code
 * does not count as a new click.
 */
export async function recordClick(rawCode: unknown, cookieCode?: string | null): Promise<string | null> {
  const affiliate = await findEarningAffiliateByCode(rawCode);
  if (!affiliate?.code) return null;
  const existing = normalizeAffiliateCode(cookieCode);
  if (existing === affiliate.code) return null; // same link again — not a new click
  if (existing && ATTRIBUTION_MODEL === "first") return null; // first click sticks
  await Affiliate.updateOne({ _id: affiliate._id }, { $inc: { clicks: 1 }, $set: { lastClickAt: new Date() } });
  return affiliate.code;
}

/**
 * Store the cookie's affiliate on a user. Called at signup and again at
 * checkout (last click wins until the agent's subscription is attributed —
 * after that the referral is locked). Never attributes a user to themself.
 * Returns the affiliate written, or null.
 */
export async function captureReferral(
  userId: string | mongoose.Types.ObjectId,
  cookieCode: string | null | undefined,
  source: "signup" | "checkout"
): Promise<IAffiliate | null> {
  if (!cookieCode) return null;
  const affiliate = await findEarningAffiliateByCode(cookieCode);
  if (!affiliate) return null;
  if (String(affiliate.userId) === String(userId)) return null;

  const locked = await AgentSubscription.exists({ agentId: userId, referredBy: { $exists: true, $ne: null } });
  if (locked) return null;

  const user = await User.findById(userId).select("affiliateReferral");
  if (!user) return null;
  const current = (user as any).affiliateReferral;
  if (current?.affiliateId && ATTRIBUTION_MODEL === "first") return null;
  if (current?.affiliateId && String(current.affiliateId) === String(affiliate._id)) return affiliate;

  await User.updateOne(
    { _id: userId },
    { $set: { affiliateReferral: { affiliateId: affiliate._id, code: affiliate.code, capturedAt: new Date(), source } } }
  );
  return affiliate;
}

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

/**
 * Currently paying agents for an affiliate: attributed subscriptions that are
 * active on a paid tier. Trials, past-due and cancelled do not count (A7).
 * `includeAgentId` counts that agent even if their subscription row has not
 * landed yet (the first invoice can beat checkout.session.completed).
 */
export async function countPayingAgents(
  affiliateUserId: mongoose.Types.ObjectId | string,
  includeAgentId?: mongoose.Types.ObjectId | string
): Promise<number> {
  await dbConnect();
  const ids = await AgentSubscription.distinct("agentId", {
    referredBy: affiliateUserId,
    status: "active",
    tier: { $ne: "free" },
  });
  const set = new Set(ids.map(String));
  if (includeAgentId) set.add(String(includeAgentId));
  return set.size;
}

// ---------------------------------------------------------------------------
// Commission ledger
// ---------------------------------------------------------------------------

function invoiceSubscription(invoice: Stripe.Invoice): { subId?: string; metadata: Record<string, string> } {
  const details = invoice.parent?.subscription_details;
  const sub = details?.subscription;
  const subId = typeof sub === "string" ? sub : sub?.id;
  return { subId, metadata: (details?.metadata as Record<string, string>) || {} };
}

async function paymentIntentForInvoice(invoiceId: string): Promise<string | undefined> {
  try {
    const list = await getStripe().invoicePayments.list({ invoice: invoiceId, limit: 1 });
    const pi = list.data[0]?.payment?.payment_intent;
    return typeof pi === "string" ? pi : pi?.id;
  } catch (err) {
    console.warn("[affiliates] could not resolve payment intent for", invoiceId, (err as Error).message);
    return undefined;
  }
}

export type CommissionResult =
  | { created: true; commissionId: string; amount: number; rate: number; payingAgents: number }
  | { created: false; reason: string };

/**
 * Turn a paid subscription invoice into a pending commission row, if the
 * agent was referred by an affiliate who is still earning. Idempotent on the
 * invoice id (invoice.paid and invoice.payment_succeeded both arrive).
 */
export async function recordInvoiceCommission(invoice: Stripe.Invoice, livemode: boolean): Promise<CommissionResult> {
  await dbConnect();
  const { subId, metadata } = invoiceSubscription(invoice);
  if (!subId || !invoice.id) return { created: false, reason: "not a subscription invoice" };

  const amountPaid = (invoice.amount_paid ?? 0) / 100;
  if (amountPaid <= 0) return { created: false, reason: "nothing paid" };

  // Subscriptions only — and only ChatRealty agent plans (not Pro, not domains).
  const subDoc = await AgentSubscription.findOne({ stripeSubscriptionId: subId }).lean<any>();
  const tier = subDoc?.tier || metadata.tier;
  if (!tier || !AGENT_TIERS.has(tier)) return { created: false, reason: "not an agent plan invoice" };

  const agentId = subDoc?.agentId || metadata.userId;
  if (!agentId || !mongoose.isValidObjectId(String(agentId))) return { created: false, reason: "no agent" };

  // Who referred this agent: the locked subscription attribution, then the
  // checkout metadata, then the user's stored referral.
  let affiliate: IAffiliate | null = null;
  if (subDoc?.referredBy) affiliate = await Affiliate.findOne({ userId: subDoc.referredBy });
  if (!affiliate && metadata.affiliateId && mongoose.isValidObjectId(metadata.affiliateId)) {
    affiliate = await Affiliate.findById(metadata.affiliateId);
  }
  if (!affiliate) {
    const agent = await User.findById(agentId).select("affiliateReferral").lean<any>();
    if (agent?.affiliateReferral?.affiliateId) affiliate = await Affiliate.findById(agent.affiliateReferral.affiliateId);
  }
  if (!affiliate) return { created: false, reason: "not referred" };
  if (!(EARNING_STATUSES as readonly string[]).includes(affiliate.status)) {
    return { created: false, reason: `affiliate ${affiliate.status}` };
  }
  if (String(affiliate.userId) === String(agentId)) return { created: false, reason: "self-referral" };

  // Lock attribution on the subscription row the first time we pay on it.
  await AgentSubscription.updateOne(
    { stripeSubscriptionId: subId, $or: [{ referredBy: { $exists: false } }, { referredBy: null }] },
    { $set: { referredBy: affiliate.userId } }
  );

  const payingAgents = await countPayingAgents(affiliate.userId, agentId);
  const overridden = typeof affiliate.rateOverride === "number" && affiliate.rateOverride >= 0;
  const rate = rateForCount(payingAgents, affiliate.rateOverride);
  const interval = subDoc?.billingInterval || metadata.billingInterval;
  const months = interval === "annual" || interval === "yearly" ? 12 : 1;
  // Never pay out more than the agent actually paid on this invoice.
  const amount = round2(Math.min(rate * months, amountPaid));
  if (amount <= 0) return { created: false, reason: "zero rate" };

  const now = new Date();
  try {
    const row = await AffiliateCommission.create({
      affiliateId: affiliate._id,
      affiliateUserId: affiliate.userId,
      agentId,
      kind: "commission",
      status: "pending",
      amount,
      currency: invoice.currency || "usd",
      ratePerAgent: rate,
      payingAgentsAtInvoice: payingAgents,
      months,
      rateOverridden: overridden,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subId,
      stripePaymentIntentId: await paymentIntentForInvoice(invoice.id),
      invoiceAmountPaid: amountPaid,
      livemode,
      earnedAt: now,
      payableAt: new Date(now.getTime() + REFUND_HOLD_DAYS * DAY_MS),
    });
    console.log(`[affiliates] commission $${amount} → affiliate ${affiliate.code} for invoice ${invoice.id} (${payingAgents} paying, $${rate}/agent)`);
    return { created: true, commissionId: String(row._id), amount, rate, payingAgents };
  } catch (e: any) {
    if (e?.code === 11000) return { created: false, reason: "already recorded" };
    throw e;
  }
}

/**
 * Reverse the commission for a refunded or disputed subscription payment.
 * Before payout the row is voided; after payout a negative clawback row nets
 * against the next payout.
 */
export async function reverseCommissionForPayment(opts: {
  paymentIntentId?: string | null;
  chargeId?: string | null;
  reason: string;
}): Promise<"none" | "reversed" | "clawback" | "already"> {
  await dbConnect();
  if (!opts.paymentIntentId) return "none";
  const row = await AffiliateCommission.findOne({ kind: "commission", stripePaymentIntentId: opts.paymentIntentId });
  if (!row) return "none";
  if (row.status === "reversed") return "already";

  if (row.status === "pending" || row.status === "payable") {
    const res = await AffiliateCommission.updateOne(
      { _id: row._id, status: { $in: ["pending", "payable"] } },
      { $set: { status: "reversed", reversedAt: new Date(), reversalReason: opts.reason, stripeChargeId: opts.chargeId || undefined } }
    );
    if (res.modifiedCount === 1) return "reversed";
    // Lost a race with the payout run — fall through to clawback.
  }

  try {
    await AffiliateCommission.create({
      affiliateId: row.affiliateId,
      affiliateUserId: row.affiliateUserId,
      agentId: row.agentId,
      kind: "clawback",
      status: "payable",
      amount: -Math.abs(row.amount),
      currency: row.currency,
      ratePerAgent: row.ratePerAgent,
      payingAgentsAtInvoice: row.payingAgentsAtInvoice,
      months: row.months,
      stripeInvoiceId: row.stripeInvoiceId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      stripeChargeId: opts.chargeId || undefined,
      livemode: row.livemode,
      earnedAt: new Date(),
      payableAt: new Date(),
      reversesCommissionId: row._id,
      reversalReason: opts.reason,
      note: `Clawback: ${opts.reason} after payout`,
    });
    return "clawback";
  } catch (e: any) {
    if (e?.code === 11000) return "already";
    throw e;
  }
}

/** Move commissions whose refund hold has passed from pending to payable. */
export async function promotePayableCommissions(now = new Date()): Promise<number> {
  await dbConnect();
  const res = await AffiliateCommission.updateMany(
    { status: "pending", payableAt: { $lte: now } },
    { $set: { status: "payable" } }
  );
  return res.modifiedCount;
}

// ---------------------------------------------------------------------------
// Stripe Connect Express
// ---------------------------------------------------------------------------

/** Create (or reuse) the affiliate's Express account and return a Stripe-hosted onboarding link. */
export async function createConnectOnboardingLink(affiliate: IAffiliate, baseUrl: string): Promise<string> {
  const stripe = getStripe();
  const livemode = requireStripeMode() === "live";

  // An account made with test keys does not exist in live mode (and vice versa).
  if (!affiliate.stripeConnectAccountId || affiliate.stripeConnectLivemode !== livemode) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: affiliate.email,
      capabilities: { transfers: { requested: true } },
      metadata: { affiliateId: String(affiliate._id), userId: String(affiliate.userId) },
    });
    affiliate.stripeConnectAccountId = account.id;
    affiliate.stripeConnectLivemode = livemode;
    affiliate.payoutsEnabled = false;
    affiliate.connectDetailsSubmitted = false;
    await affiliate.save();
  }

  const link = await stripe.accountLinks.create({
    account: affiliate.stripeConnectAccountId!,
    refresh_url: `${baseUrl}/partner/affiliate?connect=refresh`,
    return_url: `${baseUrl}/partner/affiliate?connect=return`,
    type: "account_onboarding",
  });
  return link.url;
}

/** Pull the Express account's state from Stripe (no Connect webhook needed). */
export async function refreshConnectStatus(affiliate: IAffiliate): Promise<void> {
  if (!affiliate.stripeConnectAccountId) return;
  const livemode = requireStripeMode() === "live";
  if (affiliate.stripeConnectLivemode !== livemode) return;
  try {
    const acct = await getStripe().accounts.retrieve(affiliate.stripeConnectAccountId);
    const payoutsEnabled = !!acct.payouts_enabled && acct.capabilities?.transfers === "active";
    if (payoutsEnabled !== affiliate.payoutsEnabled || !!acct.details_submitted !== affiliate.connectDetailsSubmitted) {
      affiliate.payoutsEnabled = payoutsEnabled;
      affiliate.connectDetailsSubmitted = !!acct.details_submitted;
      await affiliate.save();
    }
  } catch (err) {
    console.warn("[affiliates] connect status refresh failed:", (err as Error).message);
  }
}

/** Express dashboard login link, for an onboarded affiliate to see their Stripe payouts. */
export async function createConnectLoginLink(affiliate: IAffiliate): Promise<string | null> {
  if (!affiliate.stripeConnectAccountId || !affiliate.connectDetailsSubmitted) return null;
  const link = await getStripe().accounts.createLoginLink(affiliate.stripeConnectAccountId);
  return link.url;
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export interface PayoutRunResult {
  periodLabel: string;
  promoted: number;
  ran: boolean;
  skippedReason?: string;
  payouts: Array<{ affiliateId: string; code?: string; amount: number; status: string; error?: string }>;
}

/**
 * Daily job: promote matured commissions, and on the payout day transfer each
 * eligible affiliate's net payable balance (>= minimum) to their Express
 * account. Transfers are sent ONLY when AFFILIATE_PAYOUTS_ENABLED === "true",
 * so a merged deploy cannot move money before the program launches.
 */
export async function runAffiliatePayouts(opts: { now?: Date; force?: boolean } = {}): Promise<PayoutRunResult> {
  const now = opts.now || new Date();
  const periodLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const result: PayoutRunResult = { periodLabel, promoted: await promotePayableCommissions(now), ran: false, payouts: [] };

  if (process.env.AFFILIATE_PAYOUTS_ENABLED !== "true") {
    result.skippedReason = "AFFILIATE_PAYOUTS_ENABLED is not true";
    return result;
  }
  if (!opts.force && now.getUTCDate() !== PAYOUT_DAY_OF_MONTH) {
    result.skippedReason = `not payout day (${PAYOUT_DAY_OF_MONTH})`;
    return result;
  }
  result.ran = true;

  const livemode = requireStripeMode() === "live";
  const stripe = getStripe();
  const affiliates = await Affiliate.find({ status: "approved", stripeConnectAccountId: { $exists: true } });

  for (const affiliate of affiliates) {
    await refreshConnectStatus(affiliate);
    if (!affiliate.payoutsEnabled || affiliate.stripeConnectLivemode !== livemode) continue;

    const rows = await AffiliateCommission.find({ affiliateId: affiliate._id, status: "payable", livemode });
    const total = round2(rows.reduce((s, r) => s + r.amount, 0));
    if (rows.length === 0 || total < PAYOUT_MINIMUM_USD) continue;

    // Claim the month's payout row first; its id is the Stripe idempotency key.
    let payout = await AffiliatePayout.findOne({ affiliateId: affiliate._id, periodLabel, livemode });
    if (payout?.status === "paid") continue;
    if (!payout) {
      try {
        payout = await AffiliatePayout.create({
          affiliateId: affiliate._id,
          amount: total,
          commissionIds: rows.map((r) => r._id),
          stripeConnectAccountId: affiliate.stripeConnectAccountId!,
          livemode,
          periodLabel,
        });
      } catch (e: any) {
        if (e?.code === 11000) continue; // another run claimed it
        throw e;
      }
    } else {
      payout.amount = total;
      payout.commissionIds = rows.map((r) => r._id as mongoose.Types.ObjectId);
      payout.status = "processing";
      payout.error = undefined;
      await payout.save();
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(total * 100),
          currency: "usd",
          destination: affiliate.stripeConnectAccountId!,
          transfer_group: `affiliate-${periodLabel}`,
          description: `ChatRealty affiliate commissions ${periodLabel}`,
          metadata: { affiliateId: String(affiliate._id), payoutId: String(payout._id), periodLabel },
        },
        { idempotencyKey: `affiliate-payout-${payout._id}-${Math.round(total * 100)}` }
      );
      await AffiliateCommission.updateMany(
        { _id: { $in: rows.map((r) => r._id) }, status: "payable" },
        { $set: { status: "paid", paidAt: now, payoutId: payout._id } }
      );
      payout.status = "paid";
      payout.stripeTransferId = transfer.id;
      await payout.save();
      result.payouts.push({ affiliateId: String(affiliate._id), code: affiliate.code, amount: total, status: "paid" });
    } catch (err) {
      payout.status = "failed";
      payout.error = (err as Error).message;
      await payout.save();
      result.payouts.push({ affiliateId: String(affiliate._id), code: affiliate.code, amount: total, status: "failed", error: payout.error });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export async function getAffiliateSummary(affiliate: IAffiliate) {
  await dbConnect();
  const livemode = (() => {
    try { return requireStripeMode() === "live"; } catch { return false; }
  })();

  const [signups, payingAgents, sums, recent, payouts] = await Promise.all([
    User.countDocuments({ "affiliateReferral.affiliateId": affiliate._id }),
    countPayingAgents(affiliate.userId),
    AffiliateCommission.aggregate([
      { $match: { affiliateId: affiliate._id, livemode } },
      { $group: { _id: "$status", total: { $sum: "$amount" } } },
    ]),
    AffiliateCommission.find({ affiliateId: affiliate._id, livemode })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("agentId", "name")
      .lean<any[]>(),
    AffiliatePayout.find({ affiliateId: affiliate._id, livemode }).sort({ createdAt: -1 }).limit(24).lean<any[]>(),
  ]);

  const by = Object.fromEntries(sums.map((s: any) => [s._id, round2(s.total)])) as Record<string, number>;
  const pending = by.pending || 0;
  const payable = by.payable || 0;
  const paid = by.paid || 0;
  const tier = tierForCount(payingAgents);
  const nextTier = AFFILIATE_TIERS.find((t) => t.minAgents > payingAgents) || null;

  const privateName = (name?: string) => {
    const parts = (name || "Agent").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  };

  return {
    livemode,
    clicks: affiliate.clicks || 0,
    signups,
    payingAgents,
    currentRate: rateForCount(payingAgents, affiliate.rateOverride),
    rateOverride: affiliate.rateOverride ?? null,
    tier,
    nextTier,
    monthlyRunRate: round2(payingAgents * rateForCount(payingAgents, affiliate.rateOverride)),
    totals: { earned: round2(pending + payable + paid), pending, payable, paid },
    commissions: recent.map((c) => ({
      id: String(c._id),
      kind: c.kind,
      status: c.status,
      amount: c.amount,
      ratePerAgent: c.ratePerAgent,
      payingAgentsAtInvoice: c.payingAgentsAtInvoice,
      agent: privateName(c.agentId?.name),
      earnedAt: c.earnedAt,
      payableAt: c.payableAt,
      paidAt: c.paidAt,
    })),
    payouts: payouts.map((p) => ({
      id: String(p._id),
      amount: p.amount,
      status: p.status,
      periodLabel: p.periodLabel,
      createdAt: p.createdAt,
    })),
  };
}
