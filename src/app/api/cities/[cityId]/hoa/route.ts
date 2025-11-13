import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import Subdivision from "@/models/subdivisions";

export async function GET(
  request: Request,
  { params }: { params: { cityId: string } }
) {
  try {
    await dbConnect();

    const { cityId } = params;

    // Convert cityId to city name
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Get HOA statistics
    const hoaStats = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          standardStatus: "Active",
          $or: [
            { associationFee: { $exists: true, $ne: null, $gt: 0 } },
            { hoaFee: { $exists: true, $ne: null, $gt: 0 } },
          ],
        },
      },
      {
        $addFields: {
          monthlyHoaFee: {
            $cond: [
              { $gt: ["$associationFee", 0] },
              "$associationFee",
              "$hoaFee",
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgFee: { $avg: "$monthlyHoaFee" },
          minFee: { $min: "$monthlyHoaFee" },
          maxFee: { $max: "$monthlyHoaFee" },
        },
      },
    ]);

    // Get communities with HOA
    const communities = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          standardStatus: "Active",
          subdivisionName: { $exists: true, $nin: [null, ""] },
          $or: [
            { associationFee: { $exists: true, $ne: null, $gt: 0 } },
            { hoaFee: { $exists: true, $ne: null, $gt: 0 } },
          ],
        },
      },
      {
        $addFields: {
          monthlyHoaFee: {
            $cond: [
              { $gt: ["$associationFee", 0] },
              "$associationFee",
              "$hoaFee",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$subdivisionName",
          avgHoaFee: { $avg: "$monthlyHoaFee" },
          listingCount: { $sum: 1 },
        },
      },
      {
        $sort: { listingCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: "$_id",
          avgHoaFee: { $round: "$avgHoaFee" },
          listingCount: 1,
        },
      },
    ]);

    const stats = hoaStats.length > 0 ? hoaStats[0] : null;

    // Get subdivision slugs for communities
    const communityNames = communities.map((c) => c.name);
    const subdivisions = await Subdivision.find({
      name: { $in: communityNames },
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
    }).select("name slug");

    // Create a map of name to slug
    const slugMap = new Map(
      subdivisions.map((s) => [s.name, s.slug])
    );

    // Add slugs to communities
    const communitiesWithSlugs = communities
      .map((c) => ({
        ...c,
        slug: slugMap.get(c.name) || null,
      }))
      .filter((c) => c.slug !== null); // Only include communities with valid slugs

    return NextResponse.json({
      success: true,
      city: cityName,
      stats: stats
        ? {
            propertiesWithHOA: stats.count,
            avgFee: Math.round(stats.avgFee),
            feeRange: {
              min: stats.minFee,
              max: stats.maxFee,
            },
          }
        : null,
      communities: communitiesWithSlugs,
    });
  } catch (error) {
    console.error("Error fetching HOA data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch HOA data" },
      { status: 500 }
    );
  }
}
