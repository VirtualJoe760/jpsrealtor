// src/app/api/subdivisions/[slug]/market-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Listing } from "@/models/listings";
import type { MarketStatistics } from "@/types/cma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Subdivision slug is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find all listings in the subdivision (both active and recently sold)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const query: any = {
      subdivisionSlug: slug,
      $or: [
        { standardStatus: "Active" },
        {
          standardStatus: "Closed",
          closeDate: { $gte: sixMonthsAgo }
        }
      ]
    };

    const listings = await Listing
      .find(query)
      .select({
        listPrice: 1,
        closePrice: 1,
        soldPrice: 1,
        standardStatus: 1,
        livingArea: 1,
        onMarketDate: 1,
        closeDate: 1,
      })
      .lean();

    if (listings.length === 0) {
      return NextResponse.json(
        {
          error: "No listings found for this subdivision",
          statistics: null
        },
        { status: 404 }
      );
    }

    // Calculate market statistics
    const activeListings = listings.filter((l) => l.standardStatus === "Active");
    const soldListings = listings.filter((l) => l.standardStatus === "Closed");

    // List prices
    const listPrices = activeListings
      .map((l) => l.listPrice)
      .filter((p): p is number => typeof p === "number" && p > 0);

    // Sold prices
    const soldPrices = soldListings
      .map((l) => l.closePrice)
      .filter((p): p is number => typeof p === "number" && p > 0);

    // Days on market (for sold properties)
    const daysOnMarket = soldListings
      .map((l) => {
        if (l.onMarketDate && l.closeDate) {
          const onMarket = new Date(l.onMarketDate);
          const close = new Date(l.closeDate);
          return Math.round((close.getTime() - onMarket.getTime()) / (1000 * 60 * 60 * 24));
        }
        return null;
      })
      .filter((d): d is number => d !== null && d >= 0);

    // Price per sqft (all listings)
    const pricePerSqft = listings
      .map((l) => {
        const price = l.closePrice || l.listPrice;
        if (price && l.livingArea && l.livingArea > 0) {
          return Math.round(price / l.livingArea);
        }
        return null;
      })
      .filter((p): p is number => p !== null);

    // Calculate averages and medians
    const average = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
        : (sorted[mid] || 0);
    };

    const avgListPrice = Math.round(average(listPrices));
    const medianListPrice = Math.round(median(listPrices));
    const avgSoldPrice = Math.round(average(soldPrices));
    const medianSoldPrice = Math.round(median(soldPrices));
    const avgDaysOnMarket = daysOnMarket.length > 0 ? average(daysOnMarket) : 0;
    const avgPricePerSqFt = pricePerSqft.length > 0 ? Math.round(average(pricePerSqft)) : 0;

    // List-to-sold ratio
    const listToSoldRatio =
      avgListPrice > 0 && avgSoldPrice > 0
        ? Math.round((avgSoldPrice / avgListPrice) * 100)
        : 100;

    const statistics: MarketStatistics = {
      averageListPrice: avgListPrice,
      medianListPrice: medianListPrice,
      averageSoldPrice: avgSoldPrice,
      medianSoldPrice: medianSoldPrice,
      averageDaysOnMarket: avgDaysOnMarket,
      averagePricePerSqFt: avgPricePerSqFt,
      listToSoldRatio: listToSoldRatio,
      totalComparables: listings.length,
    };

    return NextResponse.json({
      success: true,
      statistics,
      activeCount: activeListings.length,
      soldCount: soldListings.length,
    });
  } catch (error) {
    console.error("Error generating subdivision market stats:", error);
    return NextResponse.json(
      { error: "Failed to generate market statistics" },
      { status: 500 }
    );
  }
}
