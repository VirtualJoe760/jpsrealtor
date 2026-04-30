// src/lib/cloudflare.ts
// Cloudflare API v4 wrapper for domain/zone management
// Docs: https://developers.cloudflare.com/api/

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function getToken(): string {
  const token =
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.JPSREALTOR_WORKS_DEPLOYMENT_API_TOKEN;
  if (!token) throw new Error("No Cloudflare API token found. Set CLOUDFLARE_API_TOKEN (or CF_API_TOKEN) in .env.local");
  return token;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// ── Response Types ──────────────────────────────────────────────────

export interface CloudflareZone {
  id: string;
  name: string;
  status: string; // "active", "pending", "initializing", "moved", "deleted"
  name_servers: string[];
  original_name_servers?: string[];
  created_on: string;
  modified_on: string;
}

export interface CloudflareDnsRecord {
  id: string;
  zone_id: string;
  type: string; // "A", "AAAA", "CNAME", "TXT", "MX", etc.
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  created_on: string;
  modified_on: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${CF_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });

  const data: CloudflareApiResponse<T> = await res.json();

  if (!data.success) {
    const errMsg = data.errors.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare API error (${res.status}): ${errMsg}`);
  }

  return data.result;
}

// ── API Functions ───────────────────────────────────────────────────

/**
 * Add a zone (domain) to Cloudflare.
 * POST /zones
 */
export async function addZone(domain: string): Promise<CloudflareZone> {
  return cfFetch<CloudflareZone>("/zones", {
    method: "POST",
    body: JSON.stringify({
      name: domain,
      type: "full", // Full DNS management
    }),
  });
}

/**
 * Get zone details by zone ID.
 * GET /zones/{zone_id}
 */
export async function getZone(zoneId: string): Promise<CloudflareZone> {
  return cfFetch<CloudflareZone>(`/zones/${encodeURIComponent(zoneId)}`);
}

/**
 * Check zone status (active, pending, etc.).
 * Returns the zone with current status.
 */
export async function checkZoneStatus(zoneId: string): Promise<{ status: string; nameservers: string[] }> {
  const zone = await getZone(zoneId);
  return {
    status: zone.status,
    nameservers: zone.name_servers,
  };
}

/**
 * List all zones in the Cloudflare account.
 * GET /zones
 */
export async function listZones(page = 1, perPage = 50): Promise<CloudflareZone[]> {
  return cfFetch<CloudflareZone[]>(`/zones?page=${page}&per_page=${perPage}&order=name&direction=asc`);
}

/**
 * Find a zone by domain name.
 * GET /zones?name={domain}
 */
export async function findZoneByName(domain: string): Promise<CloudflareZone | null> {
  const zones = await cfFetch<CloudflareZone[]>(`/zones?name=${encodeURIComponent(domain)}`);
  return zones.length > 0 ? zones[0] : null;
}

/**
 * Create a DNS record in a zone.
 * POST /zones/{zone_id}/dns_records
 */
export async function createDnsRecord(
  zoneId: string,
  record: {
    type: string;  // "A", "AAAA", "CNAME", "TXT", "MX"
    name: string;  // e.g., "@", "www", "subdomain"
    content: string; // IP address, target domain, TXT value
    ttl?: number;  // 1 = automatic
    proxied?: boolean;
    priority?: number; // For MX records
  }
): Promise<CloudflareDnsRecord> {
  return cfFetch<CloudflareDnsRecord>(
    `/zones/${encodeURIComponent(zoneId)}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl ?? 1, // 1 = automatic
        proxied: record.proxied ?? false,
        ...(record.priority !== undefined && { priority: record.priority }),
      }),
    }
  );
}

/**
 * List DNS records for a zone.
 * GET /zones/{zone_id}/dns_records
 */
export async function listDnsRecords(
  zoneId: string,
  type?: string
): Promise<CloudflareDnsRecord[]> {
  const params = type ? `?type=${encodeURIComponent(type)}` : "";
  return cfFetch<CloudflareDnsRecord[]>(
    `/zones/${encodeURIComponent(zoneId)}/dns_records${params}`
  );
}

/**
 * Delete a DNS record.
 * DELETE /zones/{zone_id}/dns_records/{record_id}
 */
export async function deleteDnsRecord(
  zoneId: string,
  recordId: string
): Promise<{ id: string }> {
  return cfFetch<{ id: string }>(
    `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
    { method: "DELETE" }
  );
}

/**
 * Delete a zone from Cloudflare.
 * DELETE /zones/{zone_id}
 */
export async function deleteZone(zoneId: string): Promise<{ id: string }> {
  return cfFetch<{ id: string }>(
    `/zones/${encodeURIComponent(zoneId)}`,
    { method: "DELETE" }
  );
}

/**
 * Verify Cloudflare API token is valid.
 * GET /user/tokens/verify
 */
export async function verifyToken(): Promise<boolean> {
  try {
    const result = await cfFetch<{ status: string }>("/user/tokens/verify");
    return result.status === "active";
  } catch {
    return false;
  }
}
