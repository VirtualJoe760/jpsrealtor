// src/app/api/service-partner/profile/route.ts
// Get (GET) and update (PUT) service partner profile for current user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

// GET: Get service partner profile for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("name email image roles servicePartnerProfile")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.roles?.includes("serviceProvider")) {
      return NextResponse.json(
        { error: "User is not a service partner" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        image: user.image,
        ...user.servicePartnerProfile,
      },
    });
  } catch (error: any) {
    console.error("Error getting service partner profile:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update service partner profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.roles?.includes("serviceProvider")) {
      return NextResponse.json(
        { error: "User is not a service partner" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Allowed fields for update
    const allowedFields = [
      "type", "companyName", "companyLogo", "website", "phone", "bio",
      "licenseNumber", "licenseState", "licenseExpiry", "nmlsId",
      "certifications", "serviceAreas", "legalDisclaimer",
      "insuranceInfo", "specializations",
    ];

    // Build update object
    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[`servicePartnerProfile.${field}`] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate type enum if provided
    const validTypes = [
      "mortgage_broker", "title_officer", "escrow_officer",
      "real_estate_attorney", "property_manager", "general_contractor",
      "home_inspector", "insurance_agent",
    ];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: update },
      { new: true }
    ).select("servicePartnerProfile").lean();

    return NextResponse.json({
      success: true,
      profile: updated?.servicePartnerProfile,
    });
  } catch (error: any) {
    console.error("Error updating service partner profile:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
