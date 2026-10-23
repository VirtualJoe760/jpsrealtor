// src/app/api/skill/brokerages/profile/route.ts
//
// GET /api/skill/brokerages/profile?id=compass   (a `brokerages` _id, which is its slug)
//
// One brokerage brand for a profile view: its size, live and closed totals, its offices, the cities it works and its
// top agents (placeholders already excluded by the builder). Agent and office counts are a floor: listings filed
// under "Unknown Office" are not attributed to any brokerage. Read-only (the VPS rebuilds `brokerages`).

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Brokerage data");

  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 422, headers: NO_STORE });

  await dbConnect();
  const b: any = await mongoose.connection.db!.collection("brokerages").findOne({ _id: id as any });
  if (!b) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  return NextResponse.json(
    {
      id: b._id,
      name: b.name || b._id,
      agents: b.agentCount ?? 0,
      agentsWithLiveInventory: b.agentsWithLiveInventory ?? 0,
      offices: b.officeCount ?? 0,
      mlsSources: b.mlsSources || [],
      active: { listings: b.active?.listings ?? 0, volume: b.active?.volume ?? 0, inEscrow: b.active?.inEscrow ?? 0 },
      closed: { deals: b.closed?.deals ?? 0, volume: b.closed?.volume ?? 0, last12moDeals: b.closed?.last12moDeals ?? 0, last12moVolume: b.closed?.last12moVolume ?? 0 },
      primaryCity: b.primaryCity || null,
      officeList: (b.offices || []).slice(0, 10).map((o: any) => ({ name: o.name || null, phone: o.phone || null, agents: o.agents ?? 0 })),
      cities: (b.cities || []).slice(0, 10).map((c: any) => ({ city: c.city, slug: c.slug, agents: c.agents ?? 0, active: c.active ?? 0, closed: c.closed ?? 0 })),
      topAgents: (b.topAgents || []).slice(0, 12).map((t: any) => ({
        id: t._id,
        name: t.name || t._id,
        city: t.city || null,
        activeListings: t.activeListings ?? 0,
        closedDeals: t.closedDeals ?? 0,
        closedVolume: t.closedVolume ?? 0,
      })),
      lastUpdated: b.lastUpdated ?? null,
    },
    { headers: NO_STORE }
  );
}
