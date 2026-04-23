// src/lib/vercel-domains.ts
// Vercel Domains API wrapper for automated domain provisioning
// Docs: https://vercel.com/docs/rest-api/endpoints/domains

const VERCEL_API_BASE = "https://api.vercel.com";

function getToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN environment variable is not set");
  return token;
}

function getProjectId(): string {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error("VERCEL_PROJECT_ID environment variable is not set");
  return projectId;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// ── Response Types ──────────────────────────────────────────────────

export interface DomainAvailability {
  available: boolean;
  domain: string;
}

export interface DomainPrice {
  price: number;
  period: number; // years
}

export interface DomainPurchaseResult {
  domain: string;
  created: boolean;
}

export interface ProjectDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  gitBranch?: string | null;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  createdAt: number;
  updatedAt: number;
}

// ── API Functions ───────────────────────────────────────────────────

/**
 * Check if a domain is available for purchase.
 * GET /v4/domains/status
 */
export async function checkDomainAvailability(domain: string): Promise<DomainAvailability> {
  const url = `${VERCEL_API_BASE}/v4/domains/status?name=${encodeURIComponent(domain)}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    available: data.available,
    domain: domain,
  };
}

/**
 * Get the purchase price for a domain.
 * GET /v4/domains/price
 */
export async function getDomainPrice(domain: string): Promise<DomainPrice> {
  const url = `${VERCEL_API_BASE}/v4/domains/price?name=${encodeURIComponent(domain)}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    price: data.price,
    period: data.period,
  };
}

/**
 * Purchase a domain through Vercel.
 * POST /v5/domains/buy
 */
export async function purchaseDomain(domain: string): Promise<DomainPurchaseResult> {
  const url = `${VERCEL_API_BASE}/v5/domains/buy`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    domain: data.domain?.name || domain,
    created: true,
  };
}

/**
 * Add a domain to the Vercel project (connects it for hosting).
 * POST /v10/projects/{projectId}/domains
 */
export async function addDomainToProject(domain: string): Promise<ProjectDomain> {
  const projectId = getProjectId();
  const url = `${VERCEL_API_BASE}/v10/projects/${encodeURIComponent(projectId)}/domains`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }

  return await res.json();
}

/**
 * Remove a domain from the Vercel project.
 * DELETE /v10/projects/{projectId}/domains/{domain}
 */
export async function removeDomainFromProject(domain: string): Promise<void> {
  const projectId = getProjectId();
  const url = `${VERCEL_API_BASE}/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }
}

/**
 * List all domains attached to the Vercel project.
 * GET /v10/projects/{projectId}/domains
 */
export async function listProjectDomains(): Promise<ProjectDomain[]> {
  const projectId = getProjectId();
  const url = `${VERCEL_API_BASE}/v10/projects/${encodeURIComponent(projectId)}/domains`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel API error (${res.status}): ${body?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.domains || [];
}
