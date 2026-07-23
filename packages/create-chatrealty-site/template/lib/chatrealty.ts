// ChatRealty API client — SERVER-SIDE ONLY.
//
// The token comes from process.env.CHATREALTY_API_TOKEN, which is NOT prefixed
// NEXT_PUBLIC_, so Next never ships it to the browser. Import this module only
// from Server Components and Route Handlers (app/api/*). Client components must
// call the app's own /api routes (which proxy through here) — never the
// ChatRealty API directly, or the token would have to leave the server.

import type { SearchResult, ListingDetail, MarketStats, ListingFilters } from "./types";
import { isTestDataMode, searchTestListings, getTestListing, testMarketStats } from "./test-data";

const BASE = (process.env.CHATREALTY_API_BASE || "https://www.chatrealty.io").replace(/\/+$/, "");
const TOKEN = process.env.CHATREALTY_API_TOKEN || "";

class ChatRealtyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function skillFetch(pathAndQuery: string, init?: RequestInit): Promise<Response> {
  if (!TOKEN) {
    throw new ChatRealtyError(
      "CHATREALTY_API_TOKEN is not set. Add it to .env.local (see .env.example).",
      500
    );
  }
  return fetch(`${BASE}${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

function qs(filters: ListingFilters): string {
  const p = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  };
  set("city", filters.city);
  set("subdivision", filters.subdivision);
  set("propertyType", filters.propertyType);
  set("minPrice", filters.minPrice);
  set("maxPrice", filters.maxPrice);
  set("minBeds", filters.minBeds);
  set("minBaths", filters.minBaths);
  if (filters.hasPool !== undefined) set("hasPool", filters.hasPool ? "true" : "false");
  set("near", filters.near);
  set("radiusMiles", filters.radiusMiles);
  set("limit", filters.limit);
  set("skip", filters.skip);
  return p.toString();
}

export async function searchListings(filters: ListingFilters = {}): Promise<SearchResult> {
  if (isTestDataMode()) return searchTestListings(filters);
  const res = await skillFetch(`/api/skill/listings/search?${qs(filters)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ChatRealtyError(body?.message || `Listing search failed (HTTP ${res.status})`, res.status);
  }
  return res.json();
}

export async function getListing(listingKey: string): Promise<ListingDetail | null> {
  if (isTestDataMode()) return getTestListing(listingKey);
  const res = await skillFetch(`/api/skill/listings/${encodeURIComponent(listingKey)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ChatRealtyError(body?.message || `Listing fetch failed (HTTP ${res.status})`, res.status);
  }
  return res.json();
}

export async function getMarketStats(opts: {
  city?: string;
  subdivision?: string;
  propertyType?: string;
}): Promise<MarketStats> {
  if (isTestDataMode()) return testMarketStats(opts);
  const p = new URLSearchParams();
  if (opts.city) p.set("city", opts.city);
  if (opts.subdivision) p.set("subdivision", opts.subdivision);
  if (opts.propertyType) p.set("propertyType", opts.propertyType);
  const res = await skillFetch(`/api/skill/market/stats?${p.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ChatRealtyError(body?.message || `Market stats failed (HTTP ${res.status})`, res.status);
  }
  return res.json();
}

// Lead capture. Records a deduped Contact against the tenant (write-only —
// nothing about existing CRM data is returned). Requires a tenant-bound token.
export async function submitLead(input: {
  email?: string;
  name?: string;
  phone?: string;
  source?: string;
  tags?: string[];
}): Promise<{ contactId: string | null }> {
  // Test-data mode: no CRM exists to write to — succeed quietly so the form
  // UX is previewable, but record nothing. The banner explains the mode.
  if (isTestDataMode()) return { contactId: null };
  const res = await skillFetch(`/api/skill/contacts/from-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "chatrealty-site", ...input }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ChatRealtyError(body?.error?.message || body?.message || `Lead submit failed (HTTP ${res.status})`, res.status);
  }
  // withSkill routes wrap the payload as { data: {...} }.
  const data = body?.data ?? body;
  return { contactId: data?.contactId ?? null };
}

export { ChatRealtyError };
