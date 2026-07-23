// TEST DATA mode — SERVER-SIDE ONLY.
//
// When CHATREALTY_TEST_DATA=true, the site runs entirely on 25 FICTITIOUS
// sample listings shipped in data/test-listings.json (fake cities, placeholder
// art, "Demo Realty — Test Data" attribution, pins over empty desert). No
// token, no network — it exists so you can see your site working while your
// real MLS feed / ChatRealty tenant setup is still in progress.
//
// HARD RULE: never launch a public site in test-data mode. These listings do
// not exist; presenting them as inventory would misrepresent the market and
// violate MLS/IDX display rules. The <TestDataBanner> stays until you connect
// real data (set CHATREALTY_API_TOKEN, remove CHATREALTY_TEST_DATA).

import fs from "fs";
import path from "path";
import type { SearchResult, ListingDetail, MarketStats, ListingFilters } from "./types";

export function isTestDataMode(): boolean {
  return process.env.CHATREALTY_TEST_DATA === "true";
}

let cache: ListingDetail[] | null = null;

function load(): ListingDetail[] {
  if (!cache) {
    const file = path.join(process.cwd(), "data", "test-listings.json");
    cache = JSON.parse(fs.readFileSync(file, "utf8")) as ListingDetail[];
  }
  return cache;
}

export function searchTestListings(filters: ListingFilters = {}): SearchResult {
  let rows = load();
  const ci = (s: string | null | undefined) => (s || "").toLowerCase();
  if (filters.city) rows = rows.filter((l) => ci(l.city) === ci(filters.city));
  if (filters.subdivision) rows = rows.filter((l) => ci(l.subdivision) === ci(filters.subdivision));
  if (filters.propertyType) rows = rows.filter((l) => l.propertyType === filters.propertyType);
  if (filters.minPrice != null) rows = rows.filter((l) => (l.listPrice ?? 0) >= filters.minPrice!);
  if (filters.maxPrice != null) rows = rows.filter((l) => (l.listPrice ?? Infinity) <= filters.maxPrice!);
  if (filters.minBeds != null) rows = rows.filter((l) => (l.beds ?? 0) >= filters.minBeds!);
  if (filters.minBaths != null) rows = rows.filter((l) => (l.baths ?? 0) >= filters.minBaths!);
  if (filters.hasPool !== undefined) rows = rows.filter((l) => l.pool === filters.hasPool);

  const skip = Math.max(0, filters.skip ?? 0);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 24));
  const page = rows.slice(skip, skip + limit);
  return {
    items: page,
    total: rows.length,
    skip,
    limit,
    hasMore: skip + page.length < rows.length,
  };
}

export function getTestListing(listingKey: string): ListingDetail | null {
  const k = listingKey.toUpperCase();
  return load().find((l) => l.listingKey === k || l.slug === listingKey) ?? null;
}

export function testMarketStats(opts: { city?: string; subdivision?: string; propertyType?: string }): MarketStats {
  const { items } = searchTestListings({ city: opts.city, subdivision: opts.subdivision, propertyType: opts.propertyType, limit: 50 });
  const prices = items.map((l) => l.listPrice ?? 0).filter(Boolean).sort((a, b) => a - b);
  const doms = items.map((l) => l.daysOnMarket ?? 0).sort((a, b) => a - b);
  const median = (xs: number[]) => (xs.length ? xs[Math.floor(xs.length / 2)] : null);
  return {
    scope: { city: opts.city ?? null, subdivision: opts.subdivision ?? null, propertyType: opts.propertyType ?? null },
    activeCount: items.length,
    medianListPrice: median(prices),
    averageListPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    medianDaysOnMarket: median(doms),
    priceRange: prices.length ? { min: prices[0], max: prices[prices.length - 1] } : null,
  };
}
