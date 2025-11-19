import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slugAddress: string }> }
) {
  await dbConnect();

  const { slugAddress } = await params;

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

    const documents = listing.Documents || [];

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
