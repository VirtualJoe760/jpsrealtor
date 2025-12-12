// src/app/api/subdivisions/[slug]/listings/route.ts
// API route for getting listings in a subdivision - UNIFIED

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await dbConnect();

  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
    const beds = searchParams.get("beds") ? parseInt(searchParams.get("beds")!) : undefined;
    const baths = searchParams.get("baths") ? parseInt(searchParams.get("baths")!) : undefined;

    // Find subdivision
    const subdivision = await Subdivision.findOne({ slug }).lean();

    if (!subdivision) {
      return NextResponse.json(
        { error: "Subdivision not found" },
        { status: 404 }
      );
    }

    // Build query for listings - unified collection
    const baseQuery: any = {
      standardStatus: "Active",
      // DEFAULT: Only residential sale properties (Type A), exclude rentals (Type B)
      // Include Type A (Residential) but NOT Type B (Rental Lease)
      propertyType: { $ne: "B" }
    };

    // Handle Non-HOA subdivisions differently
    if (subdivision.name.startsWith("Non-HOA ")) {
      const cityName = subdivision.name.replace("Non-HOA ", "");
      baseQuery.city = cityName;
      baseQuery.$or = [
        { subdivisionName: { $exists: false } },
        { subdivisionName: null },
        { subdivisionName: "" },
        { subdivisionName: { $regex: /^(not applicable|n\/?\s*a|none)$/i } },
      ];
    } else {
      baseQuery.subdivisionName = subdivision.name;
      baseQuery.city = subdivision.city;
    }

    // Add filters
    if (minPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $gte: minPrice };
    }
    if (maxPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $lte: maxPrice };
    }
    if (beds) {
      baseQuery.$or = [
        { bedroomsTotal: { $gte: beds } },
        { bedsTotal: { $gte: beds } },
      ];
    }
    if (baths) {
      baseQuery.$or = [
        ...(baseQuery.$or || []),
        { bathroomsTotalDecimal: { $gte: baths } },
        { bathroomsTotalInteger: { $gte: baths } },
      ];
    }

    // Query unified_listings (all 8 MLSs)
    const skip = (page - 1) * limit;

    // ANALYTICS PATTERN: Get accurate stats from ALL listings, not just the page
    const [listings, total, stats] = await Promise.all([
      UnifiedListing.find(baseQuery)
        .sort({ listPrice: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          listingKey: 1,
          slugAddress: 1,
          unparsedAddress: 1,
          address: 1,
          city: 1,
          stateOrProvince: 1,
          postalCode: 1,
          listPrice: 1,
          bedroomsTotal: 1,
          bathroomsTotalDecimal: 1,
          livingArea: 1,
          yearBuilt: 1,
          latitude: 1,
          longitude: 1,
          standardStatus: 1,
          propertyType: 1,
          propertySubType: 1,
          mlsSource: 1,
          primaryPhoto: 1,  // NEW: Hybrid photo strategy
          media: 1,         // Keep for backwards compatibility
        })
        .lean(),
      UnifiedListing.countDocuments(baseQuery),
      // CRITICAL: Calculate stats from ALL listings, not just current page
      UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$listPrice" },
            minPrice: { $min: "$listPrice" },
            maxPrice: { $max: "$listPrice" },
            // Calculate median using percentile
            prices: { $push: "$listPrice" }
          }
        },
        {
          $project: {
            avgPrice: { $round: ["$avgPrice", 0] },
            minPrice: 1,
            maxPrice: 1,
            // Sort prices and get median
            medianPrice: {
              $arrayElemAt: [
                { $sortArray: { input: "$prices", sortBy: 1 } },
                { $floor: { $divide: [{ $size: "$prices" }, 2] } }
              ]
            }
          }
        }
      ])
    ]);

    // Attach photos to listings and build full address
    const finalListings = listings.map((listing: any) => {
      // HYBRID PHOTO STRATEGY: Use primaryPhoto object from database (new caching system)
      // Fallback to media array for backwards compatibility
      let photoUrl = null;

      if (listing.primaryPhoto) {
        // New hybrid strategy: primaryPhoto object
        photoUrl = listing.primaryPhoto.uri1600 ||
                   listing.primaryPhoto.uri1280 ||
                   listing.primaryPhoto.uri1024 ||
                   listing.primaryPhoto.uri800 ||
                   listing.primaryPhoto.uri640;
      } else if (listing.media && listing.media.length > 0) {
        // Fallback: Old media array approach
        const media = listing.media;
        const primaryPhoto = media.find(
          (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
        ) || media[0];

        photoUrl = primaryPhoto
          ? primaryPhoto.Uri1600 || primaryPhoto.Uri1280 || primaryPhoto.Uri1024 || primaryPhoto.Uri800 || primaryPhoto.Uri640
          : null;
      }

      // Use unparsedAddress or address for the street address
      const streetAddress = listing.unparsedAddress || listing.address;
      const fullAddress = streetAddress || "";

      return {
        ...listing,
        address: fullAddress,
        slug: listing.slugAddress,
        primaryPhotoUrl: photoUrl,
        mlsSource: listing.mlsSource || "UNKNOWN",
      };
    });

    // Extract stats (aggregation returns array)
    const priceStats = stats[0] || {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0
    };

    return NextResponse.json({
      listings: finalListings,
      subdivision: {
        name: subdivision.name,
        city: subdivision.city,
        region: subdivision.region,
        slug: subdivision.slug,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      // ANALYTICS: Accurate stats calculated from ALL listings
      stats: {
        totalListings: total,
        avgPrice: priceStats.avgPrice,
        medianPrice: priceStats.medianPrice,
        priceRange: {
          min: priceStats.minPrice,
          max: priceStats.maxPrice
        }
      }
    });
  } catch (error) {
    console.error("❌ Error fetching subdivision listings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
