// Test API to check photos in unified_listings collection
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET() {
  try {
    await dbConnect();

    // Count total listings with photos
    const totalListingsWithPhotos = await UnifiedListing.countDocuments({
      "media.0": { $exists: true }
    });

    // Get sample listings with photos
    const sampleListings = await UnifiedListing.find({
      "media.0": { $exists: true }
    })
      .select("listingKey media")
      .limit(5)
      .lean();

    const samplePhotos = sampleListings.map((listing: any) => {
      const media = listing.media || [];
      const primaryPhoto = media.find(
        (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
      ) || media[0];

      return {
        listingKey: listing.listingKey,
        photoCount: media.length,
        primaryUrl: primaryPhoto?.Uri1280 || primaryPhoto?.Uri1024 || primaryPhoto?.Uri800 || primaryPhoto?.Uri640
      };
    });

    return NextResponse.json({
      success: true,
      totalListingsWithPhotos,
      samplePhotos,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
