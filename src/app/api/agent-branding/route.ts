// GET /api/agent-branding
// Public endpoint — returns agent branding data for sidebar/footer display.
// No authentication required (needed for unauthenticated visitors).
//
// Resolution order (mirrors /api/agent/public so apex domains like
// jpsrealtor.com get the right branding too, not just *.chatrealty.io
// subdomains):
//   1. ?subdomain=X query param
//   2. x-agent-subdomain header (set by proxy for agent subdomains)
//   3. host header lookup (agentProfile.customDomain or DomainRegistry)
//   4. PRIMARY_AGENT_EMAIL fallback (owner domains)

import { NextRequest, NextResponse } from "next/server";
import { parseOgSubdomain } from "@/lib/og-image-source";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
  } catch (err: any) {
    // The database being unreachable is an upstream dependency failing, not a
    // fault in this route's logic. It used to escape as an unhandled throw,
    // which Next.js turned into a bare 500 with a stack trace that never named
    // the cause — four separate debugging rounds on 2026-10-11 all started
    // here and the real answer was a rotated MONGODB_URI password.
    //
    // 503 (not 200-with-empty-branding) is deliberate: an empty 200 would be
    // indistinguishable from "this agent has genuinely set no brokerage", and
    // every consumer would render blank as though that were the truth.
    // no-store because vercel.json's /api/(.*) header does not apply in local
    // dev, and a cached error would outlive the outage.
    console.error(
      "[agent-branding] database unavailable:",
      err?.name,
      err?.codeName || err?.code || "",
      err?.message,
    );
    return NextResponse.json(
      { error: "Branding temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const subdomain =
    request.nextUrl.searchParams.get("subdomain") ||
    request.headers.get("x-agent-subdomain") ||
    // Parse it from the HOST as a last resort. Without this the route
    // only resolved correctly when the caller happened to pass
    // ?subdomain= (the sidebar does; nothing else has to), so a direct
    // call on bethanyklier.chatrealty.io fell through to the primary-agent
    // fallback and returned JOSEPH's name and DRE — the wrong license on
    // another agent's site. Caught by scripts/smoke-domains.mjs.
    parseOgSubdomain((request.headers.get("host") || "").split(":")[0].toLowerCase());
  const host = (request.headers.get("host") || "").split(":")[0];

  const projection =
    "name email phone licenseNumber brokerageName teamName " +
    "agentProfile.siteName agentProfile.teamName agentProfile.cellPhone " +
    "agentProfile.officePhone agentProfile.licenseNumber agentProfile.brokerageName " +
    "agentProfile.teamLogo agentProfile.teamLogoDark " +
    "agentProfile.brokerLogo agentProfile.brokerLogoDark " +
    "agentProfile.navLogo agentProfile.navLogoDark agentProfile.navWordmark agentProfile.brandMark " +
    "agentProfile.affiliation agentProfile.brokerage";

  let agent: any = null;

  if (subdomain) {
    agent = await User.findOne({ "agentProfile.subdomain": subdomain })
      .select(projection)
      .lean();
  }

  // Try custom domain lookup (jpsrealtor.com -> Joseph, etc.) — with and
  // without www so both host forms resolve identically.
  const bareHost = host.replace(/^www\./, "");
  if (!agent && host && host !== "localhost") {
    agent = await User.findOne({
      "agentProfile.customDomain": { $in: [host, bareHost, `www.${bareHost}`] },
    })
      .select(projection)
      .lean();

    // Also check DomainRegistry for mapped domains.
    if (!agent) {
      try {
        const mongoose = await import("mongoose");
        const db = mongoose.default.connection.db;
        if (db) {
          const domainEntry = await db
            .collection("domainregistries")
            .findOne({ domain: { $in: [host, bareHost] }, status: "active" }, { projection: { ownerId: 1 } });
          if (domainEntry?.ownerId) {
            agent = await User.findById(domainEntry.ownerId).select(projection).lean();
          }
        }
      } catch {
        /* non-blocking */
      }
    }
  }

  // Final fallback to the primary agent (owner of the platform).
  if (!agent) {
    const primaryAgentEmail =
      process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";
    agent = await User.findOne({ email: primaryAgentEmail }).select(projection).lean();
  }

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const ap = agent.agentProfile || {};
  const brk = ap.brokerage || {};

  // AFFILIATION decides whether the team slots mean anything. A solo agent has
  // a brokerage and no team, so their team fields are suppressed here rather
  // than left to each consumer — NavBrandMark renders agentProfile.teamLogo
  // whenever it is truthy, so a stale logo from a former team would otherwise
  // keep showing in the nav long after the agent left it.
  const isTeam = ap.affiliation === "team";

  // Brokerage resolution, newest model first. The legacy pair is the migration
  // fallback for agents not yet moved onto agentProfile.brokerage.
  const brokerageName = brk.name || ap.brokerageName || agent.brokerageName;

  return NextResponse.json({
    agentName: agent.name,
    branding: {
      agentName: agent.name,
      siteName: ap.siteName,
      email: agent.email,
      phone: ap.cellPhone || ap.officePhone || agent.phone,
      affiliation: ap.affiliation || "solo",
      brokerageName,
      // Legal entity for compliance copy; falls back to the display name.
      brokerageLegalName: brk.legalName || brokerageName,
      teamName: isTeam ? ap.teamName || agent.teamName : null,
      licenseNumber: ap.licenseNumber || agent.licenseNumber,
      teamLogo: isTeam ? ap.teamLogo : null,
      teamLogoDark: isTeam ? ap.teamLogoDark : null,
      // The nav mark is NOT affiliation-gated — it is the agent's own site
      // brand. Falling back to the team pair keeps agents who set a nav logo
      // before navLogo existed working, but only while they are still on a
      // team; for a solo agent the team pair is exactly the stale ex-team
      // artwork we are suppressing above.
      navWordmark: ap.navWordmark?.thin || ap.navWordmark?.bold ? ap.navWordmark : null,
      brandMark: ap.brandMark?.thin || ap.brandMark?.bold ? ap.brandMark : null,
      navLogo: ap.navLogo || (isTeam ? ap.teamLogo : null),
      navLogoDark: ap.navLogoDark || (isTeam ? ap.teamLogoDark : null),
      brokerLogo: brk.logo || ap.brokerLogo,
      brokerLogoDark: brk.logoDark || ap.brokerLogoDark,
    },
  });
}
