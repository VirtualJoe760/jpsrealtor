// src/models/AffiliatePayout.ts
// One Stripe Connect transfer to an affiliate, covering a set of payable
// commission rows (and netting any clawbacks). Created "processing" BEFORE the
// transfer call and used as the Stripe idempotency key, so a crash mid-payout
// can be retried without sending money twice.

import mongoose, { Schema, Document, Model } from "mongoose";

export type AffiliatePayoutStatus = "processing" | "paid" | "failed";

export interface IAffiliatePayout extends Document {
  affiliateId: mongoose.Types.ObjectId;
  amount: number; // dollars
  currency: string;
  status: AffiliatePayoutStatus;
  commissionIds: mongoose.Types.ObjectId[];
  stripeConnectAccountId: string;
  stripeTransferId?: string;
  livemode: boolean;
  error?: string;
  periodLabel: string; // e.g. "2026-11"
  createdAt: Date;
  updatedAt: Date;
}

const AffiliatePayoutSchema = new Schema<IAffiliatePayout>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: "Affiliate", required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: { type: String, enum: ["processing", "paid", "failed"], default: "processing" },
    commissionIds: [{ type: Schema.Types.ObjectId, ref: "AffiliateCommission" }],
    stripeConnectAccountId: { type: String, required: true },
    stripeTransferId: String,
    livemode: { type: Boolean, required: true },
    error: String,
    periodLabel: { type: String, required: true },
  },
  { timestamps: true, collection: "affiliate_payouts" }
);

// One payout per affiliate per month per Stripe mode.
AffiliatePayoutSchema.index({ affiliateId: 1, periodLabel: 1, livemode: 1 }, { unique: true });

export default (mongoose.models.AffiliatePayout ||
  mongoose.model<IAffiliatePayout>("AffiliatePayout", AffiliatePayoutSchema)) as Model<IAffiliatePayout>;
