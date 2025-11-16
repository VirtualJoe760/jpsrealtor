// src/app/api/mls-listings/[listingKey]/photos/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
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
  { params }: { params: { listingKey: string } }
) {
  await dbConnect();
  const { listingKey } = params;

  try {
    // 🔍 Try to find listing in GPS MLS first, then CRMLS
    // GPS: uses "listingKey" field
    // CRMLS: uses "listingKey" if populated, otherwise try "slug" or "listingId"
    let listing: any = await Listing.findOne({ listingKey }).lean();
    let mlsSource = "GPS";

    if (!listing) {
      // Try CRMLS collection - try listingKey, slug, or listingId
      listing = await CRMLSListing.findOne({
        $or: [
          { listingKey },
          { slug: listingKey },
          { listingId: listingKey }
        ]
      }).lean();
      mlsSource = "CRMLS";
    }

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    
    let safePhotos: any[] = [];

    if (mlsSource === "CRMLS") {
      // 📸 CRMLS: Fetch photos from Spark API using the listing's slug or listingId
      const rawPhotos: RawPhoto[] = await fetchListingPhotos(listing.slug || listing.listingId);

      if (!Array.isArray(rawPhotos)) {
        return NextResponse.json({ photos: [] }, { status: 200 });
      }

      safePhotos = rawPhotos
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
                      }

          return {
            id: p.Id,
            caption: p.Caption || "",
            src,
            primary: p.Primary ?? false,
          };
        })
        .filter((p) => p.src);

    } else {
      // 📸 GPS: Fetch photos from Spark API
      const rawPhotos: RawPhoto[] = await fetchListingPhotos(listing.slug);

      if (!Array.isArray(rawPhotos)) {
        return NextResponse.json({ photos: [] }, { status: 200 });
      }

      safePhotos = rawPhotos
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
                      }

          return {
            id: p.Id,
            caption: p.Caption || "",
            src,
            primary: p.Primary ?? false,
          };
        })
        .filter((p) => p.src);

    }

    return NextResponse.json({ photos: safePhotos });
  } catch (error) {
    console.error("❌ Error fetching listing photos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
