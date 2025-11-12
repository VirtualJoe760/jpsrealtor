import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";

export async function GET(
  req: Request,
  { params }: { params: { slugAddress: string } }
) {
  await dbConnect();

  const { slugAddress } = params;

  try {
    // 🔍 Try to find listing in GPS MLS first, then CRMLS
    let listing: any = await Listing.findOne({ slugAddress }).lean();

    if (!listing) {
      // Try CRMLS collection
      listing = await CRMLSListing.findOne({ slugAddress }).lean();
    }

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Videos expansion is a top-level property
    const videos = listing.Videos || [];

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
