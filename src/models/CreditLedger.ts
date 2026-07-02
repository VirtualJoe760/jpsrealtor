// src/models/CreditLedger.ts
// Credit ledger — storage for the credits system (subscriptions, top-ups, spend).
// All credit math (rates, conversions, tier costs) lives in src/config/credits.ts.
// All operations (quote, debit, credit, balance) go through src/lib/credits.ts.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { CreditTier } from "@/config/credits";

// ---------------------------------------------------------------------------
// Transaction types
// ---------------------------------------------------------------------------

export type CreditTransactionType =
  | "subscription_credit"   // Monthly credits from subscription
  | "topup_purchase"        // Bought extra credits
  | "campaign_spend"        // Spent on a campaign (Google, Meta, Direct Mail, Voicemail)
  | "refund"                // Credits returned from cancelled campaign
  | "bonus"                 // Promotional bonus credits
  | "partner_split_credit"  // Credits received from partnership cost split
  | "partner_split_debit"   // Credits sent to partnership cost split
  | "messaging_setup"       // Flat fee to activate per-agent SMS (number + A2P)
  | "email_setup"           // Flat fee to activate per-agent email (verified domain)
  | "sms_send"              // Metered outbound SMS
  | "email_send"            // Metered outbound email
  | "adjustment";           // Manual admin adjustment

export type CampaignChannel = "google_ads" | "meta_ads" | "youtube_ads" | "direct_mail" | "voicemail_drop" | "sms" | "email";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ICreditTransaction {
  type: CreditTransactionType;
  amount: number;              // Positive for credits in, negative for debits out
  balanceAfter: number;
  description: string;
  channel?: CampaignChannel;
  campaignId?: mongoose.Types.ObjectId;
  partnershipId?: mongoose.Types.ObjectId;
  fundingId?: mongoose.Types.ObjectId;   // ref CampaignFunding — co-marketing split traceability
  stripePaymentIntentId?: string;
  adSpendValue?: number;       // Actual dollar value at $0.10/credit
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ICreditLedger extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  balance: number;
  totalEarned: number;
  totalSpent: number;
  tier: CreditTier;

  transactions: ICreditTransaction[];

  lastSubscriptionCredit: Date;
  stripeCustomerId?: string;

  creditPoints(
    amount: number,
    type: CreditTransactionType,
    description: string,
    extra?: Partial<ICreditTransaction>
  ): this;

  debitPoints(
    amount: number,
    type: CreditTransactionType,
    description: string,
    extra?: Partial<ICreditTransaction>
  ): this;

  createdAt: Date;
  updatedAt: Date;
}

/** Input for the atomic conditional debit static. */
export interface AtomicDebitInput {
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: CreditTransactionType;
  description: string;
  extra?: Partial<ICreditTransaction>;
}

export type AtomicDebitResult =
  | { ok: true; ledger: ICreditLedger }
  | { ok: false; reason: "no_ledger" | "insufficient"; balance: number };

export interface ICreditLedgerModel extends Model<ICreditLedger> {
  /**
   * Atomically debit `amount` credits iff the current balance is sufficient.
   * Uses a conditional filter + aggregation-pipeline update so two concurrent
   * debits can never overspend (no read-then-write race). Mirrors the in-memory
   * bookkeeping of the debitPoints() instance method.
   */
  debitAtomic(input: AtomicDebitInput): Promise<AtomicDebitResult>;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    type: {
      type: String,
      enum: [
        "subscription_credit", "topup_purchase", "campaign_spend",
        "refund", "bonus", "partner_split_credit", "partner_split_debit",
        "messaging_setup", "email_setup", "sms_send", "email_send",
        "adjustment",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    channel: {
      type: String,
      enum: ["google_ads", "meta_ads", "youtube_ads", "direct_mail", "voicemail_drop", "sms", "email"],
    },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    partnershipId: { type: Schema.Types.ObjectId, ref: "Partnership" },
    fundingId: { type: Schema.Types.ObjectId, ref: "CampaignFunding" },
    stripePaymentIntentId: String,
    adSpendValue: Number,
    metadata: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CreditLedgerSchema = new Schema<ICreditLedger>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    balance: { type: Number, default: 0, required: true },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tier: { type: String, enum: ["beginner", "experienced", "topagent"], default: "beginner", required: true },
    transactions: [CreditTransactionSchema],
    lastSubscriptionCredit: Date,
    stripeCustomerId: { type: String, index: true },
  },
  {
    timestamps: true,
    // Collection name kept as "pointsledgers" to avoid a data migration —
    // the model is the canonical name, the collection is just storage.
    collection: "pointsledgers",
  }
);

CreditLedgerSchema.index({ userId: 1 }, { unique: true });
CreditLedgerSchema.index({ "transactions.createdAt": -1 });
CreditLedgerSchema.index({ "transactions.type": 1 });

// ---------------------------------------------------------------------------
// Instance methods
// ---------------------------------------------------------------------------

CreditLedgerSchema.methods.creditPoints = function (
  amount: number,
  type: CreditTransactionType,
  description: string,
  extra: Partial<ICreditTransaction> = {}
) {
  if (amount <= 0) throw new Error("Credit amount must be positive");

  this.balance += amount;
  this.totalEarned += amount;

  this.transactions.push({
    type,
    amount,
    balanceAfter: this.balance,
    description,
    createdAt: new Date(),
    ...extra,
  });
  return this;
};

CreditLedgerSchema.methods.debitPoints = function (
  amount: number,
  type: CreditTransactionType,
  description: string,
  extra: Partial<ICreditTransaction> = {}
) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  if (this.balance < amount) throw new Error("Insufficient credit balance");

  this.balance -= amount;
  this.totalSpent += amount;

  this.transactions.push({
    type,
    amount: -amount,
    balanceAfter: this.balance,
    description,
    createdAt: new Date(),
    ...extra,
  });
  return this;
};

// ---------------------------------------------------------------------------
// Static methods
// ---------------------------------------------------------------------------

CreditLedgerSchema.statics.debitAtomic = async function (
  input: AtomicDebitInput
): Promise<AtomicDebitResult> {
  const { userId, amount, type, description, extra = {} } = input;
  if (amount <= 0) throw new Error("Debit amount must be positive");

  // Drop undefined keys so the raw pipeline update (no schema casting, unlike
  // .save()) doesn't persist spurious null-ish fields like `channel: undefined`.
  const cleanExtra: Record<string, any> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) cleanExtra[k] = v;
  }

  // Assemble the transaction subdoc up front. amount is stored negative for
  // debits (same convention as debitPoints); balanceAfter is stamped by the
  // pipeline from the post-decrement balance.
  const txn: Record<string, any> = {
    _id: new mongoose.Types.ObjectId(),
    type,
    amount: -amount,
    description,
    createdAt: new Date(),
    ...cleanExtra,
  };

  // Conditional filter { balance: { $gte: amount } } guarantees the decrement
  // only applies when funds are sufficient. Under concurrency, whichever debit
  // commits first lowers the balance; a racing debit that would overspend no
  // longer matches the filter and returns null — so the balance can never go
  // negative.
  const ledger = await this.findOneAndUpdate(
    { userId, balance: { $gte: amount } },
    [
      {
        $set: {
          balance: { $subtract: ["$balance", amount] },
          totalSpent: { $add: [{ $ifNull: ["$totalSpent", 0] }, amount] },
        },
      },
      {
        $set: {
          transactions: {
            $concatArrays: [
              { $ifNull: ["$transactions", []] },
              [{ $mergeObjects: [txn, { balanceAfter: "$balance" }] }],
            ],
          },
        },
      },
    ],
    { new: true }
  );

  if (ledger) return { ok: true, ledger };

  // No match: distinguish "no ledger" from "insufficient balance" for callers.
  const existing = await this.findOne({ userId }).select("balance").lean();
  if (!existing) return { ok: false, reason: "no_ledger", balance: 0 };
  return { ok: false, reason: "insufficient", balance: existing.balance };
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const CreditLedger = (mongoose.models.CreditLedger ||
  mongoose.model<ICreditLedger>("CreditLedger", CreditLedgerSchema)) as ICreditLedgerModel;

export default CreditLedger;
