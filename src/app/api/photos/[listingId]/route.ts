// src/app/api/photos/[listingId]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Photo from "@/models/photos";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  await dbConnect();

  const { listingId } = await params;

  try {
    const photos = await Photo.find({ listingId })
      .sort({ primary: -1, Order: 1 }) // Primary first, then ordered
      .lean();

    const result = photos.map((p) => ({
      Id: p.photoId,
      Url: p.uri1024 || p.uri800 || p.uri640 || "/images/no-photo.png",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching all photos:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
