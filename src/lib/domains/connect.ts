// src/lib/domains/connect.ts
//
// Connect a domain the agent ALREADY OWNS (free with Basic, 2026-10-28).
//
// No admin approval: the agent attaches the domain, adds two DNS records at
// their own registrar, and the domain goes live once Vercel sees those records.
// Pointing DNS at us is the proof of ownership — someone who doesn't control
// the domain can't make it resolve here. Only then does the host resolve to
// the agent (pointDomainAtAgent).
//
// Replaces the old request → admin approve → Cloudflare-nameserver flow for
// homepage domains. That flow wrote `domain_registry`, which no resolver reads,
// so approved domains showed the PRIMARY agent's site. City/subdivision
// mappings still use the admin flow.

import DomainMapping, { IDomainMapping } from "@/models/DomainMapping";
import { addDomainToProject, VercelApiError } from "@/lib/vercel-domains";
import { getDnsStatus, getProjectVerification, DnsRecord } from "@/lib/domains/registrar";
import { pointDomainAtAgent, domainOwnedByOther } from "@/lib/domains/point";
import { isPlatformDomain } from "@/lib/domain-classify";

export class ConnectError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Hosts nobody may claim: the platform itself and its subdomains, Vercel's. */
function isReserved(domain: string): boolean {
  return (
    isPlatformDomain(domain) ||
    domain === "chatrealty.io" ||
    domain.endsWith(".chatrealty.io") ||
    domain.endsWith(".vercel.app") ||
    domain.endsWith(".localhost")
  );
}

async function attach(host: string): Promise<void> {
  try {
    await addDomainToProject(host);
  } catch (error) {
    // 409 domain_already_in_use = already attached to one of OUR projects
    // (e.g. reconnecting). Ownership is decided by verification, not here.
    if (error instanceof VercelApiError && error.status === 409) return;
    throw error;
  }
}

export async function connectExistingDomain(
  domain: string,
  agent: { _id: unknown; email: string }
): Promise<{ mapping: IDomainMapping; records: DnsRecord[]; live: boolean }> {
  const agentId = String(agent._id);
  if (isReserved(domain)) throw new ConnectError(400, "That domain can't be connected.");
  if (await domainOwnedByOther(domain, agentId)) throw new ConnectError(409, "That domain is already connected to another agent.");

  const existing = await DomainMapping.findOne({ domain });
  if (existing && String(existing.agentId) !== agentId) {
    throw new ConnectError(409, "That domain is already connected to another agent.");
  }

  await attach(domain);
  await attach(`www.${domain}`);

  const mapping =
    existing ||
    (await DomainMapping.create({
      domain,
      agentId: agent._id,
      agentEmail: agent.email,
      mappingType: "agent_landing",
      targetPath: "/",
      status: "pending_dns",
      sslStatus: "not_started",
      dnsConfigured: false,
      purchasedViaVercel: false,
    }));
  return checkConnectedDomain(mapping);
}

/** Re-check DNS; goes live (resolves to the agent) the moment it's correct. */
export async function checkConnectedDomain(
  mapping: IDomainMapping
): Promise<{ mapping: IDomainMapping; records: DnsRecord[]; live: boolean }> {
  const [{ configured, records: pointRecords }, verification] = await Promise.all([
    getDnsStatus(mapping.domain),
    getProjectVerification(mapping.domain),
  ]);
  // Live only when BOTH hold: DNS points here, and Vercel has verified this
  // project may serve the domain (a TXT challenge when another Vercel account
  // has it). DNS alone isn't ownership — see getProjectVerification().
  const records = [...pointRecords, ...verification.txt];
  const isLive = configured && verification.verified;
  if (isLive) await pointDomainAtAgent(mapping.domain, String(mapping.agentId));

  // Atomic update, not doc.save(): two "Check DNS" clicks (or connect +
  // check) racing on one mapping made the second save() throw a VersionError.
  const set: Record<string, unknown> = { dnsRecords: records };
  if (isLive) {
    Object.assign(set, {
      status: "active",
      dnsConfigured: true,
      vercelVerified: true,
      sslStatus: "issued", // Vercel issues SSL automatically once DNS resolves
      dnsVerifiedAt: mapping.dnsVerifiedAt || new Date(),
    });
  } else if (mapping.status !== "active") {
    Object.assign(set, { status: "pending_dns", dnsConfigured: false });
  }
  const updated = await DomainMapping.findByIdAndUpdate(mapping._id, { $set: set }, { new: true });
  return { mapping: updated || mapping, records, live: isLive };
}
