// src/app/api/mls-listings/[slugAddress]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing, IListing } from "@/models/listings";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;

  try {
    const listing: IListing | null = await Listing.findOne({ slugAddress }).lean();

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
      primaryPhotoUrl: photo?.uri800 || "/images/no-photo.png",
      openHouses,
    };

    return NextResponse.json({ listing: enrichedListing });
  } catch (error) {
    console.error("❌ Error fetching listing from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
