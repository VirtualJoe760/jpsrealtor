// src/app/api/partnerships/[id]/route.ts
// Get (GET), update (PUT), and terminate (DELETE) a partnership

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Partnership from "@/models/Partnership";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

// GET: Get partnership details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid partnership ID" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const partnership = await Partnership.findById(id)
      .populate("agentId", "name email image agentProfile.headshot agentProfile.headline")
      .populate("servicePartnerId", "name email image servicePartnerProfile")
      .populate("initiatedBy", "name email")
      .lean();

    if (!partnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    // Only allow participants to view
    const userId = user._id.toString();
    const isParticipant =
      partnership.agentId._id.toString() === userId ||
      partnership.servicePartnerId._id.toString() === userId;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ partnership });
  } catch (error: any) {
    console.error("Error getting partnership:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update partnership (accept/reject, update terms, upload JMA)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid partnership ID" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const partnership = await Partnership.findById(id);
    if (!partnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    // Only allow participants to update
    const userId = user._id.toString();
    const isParticipant =
      partnership.agentId.toString() === userId ||
      partnership.servicePartnerId.toString() === userId;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, terms, respaCompliance } = body;

    // Handle status actions
    if (action) {
      const isRecipient = partnership.initiatedBy.toString() !== userId;

      switch (action) {
        case "accept":
          if (!isRecipient) {
            return NextResponse.json(
              { error: "Only the recipient can accept a partnership request" },
              { status: 400 }
            );
          }
          if (partnership.status !== "pending") {
            return NextResponse.json(
              { error: "Partnership is not in pending status" },
              { status: 400 }
            );
          }
          partnership.status = "active";
          break;

        case "reject":
          if (!isRecipient) {
            return NextResponse.json(
              { error: "Only the recipient can reject a partnership request" },
              { status: 400 }
            );
          }
          if (partnership.status !== "pending") {
            return NextResponse.json(
              { error: "Partnership is not in pending status" },
              { status: 400 }
            );
          }
          partnership.status = "terminated";
          break;

        case "suspend":
          if (partnership.status !== "active") {
            return NextResponse.json(
              { error: "Can only suspend active partnerships" },
              { status: 400 }
            );
          }
          partnership.status = "suspended";
          break;

        case "reactivate":
          if (partnership.status !== "suspended") {
            return NextResponse.json(
              { error: "Can only reactivate suspended partnerships" },
              { status: 400 }
            );
          }
          partnership.status = "active";
          break;

        default:
          return NextResponse.json(
            { error: "Invalid action. Use: accept, reject, suspend, reactivate" },
            { status: 400 }
          );
      }
    }

    // Update terms if provided
    if (terms) {
      if (terms.costSplitType) partnership.terms.costSplitType = terms.costSplitType;
      if (terms.agentPercentage !== undefined) partnership.terms.agentPercentage = terms.agentPercentage;
      if (terms.partnerPercentage !== undefined) partnership.terms.partnerPercentage = terms.partnerPercentage;
      if (terms.fixedAgentAmount !== undefined) partnership.terms.fixedAgentAmount = terms.fixedAgentAmount;
      if (terms.fixedPartnerAmount !== undefined) partnership.terms.fixedPartnerAmount = terms.fixedPartnerAmount;
      if (terms.maxMonthlyContribution !== undefined) partnership.terms.maxMonthlyContribution = terms.maxMonthlyContribution;
    }

    // Update RESPA compliance if provided
    if (respaCompliance) {
      if (respaCompliance.jointMarketingAgreement !== undefined) {
        partnership.respaCompliance.jointMarketingAgreement = respaCompliance.jointMarketingAgreement;
      }
      if (respaCompliance.jmaDocumentUrl) {
        partnership.respaCompliance.jmaDocumentUrl = respaCompliance.jmaDocumentUrl;
        partnership.respaCompliance.jmaSignedAt = new Date();
      }
      if (respaCompliance.agreedToTerms !== undefined) {
        partnership.respaCompliance.agreedToTerms = respaCompliance.agreedToTerms;
        partnership.respaCompliance.agreedAt = new Date();
      }
    }

    await partnership.save();

    return NextResponse.json({
      success: true,
      partnership,
    });
  } catch (error: any) {
    console.error("Error updating partnership:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Terminate partnership
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid partnership ID" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const partnership = await Partnership.findById(id);
    if (!partnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    // Only allow participants to terminate
    const userId = user._id.toString();
    const isParticipant =
      partnership.agentId.toString() === userId ||
      partnership.servicePartnerId.toString() === userId;

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft-delete: mark as terminated rather than removing
    partnership.status = "terminated";
    await partnership.save();

    return NextResponse.json({
      success: true,
      message: "Partnership terminated",
    });
  } catch (error: any) {
    console.error("Error terminating partnership:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
