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
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  await dbConnect();

  const subdomain =
    request.nextUrl.searchParams.get("subdomain") ||
    request.headers.get("x-agent-subdomain");
  const host = (request.headers.get("host") || "").split(":")[0];

  const projection =
    "name email phone licenseNumber brokerageName " +
    "agentProfile.siteName agentProfile.teamName agentProfile.cellPhone " +
    "agentProfile.officePhone agentProfile.licenseNumber agentProfile.brokerageName " +
    "agentProfile.teamLogo agentProfile.teamLogoDark " +
    "agentProfile.brokerLogo agentProfile.brokerLogoDark";

  let agent: any = null;

  if (subdomain) {
    agent = await User.findOne({ "agentProfile.subdomain": subdomain })
      .select(projection)
      .lean();
  }

  // Try custom domain lookup (jpsrealtor.com -> Joseph, etc.)
  if (!agent && host && host !== "localhost") {
    agent = await User.findOne({ "agentProfile.customDomain": host })
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
            .findOne({ domain: host, status: "active" }, { projection: { ownerId: 1 } });
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

  return NextResponse.json({
    agentName: agent.name,
    branding: {
      agentName: agent.name,
      siteName: ap.siteName,
      email: agent.email,
      phone: ap.cellPhone || ap.officePhone || agent.phone,
      brokerageName: ap.brokerageName || agent.brokerageName,
      teamName: ap.teamName,
      licenseNumber: ap.licenseNumber || agent.licenseNumber,
      teamLogo: ap.teamLogo,
      teamLogoDark: ap.teamLogoDark,
      brokerLogo: ap.brokerLogo,
      brokerLogoDark: ap.brokerLogoDark,
    },
  });
}
