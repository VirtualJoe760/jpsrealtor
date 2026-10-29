// /api/admin/mls-associations — every agent's MLS association, grouped, so
// the admin can call each association about IDX data access.
//   GET   → groups of { associationName, contacts, agents[] }
//   PATCH → { userId, dataAccessStatus?, adminNotes? } on one agent's record
// Admin-only: behind the /api/admin proxy gate AND verifyAdmin() here.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const STATUSES = ["not_contacted", "contacted", "in_progress", "connected", "declined"];

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();

  const users = await User.find({
    $or: [{ roles: "realEstateAgent" }, { "agentApplication.phase": { $exists: true } }],
  })
    .select("name email phone roles agentProfile.mlsMembership agentApplication.mlsAssociation agentApplication.mlsId agentApplication.phase")
    .lean<any[]>();

  const agents = users.map((u) => {
    const m = u.agentProfile?.mlsMembership || {};
    return {
      userId: String(u._id),
      name: u.name || u.email,
      email: u.email,
      phone: u.phone || "",
      isAgent: (u.roles || []).includes("realEstateAgent"),
      phase: u.agentApplication?.phase || null,
      // Fall back to what the old application form collected.
      associationName: m.associationName || u.agentApplication?.mlsAssociation || "",
      mlsId: m.mlsId || u.agentApplication?.mlsId || "",
      contactName: m.contactName || "",
      contactPhone: m.contactPhone || "",
      contactEmail: m.contactEmail || "",
      website: m.website || "",
      dataAccessStatus: m.dataAccessStatus || "not_contacted",
      adminNotes: m.adminNotes || "",
      complete: !!(m.associationName && m.mlsId && (m.contactPhone || m.contactEmail)),
    };
  });

  // Group by a normalized association name so "CDAR" / "cdar " land together.
  const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const groups = new Map<string, { associationName: string; agents: typeof agents }>();
  for (const a of agents) {
    const k = a.associationName ? key(a.associationName) : "__missing__";
    if (!groups.has(k)) groups.set(k, { associationName: a.associationName || "Not provided yet", agents: [] });
    groups.get(k)!.agents.push(a);
  }
  const out = [...groups.values()].sort((x, y) =>
    x.associationName === "Not provided yet" ? 1 : y.associationName === "Not provided yet" ? -1 : y.agents.length - x.agents.length
  );
  return NextResponse.json({ groups: out }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const set: Record<string, unknown> = {};
  if (body.dataAccessStatus !== undefined) {
    if (!STATUSES.includes(body.dataAccessStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    set["agentProfile.mlsMembership.dataAccessStatus"] = body.dataAccessStatus;
  }
  if (body.adminNotes !== undefined) set["agentProfile.mlsMembership.adminNotes"] = String(body.adminNotes).slice(0, 2000);
  if (!Object.keys(set).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await dbConnect();
  await User.updateOne({ _id: body.userId }, { $set: set });
  return NextResponse.json({ ok: true });
}
