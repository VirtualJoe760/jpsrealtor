// src/app/api/mls-listings/[slugAddress]/route.ts
// Lookup a single listing by slugAddress OR listingKey from unified_listings.
// The lookup lives in src/lib/listings/listing-detail.ts so the detail page can
// call it in-process instead of fetching this route over HTTP.
import { NextResponse } from "next/server";
import { getEnrichedListing, LISTING_REVALIDATE_SECONDS } from "@/lib/listings/listing-detail";

// Public MLS data, identical on every host and for every visitor — safe for the
// shared CDN. Browsers (map prefetch in MLSProvider, chat cards) re-request the
// same slugs constantly; before 2026-10-25 vercel.json's /api no-store made
// every one a function invocation. Route-handler headers win over vercel.json
// (verified on prod: the photos route returns X-Vercel-Cache: HIT).
const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${LISTING_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
  "Vercel-CDN-Cache-Control": `public, max-age=${LISTING_REVALIDATE_SECONDS}, stale-while-revalidate=3600`,
};

// Short negative cache: crawlers walk dead slugs repeatedly, but a listing
// synced at 06:00 shouldn't 404 for long.
const NOT_FOUND_HEADERS = {
  "Cache-Control": "public, s-maxage=60",
  "Vercel-CDN-Cache-Control": "public, max-age=60",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slugAddress: string }> }
) {
  const { slugAddress } = await params;

  try {
    const listing = await getEnrichedListing(slugAddress);

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found in database" },
        { status: 404, headers: NOT_FOUND_HEADERS }
      );
    }

    return NextResponse.json({ listing }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("❌ Error fetching listing from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
