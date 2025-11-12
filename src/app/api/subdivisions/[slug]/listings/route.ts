// src/app/api/subdivisions/[slug]/listings/route.ts
// API route for getting listings in a subdivision

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  await dbConnect();

  try {
    const { slug } = params;
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

    // Build query for listings
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
        { subdivisionName: { $regex: /^(not applicable|n\/?a|none)$/i } },
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

    // Query both GPS and CRMLS
    const skip = (page - 1) * limit;

    let listings: any[] = [];
    let total = 0;

    if (subdivision.mlsSources.includes("GPS")) {
      const [gpsListings, gpsCount] = await Promise.all([
        Listing.find(baseQuery)
          .sort({ listPrice: -1 })
          .skip(skip)
          .limit(limit)
          .select({
            listingId: 1,
            listingKey: 1,
            slug: 1,
            address: 1,
            city: 1,
            stateOrProvince: 1,
            postalCode: 1,
            listPrice: 1,
            bedroomsTotal: 1,
            bathroomsTotalDecimal: 1,
            livingArea: 1,
            yearBuilt: 1,
            primaryPhotoUrl: 1,
            latitude: 1,
            longitude: 1,
            standardStatus: 1,
            propertyType: 1,
            mlsSource: 1,
          })
          .lean(),
        Listing.countDocuments(baseQuery),
      ]);
      listings = listings.concat(gpsListings);
      total += gpsCount;
    }

    if (subdivision.mlsSources.includes("CRMLS")) {
      const [cmlsListings, crmlsCount] = await Promise.all([
        CRMLSListing.find(baseQuery)
          .sort({ listPrice: -1 })
          .skip(skip)
          .limit(limit)
          .select({
            listingId: 1,
            listingKey: 1,
            slug: 1,
            address: 1,
            city: 1,
            stateOrProvince: 1,
            postalCode: 1,
            listPrice: 1,
            bedroomsTotal: 1,
            bathroomsTotalDecimal: 1,
            livingArea: 1,
            yearBuilt: 1,
            primaryPhotoUrl: 1,
            latitude: 1,
            longitude: 1,
            standardStatus: 1,
            propertyType: 1,
            mlsSource: 1,
          })
          .lean(),
        CRMLSListing.countDocuments(baseQuery),
      ]);
      listings = listings.concat(cmlsListings);
      total += crmlsCount;
    }

    // Sort combined results by price
    listings.sort((a, b) => (b.listPrice || 0) - (a.listPrice || 0));

    // Apply limit to combined results
    listings = listings.slice(0, limit);

    return NextResponse.json({
      listings,
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
