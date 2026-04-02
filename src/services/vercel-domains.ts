// src/services/vercel-domains.ts
// Wraps the Vercel REST API for programmatic domain management.
//
// Required env vars:
//   VERCEL_API_TOKEN   — Create at https://vercel.com/account/tokens
//   VERCEL_PROJECT_ID  — Found in Vercel project settings
//   VERCEL_TEAM_ID     — (Optional) If project belongs to a team

const VERCEL_API_BASE = "https://api.vercel.com";

function getConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) throw new Error("Missing VERCEL_API_TOKEN in environment");
  if (!projectId) throw new Error("Missing VERCEL_PROJECT_ID in environment");

  return { token, projectId, teamId };
}

function buildUrl(path: string, teamId?: string): string {
  const url = new URL(path, VERCEL_API_BASE);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

async function vercelFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const { token, teamId } = getConfig();
  const url = buildUrl(path, teamId);

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage =
      data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`Vercel API error (${res.status}): ${errorMessage}`);
  }

  return data;
}

/**
 * Add a domain to the Vercel project.
 * Returns the domain configuration from Vercel.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
 */
export async function addDomainToProject(domain: string) {
  const { projectId } = getConfig();

  const data = await vercelFetch(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });

  return data;
}

/**
 * Remove a domain from the Vercel project.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/projects#remove-a-domain-from-a-project
 */
export async function removeDomainFromProject(domain: string) {
  const { projectId } = getConfig();

  const data = await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}`,
    {
      method: "DELETE",
    }
  );

  return data;
}

/**
 * List all domains on the Vercel project.
 */
export async function listProjectDomains() {
  const { projectId } = getConfig();

  const data = await vercelFetch(`/v9/projects/${projectId}/domains`);
  return data.domains || [];
}

/**
 * Check domain DNS configuration.
 * Returns whether DNS is correctly configured to point to Vercel.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/domains#get-a-domain-s-configuration
 */
export async function checkDomainConfig(domain: string) {
  const data = await vercelFetch(`/v6/domains/${domain}/config`);

  return {
    configured: !data.misconfigured,
    misconfigured: data.misconfigured || false,
    // DNS records Vercel expects
    aValues: data.aValues || [],
    cnames: data.cnames || [],
    // Conflicts
    conflicts: data.conflicts || [],
  };
}

/**
 * Verify domain ownership on Vercel.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/domains#verify-a-domain
 */
export async function verifyDomain(domain: string) {
  const data = await vercelFetch(`/v6/domains/${domain}/verify`, {
    method: "POST",
  });

  return {
    verified: data.verified || false,
    domain: data.name,
  };
}

/**
 * Get information about a specific domain on the project.
 */
export async function getDomainInfo(domain: string) {
  const { projectId } = getConfig();

  try {
    const data = await vercelFetch(
      `/v9/projects/${projectId}/domains/${domain}`
    );
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if a domain is available for purchase via Vercel.
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/dns#check-domain-availability
 */
export async function checkDomainAvailability(domain: string) {
  try {
    const data = await vercelFetch(`/v4/domains/status?name=${encodeURIComponent(domain)}`);
    return {
      available: data.available || false,
    };
  } catch {
    return { available: false };
  }
}

/**
 * Get the domain purchase URL for Vercel's domain registrar.
 * Agents can buy domains directly through Vercel.
 */
export function getDomainPurchaseUrl(domain: string): string {
  return `https://vercel.com/domains/${encodeURIComponent(domain)}`;
}

/**
 * Get DNS instructions for an agent to configure their domain.
 */
export function getDnsInstructions(domain: string) {
  const isApex = !domain.includes(".") || domain.split(".").length === 2;

  return {
    domain,
    isApex,
    records: isApex
      ? [
          {
            type: "A",
            name: "@",
            value: "76.76.21.21",
            description:
              "Points your domain to Vercel's servers. Required for root/apex domains.",
          },
        ]
      : [
          {
            type: "CNAME",
            name: domain.split(".")[0],
            value: "cname.vercel-dns.com",
            description:
              "Points your subdomain to Vercel's servers. Required for subdomains.",
          },
        ],
    notes: [
      "DNS changes can take up to 48 hours to propagate, though most resolve within minutes.",
      "SSL certificates are automatically provisioned once DNS is configured correctly.",
      "Do not add both A and CNAME records for the same domain — use A for root domains and CNAME for subdomains.",
    ],
    vercelDomainUrl: `https://vercel.com/domains/${encodeURIComponent(domain)}`,
  };
}
