// src/lib/domains/point.ts
//
// Make a domain resolve to an agent's site — and undo it.
//
// Host → agent resolution (resolveDomainOwner, domain-utils, /api/agent/public,
// /api/agent-branding) checks agentProfile.customDomain, then the legacy
// `domainregistries` collection ({ domain, status: "active", ownerId }). The
// newer DomainRegistry model writes `domain_registry`, which NO resolver reads
// — that's why admin-approved mappings used to fall back to the primary agent
// (JPSREALTOR) instead of the agent who owns the domain.
//
// So a self-serve domain is written to `domainregistries` (supports several
// domains per agent) and becomes agentProfile.customDomain only when the agent
// has none — never overwriting a domain they already use.

import mongoose from "mongoose";
import User from "@/models/User";

const LEGACY = "domainregistries";

export async function pointDomainAtAgent(domain: string, userId: string | mongoose.Types.ObjectId): Promise<void> {
  const ownerId = new mongoose.Types.ObjectId(String(userId));
  await mongoose.connection.db!.collection(LEGACY).updateOne(
    { domain },
    {
      $set: { domain, ownerId, status: "active", type: "agent_custom", source: "self_serve", updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  await User.updateOne(
    { _id: ownerId, $or: [{ "agentProfile.customDomain": { $exists: false } }, { "agentProfile.customDomain": { $in: [null, ""] } }] },
    { $set: { "agentProfile.customDomain": domain } }
  );
}

/** Stop resolving `domain` to this agent (the domain itself is left alone). */
export async function unpointDomain(domain: string, userId: string | mongoose.Types.ObjectId): Promise<void> {
  const ownerId = new mongoose.Types.ObjectId(String(userId));
  await mongoose.connection.db!.collection(LEGACY).updateOne(
    { domain, ownerId },
    { $set: { status: "removed", updatedAt: new Date() } }
  );
  await User.updateOne(
    { _id: ownerId, "agentProfile.customDomain": domain },
    { $unset: { "agentProfile.customDomain": "" } }
  );
}

/** True when the domain already resolves to a DIFFERENT owner. */
export async function domainOwnedByOther(domain: string, userId: string): Promise<boolean> {
  const db = mongoose.connection.db!;
  const reg = await db.collection(LEGACY).findOne({ domain, status: "active" }, { projection: { ownerId: 1 } });
  if (reg?.ownerId && String(reg.ownerId) !== String(userId)) return true;
  const other = await User.exists({
    _id: { $ne: new mongoose.Types.ObjectId(String(userId)) },
    "agentProfile.customDomain": { $in: [domain, `www.${domain}`] },
  });
  return !!other;
}
