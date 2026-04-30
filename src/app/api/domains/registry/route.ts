// src/app/api/domains/registry/route.ts
// Domain Registry API — CRUD for centralized domain records
// Admin-only for write operations

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import DomainRegistry from "@/models/DomainRegistry";
import { provisionDomain } from "@/lib/domain-registry/provision";

/**
 * GET /api/domains/registry
 * List all domain registry records. Admin only.
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (type) query.type = type;
  if (status) query.status = status;

  const domains = await DomainRegistry.find(query)
    .sort({ type: 1, domain: 1 })
    .lean();

  // Counts by type
  const counts = await DomainRegistry.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);
  const typeCounts: Record<string, number> = {};
  for (const c of counts) {
    typeCounts[c._id] = c.count;
  }

  return NextResponse.json({
    domains,
    counts: typeCounts,
    total: domains.length,
  });
}

/**
 * POST /api/domains/registry
 * Create a new domain registry record. Admin only.
 */
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const body = await req.json();

  if (!body.domain || !body.type || !body.ownerType) {
    return NextResponse.json(
      { error: "domain, type, and ownerType are required" },
      { status: 400 }
    );
  }

  // Check for duplicate
  const existing = await DomainRegistry.findOne({ domain: body.domain.toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { error: `Domain ${body.domain} already exists in registry` },
      { status: 409 }
    );
  }

  const registry = new DomainRegistry({
    domain: body.domain.toLowerCase(),
    type: body.type,
    status: body.status || "pending",
    ownerId: body.ownerId,
    ownerEmail: body.ownerEmail,
    ownerType: body.ownerType,
    target: body.target || { type: "homepage", path: "/" },
    vercel: body.vercel || { registered: false, verified: false, sslStatus: "not_started", dnsConfigured: false },
    cloudflare: body.cloudflare || { registered: false },
    gsc: body.gsc || { registered: false, verified: false, sitemapSubmitted: false },
    analytics: body.analytics || { gaEnabled: false },
    googleAds: body.googleAds || { enabled: false },
    metaAds: body.metaAds || { enabled: false },
    seo: body.seo || { sitemapEnabled: true },
    purchase: body.purchase || { purchasedViaVercel: false, autoRenew: false },
    approvedBy: body.approvedBy || admin.email,
    approvedAt: body.status === "active" ? new Date() : undefined,
    notes: body.notes,
    domainMappingId: body.domainMappingId,
  });

  await registry.save();

  // Auto-provision if requested
  if (body.provision) {
    try {
      const result = await provisionDomain(registry._id.toString());
      return NextResponse.json({ registry, provisionResult: result }, { status: 201 });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { registry, provisionError: msg, message: "Domain created but provisioning failed" },
        { status: 201 }
      );
    }
  }

  return NextResponse.json({ registry }, { status: 201 });
}

/**
 * PUT /api/domains/registry
 * Update a domain registry record. Admin only.
 */
export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const registry = await DomainRegistry.findById(id);
  if (!registry) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Apply updates to allowed fields
  const allowedTopLevel = [
    "status", "ownerEmail", "ownerType", "notes", "approvedBy", "approvedAt",
  ] as const;

  for (const key of allowedTopLevel) {
    if (updates[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (registry as any)[key] = updates[key];
    }
  }

  // Nested object updates
  const nestedKeys = [
    "target", "vercel", "cloudflare", "gsc", "analytics",
    "googleAds", "metaAds", "seo", "purchase",
  ] as const;

  for (const key of nestedKeys) {
    if (updates[key]) {
      Object.assign(registry[key], updates[key]);
      registry.markModified(key);
    }
  }

  await registry.save();

  return NextResponse.json({ registry });
}
