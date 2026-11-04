// src/models/PageView.ts
// One row per page a visitor looked at on a site this app serves, with how long
// the tab was visible on it. Feeds "what has this lead been looking at" on the
// admin Users panel and the agent's contact panel.
//
// Written only by POST /api/activity/page-view (the PageViewTracker beacon).
// `viewId` is minted in the browser; the beacon is re-sent each time the tab is
// hidden, so the route upserts on it and keeps the largest duration.
//
// `agentId` is the owner of the host the page was served on (null on platform
// hosts). An agent only ever reads rows where agentId is them.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPageView extends Document {
  viewId: string;
  userId?: mongoose.Types.ObjectId;
  anonymousId?: string;
  sessionId?: string;
  host: string;
  path: string;
  title?: string;
  referrer?: string;
  agentId?: mongoose.Types.ObjectId;
  deviceType?: "mobile" | "tablet" | "desktop";
  startedAt: Date;
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    viewId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    anonymousId: { type: String },
    sessionId: { type: String },
    host: { type: String, required: true },
    path: { type: String, required: true },
    title: { type: String },
    referrer: { type: String },
    agentId: { type: Schema.Types.ObjectId, ref: "User" },
    deviceType: { type: String, enum: ["mobile", "tablet", "desktop"] },
    startedAt: { type: Date, required: true },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PageViewSchema.index({ userId: 1, startedAt: -1 });
PageViewSchema.index({ anonymousId: 1, userId: 1 });
PageViewSchema.index({ agentId: 1, userId: 1, startedAt: -1 });
// Raw browsing history isn't kept forever: 18 months, then Mongo drops it.
PageViewSchema.index({ startedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 548 });

const PageView: Model<IPageView> =
  (mongoose.models.PageView as Model<IPageView>) ||
  mongoose.model<IPageView>("PageView", PageViewSchema);

export default PageView;
