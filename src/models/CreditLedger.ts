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
  | "adjustment";           // Manual admin adjustment

export type CampaignChannel = "google_ads" | "meta_ads" | "youtube_ads" | "direct_mail" | "voicemail_drop";

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
        "adjustment",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    channel: {
      type: String,
      enum: ["google_ads", "meta_ads", "youtube_ads", "direct_mail", "voicemail_drop"],
    },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
    partnershipId: { type: Schema.Types.ObjectId, ref: "Partnership" },
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
// Export
// ---------------------------------------------------------------------------

const CreditLedger = (mongoose.models.CreditLedger ||
  mongoose.model<ICreditLedger>("CreditLedger", CreditLedgerSchema)) as Model<ICreditLedger>;

export default CreditLedger;
