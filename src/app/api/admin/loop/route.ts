// src/app/api/admin/loop/route.ts
//
// Backing API for /admin/loop — the loop console. Session auth + isAdmin,
// same pattern as /api/admin/agent-feedback.
//
//   GET   → one composite payload: toggle state, the loop's current stage
//           (derived), recent reports (summaries), ticket fingerprints, both
//           chat threads, bug reports, feedback submissions, and a merged
//           activity feed composed from those collections' timestamps. No new
//           event collection — the state IS the log.
//   GET ?report=<id> → one report's full markdown + resolution notes,
//           fetched lazily on expand (20 full reports × 15k would bloat the
//           15s poll).
//   POST  → { channel: "tom"|"repairer", body } — an admin chat message.
//   PATCH → { fingerprint, status } — ticket cluster override
//         | { reportId, status, resolutionNotes? } — report lifecycle
//         | { testingOn } — the toggle.
//
// This is the ONE admin surface for the loop — /admin/agent-feedback was
// merged in and now redirects here.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { AgentTestReport, getTestingState, setTestingOn, setTomMode } from "@/models/AgentTesting";
import BugReport from "@/models/BugReport";
import FeedbackSubmission from "@/models/FeedbackSubmission";
import {
  TicketFingerprint,
  LoopTicket,
  LoopMessage,
  type FingerprintStatus,
} from "@/models/LoopTicket";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await dbConnect();
  const user: any = await User.findById(session.user.id).select("isAdmin").lean();
  return user?.isAdmin ? session : null;
}

/**
 * Where the loop is right now, derived — not stored, so it can never drift
 * from the truth it summarises.
 *
 *   paused    testingOn=false and no open report (nobody's move)
 *   repairing an open report exists (the repairer's move; toggle is off)
 *   armed     testingOn=true, last report complete (Tom dispatches on his
 *             next cron firing — up to ~15 min away)
 */
function deriveStage(
  testingOn: boolean,
  latest: any,
  mode?: "idle" | "working"
): { stage: string; detail: string } {
  // The operator's switch outranks the loop handshake in the display: an idle
  // Tom answers chat and does nothing else, whatever the toggle says.
  if (mode === "idle") {
    return {
      stage: "idle",
      detail:
        "Tom is IDLE — on each firing he pulls his docs and answers chat, nothing else. Flip to Working when the conversation is done.",
    };
  }
  const open = latest && latest.status !== "complete";
  if (open) {
    return {
      stage: latest.status === "new" ? "report-waiting" : "repairing",
      detail:
        latest.status === "new"
          ? "A report is waiting for the repairer. It polls every 5 minutes while the desktop app is open."
          : "The repairer has claimed the report and is fixing what it names.",
    };
  }
  if (!testingOn) {
    return { stage: "paused", detail: "Testing is off and no report is open. Nothing runs until the toggle is re-armed." };
  }
  return {
    stage: "armed",
    detail: "Ready for a new test. Tom dispatches on his next cron firing (every 15 minutes).",
  };
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  // Lazy single-report read — full markdown on expand only.
  const reportId = new URL(req.url).searchParams.get("report");
  if (reportId) {
    const r: any = await AgentTestReport.findById(reportId).lean();
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(
      {
        id: String(r._id),
        title: r.title,
        status: r.status,
        markdown: r.markdown,
        resolutionNotes: r.resolutionNotes,
        reporterTokenName: r.reporterTokenName,
        submittedAt: r.createdAt,
        completedAt: r.completedAt,
      },
      { headers: NO_STORE }
    );
  }

  const state = await getTestingState();
  const reports = await AgentTestReport.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .select("-markdown") // summaries; full text via ?report=<id> on expand
    .lean();
  const bugs = await BugReport.find({})
    .sort({ createdAt: -1 })
    .limit(25)
    .select("title severity area status reporter.tokenName createdAt resolutionNotes")
    .lean();
  const feedback = await FeedbackSubmission.find({})
    .sort({ createdAt: -1 })
    .limit(25)
    .select("summary kind status reporter.tokenName fileBytes createdAt")
    .lean();
  const fingerprints = await TicketFingerprint.find({})
    .sort({ population: -1, lastSeenAt: -1 })
    .limit(50)
    .lean();
  const recentTickets = await LoopTicket.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select("fingerprint association failingStep howFar reporterTokenName createdAt")
    .lean();
  const messages = await LoopMessage.find({}).sort({ createdAt: -1 }).limit(60).lean();

  const latest = reports[0] || null;

  // Presence, derived from what the agents already touch — no heartbeat
  // infrastructure. Tom stamps his token's lastUsedAt on every poll; the
  // repairer's most recent visible act is its last chat reply or last
  // completed report.
  const owner: any = await User.findOne({ isAdmin: true, "agentProfile.aiIntegrations.apiTokens.name": "tom" })
    .select("agentProfile.aiIntegrations.apiTokens")
    .lean();
  const tomToken = (owner?.agentProfile?.aiIntegrations?.apiTokens || []).find(
    (t: any) => t.name === "tom" && !t.revokedAt
  );
  const lastRepairerMsg = (messages as any[]).find((m) => m.channel === "repairer" && m.from === "agent");
  const lastCompleted = (reports as any[]).find((r) => r.completedAt);
  const repairerCandidates = [lastRepairerMsg?.createdAt, lastCompleted?.completedAt]
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  const presence = {
    tomLastPoll: tomToken?.lastUsedAt || null,
    repairerLastAction: repairerCandidates.length
      ? new Date(Math.max(...repairerCandidates))
      : null,
  };

  // Activity feed: one merged, newest-first timeline from what already exists.
  const events: Array<{ at: Date; kind: string; text: string }> = [];
  events.push({
    at: state.updatedAt,
    kind: "toggle",
    text: `testing turned ${state.testingOn ? "ON" : "OFF"} by ${state.updatedBy}`,
  });
  for (const r of reports as any[]) {
    events.push({ at: r.createdAt, kind: "report", text: `report submitted: ${r.title}` });
    if (r.completedAt)
      events.push({ at: r.completedAt, kind: "report", text: `report completed: ${r.title}` });
  }
  for (const t of recentTickets as any[]) {
    events.push({
      at: t.createdAt,
      kind: "ticket",
      text: `ticket filed: ${t.association} / ${t.failingStep} (${t.howFar})`,
    });
  }
  for (const m of messages.slice(0, 20) as any[]) {
    events.push({
      at: m.createdAt,
      kind: "chat",
      text: `${m.from === "admin" ? "you" : m.channel} → ${m.from === "admin" ? m.channel : "console"}: ${String(m.body).slice(0, 80)}`,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json(
    {
      testingOn: state.testingOn,
      toggleUpdatedBy: state.updatedBy,
      toggleUpdatedAt: state.updatedAt,
      presence,
      tomMode: state.tomMode || "working",
      ...deriveStage(state.testingOn, latest, state.tomMode),
      reports: (reports as any[]).map((r) => ({
        id: String(r._id),
        title: r.title,
        status: r.status,
        reporterTokenName: r.reporterTokenName,
        submittedAt: r.createdAt,
        completedAt: r.completedAt,
        resolutionNotes: r.resolutionNotes,
      })),
      fingerprints: (fingerprints as any[]).map((c) => ({
        fingerprint: c.fingerprint,
        association: c.association,
        failingStep: c.failingStep,
        errorClass: c.errorClass,
        status: c.status,
        goal: c.goal,
        triageNote: c.triageNote,
        population: c.population,
        firstSeenAt: c.firstSeenAt,
        lastSeenAt: c.lastSeenAt,
        resolutionNotes: c.resolutionNotes,
      })),
      chat: {
        tom: (messages as any[])
          .filter((m) => m.channel === "tom")
          .reverse()
          .map((m) => ({ id: String(m._id), from: m.from, body: m.body, at: m.createdAt, readAt: m.readAt })),
        repairer: (messages as any[])
          .filter((m) => m.channel === "repairer")
          .reverse()
          .map((m) => ({ id: String(m._id), from: m.from, body: m.body, at: m.createdAt, readAt: m.readAt })),
      },
      bugs: (bugs as any[]).map((b) => ({
        id: String(b._id),
        title: b.title,
        severity: b.severity,
        area: b.area,
        status: b.status,
        reporterTokenName: b.reporter?.tokenName || null,
        createdAt: b.createdAt,
        resolutionNotes: b.resolutionNotes || null,
      })),
      feedback: (feedback as any[]).map((f) => ({
        id: String(f._id),
        summary: f.summary,
        kind: f.kind,
        status: f.status,
        reporterTokenName: f.reporter?.tokenName || null,
        fileBytes: f.fileBytes || null,
        createdAt: f.createdAt,
      })),
      events: events.slice(0, 30),
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const channel = body.channel;
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 10_000) : "";
  if (!["tom", "repairer"].includes(channel) || !text) {
    return NextResponse.json(
      { error: "validation_failed", message: "channel ('tom'|'repairer') and body are required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const msg = await LoopMessage.create({ channel, from: "admin", body: text, readAt: null });
  return NextResponse.json(
    { ok: true, id: String(msg._id), at: msg.createdAt },
    { status: 201, headers: NO_STORE }
  );
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const STATUSES: FingerprintStatus[] = ["open", "triaged", "in_progress", "resolved"];
  if (typeof body.fingerprint === "string" && STATUSES.includes(body.status)) {
    const update: any = { status: body.status };
    if (body.status === "resolved") update.resolvedAt = new Date();
    const cluster = await TicketFingerprint.findOneAndUpdate(
      { fingerprint: body.fingerprint },
      { $set: update },
      { new: true }
    );
    if (!cluster) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(
      { ok: true, fingerprint: cluster.fingerprint, status: cluster.status },
      { headers: NO_STORE }
    );
  }

  // Report lifecycle — absorbed from /api/admin/agent-feedback at consolidation.
  if (typeof body.reportId === "string" && body.reportId && body.status) {
    if (!["new", "in_progress", "complete"].includes(body.status)) {
      return NextResponse.json({ error: "bad_status" }, { status: 400, headers: NO_STORE });
    }
    const update: any = { status: body.status };
    if (body.status === "complete") {
      update.completedAt = new Date();
      if (typeof body.resolutionNotes === "string") {
        update.resolutionNotes = body.resolutionNotes.slice(0, 20_000);
      }
    }
    const report = await AgentTestReport.findByIdAndUpdate(body.reportId, update, { new: true });
    if (!report) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(
      { ok: true, id: String(report._id), status: report.status },
      { headers: NO_STORE }
    );
  }

  // The operator's switch: idle = chat-only firings, working = full loop.
  if (body.mode === "idle" || body.mode === "working") {
    const state = await setTomMode(body.mode, "admin");
    return NextResponse.json({ ok: true, tomMode: state.tomMode }, { headers: NO_STORE });
  }

  // The toggle — same absorption. Manual override half of the handshake.
  if (typeof body.testingOn === "boolean") {
    const state = await setTestingOn(body.testingOn, "admin");
    return NextResponse.json({ ok: true, testingOn: state.testingOn }, { headers: NO_STORE });
  }

  return NextResponse.json(
    {
      error: "validation_failed",
      message: "Send { fingerprint, status }, { reportId, status }, { testingOn }, or { mode }.",
    },
    { status: 400, headers: NO_STORE }
  );
}
