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

    const [listings, total] = await Promise.all([
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
          media: 1,
        })
        .lean(),
      UnifiedListing.countDocuments(baseQuery),
    ]);

    // Attach photos to listings and build full address
    const finalListings = listings.map((listing: any) => {
      // Get primary photo from media array
      const media = listing.media || [];
      const primaryPhoto = media.find(
        (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
      ) || media[0];

      const photoUrl = primaryPhoto
        ? primaryPhoto.Uri1600 || primaryPhoto.Uri1280 || primaryPhoto.Uri1024 || primaryPhoto.Uri800 || primaryPhoto.Uri640
        : null;

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
    });
  } catch (error) {
    console.error("❌ Error fetching subdivision listings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
