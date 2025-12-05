// src/app/api/listing/[listingKey]/photos/route.ts
// Updated for unified MLS system - supports all 8 MLS associations
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Photo from "@/models/photos";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  await dbConnect();
  const { listingKey } = await params;

  try {
    // 🔍 Find listing in unified collection (all 8 MLSs)
    // Try multiple fields: listingKey, slug, slugAddress, listingId
    const listing = await UnifiedListing.findOne({
      $or: [
        { listingKey },
        { slug: listingKey },
        { slugAddress: listingKey },
        { listingId: listingKey }
      ]
    }).lean();

    if (!listing) {
      console.log(`⚠️  Listing not found in unified collection: ${listingKey}`);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // 📸 Fetch photos from photos collection (MongoDB)
    // Photos are indexed by listingId (not listingKey)
    const photos = await Photo.find({ listingId: listing.listingId })
      .sort({ primary: -1, Order: 1 }) // Primary photo first, then by order
      .select({
        uri2048: 1,
        uri1600: 1,
        uri1280: 1,
        uri1024: 1,
        uri800: 1,
        uri640: 1,
        uri300: 1,
        uriThumb: 1,
        uriLarge: 1,
        caption: 1,
        primary: 1,
        _id: 1
      })
      .lean();

    if (!photos || photos.length === 0) {
      console.log(`⚠️  No photos found for listing ${listing.listingId} (key: ${listingKey})`);
      return NextResponse.json({ photos: [] }, { status: 200 });
    }

    // Map to consistent format for frontend
    const safePhotos = photos.map((p: any) => {
      const src =
        p.uri2048 ||
        p.uri1600 ||
        p.uri1280 ||
        p.uri1024 ||
        p.uri800 ||
        p.uri640 ||
        p.uri300 ||
        p.uriThumb ||
        p.uriLarge ||
        "";

      return {
        id: p._id?.toString() || "",
        caption: p.caption || "",
        src,
        primary: p.primary ?? false,
      };
    }).filter((p) => p.src); // Only include photos with valid URLs

    return NextResponse.json({ photos: safePhotos });
  } catch (error) {
    console.error("❌ Error fetching listing photos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
