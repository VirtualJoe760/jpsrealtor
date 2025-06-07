export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing, IListing } from "@/models/listings";
import Photo from "@/models/photos";
import OpenHouse from "@/models/openHouses";
import { fetchListingPhotos } from "@/app/utils/spark/photos";

const BATCH_SIZE = 500;

export async function GET(req: NextRequest) {
  console.log("🔌 Connecting to MongoDB...");
  await dbConnect();

  const url = req.nextUrl;
  const batch = parseInt(url.searchParams.get("batch") || "0", 10);
  const selectedKey = url.searchParams.get("selected");

  try {
    // ✅ Handle single listing photo fetch from Spark if selected is present
    if (selectedKey) {
      console.log(`📸 Fetching photos for selected listing: ${selectedKey}`);
      const photos = await fetchListingPhotos(selectedKey);
      return NextResponse.json({ photos });
    }

    // ✅ Otherwise, load batch of active listings from DB
    const expectedCount = await Listing.countDocuments({
      standardStatus: "Active",
      propertyType: "A",
      latitude: { $type: "number" },
      longitude: { $type: "number" },
    });
    console.log(`✅ DB says we should have ${expectedCount} listings`);

    const listings: IListing[] = await Listing.find(
      {
        standardStatus: "Active",
        propertyType: "A",
        latitude: { $type: "number" },
        longitude: { $type: "number" },
        listPrice: { $ne: null },
      },
      {
        listingId: 1,
        slug: 1,
        slugAddress: 1,
        status: 1,
        listPrice: 1,
        currentPrice: 1,
        originalListPrice: 1,
        bedsTotal: 1,
        bedroomsTotal: 1,
        bathroomsFull: 1,
        bathroomsHalf: 1,
        bathroomsTotalDecimal: 1,
        bathroomsTotalInteger: 1,
        livingArea: 1,
        buildingAreaTotal: 1,
        yearBuilt: 1,
        lotSizeSqft: 1,
        lotSizeArea: 1,
        lotSizeAcres: 1,
        fireplacesTotal: 1,
        flooring: 1,
        laundryFeatures: 1,
        interiorFeatures: 1,
        exteriorFeatures: 1,
        listingContractDate: 1,
        address: 1,
        unparsedAddress: 1,
        unparsedFirstLineAddress: 1,
        streetName: 1,
        streetNumber: 1,
        subdivisionName: 1,
        apn: 1,
        parcelNumber: 1,
        latitude: 1,
        longitude: 1,
        city: 1,
        stateOrProvince: 1,
        postalCode: 1,
        countyOrParish: 1,
        country: 1,
        poolYn: 1,
        spaYn: 1,
        viewYn: 1,
        view: 1,
        furnished: 1,
        roof: 1,
        cooling: 1,
        coolingYn: 1,
        heating: 1,
        heatingYn: 1,
        garageSpaces: 1,
        carportSpaces: 1,
        parkingTotal: 1,
        parkingFeatures: 1,
        stories: 1,
        levels: 1,
        seniorCommunityYn: 1,
        gatedCommunity: 1,
        listingAgentName: 1,
        listingAgentPhone: 1,
        listingOfficeName: 1,
        listingOfficePhone: 1,
      }
    )
      .skip(batch * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    console.log(`📍 Loaded ${listings.length} raw listings from MongoDB (batch ${batch})`);

    const listingsWithExtras = await Promise.all(
      listings.map(async (listing) => {
        const photo = await Photo.findOne({ listingId: listing.listingId })
          .sort({ primary: -1, Order: 1 })
          .lean();

        const openHouses = await OpenHouse.find({ listingId: listing.listingId }).lean();

        return {
          ...listing,
          primaryPhotoUrl: photo?.uri800 || "/images/no-photo.png",
          openHouses,
        };
      })
    );

    if (process.env.NODE_ENV !== "production") {
      const fs = await import("fs/promises");
      const path = await import("path");
      const logsDir = path.resolve(process.cwd(), "local-logs");
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(
        path.join(logsDir, "maplisting.json"),
        JSON.stringify(listingsWithExtras, null, 2)
      );
      console.log("📝 Wrote maplisting.json with listings + photo + openHouses");
    }

    return NextResponse.json({ listings: listingsWithExtras });
  } catch (error) {
    console.error("❌ Failed to fetch listings:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
