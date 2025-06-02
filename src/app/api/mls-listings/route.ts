export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Listing from "@/models/listings";
import Photo from "@/models/photos"; // ✅ Photo model

export async function GET(req: NextRequest) {
  console.log("🔌 Connecting to MongoDB...");

  try {
    await dbConnect();

    // ✅ Expected total count for verification
    const expectedCount = await Listing.countDocuments({
      status: "Active",
      propertyType: "A",
      latitude: { $type: "number" },
      longitude: { $type: "number" },
    });
    console.log(`✅ DB says we should have ${expectedCount} listings`);

    // ✅ Fetch active listings with relevant fields
    const listings = await Listing.find({
      status: "Active",
      propertyType: "A",
      latitude: { $type: "number" },
      longitude: { $type: "number" },
      listPrice: { $ne: null },
    })
      .select([
        "_id",
        "latitude",
        "longitude",
        "listPrice",
        "address",
        "bedroomsTotal",
        "bathroomsFull",
        "livingArea",
        "lotSizeSqft",
        "pool",
        "spa",
        "listingId",
        "slugAddress",
        "slug",
        "publicRemarks",
        "propertyType",
        "status",
        "modificationTimestamp",
      ].join(" "))
      .lean();

    console.log(`📍 Loaded ${listings.length} listings from MongoDB`);

    // ✅ Enrich listings with up to 3 photos each
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const photos = await Photo.find({ listingId: listing.listingId })
          .sort({ primary: -1, Order: 1 }) // prioritize primary, then order
          .limit(3)
          .lean();

        return {
          ...listing,
          primaryPhotoUrl: photos?.[0]?.uri800 || "/images/no-photo.png",
          photos, // contains 1–3 photos for collage
        };
      })
    );

    // ✅ Optional: compare returned slugs
    const allSlugs = await Listing.find({
      status: "Active",
      propertyType: "A",
      latitude: { $type: "number" },
      longitude: { $type: "number" },
    }).select("slug").lean();

    const returnedSlugs = new Set(enrichedListings.map((l) => l.slug));
    const missing = allSlugs.filter((l) => !returnedSlugs.has(l.slug));
    if (missing.length > 0) {
      console.warn(`🚫 ${missing.length} listings missing from API response`);
      console.warn("🕳️ Missing slugs:", missing.slice(0, 5).map((m) => m.slug));
    }

    // ✅ Optional debug check
    const targetSlug = "20250206061055758248000000";
    const target = enrichedListings.find((l) => l.slug === targetSlug);
    if (target) {
      console.log("🎯 Target listing is in the response:", {
        slug: target.slug,
        address: target.address,
        lat: target.latitude,
        lng: target.longitude,
      });
    } else {
      console.warn("⚠️ Target listing NOT found in API response");
    }

    return NextResponse.json({ listings: enrichedListings });
  } catch (error) {
    console.error("❌ Failed to fetch listings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
