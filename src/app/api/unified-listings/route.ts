// src/app/api/unified-listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

export const dynamic = "force-dynamic";

/**
 * Unified MLS Listings API
 *
 * Universal endpoint for querying listings from all 8 MLS associations
 *
 * Query Parameters:
 * - city: Filter by city name
 * - subdivisionName: Filter by subdivision
 * - mlsSource: Filter by MLS (GPS, CRMLS, etc.)
 * - propertyType: Filter by property type code (A, B, C, D)
 * - propertyTypeName: Filter by property type name (Residential, Land, etc.)
 * - standardStatus: Filter by status (Active, Pending, etc.)
 * - minPrice: Minimum list price
 * - maxPrice: Maximum list price
 * - minBeds: Minimum bedrooms
 * - minBaths: Minimum bathrooms
 * - limit: Results per page (default: 20, max: 100)
 * - skip: Number of results to skip for pagination
 * - sort: Sort field (default: modificationTimestamp)
 * - order: Sort order (asc/desc, default: desc)
 *
 * Geospatial:
 * - lat: Latitude for radius search
 * - lng: Longitude for radius search
 * - radius: Radius in meters (default: 1609 = 1 mile)
 */

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);

    // Build query filter
    const filter: any = {};

    // Location filters
    if (searchParams.has("city")) {
      filter.city = new RegExp(searchParams.get("city")!, "i");
    }

    if (searchParams.has("subdivisionName")) {
      filter.subdivisionName = new RegExp(searchParams.get("subdivisionName")!, "i");
    }

    // MLS filters
    if (searchParams.has("mlsSource")) {
      const mlsSources = searchParams.get("mlsSource")!.split(",");
      filter.mlsSource = { $in: mlsSources };
    }

    // Property type filters
    if (searchParams.has("propertyType")) {
      const types = searchParams.get("propertyType")!.split(",");
      filter.propertyType = { $in: types };
    }

    if (searchParams.has("propertyTypeName")) {
      filter.propertyTypeName = searchParams.get("propertyTypeName");
    }

    // Status filter
    if (searchParams.has("standardStatus")) {
      const statuses = searchParams.get("standardStatus")!.split(",");
      filter.standardStatus = { $in: statuses };
    } else {
      // Default to Active listings
      filter.standardStatus = "Active";
    }

    // Price range
    if (searchParams.has("minPrice") || searchParams.has("maxPrice")) {
      filter.listPrice = {};
      if (searchParams.has("minPrice")) {
        filter.listPrice.$gte = parseInt(searchParams.get("minPrice")!);
      }
      if (searchParams.has("maxPrice")) {
        filter.listPrice.$lte = parseInt(searchParams.get("maxPrice")!);
      }
    }

    // Beds/baths filters
    if (searchParams.has("minBeds")) {
      filter.bedroomsTotal = { $gte: parseInt(searchParams.get("minBeds")!) };
    }

    if (searchParams.has("minBaths")) {
      filter.bathroomsTotalDecimal = { $gte: parseFloat(searchParams.get("minBaths")!) };
    }

    // Geospatial search
    let useGeoQuery = false;
    if (searchParams.has("lat") && searchParams.has("lng")) {
      const lat = parseFloat(searchParams.get("lat")!);
      const lng = parseFloat(searchParams.get("lng")!);
      const radius = searchParams.has("radius")
        ? parseInt(searchParams.get("radius")!)
        : 1609; // Default 1 mile

      filter.coordinates = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // [longitude, latitude]
          },
          $maxDistance: radius,
        },
      };
      useGeoQuery = true;
    }

    // Pagination
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20"),
      100
    );
    const skip = parseInt(searchParams.get("skip") || "0");

    // Sorting
    const sortField = searchParams.get("sort") || "modificationTimestamp";
    const sortOrder = searchParams.get("order") === "asc" ? 1 : -1;

    // Execute query using Mongoose
    const listings = await UnifiedListing
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await UnifiedListing.countDocuments(filter);

    return NextResponse.json(
      {
        success: true,
        data: listings,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        },
        filter: {
          city: searchParams.get("city") || undefined,
          subdivisionName: searchParams.get("subdivisionName") || undefined,
          mlsSource: searchParams.get("mlsSource") || undefined,
          propertyType: searchParams.get("propertyType") || undefined,
          standardStatus: searchParams.get("standardStatus") || "Active",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    console.error("[API /unified-listings] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch listings",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
