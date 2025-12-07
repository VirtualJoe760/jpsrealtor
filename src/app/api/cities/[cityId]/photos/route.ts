import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const cityId = resolvedParams.cityId;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    // Convert cityId to city name for matching
    // e.g., "palm-springs" -> "Palm Springs"
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Fetch listings from unified collection
    const listings = await UnifiedListing.find({
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      standardStatus: { $in: ["Active", "Active Under Contract", "Pending"] },
      "media.0": { $exists: true }, // Only listings with at least one photo
    })
      .select(
        "listingKey unparsedAddress slugAddress listPrice bedroomsTotal bathroomsTotalDecimal media"
      )
      .limit(limit)
      .lean()
      .exec();

    // Extract primary photo from each listing's media array
    const photosWithInfo = listings
      .map((listing: any) => {
        const media = listing.media || [];
        // Find primary photo or use first photo
        const primaryPhoto = media.find(
          (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
        ) || media[0];

        if (!primaryPhoto) return null;

        return {
          photoId: primaryPhoto.MediaKey,
          listingId: listing.listingKey,
          slug: listing.slugAddress || listing.listingKey,
          caption: listing.unparsedAddress || "",
          src: primaryPhoto.Uri1280 || primaryPhoto.Uri1024 || primaryPhoto.Uri800 || primaryPhoto.Uri640,
          thumb: primaryPhoto.UriThumb || primaryPhoto.Uri300 || primaryPhoto.Uri640,
          address: listing.unparsedAddress || "",
          listPrice: listing.listPrice,
          bedroomsTotal: listing.bedroomsTotal || 0,
          bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
        };
      })
      .filter((photo) => photo !== null);

    return NextResponse.json({ photos: photosWithInfo });
  } catch (error) {
    console.error("Error fetching city photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch city photos" },
      { status: 500 }
    );
  }
}
