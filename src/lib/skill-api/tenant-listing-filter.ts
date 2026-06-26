// src/lib/skill-api/tenant-listing-filter.ts
//
// Pure mapping from /api/skill/listings/search query params to the structured
// ListingFilter the per-tenant adapter consumes. Kept separate from the route
// (which imports next/server + Mongoose) so it unit-tests with zero deps.
//
// This intentionally mirrors the legacy search route's param semantics so a
// tenant's basic search behaves like the live one (minus the geo bbox, which
// the route adds after geocoding). Defaults: status "Active", propertyType "A"
// (residential sale) so rentals don't pollute a basic price search.

import type { ListingFilter } from "@/lib/db/adapter";

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function rangeOf(min: number | undefined, max: number | undefined) {
  return min === undefined && max === undefined ? undefined : { min, max };
}

export function buildTenantListingFilter(sp: URLSearchParams): ListingFilter {
  const maxDom = num(sp.get("maxDaysOnMarket"));
  const minDom = num(sp.get("minDaysOnMarket"));
  let onMarketDate: { min?: string; max?: string } | undefined;
  if (maxDom !== undefined || minDom !== undefined) {
    onMarketDate = {};
    // "on market at most N days" -> onMarketDate is recent (>= now - N).
    if (maxDom !== undefined) onMarketDate.min = new Date(Date.now() - maxDom * 86400000).toISOString();
    // "on market at least N days" -> onMarketDate is old (<= now - N).
    if (minDom !== undefined) onMarketDate.max = new Date(Date.now() - minDom * 86400000).toISOString();
  }

  const hasPoolRaw = sp.get("hasPool")?.trim().toLowerCase();
  const hasPool =
    hasPoolRaw === "true" || hasPoolRaw === "1" || hasPoolRaw === "yes" ? true
    : hasPoolRaw === "false" || hasPoolRaw === "0" || hasPoolRaw === "no" ? false
    : undefined;

  return {
    city: sp.get("city")?.trim() || undefined,
    subdivision: sp.get("subdivision")?.trim() || undefined,
    propertyType: sp.get("propertyType")?.trim() || "A",
    status: sp.get("status")?.trim() || "Active",
    price: rangeOf(num(sp.get("minPrice")), num(sp.get("maxPrice"))),
    beds: rangeOf(num(sp.get("minBeds")), num(sp.get("maxBeds"))),
    baths: rangeOf(num(sp.get("minBaths")), num(sp.get("maxBaths"))),
    yearBuilt: rangeOf(num(sp.get("minYearBuilt")), num(sp.get("maxYearBuilt"))),
    onMarketDate,
    hasPool,
  };
}
