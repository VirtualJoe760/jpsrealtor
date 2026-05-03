// src/lib/search/multi-source-search.ts
//
// Unified entity autocomplete used by /api/listings/quick-search and the
// upcoming chat-v2 search-first architecture. Combines the strengths of two
// underlying systems:
//
//   1. search_index collection — pre-built nightly by build_search_index.py.
//      Tiny denormalized docs + Mongo $text index = sub-50ms full-word
//      lookups across listings, cities, and subdivisions.
//
//   2. Live regex on counties + regions + (cities + subdivisions for
//      partial-prefix queries) — closes two gaps in #1: counties/regions
//      aren't in search_index, and Mongo's $text won't match prefixes of
//      tokens (`indi` doesn't find `indian wells`).
//
// All sources run in parallel; results dedupe by (type, label) and rank by
// exact-match → score → recency. Falls back gracefully when search_index
// doesn't exist (e.g., on a dev machine without the cron-built collection).

import mongoose from "mongoose";
import { City } from "@/models/cities";
import Subdivision from "@/models/subdivisions";
import { County } from "@/models/counties";
import { Region } from "@/models/regions";

// =============================================================================
// Public types
// =============================================================================

export type SearchResultType = "listing" | "city" | "subdivision" | "county" | "region";

export interface SearchResult {
  type: SearchResultType;
  /** Stable id — slug for cities/subs/counties/regions, listingKey for listings */
  entityId?: string;
  /** Primary display label */
  label: string;
  /** Secondary line — city for subdivision, listing count for city, etc. */
  sublabel?: string;

  // Listing-specific
  slug?: string;
  /** New shape (search_index storage) */
  price?: number;
  beds?: number;
  baths?: number;
  /** Legacy shape (existing ChatInput consumer) — emitted alongside new shape for back-compat */
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  photo?: string;
  city?: string;
  subdivision?: string;
  status?: string;

  // City-specific
  totalListings?: number;

  // Subdivision-specific
  parentCity?: string;

  // Internal — for ranking/debugging
  score?: number;
  source?: "text" | "regex";
}

interface Options {
  /** Max results returned. Default 8. */
  limit?: number;
  /**
   * Length threshold below which we always run the prefix-regex layer on
   * cities + subdivisions (because $text can't match partial tokens).
   * Default 6.
   */
  prefixThreshold?: number;
}

// =============================================================================
// Helper: $text on search_index — fast path for full-word matches
// =============================================================================

async function searchIndexHits(q: string, limit: number): Promise<SearchResult[]> {
  try {
    const db = mongoose.connection.db;
    if (!db) return [];

    // Probe whether the collection exists. Avoid a hard failure on dev
    // machines where build_search_index.py hasn't run yet.
    const collections = await db.listCollections({ name: "search_index" }).toArray();
    if (collections.length === 0) return [];

    const collection = db.collection("search_index");
    const docs = await collection
      .find(
        { $text: { $search: q } },
        { projection: { score: { $meta: "textScore" }, searchText: 0 } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .toArray();

    return docs.map((d: any): SearchResult => ({
      type: d.type,
      entityId: d.entityId,
      label: d.label,
      sublabel: d.sublabel,
      slug: d.slug,
      // search_index stores price/beds/baths; emit BOTH for back-compat with
      // the existing ChatInput consumer that reads listPrice/bedrooms/etc.
      price: d.price ?? undefined,
      listPrice: d.price ?? undefined,
      beds: d.beds ?? undefined,
      bedrooms: d.beds ?? undefined,
      baths: d.baths ?? undefined,
      bathrooms: d.baths ?? undefined,
      sqft: d.sqft ?? undefined,
      photo: d.photo ?? undefined,
      city: d.city ?? undefined,
      subdivision: d.subdivision ?? undefined,
      status: d.status ?? undefined,
      totalListings: d.totalListings ?? undefined,
      parentCity: d.parentCity ?? undefined,
      score: d.score,
      source: "text",
    }));
  } catch (err) {
    console.warn("[multi-source-search] search_index $text failed:", err);
    return [];
  }
}

// =============================================================================
// Helper: regex on counties + regions (gap fill — not in search_index)
// =============================================================================

async function countyAndRegionHits(q: string): Promise<SearchResult[]> {
  const re = new RegExp(escapeRegex(q), "i");
  const [counties, regions] = await Promise.all([
    County.find({ name: re }, { name: 1, slug: 1 }).limit(3).lean(),
    Region.find({ name: re }, { name: 1, slug: 1 }).limit(3).lean(),
  ]);
  const out: SearchResult[] = [];
  for (const c of counties as any[]) {
    out.push({
      type: "county",
      entityId: c.slug,
      label: c.name,
      source: "regex",
    });
  }
  for (const r of regions as any[]) {
    out.push({
      type: "region",
      entityId: r.slug,
      label: r.name,
      source: "regex",
    });
  }
  return out;
}

// =============================================================================
// Helper: prefix regex on cities + subdivisions (gap fill — $text can't prefix-match)
// =============================================================================

async function prefixHits(q: string): Promise<SearchResult[]> {
  // Anchored at start of name — cheap, uses btree index
  const prefixRe = new RegExp("^" + escapeRegex(q), "i");
  const [cities, subdivisions] = await Promise.all([
    City.find({ name: prefixRe }, { name: 1, slug: 1, listingCount: 1 }).limit(5).lean(),
    Subdivision.find(
      { name: prefixRe, listingCount: { $gt: 0 } },
      { name: 1, slug: 1, city: 1 }
    )
      .limit(5)
      .lean(),
  ]);
  const out: SearchResult[] = [];
  for (const c of cities as any[]) {
    out.push({
      type: "city",
      entityId: c.slug,
      label: c.name,
      sublabel: c.listingCount ? `${c.listingCount.toLocaleString()} active listings` : undefined,
      totalListings: c.listingCount,
      source: "regex",
    });
  }
  for (const s of subdivisions as any[]) {
    out.push({
      type: "subdivision",
      entityId: s.slug,
      label: s.name,
      sublabel: s.city,
      parentCity: s.city,
      source: "regex",
    });
  }
  return out;
}

// =============================================================================
// Merge + rank
// =============================================================================

function dedupeAndRank(
  q: string,
  textHits: SearchResult[],
  countyRegionHits: SearchResult[],
  prefixHits: SearchResult[],
  limit: number
): SearchResult[] {
  const norm = q.toLowerCase().trim();

  // Dedupe key — type + lowercased label.
  // When duplicates exist, prefer the search_index version (richer fields).
  const seen = new Map<string, SearchResult>();
  const tryAdd = (r: SearchResult) => {
    const key = `${r.type}::${r.label.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, r);
      return;
    }
    // Prefer text-source over regex (richer denormalized fields)
    if (existing.source === "regex" && r.source === "text") {
      seen.set(key, r);
    }
  };

  for (const r of textHits) tryAdd(r);
  for (const r of countyRegionHits) tryAdd(r);
  for (const r of prefixHits) tryAdd(r);

  const all = Array.from(seen.values());

  // Ranking:
  //   1. Exact label match (case-insensitive) — wins regardless of source
  //   2. Source preference: text > regex (text matches are more relevant)
  //   3. textScore descending within text source
  //   4. Type ordering for ties: city > subdivision > county > region > listing
  //      (broader entities first, listings as the granular fallback)
  const typeOrder: Record<SearchResultType, number> = {
    city: 0,
    subdivision: 1,
    county: 2,
    region: 3,
    listing: 4,
  };

  all.sort((a, b) => {
    const aExact = a.label.toLowerCase() === norm ? 1 : 0;
    const bExact = b.label.toLowerCase() === norm ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    if (a.source === "text" && b.source === "regex") return -1;
    if (a.source === "regex" && b.source === "text") return 1;

    if (a.source === "text" && b.source === "text") {
      return (b.score || 0) - (a.score || 0);
    }

    return typeOrder[a.type] - typeOrder[b.type];
  });

  return all.slice(0, limit);
}

// =============================================================================
// Entry point
// =============================================================================

/**
 * Run all three search layers in parallel and return a ranked, deduped list
 * of SearchResults. `q` is the raw user input; treats <2 chars as empty.
 */
export async function multiSourceSearch(
  q: string,
  options: Options = {}
): Promise<SearchResult[]> {
  const limit = options.limit ?? 8;
  const prefixThreshold = options.prefixThreshold ?? 6;
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  // Always run text + county/region.
  // Run prefix layer when query is short (where $text can't help) OR
  // unconditionally — it's cheap (indexed prefix scan on small collections).
  const runPrefix = trimmed.length <= prefixThreshold * 2; // be permissive

  const [textHits, crHits, pHits] = await Promise.all([
    searchIndexHits(trimmed, Math.ceil(limit * 1.5)),
    countyAndRegionHits(trimmed),
    runPrefix ? prefixHits(trimmed) : Promise.resolve([] as SearchResult[]),
  ]);

  return dedupeAndRank(trimmed, textHits, crHits, pHits, limit);
}

// =============================================================================
// Util
// =============================================================================

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
