// src/app/api/mls-listings/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing, IListing } from "@/models/listings";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";

export async function GET(req: NextRequest) {
  await dbConnect();

  const url = req.nextUrl;
  const query = url.searchParams;

  console.log("🧪 Raw query params:", Object.fromEntries(query.entries()));

  const latMin = parseFloat(query.get("south") || "-90");
  const latMax = parseFloat(query.get("north") || "90");
  const lngMin = parseFloat(query.get("west") || "-180");
  const lngMax = parseFloat(query.get("east") || "180");

  const filters: Record<string, any> = {
    standardStatus: "Active",
    propertyType: "A",
    latitude: { $gte: latMin, $lte: latMax },
    longitude: { $gte: lngMin, $lte: lngMax },
    listPrice: { $ne: null },
  };

  const queryPropertyType = query.get("propertyType");
  if (queryPropertyType && queryPropertyType !== "A") {
    filters.propertyType = queryPropertyType;
  }

  const propertySubType = query.get("propertySubType");
  if (propertySubType) {
    filters.propertySubType = propertySubType;
  }

  const minPrice = Number(query.get("minPrice") || "0");
  const maxPrice = Number(query.get("maxPrice") || "99999999");
  filters.listPrice = { $gte: minPrice, $lte: maxPrice };

  const beds = Number(query.get("beds") || "0");
  if (beds > 0) {
    filters.$or = [
      { bedroomsTotal: { $gte: beds } },
      { bedsTotal: { $gte: beds } },
    ];
  }

  const baths = Number(query.get("baths") || "0");
  if (baths > 0) {
    filters.bathroomsFull = { $gte: baths };
  }

  const hasPool = query.get("pool");
  if (hasPool === "true") {
    filters.poolYn = true;
  } else if (hasPool === "false") {
    filters.poolYn = { $ne: true };
  }

  const hasSpa = query.get("spa");
  if (hasSpa === "true") {
    filters.spaYn = true;
  } else if (hasSpa === "false") {
    filters.spaYn = { $ne: true };
  }

  const hasHOA = query.get("hasHOA");
  if (hasHOA === "true") {
    filters.associationFee = { ...filters.associationFee, $gt: 0 };
  } else if (hasHOA === "false") {
    filters.associationFee = { ...filters.associationFee, $in: [0, null] };
  }

  const hoaMax = Number(query.get("hoa") || "");
  if (!isNaN(hoaMax) && hoaMax > 0) {
    filters.associationFee = {
      ...(filters.associationFee || {}),
      $lte: hoaMax,
    };
  }

  const skip = parseInt(query.get("skip") || "0", 10);
  const limit = Math.min(parseInt(query.get("limit") || "1000", 10), 1000);

  const sortBy = query.get("sortBy") || "listPrice";
  const sortOrder = query.get("sortOrder") === "desc" ? -1 : 1;
  const validSortFields = ["listPrice", "livingArea", "lotSizeSqft"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "listPrice";

  try {
    const listings: IListing[] = await Listing.find(filters, {
      listingId: 1,
      slug: 1,
      slugAddress: 1,
      listPrice: 1,
      bedroomsTotal: 1,
      bedsTotal: 1,
      bathroomsFull: 1,
      bathroomsTotalInteger: 1,
      livingArea: 1,
      lotSizeSqft: 1,
      latitude: 1,
      longitude: 1,
      address: 1,
      unparsedAddress: 1,
      unparsedFirstLineAddress: 1,
      poolYn: 1,
      spaYn: 1,
      publicRemarks: 1,
      propertyType: 1,
      propertySubType: 1,
      associationFee: 1,
    })
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const listingsWithExtras = await Promise.all(
      listings.map(async (listing) => {
        const photo = await Photo.findOne({ listingId: String(listing.listingId) })
          .sort({ primary: -1, Order: 1 })
          .lean();

        const openHouses = await OpenHouse.find({ listingId: listing.listingId }).lean();

        return {
          ...listing,
          pool: listing.poolYn === true,
          spa: listing.spaYn === true,
          hasHOA: listing.associationFee! > 0,
          primaryPhotoUrl: photo?.uri800 || "/images/no-photo.png",
          openHouses,
        };
      })
    );

    console.log(`✅ Fetched ${listingsWithExtras.length} listings`);
    console.log("📍 Filters:\n", JSON.stringify(filters, null, 2));

    return NextResponse.json({ listings: listingsWithExtras });
  } catch (error) {
    console.error("❌ Failed to fetch filtered listings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
