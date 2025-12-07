import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Returns photo data from unified_listings.media field
 * Heavily cached by Cloudflare for performance
 *
 * Response format:
 * {
 *   listingKey: string;
 *   photos: Array<{
 *     mediaKey: string;
 *     order: number;
 *     mediaType?: string;
 *     mediaCategory?: string;
 *     caption?: string;
 *     uri300?: string;
 *     uri640?: string;
 *     uri800?: string;
 *     uri1024?: string;
 *     uri1280?: string;
 *     uri1600?: string;
 *     uri2048?: string;
 *     uriThumb?: string;
 *     uriLarge?: string;
 *     primary: boolean;
 *   }>
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { listingKey: string } }
) {
  try {
    const { listingKey } = params;

    if (!listingKey) {
      return NextResponse.json(
        { error: "listingKey is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch listing with only media field for performance
    const listing = await UnifiedListing.findOne({ listingKey })
      .select("media listingKey")
      .lean();

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Transform media array to photo format
    const media = listing.media || [];
    const photos = media
      .filter((item: any) => item.MediaKey) // Must have MediaKey
      .map((item: any, index: number) => ({
        mediaKey: item.MediaKey,
        order: item.Order ?? index,
        mediaType: item.MediaType,
        mediaCategory: item.MediaCategory,
        caption: item.ShortDescription,

        // All URI sizes
        uri300: item.Uri300,
        uri640: item.Uri640,
        uri800: item.Uri800,
        uri1024: item.Uri1024,
        uri1280: item.Uri1280,
        uri1600: item.Uri1600,
        uri2048: item.Uri2048,
        uriThumb: item.UriThumb,
        uriLarge: item.UriLarge,

        // Metadata
        imageWidth: item.ImageWidth,
        imageHeight: item.ImageHeight,

        // Mark primary photo
        primary: item.MediaCategory === "Primary Photo" || item.Order === 0,
      }))
      .sort((a: any, b: any) => a.order - b.order); // Sort by order

    const response = {
      listingKey,
      count: photos.length,
      photos,
    };

    return NextResponse.json(response, {
      headers: {
        // Aggressive Cloudflare caching
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // 24 hours cache, 7 days stale
        'CDN-Cache-Control': 'public, max-age=86400', // Cloudflare specific
        'Vercel-CDN-Cache-Control': 'public, max-age=86400', // Vercel CDN

        // Additional performance headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    });

  } catch (error) {
    console.error("[photos API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
