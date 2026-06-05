// src/models/NewsletterSubscriber.ts
//
// A newsletter subscriber, scoped to a domain owner (agent) so the platform's
// multi-tenant sites each keep their own list. Captured via the public
// /newsletter-signup form (resolveDomainOwner decides which owner the address
// belongs to). One subscription per email per owner.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewsletterSubscriber extends Document {
  ownerId: mongoose.Types.ObjectId; // the agent/domain owner this list belongs to
  email: string;
  name?: string;
  status: "pending" | "active" | "unsubscribed";
  source?: string;
  tags?: string[];
  unsubscribeToken: string; // unique per subscriber — drives one-click unsubscribe
  confirmToken?: string; // reserved for optional double opt-in
  confirmedAt?: Date;
  consentIp?: string;
  consentAt?: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "active", "unsubscribed"],
      default: "active",
      index: true,
    },
    source: { type: String, default: "newsletter-signup" },
    tags: { type: [String], default: [] },
    unsubscribeToken: { type: String, required: true, index: true },
    confirmToken: { type: String },
    confirmedAt: { type: Date },
    consentIp: { type: String },
    consentAt: { type: Date },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true }
);

// One subscription per email per owner.
NewsletterSubscriberSchema.index({ ownerId: 1, email: 1 }, { unique: true });

const NewsletterSubscriber =
  (mongoose.models.NewsletterSubscriber as Model<INewsletterSubscriber>) ||
  mongoose.model<INewsletterSubscriber>(
    "NewsletterSubscriber",
    NewsletterSubscriberSchema
  );

export default NewsletterSubscriber;
