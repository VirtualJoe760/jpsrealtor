// src/app/api/skill/agents/profile/route.ts
//
// GET /api/skill/agents/profile?id=GPS:d83203   (an `agents` _id or slug)
//
// One agent for a profile view: the search card, contact detail from the MLS roster, the office, the cities they
// work, the 5-year closed record by side and by year, and their other MLS registrations (identity.personId) so a
// person's work is shown whole without summing a co-brokered deal twice. Read-only (the VPS rebuilds `agents`).

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { agentCard } from "@/lib/skill-api/agent-card";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Agent data");

  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 422, headers: NO_STORE });

  await dbConnect();
  const agents = mongoose.connection.db!.collection("agents");
  const a: any = await agents.findOne({ $or: [{ _id: id as any }, { slug: id }] });
  if (!a) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  const siblings = a.identity?.personId
    ? await agents
        .find(
          { "identity.personId": a.identity.personId, _id: { $ne: a._id } },
          { projection: { _id: 1, mlsSource: 1, "brokerage.name": 1, "production.activeListings": 1, "production.windowDeals": 1, "production.last12moDeals": 1 } }
        )
        .limit(6)
        .toArray()
    : [];

  const side = (s: any) =>
    s ? { deals: s.deals ?? 0, volume: s.volume ?? 0, medianClosePrice: s.medianClosePrice ?? null, medianDaysOnMarket: s.medianDaysOnMarket ?? null, medianSaleToListRatio: s.medianSaleToListRatio ?? null } : null;
  const cities = (a.location?.cities || [])
    .slice()
    .sort((x: any, y: any) => (y?.total ?? 0) - (x?.total ?? 0))
    .slice(0, 10)
    .map((c: any) => ({ city: c.city, slug: c.slug, active: c.active ?? 0, closed: c.closed ?? 0, total: c.total ?? 0 }));

  return NextResponse.json(
    {
      ...agentCard(a),
      isPlaceholder: !!a.identity?.isSentinel,
      contact: {
        licenseNumber: a.identity?.licenseNumber || null,
        email: a.identity?.email || null,
        phone: a.identity?.phone || null,
        website: a.identity?.website || null,
        bio: a.identity?.bio || null,
      },
      memberType: a.identity?.memberType || null,
      isTeam: !!a.identity?.isTeam,
      office: a.office ? { name: a.office.name || null, phone: a.office.phone || null, mlsId: a.office.mlsId || null } : null,
      cities,
      closed: a.closed
        ? {
            windowYears: a.closed.windowYears ?? 5,
            windowStart: a.closed.windowStart ?? null,
            lastCloseDate: a.closed.lastCloseDate ?? null,
            listSide: side(a.closed.listSide),
            buySide: side(a.closed.buySide),
            last12mo: { deals: a.closed.last12mo?.deals ?? 0, volume: a.closed.last12mo?.volume ?? 0 },
            byYear: (a.closed.byYear || []).map((y: any) => ({ year: y.year, deals: y.deals ?? 0, volume: y.volume ?? 0 })),
          }
        : null,
      production: {
        primaryRole: a.production?.primaryRole || null,
        activeInventoryValue: a.production?.activeInventoryValue ?? 0,
        inEscrowListings: a.production?.inEscrowListings ?? 0,
        avgDealPrice: a.production?.avgDealPrice ?? null,
        listSideDeals: a.production?.listSideDeals ?? 0,
        buySideDeals: a.production?.buySideDeals ?? 0,
      },
      lastActivityDate: a.activity?.lastActivityDate ?? null,
      notes: a.coverage?.notes || [],
      registrations: siblings.map((s: any) => ({
        id: s._id,
        mlsSource: s.mlsSource || null,
        brokerage: s.brokerage?.name || null,
        activeListings: s.production?.activeListings ?? 0,
        windowDeals: s.production?.windowDeals ?? 0,
      })),
      lastUpdated: a.lastUpdated ?? null,
    },
    { headers: NO_STORE }
  );
}
