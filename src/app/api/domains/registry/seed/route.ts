// src/app/api/domains/registry/seed/route.ts
// Seed DomainRegistry with existing Vercel project domains and DomainMapping records.
// Admin only. POST /api/domains/registry/seed

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import DomainRegistry from "@/models/DomainRegistry";
import DomainMapping from "@/models/DomainMapping";
import { listProjectDomains } from "@/lib/vercel-domains";

// Known platform domains and their config
const PLATFORM_DOMAINS: Record<
  string,
  {
    type: "platform";
    target: { type: "homepage"; path: string };
    analytics?: { gaEnabled: boolean; measurementId?: string };
    metaAds?: { enabled: boolean; pixelId?: string; accessToken?: string };
  }
> = {
  "chatrealty.io": {
    type: "platform",
    target: { type: "homepage", path: "/" },
  },
  "www.chatrealty.io": {
    type: "platform",
    target: { type: "homepage", path: "/" },
  },
  "jpsrealtor.com": {
    type: "platform",
    target: { type: "homepage", path: "/" },
    analytics: { gaEnabled: true, measurementId: "G-LD3LJ0E2YK" },
    metaAds: { enabled: true, pixelId: "1378421466770456" },
  },
  "www.jpsrealtor.com": {
    type: "platform",
    target: { type: "homepage", path: "/" },
  },
  "josephsardella.com": {
    type: "platform",
    target: { type: "homepage", path: "/" },
  },
  "www.josephsardella.com": {
    type: "platform",
    target: { type: "homepage", path: "/" },
  },
};

const PLATFORM_APEX_DOMAINS = ["chatrealty.io", "jpsrealtor.com", "josephsardella.com", "vercel.app"];

export async function POST() {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const results = {
    vercelDomains: 0,
    platformSeeded: 0,
    agentSubdomainsSeeded: 0,
    domainMappingsMigrated: 0,
    skippedExisting: 0,
    errors: [] as string[],
  };

  // 1. Fetch all Vercel project domains
  let vercelDomains;
  try {
    vercelDomains = await listProjectDomains();
    results.vercelDomains = vercelDomains.length;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to fetch Vercel domains: ${msg}` }, { status: 502 });
  }

  // 2. Seed Vercel domains
  for (const vd of vercelDomains) {
    // Skip vercel.app domains
    if (vd.name.endsWith(".vercel.app")) continue;

    // Check if already in registry
    const existing = await DomainRegistry.findOne({ domain: vd.name });
    if (existing) {
      results.skippedExisting++;
      continue;
    }

    const isPlatform = PLATFORM_APEX_DOMAINS.some(
      (apex) => vd.name === apex || vd.name === `www.${apex}` || vd.apexName === apex
    );
    const isSubdomain = vd.name.endsWith(".chatrealty.io") && !PLATFORM_DOMAINS[vd.name];
    const platformConfig = PLATFORM_DOMAINS[vd.name];

    try {
      const record = new DomainRegistry({
        domain: vd.name,
        type: isPlatform ? "platform" : isSubdomain ? "agent_subdomain" : "agent_custom",
        status: vd.verified ? "active" : "pending",
        ownerType: isPlatform ? "platform" : "agent",
        target: platformConfig?.target || {
          type: isSubdomain ? "agent_landing" : "homepage",
          path: "/",
          ...(isSubdomain && { agentSubdomain: vd.name.split(".chatrealty.io")[0] }),
        },
        vercel: {
          registered: true,
          verified: vd.verified,
          domainId: vd.name,
          sslStatus: vd.verified ? "issued" : "pending",
          dnsConfigured: vd.verified,
          registeredAt: new Date(vd.createdAt),
          ...(vd.verified && { verifiedAt: new Date(vd.updatedAt) }),
        },
        cloudflare: { registered: false },
        gsc: { registered: false, verified: false, sitemapSubmitted: false },
        analytics: platformConfig?.analytics || { gaEnabled: false },
        googleAds: { enabled: false },
        metaAds: platformConfig?.metaAds || { enabled: false },
        seo: { sitemapEnabled: true },
        purchase: { purchasedViaVercel: false, autoRenew: false },
        approvedBy: admin.email,
        approvedAt: vd.verified ? new Date() : undefined,
        notes: `Seeded from Vercel project on ${new Date().toISOString().split("T")[0]}`,
      });

      await record.save();
      if (isPlatform) results.platformSeeded++;
      else if (isSubdomain) results.agentSubdomainsSeeded++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`${vd.name}: ${msg}`);
    }
  }

  // 3. Migrate DomainMapping records
  const mappings = await DomainMapping.find({}).lean();
  for (const mapping of mappings) {
    const existing = await DomainRegistry.findOne({ domain: mapping.domain });
    if (existing) {
      // Link the DomainMapping ID if not already linked
      if (!existing.domainMappingId) {
        existing.domainMappingId = mapping._id as mongoose.Types.ObjectId;
        await existing.save();
      }
      results.skippedExisting++;
      continue;
    }

    try {
      const targetType =
        mapping.mappingType === "community_page" ? "community_page" : "agent_landing";

      const record = new DomainRegistry({
        domain: mapping.domain,
        type: mapping.mappingType === "community_page" ? "community" : "agent_custom",
        status: mapping.status === "active" ? "active" : "pending",
        ownerId: mapping.agentId,
        ownerEmail: mapping.agentEmail,
        ownerType: "agent",
        target: {
          type: targetType,
          path: mapping.targetPath,
          subdivisionSlug: mapping.subdivisionSlug,
          cityId: mapping.cityId,
        },
        vercel: {
          registered: mapping.vercelVerified || mapping.status === "active",
          verified: mapping.vercelVerified,
          domainId: mapping.vercelDomainId,
          sslStatus: mapping.sslStatus || "not_started",
          dnsConfigured: mapping.dnsConfigured,
          dnsRecords: mapping.dnsRecords,
          registeredAt: mapping.reviewedAt,
        },
        cloudflare: { registered: false },
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
        approvedBy: mapping.reviewedBy,
        approvedAt: mapping.reviewedAt,
        domainMappingId: mapping._id as mongoose.Types.ObjectId,
        notes: `Migrated from DomainMapping on ${new Date().toISOString().split("T")[0]}`,
      });

      await record.save();
      results.domainMappingsMigrated++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`DomainMapping ${mapping.domain}: ${msg}`);
    }
  }

  return NextResponse.json({
    message: "Seed complete",
    results,
  });
}
