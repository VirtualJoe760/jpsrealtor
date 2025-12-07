import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/testPhotos
 *
 * Tests photo fetching from Spark API for all 8 MLS sources
 * Returns detailed results in JSON format
 */

interface PhotoTestResult {
  mlsSource: string;
  mlsId: string;
  listingKey: string;
  city?: string;
  listPrice?: number;
  photoCount: number;
  success: boolean;
  error?: string;
  sparkUrl?: string;
  samplePhotoUrls?: string[];
}

export async function GET() {
  try {
    await dbConnect();

    // Step 1: Get distinct MLS sources
    const mlsSources = await UnifiedListing.distinct('mlsSource');

    console.log(`[testPhotos] Found ${mlsSources.length} MLS sources:`, mlsSources);

    // Step 2: Get one sample Active listing from each MLS
    const samples = [];
    for (const mls of mlsSources) {
      const sample = await UnifiedListing.findOne({
        mlsSource: mls,
        standardStatus: 'Active'
      })
        .select('listingKey mlsId mlsSource listPrice city standardStatus')
        .lean();

      if (sample) {
        samples.push(sample);
      }
    }

    console.log(`[testPhotos] Found ${samples.length} sample listings`);

    // Step 3: Test photo fetch for each
    const results: PhotoTestResult[] = [];
    const sparkApiKey = process.env.SPARK_API_KEY;

    if (!sparkApiKey) {
      return NextResponse.json({
        error: "SPARK_API_KEY not configured",
        mlsSourcesFound: mlsSources.length,
        sampleListingsFound: samples.length
      }, { status: 500 });
    }

    for (const listing of samples) {
      const { listingKey, mlsId, mlsSource, city, listPrice } = listing;

      const result: PhotoTestResult = {
        mlsSource,
        mlsId,
        listingKey,
        city,
        listPrice,
        photoCount: 0,
        success: false,
      };

      try {
        // Use Replication API with Media expansion (correct method)
        const replicationUrl = `https://replication.sparkapi.com/v1/listings/${listingKey}?_expand=Media`;
        result.sparkUrl = replicationUrl;

        const response = await fetch(replicationUrl, {
          headers: {
            "Authorization": `Bearer ${sparkApiKey}`,
            "X-SparkApi-User-Agent": "jpsrealtor.com",
            "Accept": "application/json"
          },
        });

        if (!response.ok) {
          result.error = `HTTP ${response.status}: ${response.statusText}`;
          result.success = false;
        } else {
          const data = await response.json();

          // Get listing from Results array
          const listingData = data?.D?.Results?.[0];

          if (!listingData) {
            result.error = "Listing not found in response";
            result.success = false;
          } else {
            // Media is in StandardFields.Media
            const media = listingData?.StandardFields?.Media || [];

            result.photoCount = media.length;
            result.success = true;

            // Get sample photo URLs
            if (media.length > 0) {
              result.samplePhotoUrls = media.slice(0, 3).map((m: any) =>
                m.Uri1024 || m.Uri800 || m.Uri640 || 'No URL'
              );
            }
          }
        }
      } catch (error: any) {
        result.error = error.message;
        result.success = false;
      }

      results.push(result);
    }

    // Step 4: Generate summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalPhotos = successful.reduce((sum, r) => sum + r.photoCount, 0);

    const summary = {
      timestamp: new Date().toISOString(),
      mlsSourcesFound: mlsSources.length,
      mlsSources: mlsSources,
      sampleListingsTested: samples.length,
      successful: successful.length,
      failed: failed.length,
      totalPhotosFound: totalPhotos,
      averagePhotosPerListing: successful.length > 0 ? Math.round(totalPhotos / successful.length) : 0,
    };

    return NextResponse.json({
      summary,
      results: results.map(r => ({
        mlsSource: r.mlsSource,
        mlsId: r.mlsId,
        listingKey: r.listingKey,
        city: r.city,
        listPrice: r.listPrice,
        success: r.success,
        photoCount: r.photoCount,
        error: r.error,
        sparkUrl: r.sparkUrl,
        samplePhotoUrls: r.samplePhotoUrls
      }))
    });

  } catch (error: any) {
    console.error('[testPhotos] Error:', error);
    return NextResponse.json({
      error: "Test failed",
      message: error.message
    }, { status: 500 });
  }
}
