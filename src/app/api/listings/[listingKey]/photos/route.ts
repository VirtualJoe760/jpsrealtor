import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/listings/[listingKey]/photos
 *
 * Fetches photos using Spark Replication API with Photos expansion
 * Supports multiple MLS IDs (GPS, CRMLS, CLAW, SOUTHLAND, HIGH_DESERT, BRIDGE, CONEJO_SIMI_MOORPARK, ITECH)
 *
 * Method: Uses _expand=Photos on the listings endpoint
 * URL: https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '{mlsId}' And ListingKey Eq '{listingKey}'&_expand=Photos
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

    // Step 1: Get listing's mlsId and mlsSource from database
    await dbConnect();

    const listing = await UnifiedListing.findOne({ listingKey })
      .select("mlsSource mlsId listingKey")
      .lean();

    if (!listing) {
      console.log(`[photos API] Listing not found: ${listingKey}`);
      return NextResponse.json({
        listingKey,
        mlsSource: "Unknown",
        count: 0,
        photos: []
      });
    }

    const mlsSource = listing.mlsSource || "Unknown";
    const mlsId = listing.mlsId;

    if (!mlsId) {
      console.error(`[photos API] No mlsId found for listing ${listingKey}`);
      return NextResponse.json({
        listingKey,
        mlsSource,
        count: 0,
        photos: []
      });
    }

    // Step 2: Fetch listing with Media expansion from Replication API
    const accessToken = process.env.SPARK_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("[photos API] SPARK_ACCESS_TOKEN not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // CRITICAL FIX: Use mlsId to fetch from correct MLS association
    // Diego's method: Filter by MlsId AND ListingKey for precise lookup
    // Note: Using Photos expansion (not Media) - this is the correct field name for Replication API
    const replicationUrl = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And ListingKey Eq '${listingKey}'&_expand=Photos&_limit=1`;

    console.log(`[photos API] Fetching from MLS ${mlsSource} (${mlsId}): ${replicationUrl}`);

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

    // Photos are in StandardFields.Photos array (not Media)
    const photosArray = listingData?.StandardFields?.Photos || [];

    console.log(`[photos API] Found ${photosArray.length} photos for ${listingKey} from ${mlsSource}`);

    // Transform Photos to photo format
    const photos = photosArray
      .filter((p: any) => p.Id) // Must have Id
      .map((p: any, index: number) => ({
        mediaKey: p.Id,
        order: p.Order ?? index,
        caption: p.Caption || p.Name || "",

        // All URI sizes
        uri300: p.Uri300,
        uri640: p.Uri640,
        uri800: p.Uri800,
        uri1024: p.Uri1024,
        uri1280: p.Uri1280,
        uri1600: p.Uri1600,
        uri2048: p.Uri2048,
        uriThumb: p.UriThumb,
        uriLarge: p.UriLarge,

        // Primary photo flag
        primary: p.Primary === true || p.Order === 0,
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
