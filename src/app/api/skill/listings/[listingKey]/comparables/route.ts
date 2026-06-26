// src/app/api/skill/listings/[listingKey]/comparables/route.ts
//
// GET → simple closed-comp set for a listing. Filters closed listings on:
//   - same subdivision (if known) OR same city
//   - same property type
//   - ±1 bed, ±1 bath
//   - ±20% list price
//   - sold within last 6 months
// Capped at 12. For the rich CMA flow with stats / narrative, the agent
// has /api/cma/generate in the CRM dashboard.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import UnifiedListing from "@/models/unified-listing";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import { resolveAdapter } from "@/lib/tenant/resolve-connection";
import { mapErrorToResponse } from "@/lib/skill-api/errors";
import type { ListingFilter, ListingDTO } from "@/lib/db/adapter";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const { listingKey } = await params;

  // Product-tenant path (additive): generate comps from the customer's own
  // closed listings (their Neon DB). No tenantId -> the unchanged legacy Mongo
  // path below.
  if (auth.ok && auth.tenantId) {
    return comparablesViaTenantAdapter(auth.tenantId, listingKey);
  }

  await dbConnect();

  const subject: any = await UnifiedListing.findOne({ listingKey })
    .select(
      "listingKey unparsedAddress city subdivisionName propertyType listPrice " +
      "bedroomsTotal bedsTotal bathroomsTotalInteger bathsTotal livingArea"
    )
    .lean();
  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  // Coalesce the two field-name variants so comparables works whether the
  // subject came from a CRMLS or GPS-style source.
  const subjectBeds = subject.bedroomsTotal ?? subject.bedsTotal ?? null;
  const subjectBaths = subject.bathroomsTotalInteger ?? subject.bathsTotal ?? null;

  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  // closeDate is stored as either a real Date (newer docs, ~100k) or an ISO
  // date-only string like "2021-06-17" (older docs, ~787k). Mongoose casts
  // our Date cutoff and Mongo type-ranking means Date queries never match
  // string-typed docs. Match both via $or, using the native collection so
  // Mongoose doesn't re-cast either branch.
  const sinceIsoDay = since.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const baseQuery: Record<string, any> = {
    propertyType: subject.propertyType,
  };
  if (subject.subdivisionName) {
    baseQuery.subdivisionName = subject.subdivisionName;
  } else if (subject.city) {
    baseQuery.city = subject.city;
  }
  if (typeof subject.listPrice === "number") {
    baseQuery.closePrice = {
      $gte: Math.floor(subject.listPrice * 0.8),
      $lte: Math.ceil(subject.listPrice * 1.2),
    };
  }

  // bed/bath filters: ±1 against EITHER field-name variant on the comp record.
  const andClauses: Record<string, any>[] = [
    {
      $or: [
        { closeDate: { $gte: since } },
        { closeDate: { $gte: sinceIsoDay } },
      ],
    },
  ];
  if (subjectBeds != null) {
    const range = { $gte: subjectBeds - 1, $lte: subjectBeds + 1 };
    andClauses.push({ $or: [{ bedroomsTotal: range }, { bedsTotal: range }] });
  }
  if (subjectBaths != null) {
    const range = { $gte: subjectBaths - 1, $lte: subjectBaths + 1 };
    andClauses.push({ $or: [{ bathroomsTotalInteger: range }, { bathsTotal: range }] });
  }
  baseQuery.$and = andClauses;

  // Native collection to skip Mongoose's auto-casting (which would re-cast
  // both branches of the closeDate $or back into Date and break the string
  // branch). Project the same fields the previous .select() did.
  const items: any[] = await UnifiedClosedListing.collection
    .find(baseQuery, {
      projection: {
        listingKey: 1, unparsedAddress: 1, city: 1, subdivisionName: 1,
        closePrice: 1, closeDate: 1, bedroomsTotal: 1, bedsTotal: 1,
        bathroomsTotalInteger: 1, livingArea: 1, daysOnMarket: 1,
      },
    })
    .sort({ closeDate: -1 })
    .limit(12)
    .toArray();

  // Compute quick aggregates so Claude can write a one-sentence summary
  // without doing math itself.
  const prices = items.map((i) => i.closePrice).filter((p) => typeof p === "number") as number[];
  const median =
    prices.length > 0
      ? prices.slice().sort((a, b) => a - b)[Math.floor(prices.length / 2)]
      : null;

  return NextResponse.json(
    {
      subject: {
        listingKey: subject.listingKey,
        address: subject.unparsedAddress,
        listPrice: subject.listPrice,
        beds: subjectBeds,
        baths: subjectBaths,
        sqft: subject.livingArea,
      },
      comparables: items.map((c) => ({
        listingKey: c.listingKey,
        address: c.unparsedAddress || null,
        closePrice: c.closePrice ?? null,
        closeDate: c.closeDate || null,
        beds: c.bedroomsTotal ?? c.bedsTotal ?? null,
        baths: c.bathroomsTotalInteger ?? null,
        sqft: c.livingArea ?? null,
        daysOnMarket: c.daysOnMarket ?? null,
      })),
      stats: {
        count: items.length,
        medianClosePrice: median,
        scope: subject.subdivisionName ? "subdivision" : "city",
      },
    },
    { headers: NO_STORE }
  );
}

// ---------------------------------------------------------------------------
// Product-tenant comps — closed comps from the tenant's own data via the
// adapter. Same subject/comparables/stats shape as the legacy route, plus the
// §3.8 agent/brokerage attribution on each comp. Matches by area + ±20% price
// + ±1 bed/bath against CLOSED listings. (closePrice/closeDate are proxied
// from the DTO's currentPrice/onMarketDate — a basic comp set; the rich CMA
// stays in the CRM dashboard.)
// ---------------------------------------------------------------------------

async function comparablesViaTenantAdapter(tenantId: string, listingKey: string) {
  try {
    const adapter = await resolveAdapter(tenantId);

    const subject = await adapter.listings.get(listingKey);
    if (!subject) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const filter: ListingFilter = {
      status: "Closed",
      ...(subject.subdivision
        ? { subdivision: subject.subdivision }
        : subject.city
          ? { city: subject.city }
          : {}),
      price:
        typeof subject.listPrice === "number"
          ? { min: Math.floor(subject.listPrice * 0.8), max: Math.ceil(subject.listPrice * 1.2) }
          : undefined,
      beds: subject.beds != null ? { min: subject.beds - 1, max: subject.beds + 1 } : undefined,
      baths: subject.baths != null ? { min: subject.baths - 1, max: subject.baths + 1 } : undefined,
    };

    const page = await adapter.listings.find(filter, { limit: 12 });
    const comps: readonly ListingDTO[] = page.items;

    const prices = comps
      .map((c) => c.currentPrice ?? c.listPrice)
      .filter((p): p is number => typeof p === "number");
    const median =
      prices.length > 0
        ? prices.slice().sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : null;

    return NextResponse.json(
      {
        subject: {
          listingKey: subject.listingKey,
          address: subject.address,
          listPrice: subject.listPrice,
          beds: subject.beds,
          baths: subject.baths,
          sqft: subject.sqft,
        },
        comparables: comps.map((c) => ({
          listingKey: c.listingKey,
          address: c.address,
          closePrice: c.currentPrice ?? c.listPrice ?? null,
          closeDate: c.onMarketDate ?? null,
          beds: c.beds,
          baths: c.baths,
          sqft: c.sqft,
          daysOnMarket: c.daysOnMarket,
          listAgentName: c.listAgentName,
          listOfficeName: c.listOfficeName,
        })),
        stats: {
          count: comps.length,
          medianClosePrice: median,
          scope: subject.subdivision ? "subdivision" : "city",
        },
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    return mapErrorToResponse(e);
  }
}
