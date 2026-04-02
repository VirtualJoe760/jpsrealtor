// src/app/api/agent/domains/verify/route.ts
// Verify DNS configuration for a domain mapping

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import User from "@/models/User";
import { checkDomainConfig, getDnsInstructions } from "@/services/vercel-domains";

/**
 * POST /api/agent/domains/verify
 * Body: { domainId: string }
 *
 * Checks DNS configuration via Vercel API and updates the mapping status.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { domainId } = await req.json();
  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const mapping = await DomainMapping.findById(domainId);
  if (!mapping) {
    return NextResponse.json({ error: "Domain mapping not found" }, { status: 404 });
  }

  // Verify ownership
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user || String(mapping.agentId) !== String(user._id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check DNS via Vercel
  let dnsStatus;
  try {
    dnsStatus = await checkDomainConfig(mapping.domain);
  } catch (error: any) {
    console.error("[DNS Verify] Vercel API error:", error.message);
    return NextResponse.json(
      { error: "Failed to check DNS configuration", details: error.message },
      { status: 502 }
    );
  }

  // Update mapping based on DNS check
  if (dnsStatus.configured) {
    mapping.dnsConfigured = true;
    mapping.dnsVerifiedAt = new Date();
    mapping.status = "active";
    mapping.sslStatus = "issued"; // Vercel auto-provisions SSL once DNS is correct
    mapping.vercelVerified = true;
  } else {
    mapping.dnsConfigured = false;
    mapping.status = mapping.status === "active" ? "active" : "pending_dns";
  }

  await mapping.save();

  const dnsInstructions = getDnsInstructions(mapping.domain);

  return NextResponse.json({
    mapping,
    dnsStatus,
    dnsInstructions,
    message: dnsStatus.configured
      ? "DNS is configured correctly. Your domain is active!"
      : "DNS is not yet configured. Please update your DNS records.",
  });
}
