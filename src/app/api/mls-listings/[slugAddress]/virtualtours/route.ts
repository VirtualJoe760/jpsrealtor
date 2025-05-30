import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { Listing } from "@/models/listings";

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();
  const { slugAddress } = params;

  try {
    const listing = await Listing.findOne({ slugAddress }).lean();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // ✅ Filter videos by Type === "VirtualTour"
    const virtualTours = (listing.Videos || []).filter(
      (video) => video.Type === "VirtualTour"
    );

    return NextResponse.json({ virtualTours });
  } catch (error) {
    console.error('Error fetching virtual tours:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
