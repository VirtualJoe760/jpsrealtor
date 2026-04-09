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
import { cached } from "@/lib/cache/memory-cache";

const CMA_TTL_SECONDS = 60 * 60; // 1 hour

async function buildCMAForKey(
  listingKey: string,
  maxComps?: number,
  tierOverride?: CMATier
) {
  await dbConnect();
  const subjectListing = await UnifiedListing.findOne({ listingKey }).lean();
  if (!subjectListing) {
    return { error: `Listing not found: ${listingKey}`, status: 404 as const };
  }
  const result = await generateCMA(subjectListing, {
    maxCompsPerStatus: maxComps || 5,
    tierOverride,
  });
  return { result };
}

/**
 * GET /api/cma/generate?listingKey=...
 * Cached, browser-friendly path. Use this from listing detail pages so the
 * response is HTTP-cacheable end-to-end.
 */
export async function GET(req: NextRequest) {
  try {
    const listingKey = req.nextUrl.searchParams.get("listingKey");
    const maxComps = Number(req.nextUrl.searchParams.get("maxComps")) || undefined;
    const tierOverride = (req.nextUrl.searchParams.get("tier") as CMATier) || undefined;

    if (!listingKey) {
      return NextResponse.json({ error: "listingKey is required" }, { status: 400 });
    }

    const cacheKey = `${listingKey}:${maxComps || 5}:${tierOverride || "auto"}`;
    const out = await cached("cma-listing", cacheKey, CMA_TTL_SECONDS, () =>
      buildCMAForKey(listingKey, maxComps, tierOverride)
    );

    if ("error" in out && out.error) {
      return NextResponse.json({ error: out.error }, { status: out.status });
    }

    return NextResponse.json(out.result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("[CMA Generate GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CMA" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cma/generate
 * Body: { listingKey } OR { listing: rawListing }
 * Kept for the chat tool / agent path that needs to pass an ad-hoc listing
 * object. The listingKey path uses the same in-process cache as GET.
 */
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

    // Raw-listing path is uncacheable (no stable key).
    if (rawListing) {
      await dbConnect();
      const result = await generateCMA(rawListing, {
        maxCompsPerStatus: maxComps || 5,
        tierOverride: tierOverride as CMATier | undefined,
      });
      return NextResponse.json(result);
    }

    const cacheKey = `${listingKey}:${maxComps || 5}:${tierOverride || "auto"}`;
    const out = await cached("cma-listing", cacheKey, CMA_TTL_SECONDS, () =>
      buildCMAForKey(listingKey, maxComps, tierOverride as CMATier | undefined)
    );

    if ("error" in out && out.error) {
      return NextResponse.json({ error: out.error }, { status: out.status });
    }

    return NextResponse.json(out.result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("[CMA Generate POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CMA" },
      { status: 500 }
    );
  }
}
