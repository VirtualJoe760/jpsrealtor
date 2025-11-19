// src/app/api/subdivisions/[slug]/stats/route.ts
// API route for getting filtered subdivision stats

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await dbConnect();

  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const propertyType = searchParams.get("propertyType") || "all"; // all, sale, rental

    // Find subdivision
    const subdivision = await Subdivision.findOne({ slug }).lean();

    if (!subdivision) {
      return NextResponse.json(
        { error: "Subdivision not found" },
        { status: 404 }
      );
    }

    // Build base query
    const baseQuery: any = {
      standardStatus: "Active",
    };

    // Filter by property type
    // PropertyType codes: A = Residential (Sale), B = Residential Lease (Rental), C = Multi-Family
    if (propertyType === "sale") {
      baseQuery.$or = [
        { propertyType: "A" },
        { propertyType: "C" },
        { propertyType: { $exists: false } },
        { propertyType: null },
        { propertyType: "" }
      ];
    } else if (propertyType === "rental") {
      baseQuery.propertyType = "B"; // Only rental
    }

    // Handle Non-HOA subdivisions
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

    // Collect listings from both GPS and CRMLS
    let allListings: any[] = [];

    if (subdivision.mlsSources.includes("GPS")) {
      const gpsListings = await Listing.find(baseQuery)
        .select({ listPrice: 1 })
        .lean();
      allListings = allListings.concat(gpsListings);
    }

    if (subdivision.mlsSources.includes("CRMLS")) {
      const crmlsListings = await CRMLSListing.find(baseQuery)
        .select({ listPrice: 1 })
        .lean();
      allListings = allListings.concat(crmlsListings);
    }

    // Calculate stats
    const listingCount = allListings.length;
    const prices = allListings
      .map((l) => l.listPrice)
      .filter((p) => p != null && p > 0);

    let stats = {
      listingCount,
      avgPrice: 0,
      medianPrice: undefined as number | undefined,
      priceRange: {
        min: 0,
        max: 0,
      },
    };

    if (prices.length > 0) {
      // Average price
      const sum = prices.reduce((a, b) => a + b, 0);
      stats.avgPrice = Math.round(sum / prices.length);

      // Price range
      stats.priceRange.min = Math.min(...prices);
      stats.priceRange.max = Math.max(...prices);

      // Median price
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sortedPrices.length / 2);
      stats.medianPrice =
        sortedPrices.length % 2 === 0
          ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
          : sortedPrices[mid];
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("❌ Error fetching subdivision stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
