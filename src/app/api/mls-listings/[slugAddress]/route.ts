// src/app/api/mls-listings/[slugAddress]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slugAddress: string }> }
) {
  await dbConnect();

  const { slugAddress } = await params;

  try {
    // 🔍 Find listing in unified_listings (all 8 MLSs)
    const listing: any = await UnifiedListing.findOne({ slugAddress }).lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found in database" }, { status: 404 });
    }

    // 📸 Fetch primary photo
    const photo = await Photo.findOne({ listingId: listing.listingId })
      .sort({ primary: -1, Order: 1 })
      .lean();

    // 🏡 Fetch open houses
    const openHouses = await OpenHouse.find({ listingId: listing.listingId }).lean();

    const enrichedListing = {
      ...listing,
      mlsSource: listing.mlsSource || "UNKNOWN", // Already in unified schema
      primaryPhotoUrl: photo?.uri800 || photo?.uri640 || "/images/no-photo.png",
      openHouses,
    };

    return NextResponse.json({ listing: enrichedListing });
  } catch (error) {
    console.error("❌ Error fetching listing from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
