// src/app/api/admin/domains/route.ts
// Admin API for managing domain mapping requests

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import {
  addDomainToProject,
  removeDomainFromProject,
  getDnsInstructions,
} from "@/services/vercel-domains";

// Status sort priority — pending items surface first
const STATUS_PRIORITY: Record<string, number> = {
  pending_approval: 0,
  pending_dns: 1,
  pending_verification: 2,
  approved: 3,
  active: 4,
  failed: 5,
  rejected: 6,
  suspended: 7,
};

/**
 * GET /api/admin/domains
 * Lists ALL domain mappings with agent info.
 * Sorted by status (pending first), then by createdAt desc.
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (status) query.status = status;

  const mappings = await DomainMapping.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Sort: pending statuses first, then by createdAt desc within each group
  const sorted = mappings.sort((a, b) => {
    const aPriority = STATUS_PRIORITY[a.status] ?? 99;
    const bPriority = STATUS_PRIORITY[b.status] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Group counts by status for dashboard stats
  const counts = await DomainMapping.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusCounts: Record<string, number> = {};
  for (const c of counts) {
    statusCounts[c._id] = c.count;
  }

  return NextResponse.json({
    domains: sorted,
    counts: statusCounts,
    total: sorted.length,
  });
}

/**
 * PUT /api/admin/domains
 * Approve or reject a domain mapping request.
 *
 * Body: {
 *   domainId: string,
 *   action: "approve" | "reject",
 *   rejectionReason?: string,
 * }
 */
export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Admin Domain Approve] Vercel API error:", msg);
        return NextResponse.json(
          {
            error: "Failed to register domain with Vercel",
            details: msg,
          },
          { status: 502 }
        );
      }

      mapping.status = "approved";
      mapping.vercelDomainId = vercelResult?.name || mapping.domain;
      mapping.vercelVerified = vercelResult?.verified || false;
      mapping.reviewedBy = admin.email;
      mapping.reviewedAt = new Date();

      await mapping.save();

      const dnsInstructions = getDnsInstructions(mapping.domain);

      return NextResponse.json({
        mapping,
        dnsInstructions,
        message: `Domain ${mapping.domain} approved and registered with Vercel.`,
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

    default:
      return NextResponse.json(
        { error: 'Invalid action. Use: "approve" or "reject"' },
        { status: 400 }
      );
  }
}

/**
 * PATCH /api/admin/domains
 * Approve, reject, or suspend a domain mapping request.
 * (Legacy endpoint — prefer PUT for approve/reject)
 *
 * Body: {
 *   domainId: string,
 *   action: "approve" | "reject" | "suspend",
 *   rejectionReason?: string,
 * }
 */
export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

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
      let vercelResult;
      try {
        vercelResult = await addDomainToProject(mapping.domain);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Admin Domain Approve] Vercel API error:", msg);
        return NextResponse.json(
          {
            error: "Failed to register domain with Vercel",
            details: msg,
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
      if (
        mapping.status === "active" ||
        mapping.status === "pending_dns"
      ) {
        try {
          await removeDomainFromProject(mapping.domain);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error("[Admin Domain Suspend] Vercel removal error:", msg);
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
