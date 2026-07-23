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
  createdAt: Date;
  updatedAt: Date;
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
  },
  { timestamps: true }
);

BugReportSchema.index({ status: 1, createdAt: -1 });

export const BugReport: Model<IBugReport> =
  mongoose.models.BugReport || mongoose.model<IBugReport>("BugReport", BugReportSchema);

export default BugReport;
