import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

// Optimized neighborhoods tree for AI chat references
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get all unique regions, counties, cities from unified listings
    const pipeline = [
      {
        $match: {
          standardStatus: { $in: ["Active", "Active Under Contract", "Pending"] },
        },
      },
      {
        $group: {
          _id: {
            region: "$region",
            county: "$county",
            city: "$city",
          },
          listings: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            region: "$_id.region",
            county: "$_id.county",
          },
          cities: {
            $push: {
              name: "$_id.city",
              listings: "$listings",
            },
          },
          countyListings: { $sum: "$listings" },
        },
      },
      {
        $group: {
          _id: "$_id.region",
          counties: {
            $push: {
              name: "$_id.county",
              listings: "$countyListings",
              cities: "$cities",
            },
          },
          regionListings: { $sum: "$countyListings" },
        },
      },
      {
        $project: {
          _id: 0,
          region: "$_id",
          listings: "$regionListings",
          counties: 1,
        },
      },
      { $sort: { listings: -1 } },
    ];

    const results = await UnifiedListing.aggregate(pipeline).exec();

    // Helper to create URL-friendly slugs
    const createSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
    };

    // Format for AI consumption with hyperlinks
    const formattedTree = results
      .filter((region) => region.region && region.region !== "Other")
      .map((region) => ({
        name: region.region,
        slug: createSlug(region.region),
        listings: region.listings,
        url: `/neighborhoods#${createSlug(region.region)}`,
        counties: region.counties
          .filter((county: any) => county.name && county.name !== "Other")
          .sort((a: any, b: any) => b.listings - a.listings)
          .map((county: any) => ({
            name: county.name,
            slug: createSlug(county.name) + "-county",
            listings: county.listings,
            url: `/neighborhoods/${createSlug(county.name)}-county`,
            cities: county.cities
              .filter((city: any) => city.name && city.name !== "Other")
              .sort((a: any, b: any) => b.listings - a.listings)
              .map((city: any) => ({
                name: city.name,
                slug: createSlug(city.name),
                listings: city.listings,
                url: `/neighborhoods/${createSlug(city.name)}`,
              })),
          })),
      }));

    // Calculate total California listings
    const totalListings = formattedTree.reduce(
      (sum, region) => sum + region.listings,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        state: "California",
        totalListings,
        url: "/neighborhoods",
        regions: formattedTree,
      },
      meta: {
        timestamp: new Date().toISOString(),
        regionsCount: formattedTree.length,
        countiesCount: formattedTree.reduce(
          (sum, r) => sum + r.counties.length,
          0
        ),
        citiesCount: formattedTree.reduce(
          (sum, r) =>
            sum +
            r.counties.reduce((cSum, c) => cSum + c.cities.length, 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching neighborhoods tree:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch neighborhoods tree",
      },
      { status: 500 }
    );
  }
}
