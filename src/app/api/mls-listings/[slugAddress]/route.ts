import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Listing from '@/models/listings';
import { fetchFullListingDetails } from '@/app/utils/spark/fetchFullListingDetails';
import { parseListing } from '@/app/utils/spark/parseListing';

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true";

  try {
    let listing = await Listing.findOne({ slugAddress }).lean();

    if (!listing || refresh) {
      console.log(`📦 Fetching fresh data for: ${slugAddress}`);
      const raw = await fetchFullListingDetails(slugAddress);
      if (!raw) {
        return NextResponse.json({ error: 'Listing not found on Spark' }, { status: 404 });
      }

      const parsed = parseListing(raw);
      if (!parsed.listingId) {
        return NextResponse.json({ error: 'Invalid data from Spark' }, { status: 400 });
      }

      listing = await Listing.findOneAndUpdate(
        { listingId: parsed.listingId },
        { $set: parsed },
        { upsert: true, new: true }
      ).lean();
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('❌ Error in listing GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
