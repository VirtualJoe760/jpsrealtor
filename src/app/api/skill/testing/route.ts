// /api/skill/testing — the judge's side of the feedback loop.
//
// The judge is NOT a Claude session and runs on a different machine; this
// route is its entire interface to us. Auth is a normal crt_live_ skill token
// (mint one at chatrealty.io/agent/settings → Integrations), same as
// /api/skill/bugs — any valid token, rate-limited, no extra scope.
//
//   GET    → { testingOn, latestReport, openTickets, unreadMessages } — the
//            judge polls this. Its dispatch condition is:
//            latestReport.status === "complete" && testingOn. openTickets is
//            the reactive-ingress summary (docs/testing/tickets.md): open
//            fingerprints by population, so the judge triages field failures
//            before spending a session on coverage. unreadMessages says the
//            admin console has mail for him — fetched at
//            /api/skill/testing/messages.
//   POST   → submit an MD report: { title, markdown, testingOff? }.
//            Sets the report status "new". Pass testingOff: true to also flip
//            the toggle off in the same call (the judge's normal move).
//   PATCH  → { testingOn: false } — the judge may only turn testing OFF.
//            Turning it back ON is our routine's move after fixes land; the
//            two sides each own one direction so the handshake cannot race.
//
// Full protocol: docs/testing/README.md.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import { AgentTestReport, getTestingState, setTestingOn } from "@/models/AgentTesting";
import { TicketFingerprint, LoopMessage } from "@/models/LoopTicket";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  await dbConnect();
  const state = await getTestingState();
  const latest = await AgentTestReport.findOne({}).sort({ createdAt: -1 }).lean();

  // Reactive ingress: open fingerprints, biggest population first. Tickets a
  // field failure has already produced outrank coverage cells that are merely
  // unverified, so the judge sees them in the same poll that gates dispatch.
  const openClusters = await TicketFingerprint.find({ status: { $in: ["open", "triaged"] } })
    .sort({ population: -1, lastSeenAt: -1 })
    .limit(5)
    .lean();
  const openTicketCount = await TicketFingerprint.countDocuments({
    status: { $in: ["open", "triaged", "in_progress"] },
  });
  const unreadForTom = await LoopMessage.countDocuments({
    channel: "tom",
    from: "admin",
    readAt: null,
  });

  return NextResponse.json(
    {
      testingOn: state.testingOn,
      // The judge's operating mode. "idle" = this firing pulls docs and
      // answers console messages, then STOPS — no dispatch, no judging, no
      // reports. "working" = the full loop. Set from /admin/loop.
      mode: state.tomMode || "working",
      latestReport: latest
        ? {
            id: String(latest._id),
            title: latest.title,
            status: latest.status,
            submittedAt: latest.createdAt,
            completedAt: latest.completedAt,
            // The judge relays our notes to Test Claude as build guidance.
            resolutionNotes: latest.status === "complete" ? latest.resolutionNotes : null,
          }
        : null,
      openTickets: {
        count: openTicketCount,
        fingerprints: openClusters.map((c: any) => ({
          fingerprint: c.fingerprint,
          association: c.association,
          failingStep: c.failingStep,
          errorClass: c.errorClass,
          status: c.status,
          goal: c.goal,
          population: c.population,
          lastSeenAt: c.lastSeenAt,
        })),
      },
      unreadMessages: unreadForTom,
    },
    { headers: NO_STORE }
  );
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

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const markdown = typeof body.markdown === "string" ? body.markdown.trim() : "";
  if (!title || !markdown) {
    return NextResponse.json(
      { error: "validation_failed", message: "title and markdown are required" },
      { status: 400, headers: NO_STORE }
    );
  }
  if (markdown.length > 200_000) {
    return NextResponse.json(
      { error: "validation_failed", message: "markdown exceeds 200k chars" },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();

  // One open report at a time. A second "new" report while the first is
  // unprocessed means the loop is broken somewhere — refuse loudly rather
  // than queueing silently and processing them out of order.
  const open = await AgentTestReport.findOne({ status: { $ne: "complete" } }).lean();
  if (open) {
    return NextResponse.json(
      {
        error: "report_pending",
        message: `Report ${String(open._id)} ("${open.title}") is still ${open.status}. Wait for it to complete.`,
      },
      { status: 409, headers: NO_STORE }
    );
  }

  const report = await AgentTestReport.create({
    title,
    markdown,
    status: "new",
    reporterUserId: auth.user._id,
    reporterTokenName: auth.tokenName || null,
  });

  let testingOn: boolean | undefined;
  if (body.testingOff === true) {
    const state = await setTestingOn(false, "judge");
    testingOn = state.testingOn;
  }

  return NextResponse.json(
    { ok: true, reportId: String(report._id), status: report.status, testingOn },
    { status: 201, headers: NO_STORE }
  );
}

export async function PATCH(req: NextRequest) {
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

  // The judge's only write to the toggle is OFF. ON is the routine's signal
  // that fixes have landed; letting the judge set it would let one side
  // impersonate the other's half of the handshake.
  if (body.testingOn !== false) {
    return NextResponse.json(
      { error: "forbidden_transition", message: "This endpoint can only set testingOn: false." },
      { status: 403, headers: NO_STORE }
    );
  }

  await dbConnect();
  const state = await setTestingOn(false, "judge");
  return NextResponse.json({ ok: true, testingOn: state.testingOn }, { headers: NO_STORE });
}
