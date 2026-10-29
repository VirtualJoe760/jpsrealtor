// src/lib/domains/registrar.ts
//
// Vercel Domains Registrar API (/v1/registrar/...). Replaces the /v4 and /v5
// domain endpoints in src/lib/vercel-domains.ts, which Vercel sunset on
// 2025-11-09 — every call to them now returns 400, so domain search and
// purchase were silently broken until 2026-10-28.
//
// Purchases are ASYNCHRONOUS: buy returns an orderId, and the order moves
// draft → purchasing → completed | failed. Callers must poll getOrder().
// Every purchase here is paid for by ChatRealty's Vercel account, so only
// src/lib/domains/fulfill.ts — which runs after the agent's Stripe payment
// clears — may call buyDomain().

const BASE = "https://api.vercel.com";

export class RegistrarError extends Error {
  constructor(public status: number, public code: string | undefined, message: string) {
    super(message);
    this.name = "RegistrarError";
  }
}

function url(path: string): string {
  const u = new URL(path, BASE);
  // The API token is team-scoped, so teamId is optional; pass it when set.
  if (process.env.VERCEL_TEAM_ID) u.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  return u.toString();
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not set");
  const res = await fetch(url(path), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new RegistrarError(res.status, body?.code || body?.error?.code, body?.message || body?.error?.message || res.statusText);
  }
  return body as T;
}

export async function checkAvailability(domain: string): Promise<boolean> {
  const r = await call<{ available: boolean }>(`/v1/registrar/domains/${encodeURIComponent(domain)}/availability`);
  return !!r.available;
}

export interface RegistrarPrice {
  years: number;
  purchasePrice: number;
  renewalPrice: number;
}

export async function getPrice(domain: string): Promise<RegistrarPrice> {
  const r = await call<RegistrarPrice>(`/v1/registrar/domains/${encodeURIComponent(domain)}/price`);
  return { years: r.years, purchasePrice: Number(r.purchasePrice), renewalPrice: Number(r.renewalPrice) };
}

export interface RegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // E.164, e.g. +17605551234
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string; // ISO 3166-1 alpha-2
}

/** Places the order. Vercel rejects it if the price moved (expected_price_mismatch). */
export async function buyDomain(
  domain: string,
  opts: { expectedPrice: number; contact: RegistrantContact; autoRenew: boolean }
): Promise<{ orderId: string }> {
  return call(`/v1/registrar/domains/${encodeURIComponent(domain)}/buy`, {
    method: "POST",
    body: JSON.stringify({
      autoRenew: opts.autoRenew,
      years: 1,
      expectedPrice: opts.expectedPrice,
      contactInformation: opts.contact,
    }),
  });
}

export type OrderStatus = "draft" | "purchasing" | "completed" | "failed";

export async function getOrder(orderId: string): Promise<{
  status: OrderStatus;
  error?: { code?: string } | null;
  domains: { domainName: string; status: string; error?: unknown }[];
}> {
  return call(`/v1/registrar/orders/${encodeURIComponent(orderId)}`);
}

export async function setAutoRenew(domain: string, autoRenew: boolean): Promise<void> {
  await call(`/v1/registrar/domains/${encodeURIComponent(domain)}/auto-renew`, {
    method: "PATCH",
    body: JSON.stringify({ autoRenew }),
  });
}

// ── DNS for domains an agent already owns ───────────────────────────

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string; // "@", "www", or a TXT host like "_vercel"
  value: string;
}

/**
 * Whether THIS project is verified to serve `domain`. Vercel lets any project
 * attach any domain (2026-10-28: attaching vercel.com succeeded); it simply
 * won't serve one that another Vercel account owns until a TXT challenge is
 * met. DNS pointing at Vercel is therefore NOT proof of ownership on its own —
 * a domain hosted by any other Vercel customer already points at Vercel.
 */
export async function getProjectVerification(domain: string): Promise<{ verified: boolean; txt: DnsRecord[] }> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not set");
  const d = await call<{ verified?: boolean; verification?: { type: string; domain: string; value: string }[] }>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`
  );
  const apex = domain.replace(/^www\./, "");
  return {
    verified: d.verified === true,
    txt: (d.verification || [])
      .filter((v) => v.type === "TXT")
      .map((v) => ({ type: "TXT" as const, name: v.domain.endsWith(`.${apex}`) ? v.domain.slice(0, -(apex.length + 1)) : v.domain, value: v.value })),
  };
}

/**
 * The records an agent adds at their own registrar, and whether the domain
 * already points here. Uses Vercel's per-domain recommendations (rank 1),
 * falling back to the long-standing 76.76.21.21 / cname.vercel-dns.com.
 */
export async function getDnsStatus(domain: string): Promise<{ configured: boolean; records: DnsRecord[] }> {
  type Rec = { rank: number; value: string | string[] }[];
  const c = await call<{ misconfigured?: boolean; recommendedIPv4?: Rec; recommendedCNAME?: Rec }>(
    `/v6/domains/${encodeURIComponent(domain)}/config`
  );
  const best = (r?: Rec) => [...(r || [])].sort((a, b) => a.rank - b.rank)[0]?.value;
  const ipv4 = best(c.recommendedIPv4);
  const cname = best(c.recommendedCNAME);
  const ips = (Array.isArray(ipv4) ? ipv4 : ipv4 ? [ipv4] : ["76.76.21.21"]).filter(Boolean);
  const cnameValue = String(Array.isArray(cname) ? cname[0] : cname || "cname.vercel-dns.com").replace(/\.$/, "");
  return {
    configured: c.misconfigured === false,
    records: [
      ...ips.map((value) => ({ type: "A" as const, name: "@", value })),
      { type: "CNAME" as const, name: "www", value: cnameValue },
    ],
  };
}
