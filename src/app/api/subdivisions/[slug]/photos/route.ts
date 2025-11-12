// src/app/api/subdivisions/[slug]/photos/route.ts
// API route for getting cached photos from all listings in a subdivision

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
import Photo from "@/models/photos";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  await dbConnect();

  try {
    const { slug } = params;
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

    // Get listing IDs from both GPS and CRMLS
    let listingIds: string[] = [];

    if (subdivision.mlsSources.includes("GPS")) {
      const gpsListings = await Listing.find(listingQuery)
        .select({ listingId: 1 })
        .limit(50)
        .lean();
      listingIds = listingIds.concat(gpsListings.map((l) => l.listingId));
    }

    if (subdivision.mlsSources.includes("CRMLS")) {
      const crmlsListings = await CRMLSListing.find(listingQuery)
        .select({ listingId: 1 })
        .limit(50)
        .lean();
      listingIds = listingIds.concat(crmlsListings.map((l) => l.listingId));
    }

    if (listingIds.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    // Fetch photos for these listings from Photo model
    // Prioritize primary photos, but get multiple per listing
    const photos = await Photo.find({
      listingId: { $in: listingIds },
    })
      .sort({ listingId: 1, primary: -1, Order: 1 })
      .limit(limit)
      .lean();

    // Transform photos to include best available URI
    const transformedPhotos = photos.map((photo) => ({
      photoId: photo.photoId,
      listingId: photo.listingId,
      caption: photo.caption || "",
      src:
        photo.uri1600 ||
        photo.uri1280 ||
        photo.uri1024 ||
        photo.uri800 ||
        photo.uri640 ||
        photo.uri300 ||
        photo.uriLarge ||
        "",
      thumb: photo.uriThumb || photo.uri300 || "",
      primary: photo.primary || false,
      order: photo.Order || 0,
    })).filter((p) => p.src); // Only include photos with valid src

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
