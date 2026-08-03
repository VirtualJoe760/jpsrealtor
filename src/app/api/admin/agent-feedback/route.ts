// /api/admin/agent-feedback — the admin page's side of the judge loop.
//
//   GET   → toggle state + report list (markdown included for rendering)
//   PATCH → { testingOn } to flip the toggle, or { reportId, status,
//           resolutionNotes? } to move a report. Manual override surface:
//           the routine normally does both, but Joseph must be able to unstick
//           the loop from the dashboard when a machine on either side is down.
//
// Session auth + isAdmin, same pattern as /api/admin/users.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { AgentTestReport, getTestingState, setTestingOn } from "@/models/AgentTesting";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await dbConnect();
  const user: any = await User.findById(session.user.id).select("isAdmin").lean();
  return user?.isAdmin ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }

  const state = await getTestingState();
  const reports = await AgentTestReport.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    {
      testingOn: state.testingOn,
      toggleUpdatedBy: state.updatedBy,
      toggleUpdatedAt: state.updatedAt,
      reports: reports.map((r: any) => ({
        id: String(r._id),
        title: r.title,
        status: r.status,
        markdown: r.markdown,
        resolutionNotes: r.resolutionNotes,
        reporterTokenName: r.reporterTokenName,
        submittedAt: r.createdAt,
        completedAt: r.completedAt,
      })),
    },
    { headers: NO_STORE }
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

  if (typeof body.testingOn === "boolean") {
    const state = await setTestingOn(body.testingOn, "admin");
    return NextResponse.json({ ok: true, testingOn: state.testingOn }, { headers: NO_STORE });
  }

  if (body.reportId && body.status) {
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

  return NextResponse.json(
    { error: "validation_failed", message: "Send { testingOn } or { reportId, status }." },
    { status: 400, headers: NO_STORE }
  );
}
