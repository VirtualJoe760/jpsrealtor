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
    const sortParam = searchParams.get("sort") || "auto";

    // Price filters
    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;

    // Bed/Bath filters (exact match)
    const beds = searchParams.get("beds") ? parseInt(searchParams.get("beds")!) : undefined;
    const baths = searchParams.get("baths") ? parseInt(searchParams.get("baths")!) : undefined;

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

    // Find subdivision metadata (optional - may not exist for all subdivisions)
    const subdivision = await Subdivision.findOne({ slug }).lean();

    // If no metadata, infer subdivision name from slug
    // Convert "madison-club" → "Madison Club" for database query
    const subdivisionName = subdivision
      ? subdivision.name
      : slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    console.log(`[Subdivision Listings API] Slug: ${slug}, Subdivision: ${subdivisionName}, Has Metadata: ${!!subdivision}`);

    // Build query for listings - unified collection
    const baseQuery: any = {
      standardStatus: "Active",
      // Only residential properties (Type A: houses, condos, townhomes)
      // Excludes: B=Rentals, C=Multifamily, D=Land
      propertyType: "A",
      // Exclude Co-Ownership properties (fractional ownership/timeshares)
      propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
    };

    // Handle Non-HOA subdivisions differently
    if (subdivisionName.startsWith("Non-HOA ")) {
      const cityName = subdivisionName.replace("Non-HOA ", "");
      baseQuery.city = cityName;
      baseQuery.$or = [
        { subdivisionName: { $exists: false } },
        { subdivisionName: null },
        { subdivisionName: "" },
        { subdivisionName: { $regex: /^(not applicable|n\/?\s*a|none)$/i } },
      ];
    } else {
      // Case-insensitive regex match for subdivision name
      baseQuery.subdivisionName = new RegExp(`^${subdivisionName.replace(/[-\s]/g, '[-\\s]')}$`, 'i');
      // Only add city filter if we have metadata
      if (subdivision?.city) {
        baseQuery.city = subdivision.city;
      }
    }

    // Add filters
    if (minPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $gte: minPrice };
    }
    if (maxPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $lte: maxPrice };
    }

    // EXACT MATCH for bedrooms (3 beds means exactly 3, not 3+)
    if (beds) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { bedroomsTotal: beds },
          { bedsTotal: beds },
        ]
      });
    }

    // EXACT MATCH for bathrooms
    if (baths) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { bathroomsTotalDecimal: baths },
          { bathroomsTotalInteger: baths },
        ]
      });
    }

    // Size filters
    if (minSqft || maxSqft) {
      const livingAreaFilter: any = {};
      if (minSqft) livingAreaFilter.$gte = minSqft;
      if (maxSqft) livingAreaFilter.$lte = maxSqft;
      baseQuery.livingArea = livingAreaFilter;
    }

    if (minLotSize || maxLotSize) {
      const lotSizeFilter: any = {};
      if (minLotSize) lotSizeFilter.$gte = minLotSize;
      if (maxLotSize) lotSizeFilter.$lte = maxLotSize;
      // Check both field names for lot size
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { lotSizeSqft: lotSizeFilter },
          { lotSizeArea: lotSizeFilter },
        ]
      });
    }

    // Year filters
    if (minYear || maxYear) {
      const yearFilter: any = {};
      if (minYear) yearFilter.$gte = minYear;
      if (maxYear) yearFilter.$lte = maxYear;
      baseQuery.yearBuilt = yearFilter;
    }

    // Amenity filters
    if (pool) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [{ poolYN: true }, { pool: true }]
      });
    }

    if (spa) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [{ spaYN: true }, { spa: true }]
      });
    }

    if (view) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [{ viewYN: true }, { view: true }]
      });
    }

    if (fireplace) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { fireplacesTotal: { $gte: 1 } },
          { fireplaceYN: true },
        ]
      });
    }

    if (gatedCommunity) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { gatedCommunity: true },
          { associationAmenities: { $regex: /gated/i } },
        ]
      });
    }

    if (seniorCommunity) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { seniorCommunityYN: true },
          { ageRestricted55Plus: true },
        ]
      });
    }

    // Garage/Parking filters
    if (garageSpaces) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { garageSpaces: { $gte: garageSpaces } },
          { parkingTotal: { $gte: garageSpaces } },
        ]
      });
    }

    // Stories filter
    if (stories) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { stories: stories },
          { levels: stories },
        ]
      });
    }

    // Query unified_listings (all 8 MLSs)
    const skip = (page - 1) * limit;

    // Determine sorting strategy based on user preference
    let sortBy: any;
    let needsAggregation = false;

    if (sortParam === "auto") {
      // Default behavior: price high to low
      sortBy = { listPrice: -1 };
    } else {
      switch (sortParam) {
        case "price-low":
          sortBy = { listPrice: 1 };
          break;
        case "price-high":
          sortBy = { listPrice: -1 };
          break;
        case "sqft-low":
        case "sqft-high":
          needsAggregation = true;
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
          sortBy = { listPrice: -1 };
      }
    }

    // ANALYTICS PATTERN: Get accurate stats from ALL listings, not just the page
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
                999999
              ]
            }
          }
        },
        { $sort: { pricePerSqft: sortParam === "sqft-low" ? 1 : -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            listingKey: 1,
            listingId: 1,
            slugAddress: 1,
            slug: 1,
            unparsedAddress: 1,
            unparsedFirstLineAddress: 1,
            address: 1,
            city: 1,
            stateOrProvince: 1,
            postalCode: 1,
            latitude: 1,
            longitude: 1,
            listPrice: 1,
            currentPrice: 1,
            originalListPrice: 1,
            associationFee: 1,
            bedroomsTotal: 1,
            bedsTotal: 1,
            bathroomsTotalDecimal: 1,
            bathroomsTotalInteger: 1,
            bathroomsFull: 1,
            bathroomsHalf: 1,
            livingArea: 1,
            lotSizeArea: 1,
            lotSizeSqft: 1,
            yearBuilt: 1,
            standardStatus: 1,
            daysOnMarket: 1,
            onMarketDate: 1,
            modificationTimestamp: 1,
            propertyType: 1,
            propertySubType: 1,
            subdivisionName: 1,
            mlsSource: 1,
            landType: 1,
            poolYN: 1,
            pool: 1,
            spaYN: 1,
            spa: 1,
            viewYN: 1,
            view: 1,
            fireplaceYN: 1,
            fireplacesTotal: 1,
            seniorCommunityYN: 1,
            gatedCommunity: 1,
            associationYN: 1,
            garageSpaces: 1,
            parkingTotal: 1,
            stories: 1,
            levels: 1,
            publicRemarks: 1,
            primaryPhoto: 1,
            media: 1,
            pricePerSqft: 1
          }
        }
      ]);
    } else {
      listingsQuery = UnifiedListing.find(baseQuery)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .select({
          // Identifiers & Links
          listingKey: 1,
          listingId: 1,
          slugAddress: 1,
          slug: 1,

          // Addresses
          unparsedAddress: 1,
          unparsedFirstLineAddress: 1,
          address: 1,
          city: 1,
          stateOrProvince: 1,
          postalCode: 1,

          // Location
          latitude: 1,
          longitude: 1,

          // Pricing
          listPrice: 1,
          currentPrice: 1,
          originalListPrice: 1,
          associationFee: 1,

          // Property Details - Bedrooms/Bathrooms
          bedroomsTotal: 1,
          bedsTotal: 1,
          bathroomsTotalDecimal: 1,
          bathroomsTotalInteger: 1,
          bathroomsFull: 1,
          bathroomsHalf: 1,

          // Property Details - Size
          livingArea: 1,
          lotSizeArea: 1,
          lotSizeSqft: 1,
          yearBuilt: 1,

          // Status & Timing
          standardStatus: 1,
          daysOnMarket: 1,
          onMarketDate: 1,
          modificationTimestamp: 1,

          // Property Classification
          propertyType: 1,
          propertySubType: 1,
          subdivisionName: 1,
          mlsSource: 1,
          landType: 1,

          // Features
          poolYN: 1,
          pool: 1,
          spaYN: 1,
          spa: 1,
          viewYN: 1,
          view: 1,
          fireplaceYN: 1,
          fireplacesTotal: 1,
          seniorCommunityYN: 1,
          gatedCommunity: 1,
          associationYN: 1,
          garageSpaces: 1,
          parkingTotal: 1,
          stories: 1,
          levels: 1,

          // Description
          publicRemarks: 1,

          // Photos
          primaryPhoto: 1,
          media: 1,
        })
        .lean();
    }

    const [listings, total, stats, propertyTypeStats] = await Promise.all([
      listingsQuery,
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
        // Calculate days on market from onMarketDate
        daysOnMarket: listing.onMarketDate
          ? Math.floor((Date.now() - new Date(listing.onMarketDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        // Price per sqft - calculate if not from aggregation
        pricePerSqft: listing.pricePerSqft ||
          (listing.livingArea && listing.livingArea > 0
            ? Math.round(listing.listPrice / listing.livingArea)
            : null),
      };
    });

    // Extract stats (aggregation returns array)
    const priceStats = stats[0] || {
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
      listings: finalListings,
      subdivision: {
        name: subdivisionName,
        city: subdivision?.city || null,
        region: subdivision?.region || null,
        slug: slug,
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
        },
        propertyTypes: propertyTypeBreakdown
      },
      // SORTING: Information about applied sorting
      sorting: {
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
