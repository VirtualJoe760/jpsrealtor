import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";

/**
 * GET /api/cities/search?q=los
 * Lightweight city autocomplete — returns name, county, state for matching cities.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  await dbConnect();

  const cities = await City.find(
    { normalizedName: { $regex: `^${q.toLowerCase()}` } },
    { name: 1, county: 1, region: 1, slug: 1, _id: 0 }
  )
    .sort({ listingCount: -1 })
    .limit(10)
    .lean();

  return NextResponse.json({ cities });
}
