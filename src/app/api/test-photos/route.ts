// Test API to check Photo collection
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Photo from "@/models/photos";

export async function GET() {
  try {
    await connectDB();

    // Count total photos
    const totalPhotos = await Photo.countDocuments();

    // Get sample primary photos
    const samplePhotos = await Photo.find({ primary: true }).limit(5).lean();

    // Test with a specific listing
    const testListingId = "20250729070314620355000000";
    const photosForListing = await Photo.find({
      listingId: testListingId,
      primary: true
    }).lean();

    return NextResponse.json({
      success: true,
      totalPhotos,
      samplePhotos: samplePhotos.map(p => ({
        listingId: p.listingId,
        primary: p.primary,
        url: p.uri1280 || p.uri1024 || p.uri800 || p.uri640 || p.uriThumb
      })),
      testListing: {
        listingId: testListingId,
        photosFound: photosForListing.length,
        photoUrl: photosForListing[0] ?
          (photosForListing[0].uri1280 || photosForListing[0].uri1024 || photosForListing[0].uri800) :
          null
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
