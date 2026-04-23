// src/app/api/service-partner/apply/route.ts
// Apply to become a service partner (adds serviceProvider role, creates servicePartnerProfile)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    // Check if already a service provider
    if (user.hasRole("serviceProvider")) {
      return NextResponse.json(
        { error: "You are already a service partner" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      type,
      companyName,
      companyLogo,
      website,
      phone,
      bio,
      licenseNumber,
      licenseState,
      licenseExpiry,
      nmlsId,
      certifications,
      serviceAreas,
      legalDisclaimer,
      insuranceInfo,
      specializations,
    } = body;

    // Validate required fields
    if (!type || !companyName) {
      return NextResponse.json(
        { error: "type and companyName are required" },
        { status: 400 }
      );
    }

    // Validate type enum
    const validTypes = [
      "mortgage_broker", "title_officer", "escrow_officer",
      "real_estate_attorney", "property_manager", "general_contractor",
      "home_inspector", "insurance_agent",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Mortgage brokers should provide NMLS ID
    if (type === "mortgage_broker" && !nmlsId) {
      return NextResponse.json(
        { error: "NMLS ID is required for mortgage brokers" },
        { status: 400 }
      );
    }

    // Add serviceProvider role
    user.addRole("serviceProvider");

    // Create service partner profile
    user.servicePartnerProfile = {
      type,
      companyName,
      companyLogo: companyLogo || undefined,
      website: website || undefined,
      phone: phone || undefined,
      bio: bio || undefined,
      licenseNumber: licenseNumber || undefined,
      licenseState: licenseState || undefined,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
      nmlsId: nmlsId || undefined,
      certifications: certifications || [],
      serviceAreas: serviceAreas || [],
      legalDisclaimer: legalDisclaimer || undefined,
      insuranceInfo: insuranceInfo || undefined,
      specializations: specializations || [],
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Service partner application submitted",
      profile: user.servicePartnerProfile,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Service partner application error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
