// src/app/api/agent/domains/verify/route.ts
// "Check DNS" for a domain the agent connected.
//
// Homepage domains go live here the moment DNS points at us — the host starts
// resolving to the agent (src/lib/domains/connect.ts). City/subdivision
// mappings only get their DNS flags updated; their admin flow is unchanged.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import User from "@/models/User";
import { checkConnectedDomain } from "@/lib/domains/connect";
import { getDnsStatus } from "@/lib/domains/registrar";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const { domainId } = await req.json().catch(() => ({}));
  if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

  const mapping = await DomainMapping.findById(domainId);
  if (!mapping) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const user = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>();
  if (!user || String(mapping.agentId) !== String(user._id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    if (mapping.mappingType === "agent_landing") {
      const { mapping: m, records, live } = await checkConnectedDomain(mapping);
      return NextResponse.json({
        mapping: m,
        records,
        live,
        message: live
          ? `${m.domain} is live on your site.`
          : "Not pointed here yet. DNS changes usually take a few minutes, sometimes up to 48 hours.",
      });
    }
    const { configured, records } = await getDnsStatus(mapping.domain);
    mapping.dnsConfigured = configured;
    if (configured) mapping.dnsVerifiedAt = new Date();
    await mapping.save();
    return NextResponse.json({ mapping, records, live: false });
  } catch (error) {
    console.error("[DNS Verify] error:", (error as Error).message);
    return NextResponse.json({ error: "Couldn't check DNS right now" }, { status: 502 });
  }
}
