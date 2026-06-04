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
      "bedroomsTotal bathroomsTotalInteger livingArea"
    )
    .lean();
  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

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
  if (subject.bedroomsTotal != null) {
    query.bedroomsTotal = { $gte: subject.bedroomsTotal - 1, $lte: subject.bedroomsTotal + 1 };
  }
  if (subject.bathroomsTotalInteger != null) {
    query.bathroomsTotalInteger = {
      $gte: subject.bathroomsTotalInteger - 1,
      $lte: subject.bathroomsTotalInteger + 1,
    };
  }
  if (typeof subject.listPrice === "number") {
    query.closePrice = {
      $gte: Math.floor(subject.listPrice * 0.8),
      $lte: Math.ceil(subject.listPrice * 1.2),
    };
  }

  const items: any[] = await UnifiedClosedListing.find(query)
    .select(
      "listingKey unparsedAddress city subdivisionName closePrice closeDate " +
      "bedroomsTotal bathroomsTotalInteger livingArea daysOnMarket"
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
        beds: subject.bedroomsTotal,
        baths: subject.bathroomsTotalInteger,
        sqft: subject.livingArea,
      },
      comparables: items.map((c) => ({
        listingKey: c.listingKey,
        address: c.unparsedAddress || null,
        closePrice: c.closePrice ?? null,
        closeDate: c.closeDate || null,
        beds: c.bedroomsTotal ?? null,
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
