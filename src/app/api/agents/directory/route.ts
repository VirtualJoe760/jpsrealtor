// src/app/api/agents/directory/route.ts
// Public endpoint to list agents for the /directory page
// No auth required — powers the SEO cross-linking hub

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

/**
 * GET /api/agents/directory
 *
 * Returns public agent profiles for the agent directory page.
 * Supports filtering by city, specialization, and name search.
 *
 * Query params:
 *   ?city=          Filter by service area name (case-insensitive)
 *   ?specialization= Filter by specialization (case-insensitive)
 *   ?search=        Search by agent name (case-insensitive partial match)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const specialization = searchParams.get("specialization");
    const search = searchParams.get("search");

    // Base query: agents with realEstateAgent role and some profile data
    const query: any = {
      roles: "realEstateAgent",
      $or: [
        { "agentProfile.headshot": { $exists: true, $nin: [null, ""] } },
        { "agentProfile.headline": { $exists: true, $nin: [null, ""] } },
      ],
    };

    // Filter by service area city
    if (city) {
      query["agentProfile.serviceAreas.name"] = {
        $regex: new RegExp(city, "i"),
      };
    }

    // Filter by specialization
    if (specialization) {
      query["agentProfile.specializations"] = {
        $regex: new RegExp(specialization, "i"),
      };
    }

    // Search by name
    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    const agents = await User.find(query)
      .select(
        "name agentProfile.headshot agentProfile.headline agentProfile.tagline " +
        "agentProfile.serviceAreas agentProfile.specializations " +
        "agentProfile.customDomain agentProfile.subdomain " +
        "agentProfile.socialMedia agentProfile.certifications"
      )
      .lean();

    // Shape the response — only expose public-safe fields
    const directory = agents.map((agent: any) => {
      const profile = agent.agentProfile || {};
      return {
        id: agent._id.toString(),
        name: agent.name || "Agent",
        headshot: profile.headshot || null,
        headline: profile.headline || null,
        tagline: profile.tagline || null,
        serviceAreas: (profile.serviceAreas || []).map((sa: any) => ({
          name: sa.name,
          type: sa.type,
        })),
        specializations: profile.specializations || [],
        customDomain: profile.customDomain || null,
        subdomain: profile.subdomain || null,
        socialMedia: profile.socialMedia || {},
        certifications: (profile.certifications || []).map((cert: any) => ({
          name: cert.name,
          issuedBy: cert.issuedBy,
          year: cert.year,
        })),
      };
    });

    // Collect all unique cities and specializations for filter pills
    const allCities = new Set<string>();
    const allSpecializations = new Set<string>();
    directory.forEach((agent: any) => {
      agent.serviceAreas.forEach((sa: any) => allCities.add(sa.name));
      agent.specializations.forEach((s: string) => allSpecializations.add(s));
    });

    return NextResponse.json(
      {
        success: true,
        agents: directory,
        filters: {
          cities: Array.from(allCities).sort(),
          specializations: Array.from(allSpecializations).sort(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/agents/directory] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent directory" },
      { status: 500 }
    );
  }
}
