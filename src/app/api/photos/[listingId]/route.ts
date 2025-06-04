import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Photo from "@/models/photos"; // Your provided model

export async function GET(
  req: Request,
  { params }: { params: { listingId: string } }
) {
  await dbConnect();
  const { listingId } = params;

  try {
    const photo = await Photo.findOne({
      listingId,
      primary: true,
    }).lean();

    if (!photo || !photo.uri300) {
      return NextResponse.json({ uri300: "/images/no-photo.png" }, { status: 404 });
    }

    return NextResponse.json({ uri300: photo.uri300 });
  } catch (error) {
    console.error(`❌ Failed to load cached photo for ${listingId}:`, error);
    return NextResponse.json({ uri300: "/images/no-photo.png" }, { status: 500 });
  }
}
