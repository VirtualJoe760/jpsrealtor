// GET /api/agent-branding?subdomain=bethanyklier
// Public endpoint — returns agent branding data for sidebar/footer display.
// No authentication required (needed for unauthenticated visitors on agent subdomains).

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "subdomain required" }, { status: 400 });
  }

  await dbConnect();

  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("name email phone licenseNumber brokerageName agentProfile.siteName agentProfile.teamName agentProfile.cellPhone agentProfile.officePhone agentProfile.teamLogo agentProfile.teamLogoDark agentProfile.brokerLogo agentProfile.brokerLogoDark")
    .lean();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const ap = (agent as any).agentProfile || {};

  return NextResponse.json({
    agentName: agent.name,
    branding: {
      agentName: agent.name,
      siteName: ap.siteName,
      email: agent.email,
      phone: ap.cellPhone || ap.officePhone || agent.phone,
      brokerageName: agent.brokerageName,
      teamName: ap.teamName,
      licenseNumber: agent.licenseNumber,
      teamLogo: ap.teamLogo,
      teamLogoDark: ap.teamLogoDark,
      brokerLogo: ap.brokerLogo,
      brokerLogoDark: ap.brokerLogoDark,
    },
  });
}
