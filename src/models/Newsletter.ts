// src/models/Newsletter.ts
//
// A single newsletter issue/campaign, owned by an agent (ownerId). Authored as
// HTML (bodyHtml) with an optional markdown source kept for future editing /
// AI-generated drafts. Sent to the owner's active NewsletterSubscribers via
// Resend by /api/newsletter/issues/[id]/send.
import mongoose, { Schema, Document, Model } from "mongoose";

export type NewsletterStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

export interface INewsletter extends Document {
  ownerId: mongoose.Types.ObjectId;
  subject: string;
  previewText?: string; // email preheader
  bodyHtml: string;
  bodyMarkdown?: string;
  status: NewsletterStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount?: number;
  createdBy?: mongoose.Types.ObjectId;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSchema = new Schema<INewsletter>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, trim: true },
    bodyHtml: { type: String, default: "" },
    bodyMarkdown: { type: String },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "failed"],
      default: "draft",
      index: true,
    },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    recipientCount: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    error: { type: String },
  },
  { timestamps: true }
);

const Newsletter =
  (mongoose.models.Newsletter as Model<INewsletter>) ||
  mongoose.model<INewsletter>("Newsletter", NewsletterSchema);

export default Newsletter;
