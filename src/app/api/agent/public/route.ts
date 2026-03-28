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

    console.log('[DEBUG] Agent profile keys:', agent?.agentProfile ? Object.keys(agent.agentProfile) : 'no agentProfile');
    console.log('[DEBUG] Phone (nested):', agent?.agentProfile?.cellPhone || agent?.agentProfile?.officePhone);
    console.log('[DEBUG] Phone (top-level):', agent?.phone);
    console.log('[DEBUG] License (nested):', agent?.agentProfile?.licenseNumber);
    console.log('[DEBUG] License (top-level):', agent?.licenseNumber);
    console.log('[DEBUG] Brokerage (nested):', agent?.agentProfile?.brokerageName);
    console.log('[DEBUG] Brokerage (top-level):', agent?.brokerageName);

    if (!agent) {
      console.error(`[GET /api/agent/public] Primary agent not found: ${primaryAgentEmail}`);
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 }
      );
    }

    // Extract public-facing data with fallbacks to legacy top-level fields
    const publicProfile = {
      name: agent.name,
      email: agent.email,
      // Check both nested agentProfile and legacy top-level fields
      brokerageName: agent.agentProfile?.brokerageName || agent.brokerageName,
      licenseNumber: agent.agentProfile?.licenseNumber || agent.licenseNumber,
      phone: agent.agentProfile?.cellPhone || agent.agentProfile?.officePhone || agent.phone,
      agentProfile: {
        // Basic info with fallbacks
        bio: agent.agentProfile?.bio,
        phone: agent.agentProfile?.cellPhone || agent.agentProfile?.officePhone || agent.phone,
        licenseNumber: agent.agentProfile?.licenseNumber || agent.licenseNumber,
        yearsExperience: agent.agentProfile?.yearsExperience,
        brokerageName: agent.agentProfile?.brokerageName || agent.brokerageName,

        // Photos and branding
        profilePhoto: agent.agentProfile?.profilePhoto,
        headshot: agent.agentProfile?.headshot,
        coverPhoto: agent.agentProfile?.coverPhoto,
        insightsBannerImage: agent.agentProfile?.insightsBannerImage,
        heroImage: agent.agentProfile?.heroImage,
        heroPhoto: agent.agentProfile?.heroPhoto,
        teamLogo: agent.agentProfile?.teamLogo,
        galleryPhotos: agent.agentProfile?.galleryPhotos,

        // Social links (check both socialMedia object and top-level)
        facebook: agent.agentProfile?.socialMedia?.facebook,
        instagram: agent.agentProfile?.socialMedia?.instagram,
        linkedin: agent.agentProfile?.socialMedia?.linkedin,
        twitter: agent.agentProfile?.socialMedia?.twitter,

        // Domain info (for future multi-tenant)
        customDomain: agent.agentProfile?.customDomain,
        subdomain: agent.agentProfile?.subdomain,

        // Branding
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
