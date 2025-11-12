// src/app/api/mls-listings/[slugAddress]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing, IListing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;

  try {
    // 🔍 Try to find listing in GPS MLS first, then CRMLS
    let listing: any = await Listing.findOne({ slugAddress }).lean();
    let mlsSource = "GPS";

    if (!listing) {
      // Try CRMLS collection
      listing = await CRMLSListing.findOne({ slugAddress }).lean();
      mlsSource = "CRMLS";
    }

    if (!listing) {
      return NextResponse.json({ error: "Listing not found in database" }, { status: 404 });
    }

    // 📸 Fetch primary photo
    // GPS uses numeric listingId, CRMLS uses format like "CV-25236883"
    const photoQuery = mlsSource === "CRMLS" ? { listingId: listing.listingId } : { listingId: listing.listingId };
    const photo = await Photo.findOne(photoQuery)
      .sort({ primary: -1, Order: 1 })
      .lean();

    // 🏡 Fetch open houses
    const openHouses = await OpenHouse.find({ listingId: listing.listingId }).lean();

    const enrichedListing = {
      ...listing,
      mlsSource, // Add MLS source identifier
      primaryPhotoUrl: photo?.uri800 || photo?.uri640 || "/images/no-photo.png",
      openHouses,
    };

    return NextResponse.json({ listing: enrichedListing });
  } catch (error) {
    console.error("❌ Error fetching listing from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
