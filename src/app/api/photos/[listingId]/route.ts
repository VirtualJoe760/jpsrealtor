// src/app/api/photos/[listingId]/route.ts

import { NextResponse } from "next/server";
import { fetchListingPhotos } from "@/app/utils/spark/photos";

export async function GET(
  req: Request,
  { params }: { params: { listingId: string } }
) {
  const { listingId } = params;

  try {
    const photos = await fetchListingPhotos(listingId);

    if (!photos.length) {
      return NextResponse.json({ uri300: "/images/no-photo.png" });
    }

    return NextResponse.json({ uri300: photos[0].Uri300 });
  } catch (error) {
    console.error(`❌ Failed to load photos for ${listingId}`, error);
    return NextResponse.json({ uri300: "/images/no-photo.png" }, { status: 500 });
  }
}
