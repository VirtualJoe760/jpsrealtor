// src/app/api/pois/route.ts
// Serve cached POI data for map viewport
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PointOfInterest from "@/models/PointOfInterest";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const north = parseFloat(searchParams.get("north") || "90");
    const south = parseFloat(searchParams.get("south") || "-90");
    const east = parseFloat(searchParams.get("east") || "180");
    const west = parseFloat(searchParams.get("west") || "-180");
    const category = searchParams.get("category"); // optional filter
    const zoom = parseInt(searchParams.get("zoom") || "12", 10);

    // Only show POIs at zoom 14+
    if (zoom < 14) {
      return NextResponse.json({ pois: [] });
    }

    await dbConnect();

    const query: Record<string, any> = {
      latitude: { $gte: south, $lte: north },
      longitude: { $gte: west, $lte: east },
    };

    if (category) {
      query.category = category;
    }

    // At zoom 14-15: only show major POIs (golf, parks, attractions)
    // At zoom 16+: show all POIs including restaurants, shopping, etc.
    if (zoom < 16) {
      query.category = { $in: ["golf", "park", "attraction"] };
    }

    const pois = await PointOfInterest.find(query)
      .select({
        placeId: 1,
        name: 1,
        category: 1,
        latitude: 1,
        longitude: 1,
        rating: 1,
        userRatingsTotal: 1,
        description: 1,
        photoUrl: 1,
        address: 1,
        city: 1,
        businessStatus: 1,
      })
      .limit(500)
      .lean();

    return NextResponse.json({ pois, count: pois.length });
  } catch (error) {
    console.error("[POIs API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch POIs" },
      { status: 500 }
    );
  }
}
