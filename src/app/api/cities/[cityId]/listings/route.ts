import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import { getStreetCoordinate } from "@/lib/geo/street-lookup";
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
    // Price filters
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Bed/Bath filters (exact match when only min specified)
    // Support both 'beds'/'baths' (exact match, AI tools) and 'minBeds'/'minBaths' (range)
    const minBeds = searchParams.get("minBeds") || searchParams.get("beds");
    const maxBeds = searchParams.get("maxBeds");
    const minBaths = searchParams.get("minBaths") || searchParams.get("baths");
    const maxBaths = searchParams.get("maxBaths");

    // Size filters
    const minSqft = searchParams.get("minSqft") ? parseInt(searchParams.get("minSqft")!) : undefined;
    const maxSqft = searchParams.get("maxSqft") ? parseInt(searchParams.get("maxSqft")!) : undefined;
    const minLotSize = searchParams.get("minLotSize") ? parseInt(searchParams.get("minLotSize")!) : undefined;
    const maxLotSize = searchParams.get("maxLotSize") ? parseInt(searchParams.get("maxLotSize")!) : undefined;

    // Year filters
    const minYear = searchParams.get("minYear") ? parseInt(searchParams.get("minYear")!) : undefined;
    const maxYear = searchParams.get("maxYear") ? parseInt(searchParams.get("maxYear")!) : undefined;

    // Amenity filters (boolean)
    const pool = searchParams.get("pool") === "true";
    const spa = searchParams.get("spa") === "true";
    const view = searchParams.get("view") === "true";
    const fireplace = searchParams.get("fireplace") === "true";
    const gatedCommunity = searchParams.get("gatedCommunity") === "true";
    const seniorCommunity = searchParams.get("seniorCommunity") === "true";

    // Garage/Stories
    const garageSpaces = searchParams.get("garageSpaces") ? parseInt(searchParams.get("garageSpaces")!) : undefined;
    const stories = searchParams.get("stories") ? parseInt(searchParams.get("stories")!) : undefined;

    // Enhanced HOA filters
    const hasHOA = searchParams.get("hasHOA");
    const maxHOA = searchParams.get("maxHOA") ? parseInt(searchParams.get("maxHOA")!) : undefined;
    const minHOA = searchParams.get("minHOA") ? parseInt(searchParams.get("minHOA")!) : undefined;

    // Geographic filters (for future implementation)
    const eastOf = searchParams.get("eastOf");
    const westOf = searchParams.get("westOf");
    const northOf = searchParams.get("northOf");
    const southOf = searchParams.get("southOf");

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
      // Exclude Co-Ownership properties (fractional ownership/timeshares)
      propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
    };

    // Build $and array to combine all filters properly
    const andConditions: any[] = [];

    // Determine if this is a general query (no filters)
    const hasFilters = minPrice || maxPrice || minBeds || maxBeds || minBaths || maxBaths ||
                       minSqft || maxSqft || minLotSize || maxLotSize || minYear || maxYear ||
                       pool || spa || view || fireplace || gatedCommunity || seniorCommunity ||
                       garageSpaces || stories || hasHOA || eastOf || westOf || northOf || southOf;

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
    // EXACT MATCH: "3 beds" means exactly 3, not 3+
    if (minBeds || maxBeds) {
      const bedFilters: any = {};
      if (minBeds && !maxBeds) {
        // Only minBeds specified = exact match
        bedFilters.$eq = parseInt(minBeds);
      } else {
        // Range specified
        if (minBeds) bedFilters.$gte = parseInt(minBeds);
        if (maxBeds) bedFilters.$lte = parseInt(maxBeds);
      }
      andConditions.push({
        $or: [
          { bedsTotal: bedFilters },
          { bedroomsTotal: bedFilters },
        ],
      });
    }

    // Apply bath filters
    // EXACT MATCH: "2 baths" means exactly 2, not 2+
    if (minBaths || maxBaths) {
      const bathFilters: any = {};
      if (minBaths && !maxBaths) {
        // Only minBaths specified = exact match
        bathFilters.$eq = parseInt(minBaths);
      } else {
        // Range specified
        if (minBaths) bathFilters.$gte = parseInt(minBaths);
        if (maxBaths) bathFilters.$lte = parseInt(maxBaths);
      }
      andConditions.push({
        $or: [
          { bathsTotal: bathFilters },
          { bathroomsTotalInteger: bathFilters },
          { bathroomsFull: bathFilters },
        ],
      });
    }

    // Size filters
    if (minSqft || maxSqft) {
      const sqftFilter: any = {};
      if (minSqft) sqftFilter.$gte = minSqft;
      if (maxSqft) sqftFilter.$lte = maxSqft;
      andConditions.push({ livingArea: sqftFilter });
    }

    if (minLotSize || maxLotSize) {
      const lotFilter: any = {};
      if (minLotSize) lotFilter.$gte = minLotSize;
      if (maxLotSize) lotFilter.$lte = maxLotSize;
      andConditions.push({
        $or: [
          { lotSizeSqft: lotFilter },
          { lotSizeArea: lotFilter },
        ]
      });
    }

    // Year filters
    if (minYear || maxYear) {
      const yearFilter: any = {};
      if (minYear) yearFilter.$gte = minYear;
      if (maxYear) yearFilter.$lte = maxYear;
      andConditions.push({ yearBuilt: yearFilter });
    }

    // Amenity filters
    if (pool) {
      andConditions.push({
        $or: [{ poolYN: true }, { pool: true }]
      });
    }

    if (spa) {
      andConditions.push({
        $or: [{ spaYN: true }, { spa: true }]
      });
    }

    if (view) {
      andConditions.push({
        $or: [{ viewYN: true }, { view: true }]
      });
    }

    if (fireplace) {
      andConditions.push({
        $or: [
          { fireplacesTotal: { $gte: 1 } },
          { fireplaceYN: true },
        ]
      });
    }

    if (gatedCommunity) {
      andConditions.push({
        $or: [
          { gatedCommunity: true },
          { associationAmenities: { $regex: /gated/i } },
        ]
      });
    }

    if (seniorCommunity) {
      andConditions.push({
        $or: [
          { seniorCommunityYN: true },
          { ageRestricted55Plus: true },
        ]
      });
    }

    // Garage/Parking filters
    if (garageSpaces) {
      andConditions.push({
        $or: [
          { garageSpaces: { $gte: garageSpaces } },
          { parkingTotal: { $gte: garageSpaces } },
        ]
      });
    }

    // Stories filter
    if (stories) {
      andConditions.push({
        $or: [
          { stories: stories },
          { levels: stories },
        ]
      });
    }

    // Enhanced HOA filters
    if (hasHOA === 'false') {
      // No HOA
      andConditions.push({
        $or: [
          { hoaYN: false },
          { hoaYN: { $exists: false } },
          { associationFee: 0 },
          { associationFee: { $exists: false } }
        ]
      });
    } else if (hasHOA === 'true') {
      // Has HOA
      andConditions.push({
        $and: [
          { hoaYN: true },
          { associationFee: { $gt: 0 } }
        ]
      });

      // Apply HOA price range if provided
      if (maxHOA) {
        andConditions.push({ associationFee: { $lte: maxHOA } });
      }
      if (minHOA) {
        andConditions.push({ associationFee: { $gte: minHOA } });
      }
    }

    // Geographic filters (street-based)
    if (eastOf) {
      const coord = await getStreetCoordinate(eastOf, cityId);
      if (coord?.longitude) {
        andConditions.push({ longitude: { $gt: coord.longitude } });
        console.log(`[City API] Filtering east of ${eastOf} (lng > ${coord.longitude})`);
      } else {
        console.warn(`[City API] Could not find coordinates for street: ${eastOf}`);
      }
    }

    if (westOf) {
      const coord = await getStreetCoordinate(westOf, cityId);
      if (coord?.longitude) {
        andConditions.push({ longitude: { $lt: coord.longitude } });
        console.log(`[City API] Filtering west of ${westOf} (lng < ${coord.longitude})`);
      } else {
        console.warn(`[City API] Could not find coordinates for street: ${westOf}`);
      }
    }

    if (northOf) {
      const coord = await getStreetCoordinate(northOf, cityId);
      if (coord?.latitude) {
        andConditions.push({ latitude: { $gt: coord.latitude } });
        console.log(`[City API] Filtering north of ${northOf} (lat > ${coord.latitude})`);
      } else {
        console.warn(`[City API] Could not find coordinates for street: ${northOf}`);
      }
    }

    if (southOf) {
      const coord = await getStreetCoordinate(southOf, cityId);
      if (coord?.latitude) {
        andConditions.push({ latitude: { $lt: coord.latitude } });
        console.log(`[City API] Filtering south of ${southOf} (lat < ${coord.latitude})`);
      } else {
        console.warn(`[City API] Could not find coordinates for street: ${southOf}`);
      }
    }

    // General query filter: Show newest listings (onMarketDate within past 7 days)
    if (!hasFilters) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      // Format as YYYY-MM-DD
      const dateStr = sevenDaysAgo.toISOString().split('T')[0];
      baseQuery.onMarketDate = { $gte: dateStr };
      console.log(`[City API] General query - filtering onMarketDate >= ${dateStr}`);
    } else {
      console.log('[City API] Filtered query - no date restriction');
    }

    // Apply $and conditions if any exist
    if (andConditions.length > 0) {
      baseQuery.$and = andConditions;
    }

    // Determine sorting strategy
    const sortBy = !hasFilters
      ? { onMarketDate: -1 }  // Newest first for general queries
      : { listPrice: 1 };      // Price ascending for filtered queries

    // DEBUG: Log the final query
    console.log('[City API] Final baseQuery:', JSON.stringify(baseQuery, null, 2));
    console.log('[City API] hasFilters:', hasFilters);
    console.log('[City API] sortBy:', sortBy);

    // ANALYTICS PATTERN: Fetch listings + accurate stats from ALL listings
    const [listings, stats, propertyTypeStats] = await Promise.all([
      // Fetch paginated listings
      UnifiedListing.find(baseQuery)
        .select(
          "listingId listingKey listPrice unparsedAddress slugAddress bedsTotal bedroomsTotal bathroomsTotalDecimal bathroomsTotalInteger bathroomsFull yearBuilt livingArea lotSizeSquareFeet lotSizeSqft propertyType propertySubType coordinates latitude longitude mlsSource primaryPhoto media onMarketDate"
        )
        .sort(sortBy)
        .limit(limit)
        .lean({ virtuals: true }) // Include virtual properties like daysOnMarket
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
      ]),
      // Property type breakdown with stats
      UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: "$propertySubType",
            count: { $sum: 1 },
            avgPrice: { $avg: "$listPrice" },
            minPrice: { $min: "$listPrice" },
            maxPrice: { $max: "$listPrice" },
            avgPricePerSqft: {
              $avg: {
                $cond: [
                  { $and: [
                    { $gt: ["$livingArea", 0] },
                    { $gt: ["$listPrice", 0] }
                  ]},
                  { $divide: ["$listPrice", "$livingArea"] },
                  null
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            count: 1,
            avgPrice: { $round: ["$avgPrice", 0] },
            minPrice: 1,
            maxPrice: 1,
            avgPricePerSqft: { $round: ["$avgPricePerSqft", 0] }
          }
        },
        { $sort: { count: -1 } }
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
        listing.bathroomsTotalDecimal ||
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
      // Days on market - calculated from onMarketDate
      onMarketDate: listing.onMarketDate,
      daysOnMarket: listing.onMarketDate
        ? Math.floor((Date.now() - new Date(listing.onMarketDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // Extract stats (aggregation returns array)
    const priceStats = stats[0] || {
      totalCount: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0
    };

    // Format property type stats for response
    const propertyTypeBreakdown = propertyTypeStats.map((stat: any) => ({
      propertySubType: stat._id || "Unknown",
      count: stat.count,
      avgPrice: stat.avgPrice,
      minPrice: stat.minPrice,
      maxPrice: stat.maxPrice,
      avgPricePerSqft: stat.avgPricePerSqft
    }));

    return NextResponse.json({
      listings: listingsWithPhotos,
      // ANALYTICS: Accurate stats calculated from ALL listings
      stats: {
        totalListings: priceStats.totalCount,
        displayedListings: listingsWithPhotos.length,
        isGeneralQuery: !hasFilters,
        suggestFilters: !hasFilters && priceStats.totalCount > 100,
        avgPrice: priceStats.avgPrice,
        medianPrice: priceStats.medianPrice,
        priceRange: {
          min: priceStats.minPrice,
          max: priceStats.maxPrice
        },
        propertyTypes: propertyTypeBreakdown
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
