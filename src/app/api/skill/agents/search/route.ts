// src/app/api/skill/agents/search/route.ts
//
// GET /api/skill/agents/search?q=sardel&kind=agents|brokerages|both&city=palm-desert&sort=volume&limit=10
//
// Agents and brokerages from the collections the VPS builds (chatrealty-backend docs/tools/agents.md and
// docs/tools/frontend-agent-prompt.md). Read-only: the builder rebuilds both twice a week.
//
// - q: a name prefix against the indexed identity.searchNames ("first last", "last first") and
//   brokerages.normalizedName. Optional when a city is given ("agents in Palm Desert").
// - city: a city slug. Ranked by the city's OWN figures, not the whole-window totals: an agent with $959M statewide
//   may have 29 deals here, behind a local agent with 430. Agents with at least 3 listings or deals here
//   (location.cities, elemMatch) are fetched by whole-window volume (index cities_volume), then re-sorted in JS by
//   the local count — a sort on a matched array element cannot use an index. Brokerages likewise from cities[].
// - sort: volume (5-year closed volume; with a city, deals closed there) | deals12 (last 12 months) | active (active
//   listings; with a city, active there).
//
// One row per PERSON: a person registered in several MLSs is several docs, folded here by identity.personId.
// MLS placeholder records (identity.isSentinel) are never returned. Counts come from `production`, which every doc
// carries — `active`/`escrow` are omitted on most docs and `unified_listings` has no agent index.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { agentCard } from "@/lib/skill-api/agent-card";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX = 25;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normName = (s: string) => s.toLowerCase().replace(/[.,'"()]/g, " ").replace(/\s+/g, " ").trim();
const normBroker = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const AGENT_SORT: Record<string, Record<string, 1 | -1>> = {
  volume: { "production.windowVolume": -1 },
  deals12: { "production.last12moDeals": -1 },
  active: { "production.activeListings": -1 },
};
const BROKER_SORT: Record<string, Record<string, 1 | -1>> = {
  volume: { "closed.volume": -1 },
  deals12: { "closed.last12moDeals": -1 },
  active: { "active.listings": -1 },
};

const AGENT_PROJECTION = {
  _id: 1, slug: 1, mlsSource: 1, "identity.name": 1, "identity.photoUrl": 1, "identity.personId": 1,
  "identity.alsoKnownAs": 1, "brokerage.name": 1, "brokerage.slug": 1, "location.marketLabel": 1,
  "location.cities": 1, production: 1, "activity.status": 1, "coverage.confidence": 1,
};

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
  const cityRaw = (sp.get("city") || "").trim();
  const city = cityRaw ? slugify(cityRaw) : "";
  const sort = (sp.get("sort") || "volume").trim();
  const limit = Math.min(MAX, Math.max(1, Number(sp.get("limit")) || 10));
  if (q.length < 2 && !city) {
    return NextResponse.json({ error: "q_too_short", message: "Type at least two letters, or pick a city." }, { status: 422, headers: NO_STORE });
  }

  await dbConnect();
  const db = mongoose.connection.db!;

  let agents: any[] = [];
  if (kind !== "brokerages") {
    const match: Record<string, any> = { "identity.isSentinel": { $ne: true } };
    if (q.length >= 2) match["identity.searchNames"] = { $regex: `^${escape(normName(q))}` };
    if (city) match["location.cities"] = { $elemMatch: { slug: city, total: { $gte: q.length >= 2 ? 1 : 3 } } };
    // A name search is ranked by who is working now; a city list by the chosen figure, then by the city's own.
    const order: Record<string, 1 | -1> = q.length >= 2 && !city ? { "production.activeListings": -1, "production.last12moDeals": -1 } : AGENT_SORT[sort] || AGENT_SORT.volume;
    let docs = await db.collection("agents").find(match, { projection: AGENT_PROJECTION }).sort({ ...order, _id: 1 }).limit(city ? 500 : limit * 3).toArray();
    if (city) {
      const here = (a: any) => (a.location?.cities || []).find((c: any) => c?.slug === city) || {};
      const key = sort === "active" ? "active" : "closed";
      docs = docs.sort((x: any, y: any) => (here(y)[key] ?? 0) - (here(x)[key] ?? 0) || (here(y).total ?? 0) - (here(x).total ?? 0));
    }
    // Fold registrations of one person into the busiest of them.
    const seen = new Set<string>();
    for (const a of docs) {
      const person = a.identity?.personId || String(a._id);
      if (seen.has(person)) continue;
      seen.add(person);
      agents.push(agentCard(a, city || undefined));
      if (agents.length >= limit) break;
    }
  }

  let brokerages: any[] = [];
  if (kind !== "agents") {
    const match: Record<string, any> = {};
    if (q.length >= 2) match.normalizedName = { $regex: `^${escape(normBroker(q))}` };
    if (city) match["cities.slug"] = city;
    const order: Record<string, 1 | -1> = q.length >= 2 && !city ? { "active.listings": -1, agentCount: -1 } : BROKER_SORT[sort] || BROKER_SORT.volume;
    let docs = await db
      .collection("brokerages")
      .find(match, { projection: { _id: 1, name: 1, agentCount: 1, officeCount: 1, primaryCity: 1, active: 1, closed: 1, cities: 1 } })
      .sort({ ...order, _id: 1 })
      .limit(city ? 200 : limit)
      .toArray();
    if (city) {
      const here = (b: any) => (b.cities || []).find((c: any) => c?.slug === city) || {};
      const key = sort === "active" ? "active" : "closed";
      docs = docs.sort((x: any, y: any) => (here(y)[key] ?? 0) - (here(x)[key] ?? 0)).slice(0, limit);
    }
    brokerages = docs.map((b: any) => {
      const local = city ? (b.cities || []).find((c: any) => c?.slug === city) : null;
      return {
        id: b._id,
        name: b.name || b._id,
        agents: b.agentCount ?? 0,
        offices: b.officeCount ?? 0,
        activeListings: b.active?.listings ?? 0,
        closedDeals: b.closed?.deals ?? 0,
        closedVolume: b.closed?.volume ?? 0,
        last12moDeals: b.closed?.last12moDeals ?? 0,
        primaryCity: b.primaryCity || null,
        ...(local ? { inCity: { agents: local.agents ?? 0, active: local.active ?? 0, closed: local.closed ?? 0 } } : {}),
      };
    });
  }

  return NextResponse.json({ agents, brokerages, ...(city ? { city } : {}) }, { headers: NO_STORE });
}
