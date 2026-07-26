// src/models/AgentActivity.ts
//
// The agent-facing activity stream: "someone signed up on your site",
// "a lead came in", "a visitor saved a home".
//
// WHY MONGO, not the tenant's Postgres: the agent dashboard authenticates by
// NextAuth session and only ever reads Mongo. A Postgres `activity` table
// would be invisible to it for exactly the same reason the tenant `contact`
// table is today — which is the bug this model exists to close. Everything an
// AGENT sees must be Mongo, keyed by their user id.
//
// Writes are non-blocking and best-effort: a failed feed entry must never fail
// a visitor's signup.

import mongoose, { Schema, Document, Model } from "mongoose";

export type AgentActivityType =
  | "signup" // visitor created an account on the agent's site
  | "signin" // returning visitor signed in
  | "lead" // contact/inquiry form submission
  | "favorite" // visitor saved a listing
  | "form"; // landing-page or other form submission

export interface IAgentActivity extends Document {
  /** The AGENT who owns this site — the only scoping key the dashboard uses. */
  agentId: mongoose.Types.ObjectId;
  type: AgentActivityType;
  /** Display label, precomputed so the feed needs no joins. */
  title: string;
  /** Optional secondary line (email, listing address, form name). */
  detail?: string;
  /** Mongo Contact this activity produced//touched, when there is one. */
  contactId?: mongoose.Types.ObjectId;
  /** Tenant-Postgres end_user id (a string uuid, NOT a Mongo ref). */
  endUserId?: string;
  listingKey?: string;
  /** Where it came from: "chatrealty-site", "contact-page", host, etc. */
  source?: string;
  createdAt: Date;
}

const AgentActivitySchema = new Schema<IAgentActivity>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["signup", "signin", "lead", "favorite", "form"],
      required: true,
    },
    title: { type: String, required: true },
    detail: { type: String },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    endUserId: { type: String },
    listingKey: { type: String },
    source: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The feed's only query: this agent's events, newest first.
AgentActivitySchema.index({ agentId: 1, createdAt: -1 });

const AgentActivity: Model<IAgentActivity> =
  (mongoose.models.AgentActivity as Model<IAgentActivity>) ||
  mongoose.model<IAgentActivity>("AgentActivity", AgentActivitySchema);

export default AgentActivity;
