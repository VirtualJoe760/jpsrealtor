import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import UnifiedClosedListing from "@/models/unified-closed-listing";

export const dynamic = "force-dynamic";

/**
 * GET /api/cma/subdivision/[slug]
 *
 * Returns pre-computed CMA stats for a subdivision.
 * Pure findOne — no math at request time.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    await dbConnect();

    const doc = await Subdivision.findOne(
      { slug, retired: { $ne: true } },
      {
        name: 1,
        slug: 1,
        city: 1,
        county: 1,
        region: 1,
        photo: 1,
        cmaStats: 1,
        isMasterCommunity: 1,
        childSubdivisions: 1,
        childCount: 1,
        parentSubdivisionName: 1,
      }
    ).lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Subdivision not found" },
        { status: 404 }
      );
    }

    if (!(doc as any).cmaStats) {
      return NextResponse.json(
        { error: "No CMA data available for this subdivision" },
        { status: 404 }
      );
    }

    // Filter out excluded subtypes (Co-Ownership, etc.)
    const EXCLUDED_SUBTYPES = ["Co-Ownership"];
    const cmaStats = (doc as any).cmaStats;
    if (cmaStats.bySubType) {
      cmaStats.bySubType = cmaStats.bySubType.filter(
        (st: any) => !EXCLUDED_SUBTYPES.includes(st.subType)
      );
    }
    if (cmaStats.topComps) {
      cmaStats.topComps = cmaStats.topComps.filter(
        (c: any) => !EXCLUDED_SUBTYPES.includes(c.propertySubType)
      );
    }

    // Fetch full sales history from unified_closed_listings
    // Uses the same match strategy as the Python builder: subdivisionName + city
    const EXCLUDED_SUBTYPES_SET = new Set(EXCLUDED_SUBTYPES);
    const subdivisionNames = [(doc as any).name, ...((doc as any).aliases || [])];

    // Most recent closed sales (no date filter — let the frontend decide what to show)
    const salesHistory = await UnifiedClosedListing.find(
      {
        subdivisionName: { $in: subdivisionNames },
        city: (doc as any).city,
        propertyType: "A",
        closeDate: { $exists: true },
        closePrice: { $gt: 0 },
      },
      {
        address: 1,
        unparsedAddress: 1,
        slugAddress: 1,
        closeDate: 1,
        closePrice: 1,
        listPrice: 1,
        originalListPrice: 1,
        livingArea: 1,
        bedsTotal: 1,
        bathsTotal: 1,
        yearBuilt: 1,
        garageSpaces: 1,
        onMarketDate: 1,
        propertySubType: 1,
        poolYN: 1,
        pool: 1,
        spaYN: 1,
        spa: 1,
        view: 1,
        lotSizeArea: 1,
        lotSizeSqft: 1,
      }
    )
      .sort({ closeDate: -1 })
      .limit(50)
      .lean();

    // Filter excluded subtypes and compute daysOnMarket
    const filteredSales = salesHistory
      .filter(
        (s: any) =>
          !EXCLUDED_SUBTYPES_SET.has(s.propertySubType) &&
          (s.listPrice || s.originalListPrice) // must have a list price
      )
      .map((s: any) => {
        const dom =
          s.closeDate && s.onMarketDate
            ? Math.round(
                (new Date(s.closeDate).getTime() -
                  new Date(s.onMarketDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
        // Use unparsedAddress, strip city/state/zip for clean display
        const fullAddr = s.unparsedAddress || s.address || "";
        const shortAddr = fullAddr.split(",")[0] || fullAddr;

        return {
          address: shortAddr,
          slugAddress: s.slugAddress,
          closeDate: s.closeDate,
          closePrice: s.closePrice,
          listPrice: s.listPrice || s.originalListPrice,
          originalListPrice: s.originalListPrice,
          livingArea: s.livingArea,
          bedsTotal: s.bedsTotal,
          bathsTotal: s.bathsTotal,
          yearBuilt: s.yearBuilt,
          garageSpaces: s.garageSpaces,
          pool: s.poolYN ?? s.pool ?? null,
          spa: s.spaYN ?? s.spa ?? null,
          view: s.view || null,
          lotSize: s.lotSizeArea || s.lotSizeSqft || null,
          daysOnMarket: dom,
          propertySubType: s.propertySubType,
          salePpsf:
            s.closePrice && s.livingArea
              ? Math.round((s.closePrice / s.livingArea) * 100) / 100
              : null,
          saleToListRatio:
            s.closePrice && (s.listPrice || s.originalListPrice)
              ? Math.round(
                  (s.closePrice / (s.listPrice || s.originalListPrice)) * 10000
                ) / 10000
              : null,
        };
      });

    return NextResponse.json({ ...doc, salesHistory: filteredSales });
  } catch (error) {
    console.error("[GET /api/cma/subdivision] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
