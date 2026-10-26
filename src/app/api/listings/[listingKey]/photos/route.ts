import { NextRequest, NextResponse } from "next/server";
import { getListingPhotos, PHOTOS_REVALIDATE_SECONDS } from "@/lib/listings/listing-detail";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Photos are served DB-FIRST from the synced `unified_listings.media[]` array,
 * with the Spark Replication API as a BACKUP only when the DB has no stored
 * media. This is deliberate: when a listing comes off the market it disappears
 * from the live Spark feed, so a Spark-only fetch returns zero photos and the
 * listing shows a "no photo" placeholder — even though we already synced its
 * photos. Reading the stored media[] keeps photos working after off-market.
 * The logic lives in src/lib/listings/listing-detail.ts (shared with the
 * detail page, which no longer calls this route over HTTP).
 *
 * Response: { listingKey, mlsSource, mlsId?, count, photos[], source }
 *   source = "db" | "spark" | "primaryPhotoUrl" | "none"
 *   photos[]: { mediaKey, order, caption, uri300..uri2048, uriThumb, uriLarge, primary }
 */

const PHOTO_HEADERS = {
  "Cache-Control": `public, s-maxage=${PHOTOS_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
  "CDN-Cache-Control": `public, max-age=${PHOTOS_REVALIDATE_SECONDS}`,
  "Vercel-CDN-Cache-Control": `public, max-age=${PHOTOS_REVALIDATE_SECONDS}`,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// "Nothing found" answers used to go out with no cache header at all, so the
// CDN re-ran the function for every repeat request on a photo-less listing.
// Cache them briefly — photos land once a day (fetch-photos.py, 09:30).
const EMPTY_HEADERS = {
  ...PHOTO_HEADERS,
  "Cache-Control": "public, s-maxage=300",
  "CDN-Cache-Control": "public, max-age=300",
  "Vercel-CDN-Cache-Control": "public, max-age=300",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  const { listingKey } = await params;
  try {
    if (!listingKey) {
      return NextResponse.json(
        { error: "listingKey is required" },
        { status: 400 }
      );
    }

    const result = await getListingPhotos(listingKey);
    const found = result.source === "db" || result.source === "spark";
    return NextResponse.json(result, { headers: found ? PHOTO_HEADERS : EMPTY_HEADERS });
  } catch (error) {
    console.error("[photos API] Error:", error);
    // Errors stay uncached (vercel.json /api no-store applies).
    return NextResponse.json({
      listingKey,
      mlsSource: "Unknown",
      count: 0,
      photos: [],
      source: "error",
    });
  }
}
