// src/models/ProcessedStripeEvent.ts
//
// Idempotency guard for Stripe webhooks. Stripe retries webhook deliveries
// (network blips, timeouts), so we record each processed event.id and skip
// duplicates — otherwise a replayed checkout/invoice event double-credits the
// user. The webhook "claims" the event by inserting here BEFORE processing
// (unique index → a duplicate insert means it's already handled); on a
// processing failure it deletes the claim so Stripe's retry can reprocess.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProcessedStripeEvent extends Document {
  eventId: string;
  type?: string;
  createdAt: Date;
}

const ProcessedStripeEventSchema = new Schema<IProcessedStripeEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String },
    // TTL: auto-expire after 30 days (Stripe won't retry that long).
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { collection: "processed_stripe_events" }
);

export default (mongoose.models.ProcessedStripeEvent ||
  mongoose.model<IProcessedStripeEvent>("ProcessedStripeEvent", ProcessedStripeEventSchema)) as Model<IProcessedStripeEvent>;
