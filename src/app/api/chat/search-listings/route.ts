// src/app/api/chat/search-listings/route.ts
// AI-powered MLS search endpoint

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CRMLSListing } from "@/models/crmls-listings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      minBeds,
      maxBeds,
      minBaths,
      maxBaths,
      minPrice,
      maxPrice,
      minSqft,
      maxSqft,
      cities,
      propertyTypes,
      hasPool,
      hasView,
      limit = 10,
    } = body;

    await connectDB();

    // Build query
    const query: any = {
      standardStatus: "Active", // Only active listings
    };

    // Beds
    if (minBeds && maxBeds) {
      query.bedsTotal = { $gte: minBeds, $lte: maxBeds };
    } else if (minBeds) {
      query.bedsTotal = { $gte: minBeds };
    } else if (maxBeds) {
      query.bedsTotal = { $lte: maxBeds };
    }

    // Baths
    if (minBaths && maxBaths) {
      query.bathroomsTotalInteger = { $gte: minBaths, $lte: maxBaths };
    } else if (minBaths) {
      query.bathroomsTotalInteger = { $gte: minBaths };
    } else if (maxBaths) {
      query.bathroomsTotalInteger = { $lte: maxBaths };
    }

    // Price
    if (minPrice && maxPrice) {
      query.listPrice = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice) {
      query.listPrice = { $gte: minPrice };
    } else if (maxPrice) {
      query.listPrice = { $lte: maxPrice };
    }

    // Square footage
    if (minSqft && maxSqft) {
      query.livingArea = { $gte: minSqft, $lte: maxSqft };
    } else if (minSqft) {
      query.livingArea = { $gte: minSqft };
    } else if (maxSqft) {
      query.livingArea = { $lte: maxSqft };
    }

    // Cities
    if (cities && cities.length > 0) {
      query.city = { $in: cities.map((c: string) => new RegExp(c, "i")) };
    }

    // Property types
    if (propertyTypes && propertyTypes.length > 0) {
      query.propertySubType = { $in: propertyTypes };
    }

    // Features (simplified)
    const conditions = [];
    if (hasPool) {
      conditions.push({
        $or: [
          { poolFeatures: { $exists: true, $nin: [null, ""] } },
          { poolPrivateYN: true },
        ],
      });
    }

    if (hasView) {
      conditions.push({ view: { $exists: true, $nin: [null, ""] } });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    // Execute search
    const listings = await CRMLSListing.find(query)
      .sort({ listPrice: 1 }) // Sort by price ascending
      .limit(limit)
      .select(
        "listingKey listPrice bedsTotal bathroomsTotalInteger livingArea city unparsedAddress primaryPhotoUrl subdivisionName propertySubType slugAddress"
      )
      .lean();

    // Format results
    const results = listings.map((listing: any) => ({
      id: listing.listingKey,
      price: listing.listPrice,
      beds: listing.bedsTotal,
      baths: listing.bathroomsTotalInteger,
      sqft: listing.livingArea,
      city: listing.city,
      address: listing.unparsedAddress,
      image: listing.primaryPhotoUrl,
      subdivision: listing.subdivisionName,
      type: listing.propertySubType,
      url: `/mls-listings/${listing.slugAddress || listing.listingKey}`,
    }));

    return NextResponse.json({
      success: true,
      count: results.length,
      listings: results,
      query: body, // Echo back the query for debugging
    });
  } catch (error) {
    console.error("Error searching listings:", error);
    return NextResponse.json(
      { error: "Failed to search listings" },
      { status: 500 }
    );
  }
}
