import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";

export async function GET(
  request: NextRequest,
  { params }: { params: { cityId: string } }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const cityId = resolvedParams.cityId;

    // Convert cityId to city name
    // e.g., "laguna-beach" -> "Laguna Beach"
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Fetch subdivisions for this city from the Subdivision model
    const subdivisions = await Subdivision.find({
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
    })
      .select("name slug city listingCount avgPrice priceRange")
      .sort({ listingCount: -1 })
      .lean()
      .exec();

    // Format subdivisions for the component
    const formattedSubdivisions = subdivisions.map((sub: any) => ({
      name: sub.name,
      slug: sub.slug,
      listingCount: sub.listingCount || 0,
      avgPrice: sub.avgPrice || 0,
      priceRange: sub.priceRange || { min: 0, max: 0 },
    }));

    // Count non-subdivision listings (optional - can be implemented later)
    const noSubdivisionCount = 0;

    return NextResponse.json({
      subdivisions: formattedSubdivisions,
      noSubdivisionCount,
      city: cityName,
    });
  } catch (error) {
    console.error("Error fetching city subdivisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subdivisions" },
      { status: 500 }
    );
  }
}
