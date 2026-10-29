// src/models/DomainOrder.ts
//
// One agent's paid domain registration: the Stripe checkout that charged them,
// the yearly Stripe subscription that keeps charging them, and the Vercel
// registrar order that bought the name on ChatRealty's account.
//
// Lifecycle (src/lib/domains/fulfill.ts):
//   paid → purchasing → active                       (happy path)
//   paid|purchasing → refunded                       (registrar failed; money returned)
//   * → needs_attention                              (refund itself failed — manual)
//   active → cancelled                               (agent stopped paying; auto-renew off)
// Keyed on checkoutSessionId so a replayed webhook can never buy twice.

import mongoose, { Schema, Document, Model } from "mongoose";

export type DomainOrderStatus = "paid" | "purchasing" | "active" | "refunded" | "needs_attention" | "cancelled";

export interface IDomainOrder extends Document {
  userId: mongoose.Types.ObjectId;
  domain: string;
  status: DomainOrderStatus;
  checkoutSessionId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeInvoiceId?: string;
  vercelOrderId?: string;
  purchasePriceUsd: number;
  renewalPriceUsd: number;
  firstYearChargeUsd: number;
  yearlyChargeUsd: number;
  error?: string;
  livemode: boolean;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainOrderSchema = new Schema<IDomainOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    domain: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["paid", "purchasing", "active", "refunded", "needs_attention", "cancelled"],
      required: true,
    },
    checkoutSessionId: { type: String, required: true, unique: true },
    stripeSubscriptionId: { type: String, index: true },
    stripeCustomerId: { type: String },
    stripeInvoiceId: { type: String }, // first-year invoice — what a refund reverses
    vercelOrderId: { type: String },
    purchasePriceUsd: { type: Number, required: true },
    renewalPriceUsd: { type: Number, required: true },
    firstYearChargeUsd: { type: Number, required: true },
    yearlyChargeUsd: { type: Number, required: true },
    error: { type: String },
    livemode: { type: Boolean, required: true },
    activatedAt: { type: Date },
  },
  { timestamps: true, collection: "domain_orders" }
);

export default (mongoose.models.DomainOrder ||
  mongoose.model<IDomainOrder>("DomainOrder", DomainOrderSchema)) as Model<IDomainOrder>;
