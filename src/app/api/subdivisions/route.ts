// src/app/api/subdivisions/route.ts
// API route for listing/searching subdivisions

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    // Query parameters
    const region = searchParams.get("region");
    const county = searchParams.get("county");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const sortBy = searchParams.get("sortBy") || "listingCount"; // listingCount, avgPrice, name
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build query
    const query: any = {};

    if (region) {
      query.region = region;
    }

    if (county) {
      query.county = county;
    }

    if (city) {
      query.city = city;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { keywords: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Execute query
    const skip = (page - 1) * limit;
    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [subdivisions, total] = await Promise.all([
      Subdivision.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      Subdivision.countDocuments(query),
    ]);

    return NextResponse.json({
      subdivisions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching subdivisions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
