// src/app/api/mls-listings/[listingKey]/photos/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
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
  { params }: { params: { listingKey: string } }
) {
  await dbConnect();
  const { listingKey } = params;

  try {
    const listing = await Listing.findOne({ listingKey }).lean();

    if (!listing) {
      console.warn("⚠️ No listing found for listingKey:", listingKey);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    console.log("📸 Fetching Spark photos for:", listing.slug);
    const rawPhotos: RawPhoto[] = await fetchListingPhotos(listing.slug);

    if (!Array.isArray(rawPhotos)) {
      console.warn("⚠️ No photos returned from Spark API for:", listing.slug);
      return NextResponse.json({ photos: [] }, { status: 200 });
    }

    const safePhotos = rawPhotos
      .map((p: RawPhoto) => {
        const src =
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

    console.log(`✅ Returning ${safePhotos.length} photos for:`, listing.slug);
    return NextResponse.json({ photos: safePhotos });
  } catch (error) {
    console.error("❌ Error fetching listing photos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
