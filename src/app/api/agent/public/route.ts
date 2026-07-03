// src/app/api/agent/public/route.ts
// Public endpoint to fetch the primary agent's profile (no auth required)
// Used for displaying agent branding to all visitors

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { getSiteReadiness } from "@/lib/agent-site-readiness";

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

    // Detect which agent to show:
    // 1. x-agent-subdomain header (set by proxy for agent subdomains)
    // 2. hostname lookup (agent custom domains)
    // 3. Fallback to PRIMARY_AGENT_EMAIL (owner domains like jpsrealtor.com)
    const subdomain = request.nextUrl.searchParams.get("subdomain")
      || request.headers.get("x-agent-subdomain");
    const host = (request.headers.get("host") || "").split(":")[0];

    let agent;

    if (subdomain) {
      // Agent subdomain — look up by subdomain
      agent = await User.findOne({ "agentProfile.subdomain": subdomain })
        .select("name email phone licenseNumber brokerageName agentProfile")
        .lean();
    }

    // Try custom domain lookup (jpsrealtor.com → josephsardella, etc.)
    if (!agent && host && host !== 'localhost') {
      // Check agentProfile.customDomain first
      agent = await User.findOne({ "agentProfile.customDomain": host })
        .select("name email phone licenseNumber brokerageName agentProfile")
        .lean();

      // Also check DomainRegistry for mapped domains
      if (!agent) {
        try {
          const mongoose = await import('mongoose');
          const db = mongoose.default.connection.db;
          if (db) {
            const domainEntry = await db.collection('domainregistries').findOne(
              { domain: host, status: 'active' },
              { projection: { ownerId: 1 } }
            );
            if (domainEntry?.ownerId) {
              agent = await User.findById(domainEntry.ownerId)
                .select("name email phone licenseNumber brokerageName agentProfile")
                .lean();
            }
          }
        } catch { /* non-blocking */ }
      }
    }

    if (!agent) {
      // Final fallback to primary agent
      const primaryAgentEmail = process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";
      agent = await User.findOne({ email: primaryAgentEmail })
        .select("name email phone licenseNumber brokerageName agentProfile")
        .lean();
    }

    if (!agent) {
      console.error(`[GET /api/agent/public] Agent not found for subdomain=${subdomain} host=${host}`);
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 }
      );
    }

    // Extract public-facing data with fallbacks to legacy top-level fields
    // Cast agentProfile to any to access fields that may exist in DB but not in strict TS interface
    const profile = agent.agentProfile as any;
    const publicProfile = {
      _id: String((agent as any)._id),
      id: String((agent as any)._id),
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
        // Transparent PNG headshot uploaded via /agent/dashboard.
        headshot: profile?.headshot,
        coverPhoto: profile?.coverPhoto,
        insightsBannerImage: profile?.insightsBannerImage,
        heroImage: profile?.heroImage,
        heroPhoto: profile?.heroPhoto,
        // Dark-theme hero variants (used by AgentHero when the active theme is dark).
        heroImageDark: profile?.heroImageDark,
        heroPhotoDark: profile?.heroPhotoDark,
        teamLogo: profile?.teamLogo,
        brokerLogo: profile?.brokerLogo,
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
        accentColor: agent.agentProfile?.brandColors?.accent,

        // Hero customization
        heroHeadline: agent.agentProfile?.headline,
        heroStyle: profile?.heroStyle || "split",
        videoIntro: profile?.videoIntro,
        teamPhoto: profile?.teamPhoto,
        officePhoto: profile?.officePhoto,

        // Editorial content (hero + about page)
        headline: profile?.headline,
        tagline: profile?.tagline,
        personalStory: profile?.personalStory,
        valuePropositions: profile?.valuePropositions,
        testimonials: profile?.testimonials,
        stats: profile?.stats,
        certifications: profile?.certifications,
        specializations: profile?.specializations,
        serviceAreas: profile?.serviceAreas,
        businessHours: profile?.businessHours,
        officeAddress: profile?.officeAddress,
        officePhone: profile?.officePhone,
        cellPhone: profile?.cellPhone,
        youtube: agent.agentProfile?.socialMedia?.youtube,
        tiktok: agent.agentProfile?.socialMedia?.tiktok,
      },
    };

    // Check subscription status — determines if the site is live or "Coming Soon"
    const subscription = await AgentSubscription.findOne({
      agentId: (agent as any)._id,
      status: { $in: ["active", "trialing"] },
    }).select("tier status").lean();

    // Site goes live when the agent completes their profile setup (free tier —
    // no paid subscription required), OR has an active subscription, OR an admin
    // force-activated it. `getSiteReadiness` is the shared go-live checklist —
    // the same one the dashboard shows the agent. `hasActiveSubscription` keeps
    // its name for back-compat with existing consumers but now means "site live".
    const isForceActive = !!(agent.agentProfile as any)?.siteForceActive;
    const siteReadiness = getSiteReadiness(agent as any);
    const hasActiveSubscription = siteReadiness.complete || !!subscription || isForceActive;

    return NextResponse.json({
      profile: publicProfile,
      subscription: subscription ? { tier: subscription.tier, status: subscription.status } : null,
      hasActiveSubscription,
      siteReadiness,
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
