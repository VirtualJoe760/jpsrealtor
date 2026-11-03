// src/models/SiteSetupOrder.ts
// One paid $300 custom-site setup (site-platform plan P5). Created at checkout
// ("awaiting_payment"), flipped to "intake_pending" by the Stripe webhook, then
// moved through the admin queue to "live". Docs: docs/commerce/site-setup.md.
//
// Schema first: Mongoose strict mode drops undeclared fields silently.

import mongoose, { Schema, Document, Model } from "mongoose";
import type { SiteSetupStatus } from "@/config/site-setup";

export interface ISiteSetupIntake {
  style?: string;
  styleNotes?: string;
  serviceAreas: string[];
  logoUrl?: string;
  exampleSites: string[];
  colors?: string;
  notes?: string;
  submittedAt?: Date;
}

export interface ISiteSetupOrder extends Document {
  agentId: mongoose.Types.ObjectId;
  status: SiteSetupStatus;
  amount: number; // dollars
  currency: string;
  livemode: boolean;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  intake: ISiteSetupIntake;
  liveUrl?: string;
  liveAt?: Date;
  liveEmailSentAt?: Date;
  adminNotes?: string;
  history: Array<{ status: string; at: Date; by?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSetupOrderSchema = new Schema<ISiteSetupOrder>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["awaiting_payment", "intake_pending", "intake_received", "in_progress", "live", "refunded", "cancelled"],
      default: "awaiting_payment",
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    livemode: { type: Boolean, required: true },
    stripeCheckoutSessionId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    paidAt: Date,
    intake: {
      style: String,
      styleNotes: String,
      serviceAreas: { type: [String], default: [] },
      logoUrl: String,
      exampleSites: { type: [String], default: [] },
      colors: String,
      notes: String,
      submittedAt: Date,
    },
    liveUrl: String,
    liveAt: Date,
    liveEmailSentAt: Date,
    adminNotes: String,
    history: [
      {
        _id: false,
        status: String,
        at: { type: Date, default: Date.now },
        by: String,
      },
    ],
  },
  { timestamps: true, collection: "site_setup_orders" }
);

export default (mongoose.models.SiteSetupOrder ||
  mongoose.model<ISiteSetupOrder>("SiteSetupOrder", SiteSetupOrderSchema)) as Model<ISiteSetupOrder>;
