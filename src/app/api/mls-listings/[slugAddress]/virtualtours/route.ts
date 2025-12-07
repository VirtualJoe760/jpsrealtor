import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slugAddress: string }> }
) {
  await dbConnect();
  const { slugAddress } = await params;

  try {
    // Find listing in unified collection
    const listing = await UnifiedListing.findOne({ slugAddress })
      .select("Videos")
      .lean();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // ✅ Filter videos by Type === "VirtualTour"
    const virtualTours = (listing.Videos || []).filter(
      (video: any) => video.Type === "VirtualTour"
    );

    return NextResponse.json({ virtualTours });
  } catch (error) {
    console.error('Error fetching virtual tours:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
