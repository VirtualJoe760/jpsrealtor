import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Fetches photos using Spark Replication API with Media expansion
 * Supports multiple MLS IDs (GPS, CRMLS, DESERT, etc.)
 *
 * Method: Uses _expand=Media on the listings endpoint
 * URL: https://replication.sparkapi.com/v1/listings/{listingKey}?_expand=Media
 *
 * Response format:
 * {
 *   listingKey: string;
 *   mlsSource: string;
 *   count: number;
 *   photos: Array<{
 *     mediaKey: string;
 *     order: number;
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
  { params }: { params: Promise<{ listingKey: string }> }
) {
  try {
    const { listingKey } = await params;

    if (!listingKey) {
      return NextResponse.json(
        { error: "listingKey is required" },
        { status: 400 }
      );
    }

    // Step 1: Get listing's mlsSource from database (for response metadata)
    await dbConnect();

    const listing = await UnifiedListing.findOne({ listingKey })
      .select("mlsSource listingKey")
      .lean();

    const mlsSource = listing?.mlsSource || "Unknown";

    // Step 2: Fetch listing with Media expansion from Replication API
    const accessToken = process.env.SPARK_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("[photos API] SPARK_ACCESS_TOKEN not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // Use Replication API with Media expansion
    const replicationUrl = `https://replication.sparkapi.com/v1/listings/${listingKey}?_expand=Media`;

    console.log(`[photos API] Fetching: ${replicationUrl}`);

    const response = await fetch(replicationUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-SparkApi-User-Agent": "jpsrealtor.com",
        "Accept": "application/json"
      },
      // Cache for 1 hour
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      console.error(`[photos API] Replication API error: ${response.status} for listing ${listingKey}`);

      // Return empty array instead of error
      return NextResponse.json({
        listingKey,
        mlsSource,
        count: 0,
        photos: []
      });
    }

    const data = await response.json();

    // Replication API response format: { D: { Success: true, Results: [listing] } }
    const results = data?.D?.Results || [];

    if (results.length === 0) {
      console.log(`[photos API] No listing found for ${listingKey}`);
      return NextResponse.json({
        listingKey,
        mlsSource,
        count: 0,
        photos: []
      });
    }

    const listingData = results[0];

    // Media is in StandardFields.Media array
    const media = listingData?.StandardFields?.Media || [];

    console.log(`[photos API] Found ${media.length} photos for ${listingKey} from ${mlsSource}`);

    // Transform Media to photo format
    const photos = media
      .filter((m: any) => m.MediaKey) // Must have MediaKey
      .map((m: any, index: number) => ({
        mediaKey: m.MediaKey,
        order: m.Order ?? index,
        caption: m.ShortDescription || m.LongDescription || "",

        // All URI sizes
        uri300: m.Uri300,
        uri640: m.Uri640,
        uri800: m.Uri800,
        uri1024: m.Uri1024,
        uri1280: m.Uri1280,
        uri1600: m.Uri1600,
        uri2048: m.Uri2048,
        uriThumb: m.UriThumb,
        uriLarge: m.UriLarge,

        // Primary photo flag
        primary: m.MediaCategory === "Primary Photo" || m.Order === 0,
      }))
      .sort((a: any, b: any) => a.order - b.order);

    const apiResponse = {
      listingKey,
      mlsSource,
      count: photos.length,
      photos,
    };

    return NextResponse.json(apiResponse, {
      headers: {
        // Cache for 1 hour
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=3600',
        'Vercel-CDN-Cache-Control': 'public, max-age=3600',

        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    });

  } catch (error) {
    console.error("[photos API] Error:", error);

    // Return empty photos array on error
    return NextResponse.json({
      listingKey: (await params).listingKey,
      mlsSource: "Unknown",
      count: 0,
      photos: []
    });
  }
}
