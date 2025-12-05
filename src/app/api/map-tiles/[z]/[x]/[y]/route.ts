// src/app/api/map-tiles/[z]/[x]/[y]/route.ts
// Tile-based MLS Listings API - Optimized for Cloudflare CDN caching
// Uses Slippy Map Tiles format (z/x/y) for deterministic geographic boundaries

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";
import { tileToBounds, getLimitForZoom } from "@/app/utils/map/tile-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  await dbConnect();

  try {
    const { z, x, y } = await params;

    // Parse tile coordinates
    const zoom = parseInt(z, 10);
    const tileX = parseInt(x, 10);
    const tileY = parseInt(y, 10);

    // Validate tile coordinates
    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      return NextResponse.json(
        { error: "Invalid tile coordinates" },
        { status: 400 }
      );
    }

    // Validate zoom level (0-22 is standard for web maps)
    if (zoom < 0 || zoom > 22) {
      return NextResponse.json(
        { error: "Zoom level must be between 0 and 22" },
        { status: 400 }
      );
    }

    // Convert tile coordinates to geographic bounds
    const bounds = tileToBounds(tileX, tileY, zoom);

    // Get search parameters for filtering
    const url = req.nextUrl;
    const query = url.searchParams;

    // ==================== LISTING TYPE FILTER (Sale vs Rental vs Multi-Family) ====================
    const listingType = query.get("listingType") || "sale";
    const propertyTypeCode =
      listingType === "rental" ? "B" : // B = Residential Lease
      listingType === "multifamily" ? "C" : // C = Residential Income/Multi-Family
      "A"; // A = Residential (default)

    const matchStage: Record<string, any> = {
      standardStatus: "Active",
      propertyType: propertyTypeCode,
      latitude: { $gte: bounds.south, $lte: bounds.north },
      longitude: { $gte: bounds.west, $lte: bounds.east },
      listPrice: { $ne: null },
    };

    // ==================== PROPERTY TYPE FILTERS ====================
    const queryPropertyType = query.get("propertyType");
    if (queryPropertyType) {
      matchStage.propertyType = queryPropertyType;
    }

    const propertySubType = query.get("propertySubType");
    if (propertySubType && propertySubType !== "all") {
      matchStage.propertySubType = { $regex: new RegExp(propertySubType, "i") };
    }

    // ==================== PRICE FILTERS ====================
    const minPrice = Number(query.get("minPrice") || "0");
    const maxPrice = Number(query.get("maxPrice") || "99999999");
    matchStage.listPrice = { $gte: minPrice, $lte: maxPrice };

    // ==================== BEDS/BATHS FILTERS ====================
    const beds = Number(query.get("beds") || "0");
    if (beds > 0) {
      matchStage.$or = [
        { bedroomsTotal: { $gte: beds } },
        { bedsTotal: { $gte: beds } },
      ];
    }

    const baths = Number(query.get("baths") || "0");
    if (baths > 0) {
      matchStage.bathroomsTotalDecimal = { $gte: baths };
    }

    // ==================== SQUARE FOOTAGE FILTERS ====================
    const minSqft = Number(query.get("minSqft") || "0");
    const maxSqft = Number(query.get("maxSqft") || "999999999");
    if (minSqft > 0 || maxSqft < 999999999) {
      matchStage.livingArea = { $gte: minSqft, $lte: maxSqft };
    }

    // ==================== LOT SIZE FILTERS ====================
    const minLotSize = Number(query.get("minLotSize") || "0");
    const maxLotSize = Number(query.get("maxLotSize") || "999999999");
    if (minLotSize > 0 || maxLotSize < 999999999) {
      matchStage.lotSizeSqft = { $gte: minLotSize, $lte: maxLotSize };
    }

    // ==================== YEAR BUILT FILTERS ====================
    const minYear = Number(query.get("minYear") || "0");
    const maxYear = Number(query.get("maxYear") || new Date().getFullYear());
    if (minYear > 0 || maxYear < new Date().getFullYear()) {
      matchStage.yearBuilt = { $gte: minYear, $lte: maxYear };
    }

    // ==================== AMENITY FILTERS (Pool, Spa, etc.) ====================
    const hasPool = query.get("pool");
    if (hasPool === "true") matchStage.poolYn = true;
    else if (hasPool === "false") matchStage.poolYn = { $ne: true };

    const hasSpa = query.get("spa");
    if (hasSpa === "true") matchStage.spaYn = true;
    else if (hasSpa === "false") matchStage.spaYn = { $ne: true };

    const hasView = query.get("view");
    if (hasView === "true") matchStage.viewYn = true;

    const hasGarage = query.get("garage");
    if (hasGarage === "true") {
      matchStage.garageSpaces = { $gte: 1 };
    }

    const minGarages = Number(query.get("minGarages") || "0");
    if (minGarages > 0) {
      matchStage.garageSpaces = { $gte: minGarages };
    }

    // ==================== HOA FILTERS ====================
    const hasHOA = query.get("hasHOA");
    if (hasHOA === "true") {
      matchStage.associationFee = { ...matchStage.associationFee, $gt: 0 };
    } else if (hasHOA === "false") {
      matchStage.associationFee = { ...matchStage.associationFee, $in: [0, null] };
    }

    const hoaMax = Number(query.get("hoa") || "");
    if (!isNaN(hoaMax) && hoaMax > 0) {
      matchStage.associationFee = {
        ...(matchStage.associationFee || {}),
        $lte: hoaMax,
      };
    }

    // ==================== COMMUNITY FILTERS ====================
    const gatedCommunity = query.get("gated");
    if (gatedCommunity === "true") matchStage.gatedCommunity = true;

    const seniorCommunity = query.get("senior");
    if (seniorCommunity === "true") matchStage.seniorCommunityYn = true;

    // ==================== LAND TYPE FILTERS ====================
    const landType = query.get("landType");
    if (landType && landType !== "all") {
      matchStage.landType = landType;
    }

    // ==================== LOCATION FILTERS ====================
    const city = query.get("city");
    if (city && city !== "all") {
      matchStage.city = { $regex: new RegExp(city, "i") };
    }

    const subdivision = query.get("subdivision");
    if (subdivision) {
      matchStage.subdivisionName = { $regex: new RegExp(subdivision, "i") };
    }

    // ==================== MLS SOURCE FILTER ====================
    const mlsSource = query.get("mlsSource");
    if (mlsSource) {
      const mlsSources = mlsSource.split(",");
      matchStage.mlsSource = { $in: mlsSources };
    }

    // ==================== EXCLUDE KEYS (for swipe functionality) ====================
    const excludeKeys = query.get("excludeKeys");
    let excludeKeysArray: string[] = [];
    if (excludeKeys) {
      excludeKeysArray = excludeKeys.split(",").filter(k => k.trim());
      if (excludeKeysArray.length > 0) {
        matchStage.listingKey = { $nin: excludeKeysArray };
      }
    }

    // Get progressive limit based on zoom level
    const limit = getLimitForZoom(zoom);

    const sortBy = query.get("sortBy") || "listPrice";
    const sortOrder: 1 | -1 = query.get("sortOrder") === "desc" ? -1 : 1;
    const validSortFields = ["listPrice", "livingArea", "lotSizeSqft"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "listPrice";

    // Build aggregation pipeline
    const pipeline = [
      // Stage 1: Filter listings within tile bounds
      { $match: matchStage },

      // Stage 2: Sort
      { $sort: { [sortField]: sortOrder } },

      // Stage 3: Apply zoom-based limit
      { $limit: limit },

      // Stage 4: Join with photos (get primary photo)
      {
        $lookup: {
          from: "photos",
          let: { listingId: { $toString: "$listingId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$listingId", "$$listingId"] } } },
            { $sort: { primary: -1, Order: 1 } },
            { $limit: 1 },
            { $project: { uri800: 1, _id: 0 } }
          ],
          as: "photo"
        }
      },

      // Stage 5: Join with open houses
      {
        $lookup: {
          from: "openhouses",
          localField: "listingId",
          foreignField: "listingId",
          as: "openHouses"
        }
      },

      // Stage 6: Project only needed fields & compute derived fields
      {
        $project: {
          _id: 1,
          listingId: 1,
          listingKey: 1,
          slug: 1,
          slugAddress: 1,
          listPrice: 1,
          bedroomsTotal: 1,
          bedsTotal: 1,
          bathroomsFull: 1,
          bathroomsTotalInteger: 1,
          bathroomsTotalDecimal: 1,
          livingArea: 1,
          lotSizeArea: 1,
          lotSizeSqft: 1,
          latitude: 1,
          longitude: 1,
          address: 1,
          unparsedAddress: 1,
          unparsedFirstLineAddress: 1,
          poolYn: 1,
          spaYn: 1,
          publicRemarks: 1,
          propertyType: 1,
          propertySubType: 1,
          associationFee: 1,
          yearBuilt: 1,
          garageSpaces: 1,
          city: 1,
          subdivisionName: 1,
          landType: 1,
          viewYn: 1,
          gatedCommunity: 1,
          seniorCommunityYn: 1,
          mlsSource: 1,
          mlsId: 1,
          propertyTypeName: 1,
          pool: { $eq: ["$poolYn", true] },
          spa: { $eq: ["$spaYn", true] },
          hasHOA: { $gt: [{ $ifNull: ["$associationFee", 0] }, 0] },
          primaryPhotoUrl: {
            $ifNull: [
              { $arrayElemAt: ["$photo.uri800", 0] },
              "/images/no-photo.png"
            ]
          },
          openHouses: {
            $map: {
              input: "$openHouses",
              as: "oh",
              in: {
                listingId: "$$oh.listingId",
                openHouseId: "$$oh.openHouseId",
                date: "$$oh.date",
                startTime: "$$oh.startTime",
                endTime: "$$oh.endTime"
              }
            }
          }
        }
      }
    ];

    // Execute query
    const listings = await UnifiedListing.aggregate(pipeline as any);

    // Get total count for this tile (for analytics)
    const total = await UnifiedListing.countDocuments(matchStage);

    // Get MLS distribution for debugging/analytics
    const mlsDistribution = await UnifiedListing.aggregate([
      { $match: matchStage },
      { $group: { _id: "$mlsSource", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalByMLS = mlsDistribution.reduce((acc, item) => {
      acc[item._id || "UNKNOWN"] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Return with aggressive Cloudflare cache headers
    return NextResponse.json(
      {
        listings,
        totalCount: {
          total,
          byMLS: totalByMLS,
        },
        tile: {
          z: zoom,
          x: tileX,
          y: tileY,
          bounds,
        },
        limit,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Browser cache for 5 minutes, CDN cache for 1 hour
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=604800',
          // Cloudflare-specific: cache for 1 day, serve stale for 1 week
          'CDN-Cache-Control': 'max-age=86400',
          'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800',
          // Help Cloudflare identify cacheable content
          'Vary': 'Accept-Encoding',
        }
      }
    );
  } catch (error) {
    console.error("❌ Failed to fetch tile listings:", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}
