// src/models/BugReport.ts
//
// Testing-phase bug reports filed by customers' Claude sessions through the
// MCP `report_bug` tool → POST /api/skill/bugs. Reviewed owner-side with the
// /check-cr-bugs skill (fetch new → summarize → fix → mark resolved).

import mongoose, { Schema, type Document, type Model } from "mongoose";

export type BugStatus = "new" | "triaged" | "fixed" | "wont_fix";
export type BugSeverity = "low" | "medium" | "high" | "critical";
export const BUG_AREAS = [
  "scaffolder-template",
  "mcp-tools",
  "skill-api",
  "build-guide",
  "chatrealty-site",
  "other",
] as const;
export type BugArea = (typeof BUG_AREAS)[number];

export interface IBugReport extends Document {
  title: string;
  severity: BugSeverity;
  area: BugArea;
  description: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  /** Freeform environment info: package versions, OS, node, model, etc. */
  environment?: string;
  reporter: {
    userId: mongoose.Types.ObjectId;
    email?: string;
    name?: string;
    tokenName?: string;
  };
  status: BugStatus;
  /** Owner-side triage/fix notes (commit hashes, resolution). */
  resolutionNotes?: string;
  /**
   * Dedupe key: `area:<normalized title>`. Test sessions all authenticate as
   * the SAME judge account, so one session filing the same defect three times
   * (it happens — a retry loop, or the same 404 hit on three pages) burned
   * three slots of a 20/day budget and pushed genuinely new criticals into a
   * 429. Same fingerprint ⇒ bump `duplicateCount`, don't create a second doc.
   */
  fingerprint?: string;
  /** How many times this same defect has been reported (1 = filed once). */
  duplicateCount: number;
  /** When the most recent duplicate landed — "still happening" evidence. */
  lastReportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stable dedupe key for a report. Lowercased, punctuation-stripped, collapsed
 * whitespace — so "…/signup returns 404!" and "/signup returns 404" collide,
 * which is the point. Scoped by area so the same wording in two subsystems
 * stays two bugs.
 *
 * HOST NAMES ARE STRIPPED FIRST. One session filed the same broken button
 * three times as "…on /dashboard", "…on www.chatrealty.io/dashboard" and
 * "…on chatrealty.io/dashboard" — three rows for one defect, because a tester
 * checking the apex and the www host writes the host into the title. The host
 * is never what distinguishes two bugs, so it is not allowed to distinguish
 * two fingerprints.
 */
export function bugFingerprint(area: string, title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/https?:\/\//g, " ")
    .replace(/\b(?:www\.)?[a-z0-9-]+\.(?:io|com|net|org|dev|app|localhost)\b/g, " ")
    .replace(/\blocalhost(?::\d+)?\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${area}:${normalized}`;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    title: { type: String, required: true, maxlength: 200 },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    area: { type: String, enum: BUG_AREAS, default: "other" },
    description: { type: String, required: true, maxlength: 8000 },
    stepsToReproduce: { type: String, maxlength: 4000 },
    expected: { type: String, maxlength: 2000 },
    actual: { type: String, maxlength: 4000 },
    environment: { type: String, maxlength: 2000 },
    reporter: {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      email: String,
      name: String,
      tokenName: String,
    },
    status: { type: String, enum: ["new", "triaged", "fixed", "wont_fix"], default: "new", index: true },
    resolutionNotes: { type: String, maxlength: 4000 },
    // Declared BEFORE anything writes them — strict mode drops undeclared
    // fields silently, and a "successful" write that persisted nothing has
    // cost this repo real debugging time twice (AGENTS.md §1.5).
    fingerprint: { type: String, index: true },
    duplicateCount: { type: Number, default: 1 },
    lastReportedAt: { type: Date },
  },
  { timestamps: true }
);

BugReportSchema.index({ status: 1, createdAt: -1 });
// Dedupe lookup: "is this defect already open?" — fingerprint + status.
BugReportSchema.index({ fingerprint: 1, status: 1 });

export const BugReport: Model<IBugReport> =
  mongoose.models.BugReport || mongoose.model<IBugReport>("BugReport", BugReportSchema);

export default BugReport;
