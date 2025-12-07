import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
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
      .select("OpenHouses")
      .lean();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // OpenHouses expansion is a top-level property
    const openHouses = listing.OpenHouses || [];

    return NextResponse.json({ openHouses });
  } catch (error) {
    console.error("Error fetching open houses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
