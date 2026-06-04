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

  const query: Record<string, any> = {
    closeDate: { $gte: since },
    propertyType: subject.propertyType,
  };
  if (subject.subdivisionName) {
    query.subdivisionName = subject.subdivisionName;
  } else if (subject.city) {
    query.city = subject.city;
  }
  if (typeof subject.listPrice === "number") {
    query.closePrice = {
      $gte: Math.floor(subject.listPrice * 0.8),
      $lte: Math.ceil(subject.listPrice * 1.2),
    };
  }

  // bed/bath filters: ±1 against EITHER field-name variant on the comp record.
  const andClauses: Record<string, any>[] = [];
  if (subjectBeds != null) {
    const range = { $gte: subjectBeds - 1, $lte: subjectBeds + 1 };
    andClauses.push({ $or: [{ bedroomsTotal: range }, { bedsTotal: range }] });
  }
  if (subjectBaths != null) {
    const range = { $gte: subjectBaths - 1, $lte: subjectBaths + 1 };
    andClauses.push({ $or: [{ bathroomsTotalInteger: range }, { bathsTotal: range }] });
  }
  if (andClauses.length > 0) query.$and = andClauses;

  const items: any[] = await UnifiedClosedListing.find(query)
    .select(
      "listingKey unparsedAddress city subdivisionName closePrice closeDate " +
      "bedroomsTotal bedsTotal bathroomsTotalInteger livingArea daysOnMarket"
    )
    .sort({ closeDate: -1 })
    .limit(12)
    .lean();

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
