// ChatRealty API client — SERVER-SIDE ONLY.
//
// The token comes from process.env.CHATREALTY_API_TOKEN, which is NOT prefixed
// NEXT_PUBLIC_, so Next never ships it to the browser. Import this module only
// from Server Components and Route Handlers (app/api/*). Client components must
// call the app's own /api routes (which proxy through here) — never the
// ChatRealty API directly, or the token would have to leave the server.

import type {
  SearchResult,
  ListingDetail,
  MarketStats,
  ListingFilters,
  AgentProfile,
  BlogPost,
  BlogPostSummary,
} from "./types";
import {
  isTestDataMode,
  searchTestListings,
  getTestListing,
  testMarketStats,
  testAgentProfile,
  testPosts,
  testPostSummaries,
} from "./test-data";

const BASE = (process.env.CHATREALTY_API_BASE || "https://www.chatrealty.io").replace(/\/+$/, "");
const TOKEN = process.env.CHATREALTY_API_TOKEN || "";

// Revalidate windows (seconds) for PUBLIC listing data. This is single-tenant —
// every visitor sees the same listings — so caching is safe and cuts ChatRealty
// API calls dramatically. MLS data syncs on a schedule (not per-second), so
// short windows stay fresh. Next caches the upstream response server-side; the
// public /api routes ALSO send matching s-maxage so the agent's Cloudflare (or
// any CDN) edge-caches them. Anything user-specific (favorites, leads, chat,
// end-user auth) must NEVER pass a revalidate — it stays no-store. See the
// auth-cache-leak rule: public reads cache, per-user/writes never do.
export const REVALIDATE = {
  listings: 300, // 5 min — search + detail
  market: 900, //   15 min — stats change slowly
  profile: 3600, // 1 hr — agent identity rarely changes
  content: 300, //  5 min — blog/articles
} as const;

class ChatRealtyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// opts.revalidate present → cacheable public read (Next caches + revalidates).
// opts.revalidate absent → no-store (writes and anything not explicitly public).
async function skillFetch(
  pathAndQuery: string,
  init?: RequestInit,
  opts?: { revalidate?: number }
): Promise<Response> {
  if (!TOKEN) {
    throw new ChatRealtyError(
      "CHATREALTY_API_TOKEN is not set. Add it to .env.local (see .env.example).",
      500
    );
  }
  const cacheOpts: RequestInit =
    opts?.revalidate != null
      ? ({ next: { revalidate: opts.revalidate } } as RequestInit)
      : { cache: "no-store" };
  return fetch(`${BASE}${pathAndQuery}`, {
    ...init,
    ...cacheOpts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers || {}),
    },
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
  const res = await skillFetch(`/api/skill/listings/search?${qs(filters)}`, undefined, { revalidate: REVALIDATE.listings });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ChatRealtyError(body?.message || `Listing search failed (HTTP ${res.status})`, res.status);
  }
  return res.json();
}

export async function getListing(listingKey: string): Promise<ListingDetail | null> {
  if (isTestDataMode()) return getTestListing(listingKey);
  const res = await skillFetch(`/api/skill/listings/${encodeURIComponent(listingKey)}`, undefined, { revalidate: REVALIDATE.listings });
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
  const res = await skillFetch(`/api/skill/market/stats?${p.toString()}`, undefined, { revalidate: REVALIDATE.market });
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

// Agent identity — hydrates the header, footer, About, and Contact pages from
// the agent's ChatRealty profile. Update your profile on chatrealty.io and the
// site updates with it.
export async function getAgentProfile(): Promise<AgentProfile> {
  if (isTestDataMode()) return testAgentProfile();
  const res = await skillFetch(`/api/skill/me/profile`, undefined, { revalidate: REVALIDATE.profile });
  if (!res.ok) {
    // Identity should never take the site down — fall back to minimal.
    return {
      name: null, email: null, phone: null, licenseNumber: null,
      brokerageName: null, website: null, bio: null, headline: null,
      tagline: null, headshot: null, heroPhoto: null, serviceAreas: [], specializations: [],
    };
  }
  const p = await res.json();
  return {
    name: p.name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    licenseNumber: p.licenseNumber ?? null,
    brokerageName: p.brokerageName ?? null,
    website: p.website ?? null,
    bio: p.bio ?? null,
    headline: p.headline ?? null,
    tagline: p.tagline ?? null,
    headshot: p.headshot ?? null,
    heroPhoto: p.heroPhoto ?? null,
    serviceAreas: Array.isArray(p.serviceAreas) ? p.serviceAreas : [],
    specializations: Array.isArray(p.specializations) ? p.specializations : [],
  };
}

// Blog — posts live in the agent's ChatRealty CMS (written there or drafted +
// published by Claude via the MCP) and serve here.
export async function getPosts(): Promise<BlogPostSummary[]> {
  if (isTestDataMode()) return testPostSummaries();
  const res = await skillFetch(`/api/skill/articles?status=published&limit=50`, undefined, { revalidate: REVALIDATE.content });
  if (!res.ok) return [];
  const body = await res.json();
  const items = body.items || body.articles || [];
  return items.map((a: any) => ({
    slugId: a.slugId || a.slug,
    title: a.title,
    excerpt: a.excerpt ?? null,
    category: a.category ?? null,
    publishedAt: a.publishedAt ?? a.createdAt ?? null,
    coverUrl: a.featuredImage?.url || null,
  }));
}

export async function getPost(slugId: string): Promise<BlogPost | null> {
  if (isTestDataMode()) return testPosts().find((p) => p.slugId === slugId) ?? null;
  const res = await skillFetch(`/api/skill/articles/${encodeURIComponent(slugId)}`, undefined, { revalidate: REVALIDATE.content });
  if (!res.ok) return null;
  const a = await res.json();
  if (a.status && a.status !== "published") return null;
  return {
    slugId: a.slug || slugId,
    title: a.title,
    excerpt: a.excerpt ?? null,
    category: a.category ?? null,
    publishedAt: a.publishedAt ?? a.createdAt ?? null,
    coverUrl: a.featuredImage?.url || null,
    content: a.content || "",
  };
}

export { ChatRealtyError };
