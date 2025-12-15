// src/app/api/regions/coachella-valley/stats/route.ts
// Get aggregated stats for the entire Coachella Valley region by city

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

const COACHELLA_VALLEY_CITIES = [
  "Palm Springs",
  "Cathedral City",
  "Rancho Mirage",
  "Palm Desert",
  "Indian Wells",
  "La Quinta",
  "Indio",
  "Coachella",
  "Desert Hot Springs",
  "Bermuda Dunes"
];

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const propertyType = searchParams.get("propertyType") || "sale";
    const daysNew = searchParams.get("daysNew"); // Filter for "new" listings (e.g., last 7 days)

    // Base query for all Coachella Valley cities
    const baseQuery: any = {
      city: { $in: COACHELLA_VALLEY_CITIES.map(c => new RegExp(`^${c}$`, "i")) },
      listPrice: { $exists: true, $ne: null, $gt: 0 },
    };

    // Filter by property type
    if (propertyType === "sale") {
      baseQuery.$or = [
        { propertyType: "A" },
        { propertyType: "C" },
        { propertyType: { $exists: false } },
        { propertyType: null },
        { propertyType: "" },
      ];
    } else if (propertyType === "rental") {
      baseQuery.propertyType = "B";
    }

    // Filter for "new" listings if requested
    if (daysNew) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(daysNew));
      baseQuery.listingContractDate = { $gte: daysAgo };
    }

    // Aggregate by city
    const cityStats = await UnifiedListing.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          prices: { $push: "$listPrice" }
        }
      },
      {
        $project: {
          _id: 0,
          city: "$_id",
          count: 1,
          avgPrice: { $round: "$avgPrice" },
          minPrice: 1,
          maxPrice: 1,
          prices: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Calculate median for each city
    const citiesWithMedian = cityStats.map(city => {
      const sortedPrices = city.prices.sort((a: number, b: number) => a - b);
      const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

      // Remove prices array from response (we only needed it for median calculation)
      const { prices, ...cityData } = city;

      return {
        ...cityData,
        medianPrice
      };
    });

    // Calculate regional totals
    const totalListings = citiesWithMedian.reduce((sum, city) => sum + city.count, 0);
    const allPrices = cityStats.flatMap(city => city.prices).sort((a: number, b: number) => a - b);
    const regionalMedianPrice = allPrices[Math.floor(allPrices.length / 2)];
    const regionalAvgPrice = Math.round(
      allPrices.reduce((sum: number, price: number) => sum + price, 0) / allPrices.length
    );

    return NextResponse.json({
      region: "Coachella Valley",
      summary: {
        totalListings,
        avgPrice: regionalAvgPrice,
        medianPrice: regionalMedianPrice,
        priceRange: {
          min: Math.min(...allPrices),
          max: Math.max(...allPrices)
        }
      },
      cities: citiesWithMedian,
      metadata: {
        propertyType,
        daysNew: daysNew ? parseInt(daysNew) : null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error fetching Coachella Valley stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch regional stats" },
      { status: 500 }
    );
  }
}
