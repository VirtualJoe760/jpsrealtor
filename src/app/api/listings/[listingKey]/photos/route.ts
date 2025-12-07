import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Fetches photos directly from Spark API in real-time
 * Supports multiple MLS IDs (GPS, CRMLS, DESERT, etc.)
 *
 * Process:
 * 1. Look up listing in database to get mlsId
 * 2. Fetch photos from Spark API using that mlsId
 * 3. Return all photos for carousel display
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

    // Step 1: Get listing's mlsId from database
    await dbConnect();

    const listing = await UnifiedListing.findOne({ listingKey })
      .select("mlsId mlsSource listingKey")
      .lean();

    if (!listing) {
      console.error(`[photos API] Listing not found: ${listingKey}`);
      return NextResponse.json({
        error: "Listing not found",
        listingKey
      }, { status: 404 });
    }

    const { mlsId, mlsSource } = listing;

    if (!mlsId) {
      console.error(`[photos API] No mlsId for listing ${listingKey}`);
      return NextResponse.json({
        listingKey,
        mlsSource,
        count: 0,
        photos: []
      });
    }

    // Step 2: Fetch photos from Spark API using mlsId
    const sparkApiKey = process.env.SPARK_API_KEY;

    if (!sparkApiKey) {
      console.error("[photos API] SPARK_API_KEY not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // Use mlsId for Spark API (26-digit MLS association ID)
    const sparkUrl = `https://sparkapi.com/${mlsId}/listings/${listingKey}/photos`;

    const response = await fetch(sparkUrl, {
      headers: {
        "Authorization": `Bearer ${sparkApiKey}`,
        "X-SparkApi-User-Agent": "jpsrealtor.com",
        "Accept": "application/json"
      },
      // Cache for 1 hour (photos don't change that often)
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      console.error(`[photos API] Spark API error: ${response.status} for listing ${listingKey}`);

      // Return empty array instead of error to gracefully handle missing photos
      return NextResponse.json({
        listingKey,
        count: 0,
        photos: []
      });
    }

    const data = await response.json();

    // Spark API response format: { D: { Success: true, Results: [...] } }
    const results = data?.D?.Results || [];

    // Transform Spark photos to our format
    const photos = results.map((photo: any, index: number) => ({
      mediaKey: photo.Id,
      order: index,
      caption: photo.Caption || photo.Name || "",

      // All URI sizes from Spark API
      uri300: photo.Uri300,
      uri640: photo.Uri640,
      uri800: photo.Uri800,
      uri1024: photo.Uri1024,
      uri1280: photo.Uri1280,
      uri1600: photo.Uri1600,
      uri2048: photo.Uri2048,
      uriThumb: photo.UriThumb,
      uriLarge: photo.UriLarge,

      // Primary photo flag
      primary: photo.Primary === true,
    }));

    const apiResponse = {
      listingKey,
      mlsSource,
      mlsId,
      count: photos.length,
      photos,
    };

    console.log(`[photos API] Fetched ${photos.length} photos for ${listingKey} from ${mlsSource} (${mlsId})`);

    return NextResponse.json(apiResponse, {
      headers: {
        // Cache for 1 hour (photos don't change frequently)
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=3600',
        'Vercel-CDN-Cache-Control': 'public, max-age=3600',

        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    });

  } catch (error) {
    console.error("[photos API] Error fetching from Spark API:", error);

    // Return empty photos array on error for graceful degradation
    return NextResponse.json({
      listingKey: (await params).listingKey,
      count: 0,
      photos: []
    });
  }
}
