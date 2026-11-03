// src/models/Affiliate.ts
// An affiliate: someone who earns a flat monthly amount for every ChatRealty
// agent they signed up, for as long as that agent keeps paying. The partner
// type next to service partners (servicePartnerProfile on User). One per user.
// Money rules live in src/config/affiliates.ts. Docs: docs/commerce/affiliates.md.

import mongoose, { Schema, Document, Model } from "mongoose";

export type AffiliateStatus = "pending" | "approved" | "rejected" | "paused" | "terminated";

export interface IAffiliate extends Document {
  userId: mongoose.Types.ObjectId;
  /** Uppercase share code; the link is chatrealty.io/?ref=CODE. Assigned on approval. */
  code?: string;
  status: AffiliateStatus;

  // Application
  name: string;
  email: string;
  website?: string;
  audience?: string;        // who they reach
  promotionPlan?: string;   // how they'll promote
  /** True if the applicant holds a real-estate, mortgage, title or escrow license — flags a counsel check. */
  isSettlementServiceProvider?: boolean;
  termsVersion: string;
  termsAcceptedAt: Date;
  ftcDisclosureAcknowledged: boolean;
  appliedAt: Date;

  // Moderation
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  pausedAt?: Date;
  terminatedAt?: Date;
  adminNotes?: string;

  /** Dollars per agent per month; overrides the tier table when set. */
  rateOverride?: number | null;

  // Stripe Connect Express (payouts). Separate accounts per Stripe mode.
  stripeConnectAccountId?: string;
  stripeConnectLivemode?: boolean;
  payoutsEnabled?: boolean;
  connectDetailsSubmitted?: boolean;

  // Counters (clicks are counted on link visits; signups/paying are queried)
  clicks: number;
  lastClickAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AffiliateSchema = new Schema<IAffiliate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    code: { type: String, uppercase: true, trim: true, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paused", "terminated"],
      default: "pending",
      index: true,
    },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    website: String,
    audience: String,
    promotionPlan: String,
    isSettlementServiceProvider: { type: Boolean, default: false },
    termsVersion: { type: String, required: true },
    termsAcceptedAt: { type: Date, required: true },
    ftcDisclosureAcknowledged: { type: Boolean, required: true },
    appliedAt: { type: Date, default: Date.now },

    approvedAt: Date,
    approvedBy: String,
    rejectionReason: String,
    pausedAt: Date,
    terminatedAt: Date,
    adminNotes: String,

    rateOverride: { type: Number, default: null, min: 0 },

    stripeConnectAccountId: String,
    stripeConnectLivemode: Boolean,
    payoutsEnabled: { type: Boolean, default: false },
    connectDetailsSubmitted: { type: Boolean, default: false },

    clicks: { type: Number, default: 0 },
    lastClickAt: Date,
  },
  { timestamps: true, collection: "affiliates" }
);

export default (mongoose.models.Affiliate ||
  mongoose.model<IAffiliate>("Affiliate", AffiliateSchema)) as Model<IAffiliate>;
