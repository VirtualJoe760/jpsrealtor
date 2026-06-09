// src/lib/domain-registry/provision.ts
// Provisioning orchestrator — when a domain is approved, registers it with all services.
// Called automatically from the admin domain approval flow.

import DomainRegistry, { IDomainRegistry } from "@/models/DomainRegistry";
import { addDomainToProject, listProjectDomains } from "@/lib/vercel-domains";
import { provisionCloudflareForDomain, CloudflareProvisionResult } from "@/lib/domain-registry/cloudflare-provision";

export interface ProvisionResult {
  domain: string;
  vercel: { success: boolean; error?: string; alreadyRegistered?: boolean };
  cloudflare: CloudflareProvisionResult | { success: boolean; error?: string };
  // Future services
  gsc: { success: boolean; error?: string };
  analytics: { success: boolean; error?: string };
  // Nameserver instructions for the admin
  nameserverInstructions?: {
    nameservers: string[];
    registrar?: string;
    message: string;
  };
}

/**
 * Provision a domain across all services.
 * Called after admin approves a domain request.
 *
 * Flow:
 *   1. Add to Vercel project (hosting + SSL)
 *   2. Add to Cloudflare (zone + DNS + cache rules + page rules + worker routes)
 *   3. Return nameserver instructions if NS update is needed
 *   4. Future: GSC, GA4, Ads
 */
export async function provisionDomain(registryId: string): Promise<ProvisionResult> {
  const registry = await DomainRegistry.findById(registryId);
  if (!registry) throw new Error(`DomainRegistry record not found: ${registryId}`);

  const result: ProvisionResult = {
    domain: registry.domain,
    vercel: { success: false },
    cloudflare: { success: false },
    gsc: { success: false, error: "Not yet implemented" },
    analytics: { success: false, error: "Not yet implemented" },
  };

  // Run Vercel and Cloudflare provisioning in parallel
  const [vercelResult, cloudflareResult] = await Promise.allSettled([
    provisionVercel(registry),
    provisionCloudflareForDomain(registry.domain),
  ]);

  // Process Vercel result
  if (vercelResult.status === "fulfilled") {
    result.vercel = vercelResult.value;
  } else {
    result.vercel = { success: false, error: vercelResult.reason?.message || "Unknown error" };
  }

  // Process Cloudflare result and update registry.
  // Always stamp the attempt time so the admin UI can show "last tried".
  registry.cloudflare.lastAttemptAt = new Date();
  if (cloudflareResult.status === "fulfilled") {
    const cfResult = cloudflareResult.value;
    result.cloudflare = cfResult;

    if (cfResult.success && cfResult.zoneId) {
      registry.cloudflare.registered = true;
      registry.cloudflare.zoneId = cfResult.zoneId;
      registry.cloudflare.nameservers = cfResult.nameservers;
      registry.cloudflare.status = "pending"; // Pending until nameservers updated at registrar
      registry.cloudflare.nameserversUpdated = false;
      registry.cloudflare.registeredAt = new Date();
      registry.cloudflare.lastError = undefined;

      // Determine registrar from purchase info
      if (registry.purchase.purchasedViaVercel) {
        registry.cloudflare.registrar = "Vercel";
      }

      // Build nameserver instructions for the admin
      if (cfResult.nameservers && cfResult.nameservers.length > 0) {
        result.nameserverInstructions = {
          nameservers: cfResult.nameservers,
          registrar: registry.cloudflare.registrar,
          message: `Update nameservers at ${registry.cloudflare.registrar || "your registrar"} to:\n${cfResult.nameservers.map((ns) => `  - ${ns}`).join("\n")}\n\nCloudflare zone will activate once nameservers propagate (usually 15min–24hrs).`,
        };
      }
    } else if (cfResult.success && !cfResult.zoneId) {
      // Subdomain case — inherits parent zone, no NS update needed
      registry.cloudflare.registered = true;
      registry.cloudflare.nameserversUpdated = true;
      registry.cloudflare.status = "active";
      registry.cloudflare.lastError = undefined;
    } else {
      // Provisioning ran but failed (e.g., the CF token lacks Zone:Create → 403).
      // Persist the reason so it survives past the approval toast — otherwise the
      // failure silently vanishes once the row leaves the Pending tab, leaving the
      // domain stuck with no Cloudflare caching and no visible error.
      // NOTE: the domain can still go live via the Vercel CNAME; CF is the cache layer.
      registry.cloudflare.registered = false;
      registry.cloudflare.status = "failed";
      registry.cloudflare.lastError = cfResult.error || "Cloudflare provisioning failed";
    }
  } else {
    const msg = cloudflareResult.reason?.message || "Unknown error";
    result.cloudflare = { success: false, error: msg };
    registry.cloudflare.registered = false;
    registry.cloudflare.status = "failed";
    registry.cloudflare.lastError = msg;
  }

  // Update overall status
  if (result.vercel.success) {
    registry.status = "active";
  }
  registry.markModified("vercel");
  registry.markModified("cloudflare");
  await registry.save();

  return result;
}

/**
 * Register domain with Vercel project.
 */
async function provisionVercel(
  registry: IDomainRegistry
): Promise<{ success: boolean; error?: string; alreadyRegistered?: boolean }> {
  try {
    // Check if already on Vercel
    const existing = await listProjectDomains();
    const found = existing.find(
      (d) => d.name === registry.domain || d.apexName === registry.domain
    );

    if (found) {
      registry.vercel.registered = true;
      registry.vercel.verified = found.verified;
      registry.vercel.domainId = found.name;
      registry.vercel.registeredAt = registry.vercel.registeredAt || new Date();
      if (found.verified) {
        registry.vercel.dnsConfigured = true;
        registry.vercel.sslStatus = "issued";
        registry.vercel.verifiedAt = new Date();
      }
      return { success: true, alreadyRegistered: true };
    }

    // Add to Vercel
    const vercelDomain = await addDomainToProject(registry.domain);
    registry.vercel.registered = true;
    registry.vercel.verified = vercelDomain.verified;
    registry.vercel.domainId = vercelDomain.name;
    registry.vercel.sslStatus = vercelDomain.verified ? "issued" : "pending";
    registry.vercel.dnsConfigured = vercelDomain.verified;
    registry.vercel.registeredAt = new Date();

    if (vercelDomain.verification) {
      registry.vercel.dnsRecords = vercelDomain.verification.map((v) => ({
        type: v.type,
        name: v.domain,
        value: v.value,
      }));
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // "already exists" is not a real error
    if (msg.includes("already") || msg.includes("409")) {
      registry.vercel.registered = true;
      return { success: true, alreadyRegistered: true };
    }
    return { success: false, error: msg };
  }
}

/**
 * Check provisioning status for a domain across all services.
 */
export async function checkProvisionStatus(registryId: string): Promise<{
  domain: string;
  vercel: { registered: boolean; verified: boolean; ssl: string };
  cloudflare: { registered: boolean; status: string; nameserversUpdated: boolean; nameservers: string[] };
  gsc: { registered: boolean; verified: boolean };
  analytics: { enabled: boolean };
}> {
  const registry = await DomainRegistry.findById(registryId);
  if (!registry) throw new Error(`DomainRegistry record not found: ${registryId}`);

  return {
    domain: registry.domain,
    vercel: {
      registered: registry.vercel.registered,
      verified: registry.vercel.verified,
      ssl: registry.vercel.sslStatus,
    },
    cloudflare: {
      registered: registry.cloudflare.registered,
      status: registry.cloudflare.status || "none",
      nameserversUpdated: registry.cloudflare.nameserversUpdated,
      nameservers: registry.cloudflare.nameservers || [],
    },
    gsc: {
      registered: registry.gsc.registered,
      verified: registry.gsc.verified,
    },
    analytics: {
      enabled: registry.analytics.gaEnabled,
    },
  };
}
