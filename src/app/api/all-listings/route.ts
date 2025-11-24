// src/app/api/all-listings/route.ts
// Returns ALL active listings from both GPS MLS and CRMLS collections

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const url = req.nextUrl;
    const query = url.searchParams;

    // Optional filters
    const statusFilter = query.get("status") || "Active";
    const includeCoordinates = query.get("coordinates") === "true";
    const limit = parseInt(query.get("limit") || "0"); // 0 = no limit

    console.log(`📊 Fetching all listings with status: ${statusFilter}`);

    // Build base query
    const baseQuery: any = {
      standardStatus: statusFilter,
    };

    // Only include listings with coordinates if requested
    if (includeCoordinates) {
      baseQuery.latitude = { $exists: true, $ne: null };
      baseQuery.longitude = { $exists: true, $ne: null };
    }

    // Fetch from GPS MLS
    console.log("📦 Querying GPS MLS collection...");
    const gpsListingsQuery = Listing.find(baseQuery)
      .select({
        listingKey: 1,
        listingId: 1,
        slug: 1,
        slugAddress: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1,
        city: 1,
        stateOrProvince: 1,
        postalCode: 1,
        unparsedAddress: 1,
        bedroomsTotal: 1,
        bathroomsTotalDecimal: 1,
        livingArea: 1,
        lotSizeSqft: 1,
        yearBuilt: 1,
        propertyType: 1,
        propertySubType: 1,
        standardStatus: 1,
        mlsSource: 1,
      })
      .lean();

    // Fetch from CRMLS
    console.log("📦 Querying CRMLS collection...");
    const crmlsListingsQuery = CRMLSListing.find(baseQuery)
      .select({
        listingKey: 1,
        listingId: 1,
        slug: 1,
        slugAddress: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1,
        city: 1,
        stateOrProvince: 1,
        postalCode: 1,
        unparsedAddress: 1,
        bedroomsTotal: 1,
        bedsTotal: 1,
        bathroomsTotalDecimal: 1,
        livingArea: 1,
        lotSizeArea: 1,
        lotSizeSqft: 1,
        yearBuilt: 1,
        propertyType: 1,
        propertySubType: 1,
        standardStatus: 1,
        mlsSource: 1,
      })
      .lean();

    // Apply limit if specified
    if (limit > 0) {
      gpsListingsQuery.limit(Math.floor(limit / 2));
      crmlsListingsQuery.limit(Math.ceil(limit / 2));
    }

    // Execute queries in parallel
    const [gpsListings, crmlsListings] = await Promise.all([
      gpsListingsQuery,
      crmlsListingsQuery,
    ]);

    console.log(`✅ GPS MLS: ${gpsListings.length} listings`);
    console.log(`✅ CRMLS: ${crmlsListings.length} listings`);

    // Combine listings
    const allListings = [...gpsListings, ...crmlsListings];

    console.log(`📍 Total listings: ${allListings.length}`);

    return NextResponse.json({
      success: true,
      count: allListings.length,
      gpsCount: gpsListings.length,
      crmlsCount: crmlsListings.length,
      listings: allListings,
    });
  } catch (error) {
    console.error("❌ Error fetching all listings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch listings",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
