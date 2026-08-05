// src/app/api/skill/tickets/route.ts
//
// The feedback loop's reactive ingress. Full pipeline: docs/testing/tickets.md.
//
//   POST  — file a ticket. Called by the MCP `report_data_issue` tool from a
//           customer's (or Test Claude's) machine at the moment a data/guide
//           failure is hit. Clusters into a fingerprint on write.
//   GET   — list fingerprints (?status=open|triaged|in_progress|resolved,
//           default open), or ?fingerprint=<hex>&tickets=N for one cluster
//           with its recent tickets. This is the judge's triage read.
//   PATCH — move a fingerprint through triage: { fingerprint, status?, goal?,
//           triageNote?, resolutionNotes?, reportId? }. The judge sets
//           triaged/in_progress + goal; the repairer sets resolved.
//
// Auth is split by direction. POST mirrors /api/skill/feedback: any valid
// crt_live_ token, no scope gate — filing a failure report must never be the
// thing a scope forbids. GET and PATCH are the triage surface and require an
// admin-account token: tickets carry verbatim error traces and payload shapes
// from every tenant, and a customer may file into the queue but not browse
// it. Payloads carry names and shapes only; the MCP tool never transmits
// values, and the 20k errorText cap is a backstop, not a license.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import {
  TicketFingerprint,
  LoopTicket,
  ingestTicket,
  type FingerprintStatus,
} from "@/models/LoopTicket";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const STATUSES: FingerprintStatus[] = ["open", "triaged", "in_progress", "resolved"];
const HOW_FAR = ["auth", "fetch", "normalise", "persist", "serve", "build-guide", "other"];

// payloadShape and packageVersions are Schema.Types.Mixed — the schema cannot
// cap them, so the route must. The read side is why it matters: the triage GET
// returns these verbatim for up to 20 tickets, so one oversized filing would
// push that response past the serverless ceiling and make the cluster
// un-openable on the triage surface. Refuse rather than truncate, consistent
// with the envVarNames "=" refusal — a mangled shape is worse than no shape.
const MAX_MIXED_BYTES = 20_000;
function boundedObject(
  v: unknown
): { ok: true; value: Record<string, unknown> | null } | { ok: false } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: true, value: null };
  try {
    if (JSON.stringify(v).length > MAX_MIXED_BYTES) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, value: v as Record<string, unknown> };
}

function clusterJson(c: any) {
  return {
    fingerprint: c.fingerprint,
    association: c.association,
    failingStep: c.failingStep,
    errorClass: c.errorClass,
    packageVersion: c.packageVersion,
    status: c.status,
    goal: c.goal,
    triageNote: c.triageNote,
    population: c.population,
    firstSeenAt: c.firstSeenAt,
    lastSeenAt: c.lastSeenAt,
    resolvedAt: c.resolvedAt,
    resolutionNotes: c.resolutionNotes,
    reportId: c.reportId ? String(c.reportId) : null,
  };
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const association =
    typeof body.association === "string" ? body.association.trim().slice(0, 200) : "";
  const failingStep =
    typeof body.failingStep === "string" ? body.failingStep.trim().slice(0, 200) : "";
  const errorText = typeof body.errorText === "string" ? body.errorText.trim().slice(0, 20_000) : "";
  if (!association || !failingStep || !errorText) {
    return NextResponse.json(
      { error: "validation_failed", message: "association, failingStep, and errorText are required" },
      { status: 400, headers: NO_STORE }
    );
  }

  // Env var NAMES only. A "=" in an entry means someone shipped a value —
  // refuse the whole ticket rather than store it. Names longer than an env
  // var name has any business being get the same treatment.
  const envVarNames = Array.isArray(body.envVarNames)
    ? body.envVarNames.filter((v: unknown) => typeof v === "string").slice(0, 50)
    : [];
  if (envVarNames.some((v: string) => v.includes("=") || v.length > 200)) {
    return NextResponse.json(
      {
        error: "validation_failed",
        message: "envVarNames must be NAMES only — an entry contains '=' or is implausibly long for a name. Remove the value and refile.",
      },
      { status: 400, headers: NO_STORE }
    );
  }

  const payloadShape = boundedObject(body.payloadShape);
  const packageVersions = boundedObject(body.packageVersions);
  if (!payloadShape.ok || !packageVersions.ok) {
    return NextResponse.json(
      {
        error: "validation_failed",
        message: `payloadShape and packageVersions must each serialize under ${MAX_MIXED_BYTES} bytes — send SHAPES (field names → types), never records.`,
      },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();

  const { ticket, cluster, reopened } = await ingestTicket({
    association,
    failingStep,
    errorClass: typeof body.errorClass === "string" ? body.errorClass.slice(0, 500) : null,
    errorText,
    howFar: HOW_FAR.includes(body.howFar) ? body.howFar : "other",
    payloadShape: payloadShape.value,
    envVarNames,
    packageVersions: packageVersions.value as Record<string, string> | null,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 5_000) : null,
    reporterUserId: auth.user._id,
    reporterTokenName: auth.tokenName || null,
    tokenLast4: auth.tokenLast4 || null,
    source: "mcp",
  });

  return NextResponse.json(
    {
      ok: true,
      ticketId: String(ticket._id),
      fingerprint: cluster.fingerprint,
      population: cluster.population,
      status: cluster.status,
      reopened,
      message: reopened
        ? "This failure was previously marked resolved — your report reopened it. That recurrence is the loop's highest-value signal; thank you."
        : cluster.population > 1
          ? `Filed. ${cluster.population} reports now share this fingerprint — it is a known failure mode being tracked as one work item.`
          : "Filed as a new failure mode. The judge triages open fingerprints before dispatching new test work.",
    },
    { status: 201, headers: NO_STORE }
  );
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  // Triage is an operator surface. Tickets carry verbatim error traces and
  // payload shapes from EVERY tenant; a customer token may file (POST) but
  // must not browse the cross-tenant queue.
  if (auth.user?.isAdmin !== true) {
    return NextResponse.json(
      { error: "forbidden", message: "Ticket triage is an operator surface. Filing (POST) is open to any token." },
      { status: 403, headers: NO_STORE }
    );
  }

  await dbConnect();
  const url = new URL(req.url);

  const fingerprint = url.searchParams.get("fingerprint");
  if (fingerprint) {
    const cluster = await TicketFingerprint.findOne({ fingerprint }).lean();
    if (!cluster) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const n = Math.min(Math.max(parseInt(url.searchParams.get("tickets") || "3", 10) || 3, 0), 20);
    const tickets = await LoopTicket.find({ fingerprint })
      .sort({ createdAt: -1 })
      .limit(n)
      .lean();
    return NextResponse.json(
      {
        cluster: clusterJson(cluster),
        tickets: tickets.map((t: any) => ({
          id: String(t._id),
          howFar: t.howFar,
          errorText: t.errorText,
          payloadShape: t.payloadShape,
          envVarNames: t.envVarNames,
          packageVersions: t.packageVersions,
          notes: t.notes,
          reporterTokenName: t.reporterTokenName,
          createdAt: t.createdAt,
        })),
      },
      { headers: NO_STORE }
    );
  }

  const statusParam = url.searchParams.get("status") || "open";
  const filter = STATUSES.includes(statusParam as FingerprintStatus)
    ? { status: statusParam }
    : {};
  const clusters = await TicketFingerprint.find(filter)
    .sort({ population: -1, lastSeenAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    { fingerprints: clusters.map(clusterJson) },
    { headers: NO_STORE }
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  if (auth.user?.isAdmin !== true) {
    return NextResponse.json(
      { error: "forbidden", message: "Ticket triage is an operator surface." },
      { status: 403, headers: NO_STORE }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  if (typeof body.fingerprint !== "string" || !body.fingerprint) {
    return NextResponse.json(
      { error: "validation_failed", message: "fingerprint is required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const update: any = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "bad_status" }, { status: 400, headers: NO_STORE });
    }
    update.status = body.status;
    if (body.status === "resolved") update.resolvedAt = new Date();
  }
  if (typeof body.goal === "string") update.goal = body.goal.slice(0, 5_000);
  if (typeof body.triageNote === "string") update.triageNote = body.triageNote.slice(0, 10_000);
  if (typeof body.resolutionNotes === "string")
    update.resolutionNotes = body.resolutionNotes.slice(0, 20_000);
  if (typeof body.reportId === "string" && body.reportId) update.reportId = body.reportId;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      {
        error: "validation_failed",
        message: "Send at least one of status, goal, triageNote, resolutionNotes, reportId.",
      },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();
  const cluster = await TicketFingerprint.findOneAndUpdate(
    { fingerprint: body.fingerprint },
    { $set: update },
    { new: true }
  );
  if (!cluster) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, cluster: clusterJson(cluster) }, { headers: NO_STORE });
}
