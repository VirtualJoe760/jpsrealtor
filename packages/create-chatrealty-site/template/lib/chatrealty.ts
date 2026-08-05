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
  if (isTestDataMode()) {
    // LOUD on purpose: this used to be a silent no-op while the form still
    // rendered "Thanks — we'll be in touch", so a tester believed leads were
    // being delivered when nothing was ever transmitted.
    console.warn("[chatrealty] TEST-DATA MODE: lead NOT sent to ChatRealty.");
    return { contactId: null };
  }
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
// Service areas are typed { name, type? }[] and every consumer reads `.name`,
// but the field is easy to write as a bare string list — the scaffolder itself
// did, and `data/test-agent.json` is hand-editable, so it will happen again.
// A string entry rendered an EMPTY pill on /about (plus a React duplicate-key
// warning, since `.name` was undefined for all of them) and quietly dropped the
// market name out of the homepage CTA. Neither surfaced as an error. Accept
// both shapes here — this is the one door every consumer comes through — and
// drop entries that carry no name at all rather than rendering a blank chip.
function normalizeServiceAreas(raw: unknown): AgentProfile["serviceAreas"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => (typeof a === "string" ? { name: a } : a))
    .filter((a): a is { name: string; type?: string } => !!a && typeof a.name === "string" && a.name.length > 0);
}

// Identity overrides from .env.local. The site's identity normally comes from
// the ChatRealty profile the token belongs to — that is correct for a real
// agent, and the reason /about, the header and the footer hydrate themselves.
//
// It is WRONG in two ordinary cases, and both used to have no answer:
//   1. The site is being built for someone other than the token holder (a test
//      build, a persona, an assistant scaffolding for their agent). A judge run
//      failed its identity gate outright: every page read the token holder's
//      name and license, and the "if the API returns null, use this instead"
//      fallbacks the builder wrote never fired, because the API returned a
//      perfectly good — and wrong — name.
//   2. The build interview collected a license number or brokerage the
//      ChatRealty profile does not have yet. Compliance has to show on the site
//      NOW; waiting on a profile edit is not an option.
//
// So env wins over the API, per field, and only for fields actually set. Unset
// vars change nothing. Applied in every mode (live, test data, and the
// fetch-failed fallback) so identity is the same everywhere.
//
// This is a stopgap for the profile, not a replacement for it: the license
// number `set_site_live` checks lives on the ChatRealty profile, so an override
// that only exists here will show on the site and still block go-live.
function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function envList(name: string): string[] | null {
  const v = env(name);
  if (!v) return null;
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function applyIdentityOverrides(p: AgentProfile): AgentProfile {
  const areas = envList("AGENT_SERVICE_AREAS");
  const specs = envList("AGENT_SPECIALIZATIONS");
  return {
    ...p,
    name: env("AGENT_NAME") ?? p.name,
    email: env("AGENT_EMAIL") ?? p.email,
    phone: env("AGENT_PHONE") ?? p.phone,
    licenseNumber: env("AGENT_LICENSE") ?? p.licenseNumber,
    brokerageName: env("AGENT_BROKERAGE") ?? p.brokerageName,
    website: env("AGENT_WEBSITE") ?? p.website,
    bio: env("AGENT_BIO") ?? p.bio,
    headline: env("AGENT_HEADLINE") ?? p.headline,
    tagline: env("AGENT_TAGLINE") ?? p.tagline,
    headshot: env("AGENT_HEADSHOT") ?? p.headshot,
    serviceAreas: areas ? normalizeServiceAreas(areas) : p.serviceAreas,
    specializations: specs ?? p.specializations,
  };
}

export async function getAgentProfile(): Promise<AgentProfile> {
  if (isTestDataMode()) {
    const t = testAgentProfile();
    return applyIdentityOverrides({ ...t, serviceAreas: normalizeServiceAreas(t.serviceAreas) });
  }
  const res = await skillFetch(`/api/skill/me/profile`, undefined, { revalidate: REVALIDATE.profile });
  if (!res.ok) {
    // Identity should never take the site down — fall back to minimal.
    return applyIdentityOverrides({
      name: null, email: null, phone: null, licenseNumber: null,
      brokerageName: null, website: null, bio: null, headline: null,
      tagline: null, headshot: null, heroPhoto: null, serviceAreas: [], specializations: [],
    });
  }
  const p = await res.json();
  return applyIdentityOverrides({
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
    serviceAreas: normalizeServiceAreas(p.serviceAreas),
    specializations: Array.isArray(p.specializations) ? p.specializations : [],
  });
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
