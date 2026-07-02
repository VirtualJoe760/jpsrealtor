// src/app/api/agent/domains/route.ts
// CRUD for agent domain mappings — list and create

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import Subdivision from "@/models/subdivisions";
import User from "@/models/User";
import { getDomainPurchaseUrl } from "@/services/vercel-domains";
import { isFreeTier } from "@/lib/subscription-helpers";

/**
 * GET /api/agent/domains
 * Returns all domain mappings for the authenticated agent.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const mappings = await DomainMapping.find({ agentId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ domains: mappings });
}

/**
 * POST /api/agent/domains
 * Creates a new domain mapping.
 *
 * Body: {
 *   domain: string,                          // e.g., "johndoe.com"
 *   targetType: "agent_landing" | "community_page",
 *   targetPath?: string,                     // defaults to "/" for agent_landing
 *   cityId?: string,                         // required for community_page
 *   subdivisionSlug?: string,                // optional, for community_page
 *   seoTitle?: string,
 *   seoDescription?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Creating a custom domain mapping is a paid-plan feature; block free-tier agents (admins exempt).
  if (!user.isAdmin && (await isFreeTier(String(user._id)))) {
    return NextResponse.json(
      { error: "Custom domains require a paid plan." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    domain,
    targetType = "agent_landing",
    subdivisionSlug,
    cityId,
    seoTitle,
    seoDescription,
  } = body;

  // Validate domain is provided
  if (!domain) {
    return NextResponse.json(
      { error: "domain is required" },
      { status: 400 }
    );
  }

  // Validate targetType
  if (!["agent_landing", "community_page"].includes(targetType)) {
    return NextResponse.json(
      { error: 'targetType must be "agent_landing" or "community_page"' },
      { status: 400 }
    );
  }

  // For community_page, cityId is required
  if (targetType === "community_page" && !cityId) {
    return NextResponse.json(
      { error: "cityId is required for community_page target type" },
      { status: 400 }
    );
  }

  // Normalize domain (lowercase, strip protocol/path/www)
  const cleanDomain = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  // Validate domain format
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainRegex.test(cleanDomain)) {
    return NextResponse.json(
      { error: "Invalid domain format" },
      { status: 400 }
    );
  }

  // Check if domain is already mapped
  const existing = await DomainMapping.findOne({ domain: cleanDomain });
  if (existing) {
    return NextResponse.json(
      { error: "This domain is already mapped" },
      { status: 409 }
    );
  }

  // Build mapping data based on targetType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappingData: Record<string, any> = {
    domain: cleanDomain,
    agentId: user._id,
    agentEmail: session.user.email,
    mappingType: targetType,
    status: "pending_approval",
    sslStatus: "not_started",
    dnsConfigured: false,
    purchasedViaVercel: false,
  };

  if (targetType === "agent_landing") {
    // Agent homepage — no subdivision fields needed
    mappingData.targetPath = "/";
    mappingData.seoTitle = seoTitle || "Real Estate Agent";
    mappingData.seoDescription =
      seoDescription || "Your trusted local real estate agent.";
  } else {
    // community_page — look up subdivision if slug provided
    let targetPath = `/neighborhoods/${cityId}`;

    if (subdivisionSlug) {
      const subdivision = await Subdivision.findOne({ slug: subdivisionSlug }).lean();
      if (!subdivision) {
        return NextResponse.json(
          { error: "Subdivision not found" },
          { status: 404 }
        );
      }
      targetPath = `/neighborhoods/${cityId}/${subdivisionSlug}`;
      mappingData.subdivisionId = subdivision._id;
      mappingData.subdivisionName = subdivision.name;
      mappingData.subdivisionSlug = subdivisionSlug;
      mappingData.seoTitle = seoTitle || `${subdivision.name} Real Estate`;
      mappingData.seoDescription =
        seoDescription ||
        `Browse homes for sale in ${subdivision.name}. View listings, photos, and community information.`;
    } else {
      mappingData.seoTitle = seoTitle || `${cityId} Real Estate`;
      mappingData.seoDescription =
        seoDescription || `Browse homes for sale in ${cityId}.`;
    }

    mappingData.targetPath = targetPath;
    mappingData.cityId = cityId;
  }

  const mapping = await DomainMapping.create(mappingData);

  const purchaseUrl = getDomainPurchaseUrl(cleanDomain);

  return NextResponse.json(
    {
      mapping,
      purchaseUrl,
      message: `Domain ${cleanDomain} submitted for review. An admin will approve your request shortly.`,
    },
    { status: 201 }
  );
}
