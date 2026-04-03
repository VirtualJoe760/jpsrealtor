// src/app/api/agent/domains/[domainId]/route.ts
// Get details or delete a specific domain mapping

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";
import User from "@/models/User";
import {
  removeDomainFromProject,
  checkDomainConfig,
} from "@/services/vercel-domains";

/**
 * GET /api/agent/domains/[domainId]
 * Returns details and live DNS status for a specific domain mapping.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { domainId } = await params;

  const mapping = await DomainMapping.findById(domainId).lean();
  if (!mapping) {
    return NextResponse.json({ error: "Domain mapping not found" }, { status: 404 });
  }

  // Verify ownership
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user || String(mapping.agentId) !== String(user._id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check live DNS status from Vercel
  let dnsStatus = null;
  try {
    dnsStatus = await checkDomainConfig(mapping.domain);
  } catch (error: any) {
    console.error("[Domain Check] Vercel API error:", error.message);
  }

  return NextResponse.json({
    mapping,
    dnsStatus,
  });
}

/**
 * DELETE /api/agent/domains/[domainId]
 * Removes a domain mapping and unregisters from Vercel.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { domainId } = await params;

  const mapping = await DomainMapping.findById(domainId);
  if (!mapping) {
    return NextResponse.json({ error: "Domain mapping not found" }, { status: 404 });
  }

  // Verify ownership
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user || String(mapping.agentId) !== String(user._id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Remove from Vercel
  try {
    await removeDomainFromProject(mapping.domain);
  } catch (error: any) {
    console.error("[Domain Remove] Vercel API error:", error.message);
    // Continue with deletion even if Vercel removal fails
  }

  // Delete the mapping
  await DomainMapping.findByIdAndDelete(domainId);

  return NextResponse.json({
    message: `Domain ${mapping.domain} removed successfully`,
  });
}
