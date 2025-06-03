// src\app\api\mls-listings\[slugAddress]\photos\route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Listing from "@/models/listings";
import Photo from "@/models/photos";
import { fetchListingPhotos } from "@/utils/spark/photos";

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;

  try {
    const listing = await Listing.findOne({ slugAddress }).lean();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // ✅ Check if photos are already cached
    const existingPhotos = await Photo.find({ listingId: listing.listingId }).lean();
    if (existingPhotos.length > 0) {
      return NextResponse.json({ photos: existingPhotos });
    }

    // ✅ If no photos, fetch from Spark
    const freshPhotos = await fetchListingPhotos(listing.slug);

    for (const photo of freshPhotos) {
      await Photo.findOneAndUpdate(
        { photoId: photo.Id },
        {
          listingId: listing.listingId,
          photoId: photo.Id,
          caption: photo.Caption,
          uriThumb: photo.UriThumb,
          uri300: photo.Uri300,
          uri640: photo.Uri640,
          uri800: photo.Uri800,
          uri1024: photo.Uri1024,
          uri1280: photo.Uri1280,
          uri1600: photo.Uri1600,
          uri2048: photo.Uri2048,
          uriLarge: photo.UriLarge,
          primary: photo.Primary,
        },
        { upsert: true }
      );
    }

    const cachedPhotos = await Photo.find({ listingId: listing.listingId }).lean();
    return NextResponse.json({ photos: cachedPhotos });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
