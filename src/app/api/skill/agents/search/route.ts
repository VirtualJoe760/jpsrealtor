// src/app/api/skill/agents/search/route.ts
//
// GET /api/skill/agents/search?q=sardel[&kind=agents|brokerages|both]
//
// Type-ahead over the agents and brokerages collections built on the VPS
// (chatrealty-backend docs/tools/agents.md). Returns the ids the listing search
// takes back: agents' `_id` for `agentIds=`, brokerages' `_id` for `brokerages=`.
//
// A name prefix against the indexed identity.searchNames ("first last" and
// "last first", lowercased) and brokerages.normalizedName — an anchored regex on
// an already-normalized field is an index range scan. MLS placeholder records
// (identity.isSentinel) are never offered.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";

const NO_STORE = { "Cache-Control": "no-store" };
const LIMIT = 10;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normName = (s: string) => s.toLowerCase().replace(/[.,'"()]/g, " ").replace(/\s+/g, " ").trim();
const normBroker = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Agent data");

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const kind = (sp.get("kind") || "both").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "q_too_short", message: "Type at least two letters." }, { status: 422, headers: NO_STORE });
  }

  await dbConnect();
  const db = mongoose.connection.db!;

  const agents =
    kind === "brokerages"
      ? []
      : await db
          .collection("agents")
          .find(
            { "identity.searchNames": { $regex: `^${escape(normName(q))}` }, "identity.isSentinel": { $ne: true } },
            {
              projection: {
                _id: 1, mlsSource: 1, "identity.name": 1, "identity.photoUrl": 1, "brokerage.name": 1,
                "brokerage.slug": 1, "location.marketLabel": 1, "production.activeListings": 1,
                "production.last12moDeals": 1, "activity.status": 1, "identity.alsoKnownAs": 1,
              },
            }
          )
          .sort({ "production.activeListings": -1, "production.last12moDeals": -1, _id: 1 })
          .limit(LIMIT)
          .toArray();

  const brokerages =
    kind === "agents"
      ? []
      : await db
          .collection("brokerages")
          .find(
            { normalizedName: { $regex: `^${escape(normBroker(q))}` } },
            { projection: { _id: 1, name: 1, agentCount: 1, officeCount: 1, primaryCity: 1, "active.listings": 1 } }
          )
          .sort({ "active.listings": -1, agentCount: -1, _id: 1 })
          .limit(LIMIT)
          .toArray();

  return NextResponse.json(
    {
      agents: agents.map((a: any) => ({
        id: a._id,
        name: a.identity?.name || a._id,
        mlsSource: a.mlsSource || null,
        brokerage: a.brokerage?.name || null,
        market: a.location?.marketLabel || null,
        activeListings: a.production?.activeListings ?? 0,
        last12moDeals: a.production?.last12moDeals ?? 0,
        status: a.activity?.status || null,
        photoUrl: a.identity?.photoUrl || null,
        otherRegistrations: (a.identity?.alsoKnownAs || []).map((x: any) => x?._id).filter(Boolean),
      })),
      brokerages: brokerages.map((b: any) => ({
        id: b._id,
        name: b.name || b._id,
        agents: b.agentCount ?? 0,
        offices: b.officeCount ?? 0,
        activeListings: b.active?.listings ?? 0,
        primaryCity: b.primaryCity || null,
      })),
    },
    { headers: NO_STORE }
  );
}
