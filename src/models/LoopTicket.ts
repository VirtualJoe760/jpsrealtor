// src/models/LoopTicket.ts
//
// The feedback loop's second producer: field-reported failures.
//
// The coverage matrix (docs/testing/coverage.md) says what is UNVERIFIED; a
// ticket says what is BROKEN, with the trace attached. Both resolve to the
// same unit of work — a target the judge briefs a session toward — so this
// file adds a producer to the queue, not a mode to the loop.
// Full pipeline: docs/testing/tickets.md.
//
// Three collections:
//   TicketFingerprint — the CLUSTER. One row per distinct failure mode.
//   LoopTicket        — one report from one machine. Many per fingerprint.
//   LoopMessage       — the admin console's chat channel to each agent.
//
// The fingerprint is what makes ticket volume scale with customers while WORK
// volume scales with distinct failure modes: an association renaming a field
// generates a ticket from every tenant on that association, and they all hash
// to one fingerprint carrying a population count.

import crypto from "crypto";
import mongoose, { Schema, type Document, type Model } from "mongoose";

// ---------------------------------------------------------------------------
// Fingerprint

export type FingerprintStatus = "open" | "triaged" | "in_progress" | "resolved";

export interface ITicketFingerprint extends Document {
  /** sha256 hex of (association · failingStep · errorClass · packageVersion). */
  fingerprint: string;
  association: string;
  failingStep: string;
  errorClass: string;
  packageVersion: string | null;
  status: FingerprintStatus;
  /** Set by the judge at triage — the goal a session is briefed toward. */
  goal: string | null;
  triageNote: string | null;
  /** How many tickets have hashed here. Priority for free. */
  population: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  /** The loop report that addressed it, once one has. */
  reportId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TicketFingerprintSchema = new Schema<ITicketFingerprint>(
  {
    fingerprint: { type: String, required: true, unique: true },
    association: { type: String, required: true, maxlength: 200 },
    failingStep: { type: String, required: true, maxlength: 200 },
    errorClass: { type: String, required: true, maxlength: 500 },
    packageVersion: { type: String, default: null, maxlength: 100 },
    status: {
      type: String,
      enum: ["open", "triaged", "in_progress", "resolved"],
      default: "open",
      index: true,
    },
    goal: { type: String, default: null, maxlength: 5_000 },
    triageNote: { type: String, default: null, maxlength: 10_000 },
    population: { type: Number, default: 1 },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: { type: String, default: null, maxlength: 20_000 },
    reportId: { type: Schema.Types.ObjectId, ref: "AgentTestReport", default: null },
  },
  { timestamps: true }
);
TicketFingerprintSchema.index({ status: 1, population: -1 });

// ---------------------------------------------------------------------------
// Ticket

export interface ILoopTicket extends Document {
  fingerprintId: mongoose.Types.ObjectId;
  fingerprint: string;
  association: string;
  failingStep: string;
  errorClass: string;
  /** How far the pipeline got before it broke. */
  howFar: "auth" | "fetch" | "normalise" | "persist" | "serve" | "build-guide" | "other";
  /** Verbatim error text. Names and shapes only — the tool never sends values. */
  errorText: string;
  /** Payload SHAPE (keys/types), never records. */
  payloadShape: Record<string, unknown> | null;
  /** Env var NAMES only. A value in here is a filing bug, not data. */
  envVarNames: string[];
  packageVersions: Record<string, string> | null;
  notes: string | null;
  reporterUserId: mongoose.Types.ObjectId | null;
  reporterTokenName: string | null;
  tokenLast4: string | null;
  source: "mcp" | "internal" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const LoopTicketSchema = new Schema<ILoopTicket>(
  {
    fingerprintId: { type: Schema.Types.ObjectId, ref: "TicketFingerprint", required: true },
    fingerprint: { type: String, required: true, index: true },
    association: { type: String, required: true, maxlength: 200 },
    failingStep: { type: String, required: true, maxlength: 200 },
    errorClass: { type: String, required: true, maxlength: 500 },
    howFar: {
      type: String,
      enum: ["auth", "fetch", "normalise", "persist", "serve", "build-guide", "other"],
      default: "other",
    },
    errorText: { type: String, required: true, maxlength: 20_000 },
    payloadShape: { type: Schema.Types.Mixed, default: null },
    envVarNames: { type: [String], default: [] },
    packageVersions: { type: Schema.Types.Mixed, default: null },
    notes: { type: String, default: null, maxlength: 5_000 },
    reporterUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reporterTokenName: { type: String, default: null },
    tokenLast4: { type: String, default: null },
    source: { type: String, enum: ["mcp", "internal", "admin"], default: "mcp" },
  },
  { timestamps: true }
);
LoopTicketSchema.index({ fingerprintId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Messages — the admin console's async chat with each agent.
//
// Neither agent holds a socket open. Tom polls every 15 minutes (openclaw
// cron), the repairer every 5 (scheduled task) — so chat is a mailbox, not a
// stream, and the UI says so. `from` is the direction: "admin" wrote it on the
// console, "agent" is the channel's agent replying.

export type LoopChannel = "tom" | "repairer";

export interface ILoopMessage extends Document {
  channel: LoopChannel;
  from: "admin" | "agent";
  body: string;
  /** Set when the addressee REPLIES — the reply is the ack, never the fetch. Null = awaiting reply. */
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LoopMessageSchema = new Schema<ILoopMessage>(
  {
    channel: { type: String, enum: ["tom", "repairer"], required: true },
    from: { type: String, enum: ["admin", "agent"], required: true },
    body: { type: String, required: true, maxlength: 10_000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);
LoopMessageSchema.index({ channel: 1, createdAt: -1 });
LoopMessageSchema.index({ channel: 1, from: 1, readAt: 1 });

// ---------------------------------------------------------------------------

export const TicketFingerprint: Model<ITicketFingerprint> =
  mongoose.models.TicketFingerprint ||
  mongoose.model<ITicketFingerprint>("TicketFingerprint", TicketFingerprintSchema);

export const LoopTicket: Model<ILoopTicket> =
  mongoose.models.LoopTicket || mongoose.model<ILoopTicket>("LoopTicket", LoopTicketSchema);

export const LoopMessage: Model<ILoopMessage> =
  mongoose.models.LoopMessage || mongoose.model<ILoopMessage>("LoopMessage", LoopMessageSchema);

// ---------------------------------------------------------------------------
// Fingerprinting

/**
 * Reduce verbatim error text to a clusterable class when the reporter didn't
 * supply one: first line, lowercased, with the volatile parts (ids, paths,
 * numbers, quoted strings) masked so the same failure from two machines hashes
 * identically.
 */
export function deriveErrorClass(errorText: string): string {
  return (
    (errorText.split("\n")[0] || "unknown")
      .toLowerCase()
      .replace(/(["'`]).*?\1/g, "«str»")
      .replace(/[a-z]:\\[^\s]+|\/[^\s]+\/[^\s]+/gi, "«path»")
      .replace(/\b[0-9a-f]{8,}\b/gi, "«id»")
      .replace(/\b\d+\b/g, "«n»")
      .trim()
      .slice(0, 500) || "unknown"
  );
}

export function computeFingerprint(input: {
  association: string;
  failingStep: string;
  errorClass: string;
  packageVersion?: string | null;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      [
        input.association.trim().toLowerCase(),
        input.failingStep.trim().toLowerCase(),
        input.errorClass.trim().toLowerCase(),
        (input.packageVersion || "").trim(),
      ].join("\n")
    )
    .digest("hex");
}

/**
 * The write path POST /api/skill/tickets uses: upsert the cluster, then insert
 * the ticket. $setOnInsert vs $set split keeps firstSeenAt stable while
 * lastSeenAt and population advance. A resolved fingerprint that gets a fresh
 * ticket REOPENS — a recurrence after a claimed fix is the loop's
 * highest-value signal, and it must not be absorbed silently into a closed
 * cluster.
 */
export async function ingestTicket(input: {
  association: string;
  failingStep: string;
  errorClass?: string | null;
  errorText: string;
  howFar?: ILoopTicket["howFar"];
  payloadShape?: Record<string, unknown> | null;
  envVarNames?: string[];
  packageVersions?: Record<string, string> | null;
  notes?: string | null;
  reporterUserId?: mongoose.Types.ObjectId | null;
  reporterTokenName?: string | null;
  tokenLast4?: string | null;
  source?: ILoopTicket["source"];
}): Promise<{ ticket: ILoopTicket; cluster: ITicketFingerprint; reopened: boolean }> {
  const errorClass = (input.errorClass || "").trim() || deriveErrorClass(input.errorText);
  const packageVersion =
    input.packageVersions?.["@chatrealty/mcp-server"] ||
    input.packageVersions?.["create-chatrealty-site"] ||
    null;
  const fingerprint = computeFingerprint({
    association: input.association,
    failingStep: input.failingStep,
    errorClass,
    packageVersion,
  });

  const now = new Date();

  // Two explicit paths rather than one upsert: `population` in both $inc and
  // $setOnInsert is an update-conflict error in MongoDB, even when the
  // document already exists. The unique index on `fingerprint` closes the
  // race — a concurrent first-ticket loses the insert and retries as an
  // update.
  // The aggregation-pipeline update makes the bump-and-maybe-reopen atomic; a
  // resolved fingerprint that takes a fresh ticket REOPENS, because a
  // recurrence after a claimed fix must not be absorbed silently into a
  // closed cluster. `new: false` returns the PRE-image — the only place the
  // "was it resolved before this ticket?" fact exists.
  const BUMP = [
    {
      $set: {
        lastSeenAt: now,
        population: { $add: ["$population", 1] },
        status: { $cond: [{ $eq: ["$status", "resolved"] }, "open", "$status"] },
        resolvedAt: { $cond: [{ $eq: ["$status", "resolved"] }, null, "$resolvedAt"] },
      },
    },
  ];

  let cluster: ITicketFingerprint;
  let reopened: boolean;

  const pre = await TicketFingerprint.findOneAndUpdate({ fingerprint }, BUMP, { new: false });
  if (pre) {
    reopened = pre.status === "resolved";
    cluster = (await TicketFingerprint.findOne({ fingerprint }))!;
  } else {
    try {
      cluster = await TicketFingerprint.create({
        fingerprint,
        association: input.association.trim(),
        failingStep: input.failingStep.trim(),
        errorClass,
        packageVersion,
        status: "open",
        population: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      reopened = false;
    } catch (err: unknown) {
      // Lost the insert race — the row exists now; take the update path. The
      // unique index on `fingerprint` is what makes this safe.
      if ((err as { code?: number }).code !== 11000) throw err;
      const racedPre = await TicketFingerprint.findOneAndUpdate({ fingerprint }, BUMP, {
        new: false,
      });
      reopened = racedPre?.status === "resolved";
      cluster = (await TicketFingerprint.findOne({ fingerprint }))!;
    }
  }

  const ticket = await LoopTicket.create({
    fingerprintId: cluster._id,
    fingerprint,
    association: input.association.trim(),
    failingStep: input.failingStep.trim(),
    errorClass,
    howFar: input.howFar || "other",
    errorText: input.errorText,
    payloadShape: input.payloadShape ?? null,
    envVarNames: input.envVarNames ?? [],
    packageVersions: input.packageVersions ?? null,
    notes: input.notes ?? null,
    reporterUserId: input.reporterUserId ?? null,
    reporterTokenName: input.reporterTokenName ?? null,
    tokenLast4: input.tokenLast4 ?? null,
    source: input.source || "mcp",
  });

  return { ticket, cluster, reopened };
}
