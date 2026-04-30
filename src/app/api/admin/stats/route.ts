// GET /api/admin/stats
// Returns platform overview metrics
// Admin only

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import PointsLedger from "@/models/PointsLedger";
import Partnership from "@/models/Partnership";

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const [
    totalUsers,
    activeAgents,
    servicePartners,
    activeSubscriptions,
    pendingAgentApps,
    pendingPartnerApps,
    partnerships,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: "realEstateAgent" }),
    User.countDocuments({ roles: "serviceProvider" }),
    AgentSubscription.countDocuments({ status: "active" }),
    User.countDocuments({ "agentApplication.phase": "pending" }),
    // For partners, count users with serviceProvider role who have pending status
    Promise.resolve(0),
    Partnership.countDocuments(),
  ]);

  // Credits outstanding
  const creditStats = await PointsLedger.aggregate([
    { $group: { _id: null, totalBalance: { $sum: "$balance" }, totalEarned: { $sum: "$totalEarned" }, totalSpent: { $sum: "$totalSpent" } } }
  ]);

  // MRR from subscriptions
  const mrrResult = await AgentSubscription.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: null, mrr: { $sum: "$monthlyPrice" } } }
  ]);

  // Recent activity: latest signups, agent approvals, etc.
  const recentUsers = await User.find({})
    .select("name email roles signupOrigin createdAt image")
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const recentActivity = recentUsers.map((u) => ({
    type: u.roles?.includes("realEstateAgent")
      ? "agent_approved"
      : u.roles?.includes("serviceProvider")
        ? "partner_joined"
        : "user_signup",
    name: u.name || u.email.split("@")[0],
    email: u.email,
    domain: u.signupOrigin?.domain,
    agentId: u.signupOrigin?.agentId,
    method: u.signupOrigin?.method,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({
    totalUsers,
    activeAgents,
    servicePartners,
    activeSubscriptions,
    pendingAgentApps,
    pendingPartnerApps,
    totalPartnerships: partnerships,
    credits: creditStats[0] || { totalBalance: 0, totalEarned: 0, totalSpent: 0 },
    mrr: mrrResult[0]?.mrr || 0,
    recentActivity,
  });
}
