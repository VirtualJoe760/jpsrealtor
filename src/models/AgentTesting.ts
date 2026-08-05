// src/models/AgentTesting.ts
//
// The judge loop's two pieces of shared state.
//
// THE LOOP (docs/testing/README.md is the full protocol):
//   testingOn=true            → the judge dispatches Test Claude to build a site
//   judge submits an MD report → judge sets testingOn=false
//   our routine (every 5 min)  → sees a "new" report → fixes the bugs →
//                                marks it "complete" → sets testingOn=true
//   judge sees complete + on   → dispatches the next test
//
// The TOGGLE is the handshake between two machines that share nothing else;
// the REPORT's status field is the work ledger. Neither side ever writes the
// other's field: the judge only turns testing OFF, we only turn it ON.

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AgentTestReportStatus = "new" | "in_progress" | "complete";

export interface IAgentTestReport extends Document {
  title: string;
  /** The judge's report, verbatim markdown. This is the artifact we act on. */
  markdown: string;
  status: AgentTestReportStatus;
  /** Who submitted it (the skill token's user). */
  reporterUserId: mongoose.Types.ObjectId | null;
  reporterTokenName: string | null;
  /** Filled by our routine when it closes the report. */
  resolutionNotes: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AgentTestReportSchema = new Schema<IAgentTestReport>(
  {
    title: { type: String, required: true, maxlength: 200 },
    markdown: { type: String, required: true, maxlength: 200_000 },
    status: { type: String, enum: ["new", "in_progress", "complete"], default: "new", index: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reporterTokenName: { type: String, default: null },
    resolutionNotes: { type: String, default: null, maxlength: 20_000 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
AgentTestReportSchema.index({ status: 1, createdAt: -1 });

/**
 * Singleton toggle. One document, keyed by `key: "testing"` — findOneAndUpdate
 * with upsert keeps it a singleton without a migration.
 */
export interface ITestingState extends Document {
  key: "testing";
  testingOn: boolean;
  /** "judge" | "routine" | "admin" — who flipped it last, for the admin page. */
  updatedBy: string;
  updatedAt: Date;
}

const TestingStateSchema = new Schema<ITestingState>(
  {
    key: { type: String, default: "testing", unique: true },
    testingOn: { type: Boolean, default: false },
    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export const AgentTestReport: Model<IAgentTestReport> =
  mongoose.models.AgentTestReport ||
  mongoose.model<IAgentTestReport>("AgentTestReport", AgentTestReportSchema);

export const TestingState: Model<ITestingState> =
  mongoose.models.TestingState ||
  mongoose.model<ITestingState>("TestingState", TestingStateSchema);

/**
 * Read the toggle, creating the singleton on first touch.
 *
 * `timestamps: false` is load-bearing: with schema timestamps on, Mongoose
 * silently $sets updatedAt on EVERY findOneAndUpdate — including this pure
 * read — so each poll (the console every 15s, the judge every 15min) was
 * overwriting the flip time and pinning a fresh "toggle" event atop the
 * activity feed. A read must not write; only setTestingOn bumps updatedAt.
 */
export async function getTestingState() {
  const now = new Date();
  return TestingState.findOneAndUpdate(
    { key: "testing" },
    { $setOnInsert: { testingOn: false, updatedBy: "admin", createdAt: now, updatedAt: now } },
    { new: true, upsert: true, timestamps: false }
  );
}

export async function setTestingOn(on: boolean, by: string) {
  return TestingState.findOneAndUpdate(
    { key: "testing" },
    { $set: { testingOn: on, updatedBy: by } },
    { new: true, upsert: true }
  );
}
