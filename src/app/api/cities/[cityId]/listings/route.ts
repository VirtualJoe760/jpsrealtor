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
    const sortParam = searchParams.get("sort") || "auto";
    const skipStats = searchParams.get("skipStats") === "true"; // Skip expensive stats aggregations for pagination

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
      standardStatus: "Active",  // Only show active listings
      propertyType: "A",  // Residential only (excludes B=Rentals, C=Multifamily, D=Land)
      propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
      listPrice: { $exists: true, $ne: null, $gt: 0 },
    };

    // Build $and array to combine all filters properly
    const andConditions: any[] = [];

    // Determine if this is a general query (no filters)
    const hasFilters = minPrice || maxPrice || minBeds || maxBeds || minBaths || maxBaths ||
                       minSqft || maxSqft || minLotSize || maxLotSize || minYear || maxYear ||
                       pool || spa || view || fireplace || gatedCommunity || seniorCommunity ||
                       garageSpaces || stories || hasHOA || eastOf || westOf || northOf || southOf;

    // Property type is hardcoded to "A" (Residential) in baseQuery
    // The propertyType URL parameter is ignored to ensure only residential properties are shown

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

    // General query: Show newest listings (no date restriction)
    // The sort by newest + limit handles showing fresh listings
    // Date restriction was too strict and could return 0 results
    if (!hasFilters) {
      console.log('[City API] General query - will sort by newest, no date restriction');
    } else {
      console.log('[City API] Filtered query - user-specified filters applied');
    }

    // Apply $and conditions if any exist
    if (andConditions.length > 0) {
      baseQuery.$and = andConditions;
    }

    // Determine sorting strategy based on user preference
    let sortBy: any;
    let needsAggregation = false;

    if (sortParam === "auto") {
      // Backwards compatible default behavior
      sortBy = !hasFilters
        ? { onMarketDate: -1 }  // Newest first for general queries
        : { listPrice: 1 };      // Price ascending for filtered queries
    } else {
      // User-specified sorting
      switch (sortParam) {
        case "price-low":
          sortBy = { listPrice: 1 };
          break;
        case "price-high":
          sortBy = { listPrice: -1 };
          break;
        case "sqft-low":
        case "sqft-high":
          needsAggregation = true;  // Will use aggregation pipeline
          break;
        case "newest":
          sortBy = { onMarketDate: -1 };
          break;
        case "oldest":
          sortBy = { onMarketDate: 1 };
          break;
        case "property-type":
          sortBy = { propertySubType: 1, listPrice: 1 };
          break;
        default:
          sortBy = { listPrice: 1 };
      }
    }

    // DEBUG: Log the final query
    console.log('[City API] Final baseQuery:', JSON.stringify(baseQuery, null, 2));
    console.log('[City API] hasFilters:', hasFilters);
    console.log('[City API] sortParam:', sortParam);
    console.log('[City API] sortBy:', sortBy);
    console.log('[City API] needsAggregation:', needsAggregation);

    // ANALYTICS PATTERN: Fetch listings + accurate stats from ALL listings
    let listingsQuery;

    if (needsAggregation) {
      // Use aggregation for price-per-sqft sorting
      listingsQuery = UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $addFields: {
            pricePerSqft: {
              $cond: [
                { $and: [
                  { $gt: ["$livingArea", 0] },
                  { $ne: ["$livingArea", null] }
                ]},
                { $divide: ["$listPrice", "$livingArea"] },
                999999  // Put properties without sqft data at the end
              ]
            }
          }
        },
        { $sort: { pricePerSqft: sortParam === "sqft-low" ? 1 : -1 } },
        { $limit: limit },
        {
          $project: {
            listingId: 1,
            listingKey: 1,
            listPrice: 1,
            unparsedAddress: 1,
            slugAddress: 1,
            bedsTotal: 1,
            bedroomsTotal: 1,
            bathroomsTotalDecimal: 1,
            bathroomsTotalInteger: 1,
            bathroomsFull: 1,
            yearBuilt: 1,
            livingArea: 1,
            lotSizeSquareFeet: 1,
            lotSizeSqft: 1,
            propertyType: 1,
            propertySubType: 1,
            coordinates: 1,
            latitude: 1,
            longitude: 1,
            mlsSource: 1,
            primaryPhoto: 1,
            media: 1,
            onMarketDate: 1,
            pricePerSqft: 1  // Include calculated field
          }
        }
      ]);
    } else {
      // Standard query with .find()
      listingsQuery = UnifiedListing.find(baseQuery)
        .select(
          "listingId listingKey listPrice unparsedAddress slugAddress bedsTotal bedroomsTotal bathroomsTotalDecimal bathroomsTotalInteger bathroomsFull yearBuilt livingArea lotSizeSquareFeet lotSizeSqft propertyType propertySubType coordinates latitude longitude mlsSource primaryPhoto media onMarketDate"
        )
        .sort(sortBy)
        .limit(limit)
        .lean({ virtuals: true }); // Include virtual properties like daysOnMarket
    }

    // Conditionally run stats aggregations (skip for pagination to improve performance)
    const [listings, stats, propertyTypeStats] = await Promise.all([
      listingsQuery.then(results => {
        console.log(`[City API] Query returned ${results.length} listings (limit: ${limit})`);
        return results;
      }),

      // CRITICAL: Calculate stats from ALL listings, not just current page
      // Skip this expensive aggregation when paginating (skipStats=true)
      skipStats ? Promise.resolve([]) : UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $addFields: {
            // Calculate days on market for filtering new listings
            daysOnMarket: {
              $cond: [
                { $ne: ["$onMarketDate", null] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: [new Date(), { $toDate: "$onMarketDate" }] },
                      1000 * 60 * 60 * 24
                    ]
                  }
                },
                null
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            avgPrice: { $avg: "$listPrice" },
            minPrice: { $min: "$listPrice" },
            maxPrice: { $max: "$listPrice" },
            prices: { $push: "$listPrice" },
            // Count "new listings" (past 7 days) from ALL listings
            newListingsCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ["$daysOnMarket", null] },
                    { $lte: ["$daysOnMarket", 7] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            totalCount: 1,
            avgPrice: { $round: ["$avgPrice", 0] },
            minPrice: 1,
            maxPrice: 1,
            newListingsCount: 1,
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
      // Skip this expensive aggregation when paginating (skipStats=true)
      skipStats ? Promise.resolve([]) : UnifiedListing.aggregate([
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
      // Price per sqft - calculate if not from aggregation
      pricePerSqft: listing.pricePerSqft ||
        (listing.livingArea && listing.livingArea > 0
          ? Math.round(listing.listPrice / listing.livingArea)
          : null),
    }));

    // Extract stats (aggregation returns array)
    const priceStats = stats[0] || {
      totalCount: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      newListingsCount: 0
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

    // Build response - conditionally include stats if they were calculated
    const response: any = {
      listings: listingsWithPhotos,
    };

    // Only include stats if they were calculated (not skipped for pagination)
    if (!skipStats) {
      response.stats = {
        totalListings: priceStats.totalCount,
        newListingsCount: priceStats.newListingsCount,  // Count of listings from past 7 days (from ALL listings)
        newListingsPct: priceStats.totalCount > 0
          ? Math.round((priceStats.newListingsCount / priceStats.totalCount) * 100)
          : 0,
        isGeneralQuery: !hasFilters,
        suggestFilters: !hasFilters && priceStats.totalCount > 100,
        avgPrice: priceStats.avgPrice,
        medianPrice: priceStats.medianPrice,
        priceRange: {
          min: priceStats.minPrice,
          max: priceStats.maxPrice
        },
        propertyTypes: propertyTypeBreakdown
      };
    }

    response.sorting = {
      appliedSort: sortParam,
      availableOptions: [
        { value: "price-low", label: "Price: Low to High" },
        { value: "price-high", label: "Price: High to Low" },
        { value: "sqft-low", label: "Best Value ($/sqft)" },
        { value: "sqft-high", label: "Premium ($/sqft)" },
        { value: "newest", label: "Newest Listed" },
        { value: "oldest", label: "Longest on Market" },
        { value: "property-type", label: "Group by Property Type" }
      ]
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching city listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch city listings" },
      { status: 500 }
    );
  }
}
