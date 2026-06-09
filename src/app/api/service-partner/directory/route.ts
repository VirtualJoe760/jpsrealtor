// src/app/api/service-partner/directory/route.ts
// Public directory of service partners with filtering

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

// GET: Public directory of service partners
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const skip = (page - 1) * limit;

    // Build query: only users with serviceProvider role and servicePartnerProfile.
    // Approval gate: only admin-approved partners are publicly listed. Partners
    // predating the `status` field (none at rollout) are treated as approved so a
    // backfill isn't required, while any new applicant stays "pending" and hidden.
    const query: any = {
      roles: "serviceProvider",
      "servicePartnerProfile.type": { $exists: true },
      "servicePartnerProfile.status": { $in: ["approved", null] },
    };

    // Filter by service partner type
    if (type) {
      query["servicePartnerProfile.type"] = type;
    }

    // Filter by city in service areas
    if (city) {
      query["servicePartnerProfile.serviceAreas"] = {
        $elemMatch: {
          name: { $regex: new RegExp(city, "i") },
        },
      };
    }

    // Text search on name, companyName, bio, specializations
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { "servicePartnerProfile.companyName": searchRegex },
        { "servicePartnerProfile.bio": searchRegex },
        { "servicePartnerProfile.specializations": searchRegex },
      ];
    }

    // Select only public-facing fields
    const projection = {
      name: 1,
      image: 1,
      "servicePartnerProfile.type": 1,
      "servicePartnerProfile.companyName": 1,
      "servicePartnerProfile.companyLogo": 1,
      "servicePartnerProfile.website": 1,
      "servicePartnerProfile.phone": 1,
      "servicePartnerProfile.bio": 1,
      "servicePartnerProfile.licenseNumber": 1,
      "servicePartnerProfile.licenseState": 1,
      "servicePartnerProfile.nmlsId": 1,
      "servicePartnerProfile.certifications": 1,
      "servicePartnerProfile.serviceAreas": 1,
      "servicePartnerProfile.legalDisclaimer": 1,
      "servicePartnerProfile.specializations": 1,
    };

    const [partners, total] = await Promise.all([
      User.find(query)
        .select(projection)
        .skip(skip)
        .limit(limit)
        .sort({ "servicePartnerProfile.companyName": 1 })
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error listing service partner directory:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
