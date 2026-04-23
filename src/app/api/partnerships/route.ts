// src/app/api/partnerships/route.ts
// List partnerships (GET) and create partnership request (POST)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Partnership from "@/models/Partnership";

export const dynamic = 'force-dynamic';

// GET: List partnerships for current user (works for both agents and service partners)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id roles").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build query: match user as either agent or service partner
    const query: any = {
      $or: [
        { agentId: user._id },
        { servicePartnerId: user._id },
      ],
    };

    if (status) {
      query.status = status;
    }

    const partnerships = await Partnership.find(query)
      .populate("agentId", "name email image agentProfile.headshot")
      .populate("servicePartnerId", "name email image servicePartnerProfile")
      .populate("initiatedBy", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ partnerships });
  } catch (error: any) {
    console.error("Error listing partnerships:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create partnership request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id roles").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // User must be an agent or service provider
    const isAgent = user.roles?.includes("realEstateAgent");
    const isServiceProvider = user.roles?.includes("serviceProvider");

    if (!isAgent && !isServiceProvider) {
      return NextResponse.json(
        { error: "Only agents and service partners can create partnerships" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { partnerId, terms, message } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId is required" },
        { status: 400 }
      );
    }

    // Get the partner user
    const partner = await User.findById(partnerId).select("_id roles").lean();
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    // Determine who is agent and who is service partner
    let agentId, servicePartnerId;

    if (isAgent && partner.roles?.includes("serviceProvider")) {
      agentId = user._id;
      servicePartnerId = partner._id;
    } else if (isServiceProvider && partner.roles?.includes("realEstateAgent")) {
      agentId = partner._id;
      servicePartnerId = user._id;
    } else {
      return NextResponse.json(
        { error: "Partnership must be between an agent and a service partner" },
        { status: 400 }
      );
    }

    // Check for existing partnership
    const existing = await Partnership.findOne({ agentId, servicePartnerId });
    if (existing) {
      return NextResponse.json(
        { error: "A partnership already exists between these users", existingId: existing._id },
        { status: 409 }
      );
    }

    // Create the partnership
    const partnership = await Partnership.create({
      agentId,
      servicePartnerId,
      status: "pending",
      terms: terms || {
        costSplitType: "equal",
        agentPercentage: 50,
        partnerPercentage: 50,
      },
      respaCompliance: {
        jointMarketingAgreement: false,
        agreedToTerms: false,
      },
      campaigns: [],
      billingHistory: [],
      initiatedBy: user._id,
      message: message || undefined,
    });

    return NextResponse.json({
      success: true,
      partnership,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating partnership:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
