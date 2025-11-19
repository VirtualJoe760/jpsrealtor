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

    // Get one primary photo per listing
    // Group by listingId and get only primary photos
    const photos = await Photo.aggregate([
      {
        $match: {
          listingId: { $in: listingIds },
          primary: true, // Only get primary photos
        },
      },
      {
        $limit: limit,
      },
    ]);

    // Get listing details for each photo
    const listingDetailsMap = new Map();

    if (subdivision.mlsSources.includes("GPS")) {
      const gpsListings = await Listing.find({
        listingId: { $in: photos.map((p) => p.listingId) },
      })
        .select({
          listingId: 1,
          slugAddress: 1,
          unparsedAddress: 1,
          address: 1,
          city: 1,
          stateOrProvince: 1,
          postalCode: 1,
          listPrice: 1,
          bedsTotal: 1,
          bedroomsTotal: 1,
          bathroomsTotalDecimal: 1,
        })
        .lean();

      gpsListings.forEach((listing) => {
        listingDetailsMap.set(listing.listingId, listing);
      });
    }

    if (subdivision.mlsSources.includes("CRMLS")) {
      const crmlsListings = await CRMLSListing.find({
        listingId: { $in: photos.map((p) => p.listingId) },
      })
        .select({
          listingId: 1,
          slugAddress: 1,
          unparsedAddress: 1,
          address: 1,
          city: 1,
          stateOrProvince: 1,
          postalCode: 1,
          listPrice: 1,
          bedsTotal: 1,
          bedroomsTotal: 1,
          bathroomsTotalDecimal: 1,
        })
        .lean();

      crmlsListings.forEach((listing) => {
        listingDetailsMap.set(listing.listingId, listing);
      });
    }

    // Transform photos to include listing details
    const transformedPhotos = photos
      .map((photo) => {
        const listingDetails = listingDetailsMap.get(photo.listingId);
        if (!listingDetails) return null;

        // Build complete address using unparsedAddress or address
        const streetAddress = listingDetails.unparsedAddress || listingDetails.address;
        const addressParts = [
          streetAddress,
          listingDetails.city,
          listingDetails.stateOrProvince,
          listingDetails.postalCode,
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");

        // Use bedroomsTotal or bedsTotal, whichever has a value
        const bedrooms = listingDetails.bedroomsTotal !== undefined && listingDetails.bedroomsTotal !== null
          ? listingDetails.bedroomsTotal
          : listingDetails.bedsTotal || 0;

        return {
          photoId: photo.photoId,
          listingId: photo.listingId,
          slug: listingDetails.slugAddress || "",
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
          // Listing details
          address: fullAddress || "Address not available",
          listPrice: listingDetails.listPrice || 0,
          bedroomsTotal: bedrooms,
          bathroomsTotalDecimal: listingDetails.bathroomsTotalDecimal || 0,
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
