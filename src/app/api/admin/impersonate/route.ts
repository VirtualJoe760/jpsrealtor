// GET /api/admin/impersonate?subdomain=johndoe
// Admin-only: returns agent profile data for subdomain impersonation view.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import PointsLedger from "@/models/PointsLedger";

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "subdomain parameter required" }, { status: 400 });
  }

  await dbConnect();

  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("-password")
    .populate("team", "name description")
    .lean();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Get subscription info
  const subscription = await AgentSubscription.findOne({ agentId: agent._id })
    .lean();

  // Get points/credits info
  const pointsLedger = await PointsLedger.findOne({ userId: agent._id })
    .select("balance totalEarned totalSpent tier")
    .lean();

  return NextResponse.json({
    agent: {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      image: agent.image,
      roles: agent.roles,
      brokerageName: agent.brokerageName,
      licenseNumber: agent.licenseNumber,
      profileDescription: agent.profileDescription,
      agentProfile: agent.agentProfile,
      team: agent.team,
      isTeamLeader: agent.isTeamLeader,
      createdAt: agent.createdAt,
      lastLoginAt: agent.lastLoginAt,
      signupOrigin: agent.signupOrigin,
    },
    subscription: subscription ? {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    } : null,
    credits: pointsLedger ? {
      balance: pointsLedger.balance,
      totalEarned: pointsLedger.totalEarned,
      totalSpent: pointsLedger.totalSpent,
      tier: pointsLedger.tier,
    } : null,
  });
}
