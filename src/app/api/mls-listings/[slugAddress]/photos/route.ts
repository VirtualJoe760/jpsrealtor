// src/app/api/mls-listings/[slugAddress]/photos/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import Photo from "@/models/photos";
import { fetchListingPhotos } from "@/app/utils/spark/photos";

interface RawPhoto {
  Id: string;
  Caption?: string;
  UriThumb?: string;
  Uri300?: string;
  Uri640?: string;
  Uri800?: string;
  Uri1024?: string;
  Uri1280?: string;
  Uri1600?: string;
  Uri2048?: string;
  UriLarge?: string;
  Primary?: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;


  try {
    const listing = await Listing.findOne({ slugAddress }).lean();

    if (!listing) {
      console.warn("⚠️ No listing found for slugAddress:", slugAddress);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    console.log("📸 Spark ListingKey (slug):", listing.slug);
    const rawPhotos: RawPhoto[] = await fetchListingPhotos(listing.slug);


    if (Array.isArray(rawPhotos)) {
      const ops = rawPhotos.map((photo: RawPhoto) =>
        Photo.findOneAndUpdate(
          { photoId: photo.Id },
          {
            listingId: listing.slug, // ✅ use listingKey/slug
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
          { upsert: true, new: true }
        )
      );
      await Promise.all(ops);
    }

    const safePhotos = (rawPhotos || [])
      .map((p: RawPhoto) => {
        const src =
          p.Uri2048 ||
          p.Uri1600 ||
          p.Uri1280 ||
          p.Uri1024 ||
          p.Uri800 ||
          p.Uri640 ||
          p.Uri300 ||
          p.UriThumb ||
          p.UriLarge ||
          "";

        if (!src) {
          console.warn("⛔ Skipping photo with missing src:", {
            photoId: p.Id,
            caption: p.Caption,
          });
        }

        return {
          id: p.Id,
          caption: p.Caption || "",
          src,
          primary: p.Primary ?? false,
        };
      })
      .filter((p) => p.src);

    console.log("✅ Returning safe photos:", safePhotos.length);
    return NextResponse.json({ photos: safePhotos });
  } catch (error) {
    console.error("❌ Error fetching listing photos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
