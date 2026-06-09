// src/app/api/admin/domains/route.ts
// Admin API for managing domain mapping requests.
// On approval: creates DomainRegistry record → provisions Vercel + Cloudflare with full caching setup.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import DomainRegistry from "@/models/DomainRegistry";
import User from "@/models/User";
import { removeDomainFromProject } from "@/lib/vercel-domains";
import { provisionDomain, ProvisionResult } from "@/lib/domain-registry/provision";

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

  const sorted = mappings.sort((a, b) => {
    const aPriority = STATUS_PRIORITY[a.status] ?? 99;
    const bPriority = STATUS_PRIORITY[b.status] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const counts = await DomainMapping.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusCounts: Record<string, number> = {};
  for (const c of counts) {
    statusCounts[c._id] = c.count;
  }

  // Enrich with agent details (name, phone, brokerage, license)
  const agentEmails = [...new Set(sorted.map((m) => m.agentEmail).filter(Boolean))];
  const agents = agentEmails.length > 0
    ? await User.find({ email: { $in: agentEmails } })
        .select("email name phone licenseNumber brokerageName image")
        .lean()
    : [];
  const agentMap: Record<string, { name?: string; phone?: string; licenseNumber?: string; brokerageName?: string; image?: string }> = {};
  for (const a of agents) {
    agentMap[a.email] = {
      name: a.name,
      phone: a.phone,
      licenseNumber: a.licenseNumber,
      brokerageName: a.brokerageName,
      image: a.image,
    };
  }

  return NextResponse.json({
    domains: sorted,
    agents: agentMap,
    counts: statusCounts,
    total: sorted.length,
  });
}

/**
 * PUT /api/admin/domains
 * Approve or reject a domain mapping request (legacy — kept for compatibility).
 */
export async function PUT(req: NextRequest) {
  return handleAction(req);
}

/**
 * PATCH /api/admin/domains
 * Approve, reject, or suspend a domain mapping request.
 * On approve: creates DomainRegistry → provisions Vercel + Cloudflare (zone, DNS, cache rules, page rules, worker routes).
 */
export async function PATCH(req: NextRequest) {
  return handleAction(req);
}

// ── Shared handler ─────────────────────────────────────────────────

async function handleAction(req: NextRequest) {
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
    case "approve":
      return handleApprove(mapping, admin.email!);

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
      if (mapping.status === "active" || mapping.status === "pending_dns") {
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

      // Also suspend in registry if it exists
      await DomainRegistry.findOneAndUpdate(
        { domain: mapping.domain },
        { $set: { status: "suspended" } }
      );

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

// ── Approve Flow ───────────────────────────────────────────────────
// 1. Create or update DomainRegistry record
// 2. Run full provisioning (Vercel + Cloudflare with caching setup)
// 3. Update DomainMapping status
// 4. Return nameserver instructions if needed

async function handleApprove(
  mapping: InstanceType<typeof DomainMapping>,
  adminEmail: string
) {
  const domain = mapping.domain;

  // 1. Create DomainRegistry record (or find existing)
  let registry = await DomainRegistry.findOne({ domain });
  if (!registry) {
    const targetType =
      mapping.mappingType === "community_page" ? "community_page" as const : "agent_landing" as const;
    const domainType =
      mapping.mappingType === "community_page" ? "community" as const : "agent_custom" as const;

    registry = new DomainRegistry({
      domain,
      type: domainType,
      status: "pending",
      ownerId: mapping.agentId,
      ownerEmail: mapping.agentEmail,
      ownerType: "agent",
      target: {
        type: targetType,
        path: mapping.targetPath,
        subdivisionSlug: mapping.subdivisionSlug,
        cityId: mapping.cityId,
      },
      vercel: { registered: false, verified: false, sslStatus: "not_started", dnsConfigured: false },
      cloudflare: { registered: false, nameserversUpdated: false },
      gsc: { registered: false, verified: false, sitemapSubmitted: false },
      analytics: { gaEnabled: false },
      googleAds: { enabled: false },
      metaAds: { enabled: false },
      seo: {
        metaTitle: mapping.seoTitle,
        metaDescription: mapping.seoDescription,
        ogImage: mapping.ogImage,
        sitemapEnabled: true,
      },
      purchase: {
        purchasedViaVercel: mapping.purchasedViaVercel,
        autoRenew: false,
      },
      approvedBy: adminEmail,
      approvedAt: new Date(),
      domainMappingId: mapping._id,
    });

    // Set registrar based on how domain was acquired
    if (mapping.purchasedViaVercel) {
      registry.cloudflare.registrar = "Vercel";
    }

    await registry.save();
    console.log(`[Admin Approve] Created DomainRegistry for ${domain}: ${registry._id}`);
  }

  // 2. Run full provisioning (Vercel + Cloudflare)
  let provisionResult: ProvisionResult;
  try {
    provisionResult = await provisionDomain(registry._id.toString());
    console.log(`[Admin Approve] Provisioning result for ${domain}:`, {
      vercel: provisionResult.vercel.success,
      cloudflare: "success" in provisionResult.cloudflare ? provisionResult.cloudflare.success : false,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Admin Approve] Provisioning error for ${domain}:`, msg);

    // Even if provisioning fails, still approve the mapping
    mapping.status = "approved";
    mapping.reviewedBy = adminEmail;
    mapping.reviewedAt = new Date();
    await mapping.save();

    return NextResponse.json({
      mapping,
      registry,
      provisionError: msg,
      message: `Domain ${domain} approved but provisioning had errors: ${msg}`,
    });
  }

  // 3. Update DomainMapping status based on provisioning results
  const vercelSuccess = provisionResult.vercel.success;
  const vercelAlreadyRegistered = provisionResult.vercel.alreadyRegistered;

  // Reload registry to get updated fields from provisioning
  await registry.save(); // provisionDomain already saved, but ensure consistency

  if (vercelSuccess && registry.vercel.verified) {
    mapping.status = "active";
    mapping.vercelVerified = true;
    mapping.dnsConfigured = true;
    mapping.sslStatus = "issued";
  } else if (vercelSuccess) {
    mapping.status = vercelAlreadyRegistered ? "active" : "pending_dns";
    mapping.vercelVerified = registry.vercel.verified;
  } else {
    mapping.status = "approved";
  }

  mapping.vercelDomainId = registry.vercel.domainId || domain;
  mapping.reviewedBy = adminEmail;
  mapping.reviewedAt = new Date();
  await mapping.save();

  // 4. Build response with nameserver instructions
  const cfSuccess = "success" in provisionResult.cloudflare && provisionResult.cloudflare.success;
  const nsInstructions = provisionResult.nameserverInstructions;

  return NextResponse.json({
    mapping,
    registry: {
      _id: registry._id,
      domain: registry.domain,
      vercel: registry.vercel,
      cloudflare: registry.cloudflare,
    },
    provisioning: {
      vercel: provisionResult.vercel,
      cloudflare: cfSuccess,
    },
    nameserverInstructions: nsInstructions || null,
    dnsInstructions: !registry.vercel.verified
      ? { type: "CNAME", name: domain, value: "cname.vercel-dns.com" }
      : null,
    message: buildApprovalMessage(domain, provisionResult, nsInstructions),
  });
}

function buildApprovalMessage(
  domain: string,
  result: ProvisionResult,
  nsInstructions?: ProvisionResult["nameserverInstructions"]
): string {
  const parts: string[] = [`Domain ${domain} approved.`];

  if (result.vercel.success) {
    parts.push(result.vercel.alreadyRegistered ? "Vercel: already registered." : "Vercel: registered.");
  } else {
    parts.push(`Vercel: failed (${result.vercel.error}).`);
  }

  const cfSuccess = "success" in result.cloudflare && result.cloudflare.success;
  if (cfSuccess) {
    parts.push("Cloudflare: zone + cache rules + page rules + worker routes configured.");
  } else {
    const cfError = ("error" in result.cloudflare ? result.cloudflare.error : "") || "not configured";
    const isPermissionError = /permission|zone\.create|zone:create|\b403\b/i.test(cfError);
    if (isPermissionError) {
      parts.push(
        `Cloudflare: ${cfError}. The CF API token lacks the account-level Zone:Create permission — the site still goes live via the Vercel CNAME below, but Cloudflare caching is off. Grant the permission, then use "Provision All on Cloudflare" in the Registry tab to retry.`
      );
    } else {
      parts.push(`Cloudflare: ${cfError}. The site can still go live via the Vercel CNAME below; retry from the Registry tab once resolved.`);
    }
  }

  if (nsInstructions) {
    parts.push(`ACTION REQUIRED: Update nameservers at ${nsInstructions.registrar || "registrar"}.`);
  }

  return parts.join(" ");
}
