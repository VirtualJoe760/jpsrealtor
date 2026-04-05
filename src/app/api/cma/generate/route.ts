/**
 * POST /api/cma/generate
 *
 * Generate a Comparative Market Analysis for a listing.
 *
 * Body:
 *   { listingKey: string }           — fetch listing from DB
 *   OR { listing: object }           — provide raw listing data directly
 *   + optional: { maxComps?: number, tierOverride?: string }
 *
 * Returns: CMAResult
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import { generateCMA } from "@/lib/cma/engine";
import { CMATier } from "@/lib/cma/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingKey, listing: rawListing, maxComps, tierOverride } = body;

    if (!listingKey && !rawListing) {
      return NextResponse.json(
        { error: "listingKey or listing object is required" },
        { status: 400 }
      );
    }

    let subjectListing = rawListing;

    if (!subjectListing && listingKey) {
      await dbConnect();
      subjectListing = await UnifiedListing.findOne({ listingKey }).lean();
      if (!subjectListing) {
        return NextResponse.json(
          { error: `Listing not found: ${listingKey}` },
          { status: 404 }
        );
      }
    }

    const result = await generateCMA(subjectListing, {
      maxCompsPerStatus: maxComps || 5,
      tierOverride: tierOverride as CMATier | undefined,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=300", // 5 min cache
      },
    });
  } catch (error: any) {
    console.error("[CMA Generate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CMA" },
      { status: 500 }
    );
  }
}
