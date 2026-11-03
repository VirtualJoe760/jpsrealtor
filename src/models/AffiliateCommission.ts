// src/models/AffiliateCommission.ts
// One row per paid subscription invoice of an attributed agent. The ledger the
// affiliate dashboard, admin view and payout cron all read.
//
// Lifecycle: pending (inside the refund hold) → payable (hold passed) → paid
// (included in a Stripe transfer). A refund or chargeback before payout flips
// the row to reversed; after payout it adds a negative "clawback" row that the
// next payout nets against. Rules: src/config/affiliates.ts.
//
// Subscription revenue only — never credits, ad spend, or a real-estate deal.

import mongoose, { Schema, Document, Model } from "mongoose";

export type AffiliateCommissionStatus = "pending" | "payable" | "paid" | "reversed";
export type AffiliateCommissionKind = "commission" | "clawback" | "adjustment";

export interface IAffiliateCommission extends Document {
  affiliateId: mongoose.Types.ObjectId;
  affiliateUserId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  kind: AffiliateCommissionKind;
  status: AffiliateCommissionStatus;

  /** Dollars. Negative for clawbacks. */
  amount: number;
  currency: string;
  /** Snapshot of how the amount was computed. */
  ratePerAgent: number;
  payingAgentsAtInvoice: number;
  months: number;
  rateOverridden: boolean;

  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  invoiceAmountPaid?: number; // dollars
  livemode: boolean;

  earnedAt: Date;
  payableAt: Date;
  paidAt?: Date;
  payoutId?: mongoose.Types.ObjectId;

  reversedAt?: Date;
  reversalReason?: string;
  /** For clawbacks: the commission row it offsets. */
  reversesCommissionId?: mongoose.Types.ObjectId;
  note?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AffiliateCommissionSchema = new Schema<IAffiliateCommission>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: "Affiliate", required: true, index: true },
    affiliateUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["commission", "clawback", "adjustment"], default: "commission" },
    status: {
      type: String,
      enum: ["pending", "payable", "paid", "reversed"],
      default: "pending",
      index: true,
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    ratePerAgent: { type: Number, required: true },
    payingAgentsAtInvoice: { type: Number, required: true },
    months: { type: Number, default: 1 },
    rateOverridden: { type: Boolean, default: false },

    stripeInvoiceId: String,
    stripeSubscriptionId: String,
    stripePaymentIntentId: { type: String, index: true },
    stripeChargeId: String,
    invoiceAmountPaid: Number,
    livemode: { type: Boolean, required: true },

    earnedAt: { type: Date, required: true },
    payableAt: { type: Date, required: true, index: true },
    paidAt: Date,
    payoutId: { type: Schema.Types.ObjectId, ref: "AffiliatePayout" },

    reversedAt: Date,
    reversalReason: String,
    reversesCommissionId: { type: Schema.Types.ObjectId, ref: "AffiliateCommission" },
    note: String,
  },
  { timestamps: true, collection: "affiliate_commissions" }
);

// One commission per invoice — Stripe sends invoice.paid AND
// invoice.payment_succeeded, and retries both. The unique key makes a second
// delivery a no-op instead of a double payment.
AffiliateCommissionSchema.index(
  { stripeInvoiceId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { stripeInvoiceId: { $type: "string" }, kind: "commission" } }
);
// One clawback per reversed commission.
AffiliateCommissionSchema.index(
  { reversesCommissionId: 1 },
  { unique: true, partialFilterExpression: { kind: "clawback" } }
);
AffiliateCommissionSchema.index({ affiliateId: 1, status: 1, livemode: 1 });

export default (mongoose.models.AffiliateCommission ||
  mongoose.model<IAffiliateCommission>("AffiliateCommission", AffiliateCommissionSchema)) as Model<IAffiliateCommission>;
