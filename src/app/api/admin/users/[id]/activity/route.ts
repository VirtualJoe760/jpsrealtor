// GET /api/admin/users/[id]/activity
// Admin view of one user's site browsing (every site) plus who they signed up
// with. Agents get the same data scoped to their own sites from
// /api/crm/contacts/[id]/activity.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { summarizeVisitorActivity } from "@/lib/visitor-activity";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await dbConnect();
  const me: any = await User.findOne({ email: session.user.email }).select("isAdmin").lean();
  if (!me?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400, headers: NO_STORE });
  }

  const user: any = await User.findById(id).select("signupOrigin createdAt").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  let signupAgent: { id: string; name: string; email: string } | null = null;
  if (user.signupOrigin?.agentId) {
    const agent: any = await User.findById(user.signupOrigin.agentId).select("name email").lean();
    if (agent) signupAgent = { id: String(agent._id), name: agent.name || agent.email, email: agent.email };
  }

  const activity = await summarizeVisitorActivity({ userId: id });
  return NextResponse.json(
    { signupOrigin: user.signupOrigin || null, signupAgent, activity },
    { headers: NO_STORE }
  );
}
