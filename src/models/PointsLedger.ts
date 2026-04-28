// src/models/PointsLedger.ts
// Points/credits system for marketing spend (Google Ads, Meta Ads, Direct Mail, Voicemail)
// Points are purchased via subscription or top-up. Each point converts to ad spend
// at a rate determined by the user's subscription tier.

import mongoose, { Schema, Document, Model } from "mongoose";

// ---------------------------------------------------------------------------
// Tier configuration — points per dollar and ad-spend rate
// ---------------------------------------------------------------------------

export type PointsTier = "beginner" | "experienced" | "topagent";

export interface PointsTierConfig {
  name: string;
  tier: PointsTier;
  monthlyPrice: number;       // What the user pays
  monthlyPoints: number;      // Points they receive
  adSpendRate: number;        // Dollars of ad spend per $1 spent (e.g., 0.75)
  costPerPoint: number;       // What 1 point costs the user in dollars
  adValuePerPoint: number;    // What 1 point is worth in ad spend dollars
}

export const POINTS_TIERS: Record<PointsTier, PointsTierConfig> = {
  beginner: {
    name: "Beginner",
    tier: "beginner",
    monthlyPrice: 125,
    monthlyPoints: 750,
    adSpendRate: 0.75,         // $0.75 ad spend per $1 paid
    costPerPoint: 0.16667,     // $125 / 750 points
    adValuePerPoint: 0.125,    // $93.75 / 750 points
  },
  experienced: {
    name: "Experienced",
    tier: "experienced",
    monthlyPrice: 500,
    monthlyPoints: 3200,
    adSpendRate: 0.80,         // $0.80 ad spend per $1 paid
    costPerPoint: 0.15625,     // $500 / 3200 points
    adValuePerPoint: 0.125,    // $400 / 3200 points
  },
  topagent: {
    name: "Top Agent",
    tier: "topagent",
    monthlyPrice: 1000,
    monthlyPoints: 6800,
    adSpendRate: 0.85,         // $0.85 ad spend per $1 paid
    costPerPoint: 0.14706,     // $1000 / 6800 points
    adValuePerPoint: 0.125,    // $850 / 6800 points
  },
};

// For custom top-ups above $999, use topagent rate (0.85)
export const CUSTOM_TOPUP_RATE = 0.85;

// Convert a dollar amount to points at a given tier rate
export function dollarsToPoints(dollars: number, tier: PointsTier): number {
  const config = POINTS_TIERS[tier];
  // Points = dollars / costPerPoint
  return Math.floor(dollars / config.costPerPoint);
}

// Convert points to ad spend value at a given tier
export function pointsToAdSpend(points: number, tier: PointsTier): number {
  const config = POINTS_TIERS[tier];
  return Math.round(points * config.adValuePerPoint * 100) / 100;
}

// ---------------------------------------------------------------------------
// Transaction types
// ---------------------------------------------------------------------------

export type TransactionType =
  | "subscription_credit"   // Monthly points from subscription
  | "topup_purchase"        // Bought extra points
  | "campaign_spend"        // Spent on a campaign (Google, Meta, Direct Mail, Voicemail)
  | "refund"                // Points returned from cancelled campaign
  | "bonus"                 // Promotional bonus points
  | "partner_split_credit"  // Points received from partnership cost split
  | "partner_split_debit"   // Points sent to partnership cost split
  | "adjustment";           // Manual admin adjustment

export type CampaignChannel = "google_ads" | "meta_ads" | "direct_mail" | "voicemail_drop";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IPointsTransaction {
  type: TransactionType;
  amount: number;              // Positive for credits, negative for debits
  balanceAfter: number;        // Running balance after this transaction
  description: string;         // Human-readable description
  channel?: CampaignChannel;   // Which ad channel (for campaign_spend)
  campaignId?: mongoose.Types.ObjectId; // Reference to campaign
  partnershipId?: mongoose.Types.ObjectId; // Reference to partnership (for splits)
  stripePaymentIntentId?: string; // Stripe reference for top-ups
  adSpendValue?: number;       // Actual dollar value of ad spend this represents
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IPointsLedger extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Current state
  balance: number;             // Current points balance
  totalEarned: number;         // Lifetime points earned
  totalSpent: number;          // Lifetime points spent
  tier: PointsTier;            // Current subscription tier (affects top-up rates)

  // Transaction history
  transactions: IPointsTransaction[];

  // Subscription tracking
  lastSubscriptionCredit: Date; // When last monthly credit was applied
  stripeCustomerId?: string;

  // Methods
  creditPoints(
    amount: number,
    type: TransactionType,
    description: string,
    extra?: Partial<IPointsTransaction>
  ): this;

  debitPoints(
    amount: number,
    type: TransactionType,
    description: string,
    extra?: Partial<IPointsTransaction>
  ): this;

  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PointsTransactionSchema = new Schema<IPointsTransaction>(
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
      enum: ["google_ads", "meta_ads", "direct_mail", "voicemail_drop"],
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

const PointsLedgerSchema = new Schema<IPointsLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    balance: { type: Number, default: 0, required: true },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ["beginner", "experienced", "topagent"],
      default: "beginner",
      required: true,
    },

    transactions: [PointsTransactionSchema],

    lastSubscriptionCredit: Date,
    stripeCustomerId: { type: String, index: true },
  },
  {
    timestamps: true,
    collection: "pointsledgers",
  }
);

// Indexes
PointsLedgerSchema.index({ userId: 1 }, { unique: true });
PointsLedgerSchema.index({ "transactions.createdAt": -1 });
PointsLedgerSchema.index({ "transactions.type": 1 });

// ---------------------------------------------------------------------------
// Instance methods
// ---------------------------------------------------------------------------

// Credit points (subscription, top-up, bonus, refund)
PointsLedgerSchema.methods.creditPoints = function (
  amount: number,
  type: TransactionType,
  description: string,
  extra: Partial<IPointsTransaction> = {}
) {
  if (amount <= 0) throw new Error("Credit amount must be positive");

  this.balance += amount;
  this.totalEarned += amount;

  const transaction: Partial<IPointsTransaction> = {
    type,
    amount,
    balanceAfter: this.balance,
    description,
    createdAt: new Date(),
    ...extra,
  };

  this.transactions.push(transaction);
  return this;
};

// Debit points (campaign spend, partner split)
PointsLedgerSchema.methods.debitPoints = function (
  amount: number,
  type: TransactionType,
  description: string,
  extra: Partial<IPointsTransaction> = {}
) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  if (this.balance < amount) throw new Error("Insufficient points balance");

  this.balance -= amount;
  this.totalSpent += amount;

  const transaction: Partial<IPointsTransaction> = {
    type,
    amount: -amount, // Negative for debits
    balanceAfter: this.balance,
    description,
    createdAt: new Date(),
    ...extra,
  };

  this.transactions.push(transaction);
  return this;
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default (mongoose.models.PointsLedger ||
  mongoose.model<IPointsLedger>("PointsLedger", PointsLedgerSchema)) as Model<IPointsLedger>;
