// src/app/api/mls-listings/[slugAddress]/route.ts
// Lookup a single listing by slugAddress OR listingKey from unified_listings
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slugAddress: string }> }
) {
  await dbConnect();

  const { slugAddress } = await params;

  try {
    // 🔍 Find listing in unified_listings (all 8 MLSs)
    // Prefer Active listing when multiple exist for the same address (relisting scenario).
    // Fall back to any status if no Active listing exists.
    let listing: any = await UnifiedListing.findOne({
      slugAddress,
      standardStatus: "Active",
    }).lean();

    if (!listing) {
      listing = await UnifiedListing.findOne({ slugAddress }).lean();
    }

    // If not found by slugAddress, try by listingKey
    if (!listing) {
      console.log(`[mls-listings] slugAddress not found (${slugAddress}), trying as listingKey...`);
      listing = await UnifiedListing.findOne({ listingKey: slugAddress }).lean();
    }

    if (!listing) {
      return NextResponse.json({ error: "Listing not found in database" }, { status: 404 });
    }

    // 📸 Get primary photo from media array
    const media = listing.media || [];
    const primaryPhoto = media.find(
      (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
    ) || media[0];

    const enrichedListing = {
      ...listing,
      mlsSource: listing.mlsSource || "UNKNOWN",
      primaryPhotoUrl: primaryPhoto?.Uri800 || primaryPhoto?.Uri640 || "/images/no-photo.png",
      openHouses: listing.OpenHouses || [],
    };

    return NextResponse.json({ listing: enrichedListing });
  } catch (error) {
    console.error("❌ Error fetching listing from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
