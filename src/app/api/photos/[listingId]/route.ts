// src/app/api/photos/[listingId]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  await dbConnect();

  const { listingId } = await params;

  try {
    // Find listing by listingKey in unified collection
    const listing = await UnifiedListing.findOne({ listingKey: listingId })
      .select("media")
      .lean();

    if (!listing) {
      return NextResponse.json([]);
    }

    const media = listing.media || [];

    // Sort: Primary photo first, then by Order
    const sortedMedia = media
      .filter((m: any) => m.MediaKey)
      .sort((a: any, b: any) => {
        // Primary photos first
        if (a.MediaCategory === "Primary Photo") return -1;
        if (b.MediaCategory === "Primary Photo") return 1;
        // Then sort by Order
        return (a.Order ?? 999) - (b.Order ?? 999);
      });

    const result = sortedMedia.map((m: any) => ({
      Id: m.MediaKey,
      Url: m.Uri1024 || m.Uri800 || m.Uri640 || "/images/no-photo.png",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching all photos:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
