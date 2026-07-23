// src/models/FeedbackSubmission.ts
//
// Testing-phase feedback packages (feedback/bug md + session log + project
// code) submitted by customers' Claude sessions: the MCP `give_feedback` tool
// creates a record + one-time upload URL, the customer-side shell curls a zip
// to it, the bytes land in GridFS (bucket "crfeedback"), and the owner reviews
// with /review-cr-feedback.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type FeedbackStatus = "awaiting_upload" | "uploaded" | "reviewed";

export interface IFeedbackSubmission extends Document {
  summary: string;
  kind: "feedback" | "bug" | "session-export";
  reporter: {
    userId: mongoose.Types.ObjectId;
    email?: string;
    name?: string;
    tokenName?: string;
  };
  /** sha256 of the one-time upload token (plaintext returned once). */
  uploadTokenHash: string;
  uploadTokenExpiresAt: Date;
  status: FeedbackStatus;
  /** GridFS file id in bucket "crfeedback" once uploaded. */
  fileId?: mongoose.Types.ObjectId;
  fileBytes?: number;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSubmissionSchema = new Schema<IFeedbackSubmission>(
  {
    summary: { type: String, required: true, maxlength: 2000 },
    kind: { type: String, enum: ["feedback", "bug", "session-export"], default: "feedback" },
    reporter: {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      email: String,
      name: String,
      tokenName: String,
    },
    uploadTokenHash: { type: String, required: true, index: true },
    uploadTokenExpiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["awaiting_upload", "uploaded", "reviewed"],
      default: "awaiting_upload",
      index: true,
    },
    fileId: { type: Schema.Types.ObjectId },
    fileBytes: Number,
    reviewNotes: { type: String, maxlength: 4000 },
  },
  { timestamps: true }
);

export const FeedbackSubmission: Model<IFeedbackSubmission> =
  mongoose.models.FeedbackSubmission ||
  mongoose.model<IFeedbackSubmission>("FeedbackSubmission", FeedbackSubmissionSchema);

export default FeedbackSubmission;
