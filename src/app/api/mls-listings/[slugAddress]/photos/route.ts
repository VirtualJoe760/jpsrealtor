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
    // ✅ Find listing by slugAddress
    const listing = await Listing.findOne({ slugAddress }).lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // ✅ Optional: clean up old photos in case of mismatch
    await Photo.deleteMany({ listingId: listing.listingId });

    // ✅ Fetch fresh photos from Spark API using your shared utility
    const photos = await fetchListingPhotos(listing.slug);

    // ✅ Save photos to DB
    for (const photo of photos) {
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

    // ✅ Return updated photos from DB
    const cachedPhotos = await Photo.find({ listingId: listing.listingId }).lean();

    return NextResponse.json({ photos: cachedPhotos });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
