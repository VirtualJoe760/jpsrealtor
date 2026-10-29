// src/lib/subscription-helpers.ts
// Small helpers to resolve an agent's subscription tier for feature-gating.
//
// Source of truth: AgentSubscription.tier — NOT User.subscriptionTier (that field
// is the legacy CLIENT/consumer tier and is unrelated to agent plans). When an
// agent has no AgentSubscription record they are treated as "free".
//
// Used by: NextAuth JWT callback (to stamp agentTier onto the session), the
// free-tier nav/settings gating, and the server-side paid-feature route guards.

import dbConnect from "@/lib/mongoose";
import AgentSubscription, { type SubscriptionTier } from "@/models/AgentSubscription";
import User from "@/models/User";

export type { SubscriptionTier };

/**
 * Resolve an agent's current subscription tier.
 * Returns "free" when there is no subscription record. Prefers the most recent
 * active record (sort mirrors /api/stripe/subscription).
 */
export async function getAgentTier(userId: string): Promise<SubscriptionTier> {
  await dbConnect();
  const sub = await AgentSubscription.findOne({ agentId: userId })
    .sort({ status: 1, updatedAt: -1 })
    .select("tier")
    .lean<{ tier?: SubscriptionTier } | null>();
  const tier = sub?.tier ?? "free";
  if (tier !== "free") return tier;
  // Agents who existed when paid onboarding began (2026-10-28) keep Basic
  // ("beginner") access free forever. Resolving them HERE means every gate —
  // JWT agentTier, the portal pay-wall in src/proxy.ts, isFreeTier route
  // guards, Settings steps — treats them as Basic without its own check.
  const grandfathered = await User.exists({ _id: userId, "agentProfile.grandfathered": true });
  return grandfathered ? "beginner" : "free";
}

/** True when the agent is on the free tier (or has no subscription record). */
export async function isFreeTier(userId: string): Promise<boolean> {
  return (await getAgentTier(userId)) === "free";
}

/** True when the agent is on any paid tier (beginner / experienced / topagent). */
export async function hasPaidTier(userId: string): Promise<boolean> {
  return (await getAgentTier(userId)) !== "free";
}
