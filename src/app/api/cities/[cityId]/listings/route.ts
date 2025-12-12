import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
// Photo collection no longer used - using primaryPhoto from unified_listings

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const cityId = resolvedParams.cityId;
    const searchParams = request.nextUrl.searchParams;
    // DEFAULT to residential sale (Type A) - only show rentals/multifamily/land if explicitly requested
    const propertyType = searchParams.get("propertyType") || "sale";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get filter parameters
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minBeds = searchParams.get("minBeds");
    const maxBeds = searchParams.get("maxBeds");
    const minBaths = searchParams.get("minBaths");
    const maxBaths = searchParams.get("maxBaths");

    // Convert cityId to city name for matching
    // e.g., "palm-springs" -> "Palm Springs"
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Base query for the city - using unified_listings
    const baseQuery: any = {
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
      listPrice: { $exists: true, $ne: null, $gt: 0 },
    };

    // Build $and array to combine all filters properly
    const andConditions: any[] = [];

    // Filter by property type - DEFAULT to excluding rentals (Type B)
    if (propertyType === "sale") {
      // EXCLUDE rentals (Type B) - only show sale properties
      baseQuery.propertyType = { $ne: "B" };
    } else if (propertyType === "rental") {
      baseQuery.propertyType = "B";
    } else if (propertyType === "multifamily") {
      baseQuery.propertyType = "C";
    } else if (propertyType === "land") {
      baseQuery.propertyType = "D";
    }

    // Apply price filters
    if (minPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $lte: parseInt(maxPrice) };
    }

    // Apply bed filters
    if (minBeds || maxBeds) {
      const bedFilters: any = {};
      if (minBeds) bedFilters.$gte = parseInt(minBeds);
      if (maxBeds) bedFilters.$lte = parseInt(maxBeds);
      andConditions.push({
        $or: [
          { bedsTotal: bedFilters },
          { bedroomsTotal: bedFilters },
        ],
      });
    }

    // Apply bath filters
    if (minBaths || maxBaths) {
      const bathFilters: any = {};
      if (minBaths) bathFilters.$gte = parseInt(minBaths);
      if (maxBaths) bathFilters.$lte = parseInt(maxBaths);
      andConditions.push({
        $or: [
          { bathsTotal: bathFilters },
          { bathroomsTotalInteger: bathFilters },
          { bathroomsFull: bathFilters },
        ],
      });
    }

    // Apply $and conditions if any exist
    if (andConditions.length > 0) {
      baseQuery.$and = andConditions;
    }

    // ANALYTICS PATTERN: Fetch listings + accurate stats from ALL listings
    const [listings, stats] = await Promise.all([
      // Fetch paginated listings
      UnifiedListing.find(baseQuery)
        .select(
          "listingId listingKey listPrice unparsedAddress slugAddress bedsTotal bedroomsTotal bathsTotal bathroomsTotalInteger bathroomsFull yearBuilt livingArea lotSizeSquareFeet lotSizeSqft propertyType propertySubType coordinates latitude longitude mlsSource primaryPhoto media"
        )
        .limit(limit)
        .lean()
        .exec(),

      // CRITICAL: Calculate stats from ALL listings, not just current page
      UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            avgPrice: { $avg: "$listPrice" },
            minPrice: { $min: "$listPrice" },
            maxPrice: { $max: "$listPrice" },
            prices: { $push: "$listPrice" }
          }
        },
        {
          $project: {
            totalCount: 1,
            avgPrice: { $round: ["$avgPrice", 0] },
            minPrice: 1,
            maxPrice: 1,
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

    if (listings.length === 0) {
      return NextResponse.json({ listings: [] });
    }

    // HYBRID PHOTO STRATEGY: Extract photos from primaryPhoto field or media array
    // No separate Photo collection query needed!
    const photoMap = new Map();

    listings.forEach((listing: any) => {
      let photoUrl = null;

      // Try new primaryPhoto field first (hybrid strategy)
      if (listing.primaryPhoto) {
        photoUrl = listing.primaryPhoto.uri1600 ||
                   listing.primaryPhoto.uri1280 ||
                   listing.primaryPhoto.uri1024 ||
                   listing.primaryPhoto.uri800 ||
                   listing.primaryPhoto.uri640 ||
                   listing.primaryPhoto.uri300 ||
                   listing.primaryPhoto.uriLarge;
      }
      // Fallback to media array (backwards compatibility)
      else if (listing.media && listing.media.length > 0) {
        const media = listing.media;
        const primaryPhoto = media.find(
          (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
        ) || media[0];

        if (primaryPhoto) {
          photoUrl = primaryPhoto.Uri1600 ||
                     primaryPhoto.Uri1280 ||
                     primaryPhoto.Uri1024 ||
                     primaryPhoto.Uri800 ||
                     primaryPhoto.Uri640 ||
                     primaryPhoto.Uri300;
        }
      }

      if (photoUrl && listing.listingId) {
        photoMap.set(listing.listingId, photoUrl);
      }
    });

    // Combine listings with photos
    const listingsWithPhotos = listings.map((listing: any) => ({
      listingId: listing.listingId,
      listingKey: listing.listingKey,
      listPrice: listing.listPrice,
      address: listing.unparsedAddress,
      unparsedAddress: listing.unparsedAddress,
      slugAddress: listing.slugAddress,
      beds: listing.bedsTotal || listing.bedroomsTotal || 0,
      baths:
        listing.bathsTotal ||
        listing.bathroomsTotalInteger ||
        listing.bathroomsFull ||
        0,
      yearBuilt: listing.yearBuilt,
      livingArea: listing.livingArea,
      lotSize: listing.lotSizeSquareFeet || listing.lotSizeSqft,
      propertyType: listing.propertyType,
      propertySubType: listing.propertySubType,
      // Include both formats for compatibility
      coordinates: listing.coordinates || {
        latitude: listing.latitude,
        longitude: listing.longitude,
      },
      latitude: listing.latitude || listing.coordinates?.latitude,
      longitude: listing.longitude || listing.coordinates?.longitude,
      photoUrl: photoMap.get(listing.listingId) || null,
      primaryPhotoUrl: photoMap.get(listing.listingId) || null,
      mlsSource: listing.mlsSource || "UNKNOWN",
    }));

    // Extract stats (aggregation returns array)
    const priceStats = stats[0] || {
      totalCount: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0
    };

    return NextResponse.json({
      listings: listingsWithPhotos,
      // ANALYTICS: Accurate stats calculated from ALL listings
      stats: {
        totalListings: priceStats.totalCount,
        avgPrice: priceStats.avgPrice,
        medianPrice: priceStats.medianPrice,
        priceRange: {
          min: priceStats.minPrice,
          max: priceStats.maxPrice
        }
      }
    });
  } catch (error) {
    console.error("Error fetching city listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch city listings" },
      { status: 500 }
    );
  }
}
