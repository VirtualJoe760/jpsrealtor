// src/app/api/agent/public/route.ts
// Public endpoint to fetch the primary agent's profile (no auth required)
// Used for displaying agent branding to all visitors

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

/**
 * GET /api/agent/public
 *
 * Returns the primary agent's public profile data for the current domain.
 * No authentication required - used for displaying agent branding to all visitors.
 *
 * For now, uses PRIMARY_AGENT_EMAIL from env variable.
 * Future: Will use req.headers.host to lookup agent by domain mapping.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // For now: Use env variable to identify primary agent
    // Future: Map req.headers.host → database → agent
    const primaryAgentEmail = process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";

    console.log(`[GET /api/agent/public] Fetching public profile for primary agent: ${primaryAgentEmail}`);

    // Find the primary agent (include legacy top-level fields for fallback)
    const agent = await User.findOne({ email: primaryAgentEmail })
      .select('name email phone licenseNumber brokerageName agentProfile')
      .lean();

    if (!agent) {
      console.error(`[GET /api/agent/public] Primary agent not found: ${primaryAgentEmail}`);
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 }
      );
    }

    // Extract public-facing data with fallbacks to legacy top-level fields
    // Cast agentProfile to any to access fields that may exist in DB but not in strict TS interface
    const profile = agent.agentProfile as any;
    const publicProfile = {
      name: agent.name,
      email: agent.email,
      brokerageName: profile?.brokerageName || agent.brokerageName,
      licenseNumber: profile?.licenseNumber || agent.licenseNumber,
      phone: profile?.cellPhone || profile?.officePhone || agent.phone,
      agentProfile: {
        bio: profile?.bio,
        phone: profile?.cellPhone || profile?.officePhone || agent.phone,
        licenseNumber: profile?.licenseNumber || agent.licenseNumber,
        yearsExperience: profile?.yearsExperience,
        brokerageName: profile?.brokerageName || agent.brokerageName,

        profilePhoto: profile?.profilePhoto,
        headshot: profile?.headshot,
        coverPhoto: profile?.coverPhoto,
        insightsBannerImage: profile?.insightsBannerImage,
        heroImage: profile?.heroImage,
        heroPhoto: profile?.heroPhoto,
        teamLogo: profile?.teamLogo,
        galleryPhotos: profile?.galleryPhotos,

        // Social links (check both socialMedia object and top-level)
        facebook: agent.agentProfile?.socialMedia?.facebook,
        instagram: agent.agentProfile?.socialMedia?.instagram,
        linkedin: agent.agentProfile?.socialMedia?.linkedin,
        twitter: agent.agentProfile?.socialMedia?.twitter,

        // Domain info (for future multi-tenant)
        customDomain: agent.agentProfile?.customDomain,
        subdomain: agent.agentProfile?.subdomain,

        // Branding
        fontFamily: profile?.fontFamily || "Raleway",
        brandColor: agent.agentProfile?.brandColors?.primary,
        secondaryColor: agent.agentProfile?.brandColors?.secondary,

        // Hero customization
        heroHeadline: agent.agentProfile?.headline,
      },
    };

    console.log(`[GET /api/agent/public] Successfully fetched profile for ${agent.name}`);

    return NextResponse.json({
      profile: publicProfile,
    }, {
      headers: {
        // Cache for 5 minutes
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    console.error("[GET /api/agent/public] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent profile" },
      { status: 500 }
    );
  }
}
