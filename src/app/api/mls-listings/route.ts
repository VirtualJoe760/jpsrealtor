// src/app/api/mls-listings/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Listing from "@/models/listings";

export async function GET(req: NextRequest) {
  console.log("🔌 Connecting to MongoDB...");

  try {
    await dbConnect();

    const listings = await Listing.find({
      status: "Active",
      latitude: { $type: "number" },
      longitude: { $type: "number" },
      listPrice: { $ne: null },
    })
      .select([
        "_id",
        "latitude",
        "longitude",
        "listPrice",
        "address",
        "bedroomsTotal",
        "bathroomsFull",
        "livingArea",
        "lotSizeSqft",
        "pool",
        "spa",
        "listingId",
        "slugAddress",
        "slug",
        "publicRemarks",
      ].join(" "))
      .limit(100)
      .lean();

    console.log("📍 Found listings with coordinates:", listings.length);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("❌ Failed to fetch listings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
