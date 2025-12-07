// src/app/api/subdivisions/[slug]/photos/route.ts
// API route for getting cached photos from all listings in a subdivision

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import UnifiedListing from "@/models/unified-listing";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await dbConnect();

  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Find subdivision
    const subdivision = await Subdivision.findOne({ slug }).lean();

    if (!subdivision) {
      return NextResponse.json(
        { error: "Subdivision not found" },
        { status: 404 }
      );
    }

    // Build query for listings in subdivision
    const listingQuery: any = {
      standardStatus: "Active",
    };

    // Handle Non-HOA subdivisions differently
    if (subdivision.name.startsWith("Non-HOA ")) {
      const cityName = subdivision.name.replace("Non-HOA ", "");
      listingQuery.city = cityName;
      listingQuery.$or = [
        { subdivisionName: { $exists: false } },
        { subdivisionName: null },
        { subdivisionName: "" },
        { subdivisionName: { $regex: /^(not applicable|n\/?a|none)$/i } },
      ];
    } else {
      listingQuery.subdivisionName = subdivision.name;
      listingQuery.city = subdivision.city;
    }

    // Get listings from unified collection with media
    const listings = await UnifiedListing.find({
      ...listingQuery,
      "media.0": { $exists: true }, // Only listings with photos
    })
      .select("listingKey unparsedAddress slugAddress listPrice bedroomsTotal bathroomsTotalDecimal media city stateOrProvince postalCode")
      .limit(limit)
      .lean();

    if (listings.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    // Transform listings to photo format
    const transformedPhotos = listings
      .map((listing: any) => {
        const media = listing.media || [];
        // Find primary photo or use first photo
        const primaryPhoto = media.find(
          (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
        ) || media[0];

        if (!primaryPhoto) return null;

        // Build complete address
        const addressParts = [
          listing.unparsedAddress,
          listing.city,
          listing.stateOrProvince,
          listing.postalCode,
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");

        return {
          photoId: primaryPhoto.MediaKey,
          listingId: listing.listingKey,
          slug: listing.slugAddress || listing.listingKey,
          caption: primaryPhoto.ShortDescription || "",
          src: primaryPhoto.Uri1600 || primaryPhoto.Uri1280 || primaryPhoto.Uri1024 || primaryPhoto.Uri800 || primaryPhoto.Uri640,
          thumb: primaryPhoto.UriThumb || primaryPhoto.Uri300,
          address: fullAddress || "Address not available",
          listPrice: listing.listPrice || 0,
          bedroomsTotal: listing.bedroomsTotal || 0,
          bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
        };
      })
      .filter((p) => p && p.src); // Only include photos with valid src

    return NextResponse.json({
      photos: transformedPhotos,
      total: transformedPhotos.length,
      subdivision: {
        name: subdivision.name,
        city: subdivision.city,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching subdivision photos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
