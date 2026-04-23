// src/app/api/network-links/route.ts
// GET endpoint for ChatRealty network cross-links

import { NextRequest, NextResponse } from "next/server";
import { generateCrossLinks, type NetworkLinkContext } from "@/lib/network-links";

/**
 * GET /api/network-links
 *
 * Returns contextually relevant cross-links to other domains in the
 * ChatRealty network. Used by the NetworkLinks component to render
 * SEO-friendly cross-domain links.
 *
 * Query Parameters:
 *   domain        - (required) The current domain to exclude from results
 *   city          - (optional) Filter for agents serving this city
 *   neighborhood  - (optional) Filter for agents serving this neighborhood
 *   propertyType  - (optional) Filter for agents specializing in this property type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const domain = searchParams.get("domain");
    if (!domain) {
      return NextResponse.json(
        { error: "Missing required parameter: domain" },
        { status: 400 }
      );
    }

    const context: NetworkLinkContext = {};
    const city = searchParams.get("city");
    const neighborhood = searchParams.get("neighborhood");
    const propertyType = searchParams.get("propertyType");

    if (city) context.city = city;
    if (neighborhood) context.neighborhood = neighborhood;
    if (propertyType) context.propertyType = propertyType;

    const links = await generateCrossLinks(domain, context);

    return NextResponse.json(
      { success: true, links },
      {
        headers: {
          // Cache for 1 hour on CDN, 30 min client-side
          "Cache-Control": "public, s-maxage=3600, max-age=1800, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("[network-links] Error fetching network links:", error);
    return NextResponse.json(
      { error: "Failed to fetch network links" },
      { status: 500 }
    );
  }
}
