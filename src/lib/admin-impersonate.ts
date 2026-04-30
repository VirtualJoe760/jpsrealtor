// src/lib/admin-impersonate.ts
// Server-side utility: when an admin visits an agent's subdomain,
// resolve which agent they're viewing so agent pages can load that agent's data.

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export interface ImpersonationContext {
  /** True if an admin is viewing another agent's pages */
  isImpersonating: boolean;
  /** The agent being viewed (if impersonating), or the logged-in user */
  agentId: string;
  agentEmail: string;
  agentName: string;
  /** The subdomain being viewed */
  subdomain?: string;
}

/**
 * For API routes: check if the request is an admin impersonating an agent.
 * Returns the target agent's userId if impersonating, otherwise the session user's ID.
 */
export async function resolveAgentForRequest(
  sessionEmail: string,
  requestHeaders?: Headers
): Promise<{ agentUserId: string; isImpersonating: boolean; subdomain?: string }> {
  await dbConnect();

  const user = await User.findOne({ email: sessionEmail }).select("_id isAdmin").lean();
  if (!user) throw new Error("User not found");

  // Check for subdomain header
  const hdrs = requestHeaders || (await headers());
  const subdomain = hdrs.get("x-agent-subdomain");

  if (subdomain && user.isAdmin) {
    // Admin is on an agent's subdomain — find that agent
    const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
      .select("_id")
      .lean();

    if (agent && agent._id.toString() !== user._id.toString()) {
      return {
        agentUserId: agent._id.toString(),
        isImpersonating: true,
        subdomain,
      };
    }
  }

  return {
    agentUserId: user._id.toString(),
    isImpersonating: false,
  };
}
