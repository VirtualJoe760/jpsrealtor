import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city");
  const subdivision = searchParams.get("subdivision");
  const exclude = searchParams.get("exclude");
  const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 12);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  await dbConnect();

  try {
    const query: any = {
      standardStatus: "Active",
      slugAddress: { $exists: true, $ne: null },
    };

    // Try subdivision first for more relevant results
    if (subdivision) {
      query.subdivisionName = { $regex: new RegExp(`^${subdivision}$`, "i") };
    } else {
      query.city = { $regex: new RegExp(`^${city}$`, "i") };
    }

    if (exclude) {
      query.listingKey = { $ne: exclude };
    }

    if (minPrice && maxPrice) {
      query.listPrice = {
        $gte: parseInt(minPrice),
        $lte: parseInt(maxPrice),
      };
    }

    const projection = {
      listingKey: 1,
      slugAddress: 1,
      unparsedAddress: 1,
      city: 1,
      stateOrProvince: 1,
      listPrice: 1,
      bedroomsTotal: 1,
      bathroomsTotalInteger: 1,
      livingArea: 1,
      "media.0": 1,
    };

    let listings = await UnifiedListing.find(query, projection)
      .sort({ listPrice: -1 })
      .limit(limit)
      .lean();

    // If subdivision had too few results, fall back to city
    if (listings.length < 3 && subdivision) {
      const cityQuery: any = {
        standardStatus: "Active",
        slugAddress: { $exists: true, $ne: null },
        city: { $regex: new RegExp(`^${city}$`, "i") },
      };
      if (exclude) cityQuery.listingKey = { $ne: exclude };
      if (minPrice && maxPrice) {
        cityQuery.listPrice = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };
      }

      listings = await UnifiedListing.find(cityQuery, projection)
        .sort({ listPrice: -1 })
        .limit(limit)
        .lean();
    }

    // Map to response format with primary photo
    const mapped = listings.map((l: any) => {
      const media = l.media || [];
      const primary = media.find(
        (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
      ) || media[0];

      return {
        listingKey: l.listingKey,
        slugAddress: l.slugAddress,
        unparsedAddress: l.unparsedAddress || "Unknown Address",
        city: l.city || "",
        stateOrProvince: l.stateOrProvince || "CA",
        listPrice: l.listPrice || 0,
        bedroomsTotal: l.bedroomsTotal,
        bathroomsTotalInteger: l.bathroomsTotalInteger,
        livingArea: l.livingArea,
        primaryPhotoUrl: primary?.Uri800 || primary?.Uri640 || null,
      };
    });

    return NextResponse.json({ listings: mapped });
  } catch (error) {
    console.error("Related listings error:", error);
    return NextResponse.json({ listings: [] });
  }
}
