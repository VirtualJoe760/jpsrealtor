// src/app/api/subdivisions/[slug]/photos/route.ts
// API route for getting photos from all listings in a subdivision via Spark API

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
      city: { $regex: new RegExp(`^${subdivision.city}$`, 'i') },
    };

    // If it's not a "Non-HOA" subdivision, also filter by subdivision name
    if (!subdivision.name.startsWith("Non-HOA ")) {
      listingQuery.subdivisionName = subdivision.name;
    }

    // Get listings from unified collection
    const listings = await UnifiedListing.find(listingQuery)
      .select("listingKey unparsedAddress slugAddress listPrice bedsTotal bathroomsTotalDecimal primaryPhotoUrl city stateOrProvince postalCode")
      .limit(limit)
      .lean();

    if (listings.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    // Fetch photos for each listing using the same photo API that MLS listings use
    const photoPromises = listings.map(async (listing: any) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const photosRes = await fetch(
          `${baseUrl}/api/listings/${listing.listingKey}/photos`,
          {
            cache: "no-store",
            headers: { "Accept": "application/json" }
          }
        );

        if (!photosRes.ok) {
          // Fallback to primaryPhotoUrl if API fails
          return {
            photoId: listing.listingKey,
            listingId: listing.listingKey,
            slug: listing.slugAddress || listing.listingKey,
            caption: "",
            src: listing.primaryPhotoUrl || "",
            thumb: listing.primaryPhotoUrl || "",
            address: listing.unparsedAddress || "Address not available",
            listPrice: listing.listPrice || 0,
            bedsTotal: listing.bedsTotal || 0,
            bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
          };
        }

        const photosData = await photosRes.json();
        const photos = photosData.photos || [];

        // Use first photo from the array
        const firstPhoto = photos[0];
        if (!firstPhoto) {
          // No photos from API, use primaryPhotoUrl
          return {
            photoId: listing.listingKey,
            listingId: listing.listingKey,
            slug: listing.slugAddress || listing.listingKey,
            caption: "",
            src: listing.primaryPhotoUrl || "",
            thumb: listing.primaryPhotoUrl || "",
            address: listing.unparsedAddress || "Address not available",
            listPrice: listing.listPrice || 0,
            bedsTotal: listing.bedsTotal || 0,
            bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
          };
        }

        // Build complete address
        const addressParts = [
          listing.unparsedAddress,
          listing.city,
          listing.stateOrProvince,
          listing.postalCode,
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");

        return {
          photoId: firstPhoto.mediaKey || listing.listingKey,
          listingId: listing.listingKey,
          slug: listing.slugAddress || listing.listingKey,
          caption: firstPhoto.caption || firstPhoto.shortDescription || "",
          src: firstPhoto.uri1600 || firstPhoto.uri1280 || firstPhoto.uri1024 || firstPhoto.uri800 || firstPhoto.uriLarge || "",
          thumb: firstPhoto.uriThumb || firstPhoto.uri300 || "",
          address: fullAddress || "Address not available",
          listPrice: listing.listPrice || 0,
          bedsTotal: listing.bedsTotal || 0,
          bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
        };
      } catch (err) {
        console.error(`Failed to fetch photos for ${listing.listingKey}:`, err);
        // Fallback to primaryPhotoUrl on error
        return {
          photoId: listing.listingKey,
          listingId: listing.listingKey,
          slug: listing.slugAddress || listing.listingKey,
          caption: "",
          src: listing.primaryPhotoUrl || "",
          thumb: listing.primaryPhotoUrl || "",
          address: listing.unparsedAddress || "Address not available",
          listPrice: listing.listPrice || 0,
          bedsTotal: listing.bedsTotal || 0,
          bathroomsTotalDecimal: listing.bathroomsTotalDecimal || 0,
        };
      }
    });

    const allPhotos = await Promise.all(photoPromises);

    // Filter out photos without valid src
    const validPhotos = allPhotos.filter((p) => p && p.src);

    return NextResponse.json({
      photos: validPhotos,
      total: validPhotos.length,
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
