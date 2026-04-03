// src/app/api/admin/domains/route.ts
// Admin API for managing domain mapping requests

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import User from "@/models/User";
import {
  addDomainToProject,
  removeDomainFromProject,
  getDnsInstructions,
} from "@/services/vercel-domains";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user?.isAdmin) return null;

  return user;
}

/**
 * GET /api/admin/domains
 * Lists all domain mapping requests with optional status filter.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending_approval, active, rejected, etc.

  const query: any = {};
  if (status) query.status = status;

  const mappings = await DomainMapping.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Group counts by status for dashboard stats
  const counts = await DomainMapping.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusCounts: Record<string, number> = {};
  for (const c of counts) {
    statusCounts[c._id] = c.count;
  }

  return NextResponse.json({
    domains: mappings,
    counts: statusCounts,
    total: mappings.length,
  });
}

/**
 * PATCH /api/admin/domains
 * Approve or reject a domain mapping request.
 *
 * Body: {
 *   domainId: string,
 *   action: "approve" | "reject" | "suspend",
 *   rejectionReason?: string,
 * }
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { domainId, action, rejectionReason } = await req.json();

  if (!domainId || !action) {
    return NextResponse.json(
      { error: "domainId and action are required" },
      { status: 400 }
    );
  }

  const mapping = await DomainMapping.findById(domainId);
  if (!mapping) {
    return NextResponse.json(
      { error: "Domain mapping not found" },
      { status: 404 }
    );
  }

  switch (action) {
    case "approve": {
      // Register domain with Vercel
      let vercelResult;
      try {
        vercelResult = await addDomainToProject(mapping.domain);
      } catch (error: any) {
        console.error("[Admin Domain Approve] Vercel API error:", error.message);
        return NextResponse.json(
          {
            error: "Failed to register domain with Vercel",
            details: error.message,
          },
          { status: 502 }
        );
      }

      mapping.status = "pending_dns";
      mapping.vercelDomainId = vercelResult?.name || mapping.domain;
      mapping.vercelVerified = vercelResult?.verified || false;
      mapping.reviewedBy = admin.email;
      mapping.reviewedAt = new Date();

      await mapping.save();

      const dnsInstructions = getDnsInstructions(mapping.domain);

      return NextResponse.json({
        mapping,
        dnsInstructions,
        message: `Domain ${mapping.domain} approved and registered with Vercel. Agent needs to configure DNS.`,
      });
    }

    case "reject": {
      mapping.status = "rejected";
      mapping.reviewedBy = admin.email;
      mapping.reviewedAt = new Date();
      mapping.rejectionReason = rejectionReason || "Request denied by admin";

      await mapping.save();

      return NextResponse.json({
        mapping,
        message: `Domain ${mapping.domain} rejected.`,
      });
    }

    case "suspend": {
      // Remove from Vercel if it was previously active
      if (
        mapping.status === "active" ||
        mapping.status === "pending_dns"
      ) {
        try {
          await removeDomainFromProject(mapping.domain);
        } catch (error: any) {
          console.error("[Admin Domain Suspend] Vercel removal error:", error.message);
        }
      }

      mapping.status = "suspended";
      mapping.reviewedBy = admin.email;
      mapping.reviewedAt = new Date();

      await mapping.save();

      return NextResponse.json({
        mapping,
        message: `Domain ${mapping.domain} suspended.`,
      });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use: approve, reject, or suspend" },
        { status: 400 }
      );
  }
}
