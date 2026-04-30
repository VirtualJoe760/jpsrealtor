// src/lib/domain-registry/cloudflare-provision.ts
// Utility to register domains on Cloudflare and replicate the caching setup
// from jpsrealtor.com (the primary site).
//
// What gets replicated per domain:
//   1. Zone creation (add domain to Cloudflare account)
//   2. DNS records (CNAME → Vercel for hosting)
//   3. Cache rules (API edge TTL 5min, images 1yr)
//   4. Page rules (bypass cache for /api/auth/*, /auth/*, /dashboard*)
//   5. Worker routes (listings-api + images-transform)
//
// Usage:
//   import { provisionCloudflareForDomain } from "@/lib/domain-registry/cloudflare-provision";
//   const result = await provisionCloudflareForDomain("mynewdomain.com");
//
// Or bulk:
//   const results = await provisionAllUnregisteredDomains();

import DomainRegistry, { IDomainRegistry } from "@/models/DomainRegistry";
import {
  addZone,
  findZoneByName,
  createDnsRecord,
  listDnsRecords,
  CloudflareZone,
} from "@/lib/cloudflare";

// ── Config ─────────────────────────────────────────────────────────

// Cloudflare account info (from docs/deployment/CLOUDFLARE_DEPLOYMENT_COMPLETE.md)
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "cd0533e7f970b37ee8c80d293389e169";

// Workers already deployed on the account
const WORKERS = {
  listingsApi: "jpsrealtor-listings-api",
  imagesTransform: "jpsrealtor-images",
};

function getToken(): string {
  const token =
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.JPSREALTOR_WORKS_DEPLOYMENT_API_TOKEN;
  if (!token) throw new Error("No Cloudflare API token found. Set CLOUDFLARE_API_TOKEN in .env.local");
  return token;
}

function cfHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

const CF_API = "https://api.cloudflare.com/client/v4";

// ── Types ──────────────────────────────────────────────────────────

export interface CloudflareProvisionResult {
  domain: string;
  success: boolean;
  zoneId?: string;
  nameservers?: string[];
  steps: {
    zone: StepResult;
    dns: StepResult;
    cacheRules: StepResult;
    pageRules: StepResult;
    workerRoutes: StepResult;
  };
  error?: string;
}

interface StepResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  details?: string;
}

// ── Main Function ──────────────────────────────────────────────────

/**
 * Full Cloudflare provisioning for a single domain.
 * Creates zone, DNS, cache rules, page rules, and worker routes —
 * replicating the same setup as jpsrealtor.com.
 */
export async function provisionCloudflareForDomain(
  domain: string,
  options?: {
    skipWorkerRoutes?: boolean; // Skip if workers aren't needed (e.g., subdomain)
    skipPageRules?: boolean;
    dryRun?: boolean;
  }
): Promise<CloudflareProvisionResult> {
  const result: CloudflareProvisionResult = {
    domain,
    success: false,
    steps: {
      zone: { success: false },
      dns: { success: false },
      cacheRules: { success: false },
      pageRules: { success: false },
      workerRoutes: { success: false },
    },
  };

  const apexDomain = getApexDomain(domain);
  const isSubdomain = domain !== apexDomain;

  // Agent subdomains (*.chatrealty.io) don't need their own zone
  if (domain.endsWith(".chatrealty.io") && domain !== "chatrealty.io") {
    result.steps.zone = { success: true, skipped: true, details: "Subdomain uses parent zone" };
    result.steps.dns = { success: true, skipped: true, details: "Wildcard DNS handles subdomains" };
    result.steps.cacheRules = { success: true, skipped: true, details: "Inherits parent zone rules" };
    result.steps.pageRules = { success: true, skipped: true, details: "Inherits parent zone rules" };
    result.steps.workerRoutes = { success: true, skipped: true, details: "Inherits parent zone routes" };
    result.success = true;
    return result;
  }

  if (options?.dryRun) {
    console.log(`[DRY RUN] Would provision Cloudflare for: ${domain} (apex: ${apexDomain})`);
    result.success = true;
    return result;
  }

  try {
    // Step 1: Create or find zone
    let zone: CloudflareZone;
    try {
      const existing = await findZoneByName(apexDomain);
      if (existing) {
        zone = existing;
        result.steps.zone = { success: true, skipped: true, details: `Zone already exists: ${existing.id}` };
      } else {
        zone = await addZone(apexDomain);
        result.steps.zone = { success: true, details: `Created zone: ${zone.id}` };
      }
      result.zoneId = zone.id;
      result.nameservers = zone.name_servers;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      result.steps.zone = { success: false, error: msg };
      result.error = `Zone creation failed: ${msg}`;
      return result;
    }

    // Steps 2-5 run in parallel (they're independent once we have the zone)
    const [dnsResult, cacheResult, pageResult, workerResult] = await Promise.allSettled([
      setupDnsRecords(zone.id, domain, isSubdomain),
      setupCacheRules(zone.id, apexDomain),
      options?.skipPageRules ? Promise.resolve({ success: true, skipped: true } as StepResult) : setupPageRules(zone.id, apexDomain),
      options?.skipWorkerRoutes ? Promise.resolve({ success: true, skipped: true } as StepResult) : setupWorkerRoutes(zone.id, apexDomain),
    ]);

    result.steps.dns = dnsResult.status === "fulfilled" ? dnsResult.value : { success: false, error: (dnsResult as PromiseRejectedResult).reason?.message };
    result.steps.cacheRules = cacheResult.status === "fulfilled" ? cacheResult.value : { success: false, error: (cacheResult as PromiseRejectedResult).reason?.message };
    result.steps.pageRules = pageResult.status === "fulfilled" ? pageResult.value : { success: false, error: (pageResult as PromiseRejectedResult).reason?.message };
    result.steps.workerRoutes = workerResult.status === "fulfilled" ? workerResult.value : { success: false, error: (workerResult as PromiseRejectedResult).reason?.message };

    // Success if zone + DNS worked (cache/page/worker are nice-to-have)
    result.success = result.steps.zone.success && result.steps.dns.success;

    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    result.error = msg;
    return result;
  }
}

// ── Step 2: DNS Records ───────────────────────────────────────────

async function setupDnsRecords(zoneId: string, domain: string, isSubdomain: boolean): Promise<StepResult> {
  try {
    const existingRecords = await listDnsRecords(zoneId);
    const created: string[] = [];
    const skipped: string[] = [];

    // Required records for Vercel hosting
    const records = [
      // Root domain → Vercel
      {
        type: "CNAME",
        name: isSubdomain ? domain : "@",
        content: "cname.vercel-dns.com",
        proxied: false, // Must be unproxied for Vercel SSL verification
      },
      // www → Vercel
      ...(!isSubdomain
        ? [
            {
              type: "CNAME" as const,
              name: "www",
              content: "cname.vercel-dns.com",
              proxied: false,
            },
          ]
        : []),
    ];

    for (const record of records) {
      // Check if record already exists
      const exists = existingRecords.some(
        (r) =>
          r.type === record.type &&
          (r.name === record.name || r.name === `${record.name}.${domain}` || r.name === domain)
      );

      if (exists) {
        skipped.push(`${record.type} ${record.name}`);
        continue;
      }

      try {
        await createDnsRecord(zoneId, record);
        created.push(`${record.type} ${record.name}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        // Record already exists errors are fine
        if (msg.includes("already exists") || msg.includes("81057")) {
          skipped.push(`${record.type} ${record.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      details: `Created: ${created.join(", ") || "none"}. Skipped: ${skipped.join(", ") || "none"}`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

// ── Step 3: Cache Rules ────────────────────────────────────────────
// Replicates the cache setup from jpsrealtor.com:
//   - API routes: 5 minute edge + browser TTL
//   - Image routes: 1 year (immutable)

async function setupCacheRules(zoneId: string, domain: string): Promise<StepResult> {
  try {
    const res = await fetch(`${CF_API}/zones/${zoneId}/rulesets`, {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify({
        name: `${domain} Cache Rules`,
        kind: "zone",
        phase: "http_request_cache_settings",
        rules: [
          {
            action: "set_cache_settings",
            description: "API listings cache (5 min edge TTL)",
            expression: '(http.request.uri.path matches "^/api/(mls-listings|cities|subdivisions|market-stats|unified-listings|map-clusters|photos|listing|search|query|stats|california-stats)")',
            action_parameters: {
              edge_ttl: { mode: "override_origin", default: 300 },
              browser_ttl: { mode: "override_origin", default: 300 },
              cache_key: {
                custom_key: {
                  query_string: { include: "*" },
                },
              },
            },
          },
          {
            action: "set_cache_settings",
            description: "Images cache (1 year, immutable)",
            expression: '(http.request.uri.path matches "^/images/")',
            action_parameters: {
              edge_ttl: { mode: "override_origin", default: 31536000 },
              browser_ttl: { mode: "override_origin", default: 31536000 },
            },
          },
        ],
      }),
    });

    const data = await res.json();
    if (!data.success) {
      const errMsg = data.errors?.map((e: { message: string }) => e.message).join("; ") || "Unknown error";
      // "phase already has a ruleset" means rules exist already
      if (errMsg.includes("already") || errMsg.includes("exists")) {
        return { success: true, skipped: true, details: "Cache ruleset already exists" };
      }
      return { success: false, error: errMsg };
    }

    return { success: true, details: `Ruleset created: ${data.result?.id}` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

// ── Step 4: Page Rules ─────────────────────────────────────────────
// Bypass cache for auth, user sessions, and dashboard
// Critical: without these, NextAuth breaks

async function setupPageRules(zoneId: string, domain: string): Promise<StepResult> {
  const rules = [
    { pattern: `*${domain}/api/auth/*`, setting: "bypass", priority: 1 },
    { pattern: `*${domain}/auth/*`, setting: "bypass", priority: 2 },
    { pattern: `*${domain}/dashboard*`, setting: "bypass", priority: 3 },
  ];

  const created: string[] = [];
  const errors: string[] = [];

  for (const rule of rules) {
    try {
      const res = await fetch(`${CF_API}/zones/${zoneId}/pagerules`, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
          targets: [
            {
              target: "url",
              constraint: { operator: "matches", value: rule.pattern },
            },
          ],
          actions: [
            { id: "cache_level", value: rule.setting },
          ],
          priority: rule.priority,
          status: "active",
        }),
      });

      const data = await res.json();
      if (data.success) {
        created.push(rule.pattern);
      } else {
        const errMsg = data.errors?.map((e: { message: string }) => e.message).join("; ");
        // Already exists is fine
        if (errMsg?.includes("already") || errMsg?.includes("exists")) {
          created.push(`${rule.pattern} (exists)`);
        } else {
          errors.push(`${rule.pattern}: ${errMsg}`);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${rule.pattern}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    return { success: created.length > 0, error: errors.join("; "), details: `Created: ${created.join(", ")}` };
  }
  return { success: true, details: `Page rules: ${created.join(", ")}` };
}

// ── Step 5: Worker Routes ──────────────────────────────────────────
// Attach the existing Workers (listings-api, images-transform)
// to the new domain's zone

async function setupWorkerRoutes(zoneId: string, domain: string): Promise<StepResult> {
  const routes = [
    { pattern: `${domain}/api/*`, script: WORKERS.listingsApi },
    { pattern: `${domain}/images/*`, script: WORKERS.imagesTransform },
  ];

  const created: string[] = [];
  const errors: string[] = [];

  for (const route of routes) {
    try {
      const res = await fetch(`${CF_API}/zones/${zoneId}/workers/routes`, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
          pattern: route.pattern,
          script: route.script,
        }),
      });

      const data = await res.json();
      if (data.success) {
        created.push(`${route.pattern} → ${route.script}`);
      } else {
        const errMsg = data.errors?.map((e: { message: string }) => e.message).join("; ");
        if (errMsg?.includes("already") || errMsg?.includes("duplicate")) {
          created.push(`${route.pattern} (exists)`);
        } else {
          errors.push(`${route.pattern}: ${errMsg}`);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${route.pattern}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    return { success: created.length > 0, error: errors.join("; "), details: `Routes: ${created.join(", ")}` };
  }
  return { success: true, details: `Routes: ${created.join(", ")}` };
}

// ── Bulk Provisioning ──────────────────────────────────────────────

/**
 * Find all DomainRegistry records that aren't registered on Cloudflare
 * and provision them.
 */
export async function provisionAllUnregisteredDomains(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: CloudflareProvisionResult[];
}> {
  const unregistered = await DomainRegistry.find({
    "cloudflare.registered": { $ne: true },
    status: { $in: ["active", "pending"] },
    // Skip agent subdomains — they use wildcard DNS on the parent zone
    type: { $ne: "agent_subdomain" },
  }).lean();

  const results: CloudflareProvisionResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of unregistered) {
    const domain = record.domain;

    // Skip vercel.app domains
    if (domain.endsWith(".vercel.app")) {
      skipped++;
      continue;
    }

    console.log(`[Cloudflare Provision] Processing: ${domain}`);
    const result = await provisionCloudflareForDomain(domain);
    results.push(result);

    if (result.success) {
      succeeded++;
      // Update DomainRegistry with Cloudflare info
      await DomainRegistry.findOneAndUpdate(
        { domain },
        {
          $set: {
            "cloudflare.registered": true,
            "cloudflare.zoneId": result.zoneId,
            "cloudflare.nameservers": result.nameservers,
            "cloudflare.status": "pending", // Pending until nameservers are updated at registrar
            "cloudflare.registeredAt": new Date(),
          },
        }
      );
    } else {
      failed++;
      console.error(`[Cloudflare Provision] Failed for ${domain}:`, result.error);
    }
  }

  return { total: unregistered.length, succeeded, failed, skipped, results };
}

// ── Helpers ────────────────────────────────────────────────────────

function getApexDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  return parts.slice(-2).join(".");
}
