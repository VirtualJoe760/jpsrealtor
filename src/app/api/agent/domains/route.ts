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
 *   domain: string,          // e.g., "indianwellsccrealestate.com"
 *   subdivisionSlug: string, // e.g., "indian-wells-country-club"
 *   cityId: string,          // e.g., "indian-wells"
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

  const body = await req.json();
  const { domain, subdivisionSlug, cityId, seoTitle, seoDescription } = body;

  // Validate inputs
  if (!domain || !subdivisionSlug || !cityId) {
    return NextResponse.json(
      { error: "domain, subdivisionSlug, and cityId are required" },
      { status: 400 }
    );
  }

  // Normalize domain (lowercase, strip protocol/path/www)
  let cleanDomain = domain
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
      { error: "This domain is already mapped to a community page" },
      { status: 409 }
    );
  }

  // Find the subdivision
  const subdivision = await Subdivision.findOne({ slug: subdivisionSlug }).lean();
  if (!subdivision) {
    return NextResponse.json(
      { error: "Subdivision not found" },
      { status: 404 }
    );
  }

  // Build target path
  const targetPath = `/neighborhoods/${cityId}/${subdivisionSlug}`;

  // Create the mapping as pending_approval (admin must approve before Vercel registration)
  const mapping = await DomainMapping.create({
    domain: cleanDomain,
    agentId: user._id,
    agentEmail: session.user.email,
    subdivisionId: subdivision._id,
    subdivisionName: subdivision.name,
    targetPath,
    cityId,
    subdivisionSlug,
    status: "pending_approval",
    sslStatus: "not_started",
    dnsConfigured: false,
    seoTitle: seoTitle || `${subdivision.name} Real Estate`,
    seoDescription:
      seoDescription ||
      `Browse homes for sale in ${subdivision.name}, ${subdivision.city}. View listings, photos, and community information.`,
    purchasedViaVercel: false,
  });

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
