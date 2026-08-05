// src/app/api/admin/loop/route.ts
//
// Backing API for /admin/loop — the loop console. Session auth + isAdmin,
// same pattern as /api/admin/agent-feedback.
//
//   GET   → one composite payload: toggle state, the loop's current stage
//           (derived), recent reports (summaries — full markdown stays on
//           /admin/agent-feedback), ticket fingerprints, both chat threads,
//           and a merged activity feed composed from those collections'
//           timestamps. No new event collection — the state IS the log.
//   POST  → { channel: "tom"|"repairer", body } — an admin chat message.
//   PATCH → { fingerprint, status } — manual override on a ticket cluster.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { AgentTestReport, getTestingState } from "@/models/AgentTesting";
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
function deriveStage(testingOn: boolean, latest: any): { stage: string; detail: string } {
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  const state = await getTestingState();
  const reports = await AgentTestReport.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .select("-markdown") // summaries; the full text lives on /admin/agent-feedback
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
      ...deriveStage(state.testingOn, latest),
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

  return NextResponse.json(
    { error: "validation_failed", message: "Send { fingerprint, status }." },
    { status: 400, headers: NO_STORE }
  );
}
