import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const cityId = resolvedParams.cityId;
    const searchParams = request.nextUrl.searchParams;
    const propertyType = searchParams.get("propertyType") || "sale";

    // Convert cityId to city name for matching
    // e.g., "palm-springs" -> "Palm Springs"
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Base query for the city - using unified_listings (all 8 MLSs)
    const baseQuery: any = {
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
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

    // Get all matching listings from unified collection (all 8 MLSs)
    const allListings = await UnifiedListing.find(baseQuery)
      .select("listPrice")
      .lean()
      .exec();

    if (allListings.length === 0) {
      return NextResponse.json({
        stats: {
          listingCount: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
        },
      });
    }

    // Calculate statistics
    const prices = allListings.map((l: any) => l.listPrice).sort((a, b) => a - b);
    const listingCount = allListings.length;
    const avgPrice = Math.round(
      prices.reduce((sum, price) => sum + price, 0) / listingCount
    );
    const medianPrice = prices[Math.floor(listingCount / 2)];
    const priceRange = {
      min: prices[0],
      max: prices[prices.length - 1],
    };

    return NextResponse.json({
      stats: {
        listingCount,
        avgPrice,
        medianPrice,
        priceRange,
      },
    });
  } catch (error) {
    console.error("Error fetching city stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch city stats" },
      { status: 500 }
    );
  }
}
