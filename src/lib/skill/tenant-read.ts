// src/lib/skill/tenant-read.ts
//
// Helpers for the per-tenant read migration (build_plan Phase 2 "de-globalize
// on the keystone"). Legacy skill listing/market routes read the SHARED Mongo
// `unified_listings` (the owner's dogfood data). A tenant-bound token must
// NEVER see that — it's another agent's data. Routes ported to the tenant
// adapter serve the caller's OWN database; routes not yet ported use
// `tenantNotReadyResponse()` to refuse cleanly rather than leak dogfood.

import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Clean refusal for a tenant-bound token hitting a route not yet ported to
 * per-tenant reads. Honest + non-leaking (better than serving another agent's
 * data): the feature simply isn't wired to their database yet.
 */
export function tenantNotReadyResponse(feature = "This data"): NextResponse {
  return NextResponse.json(
    {
      error: "not_available_on_tenant_yet",
      message: `${feature} isn't wired to your ChatRealty database yet — it's coming online. Your listing search already reads your own data.`,
    },
    { status: 501, headers: NO_STORE }
  );
}

const median = (xs: number[]): number | null =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null;

/**
 * Compute the market-stats shape from a set of listings (each with listPrice +
 * daysOnMarket). Mirrors the legacy Mongo computation so the tenant path
 * returns byte-identical fields.
 */
export function statsFromListings(
  listings: { listPrice: number | null; daysOnMarket: number | null }[]
): {
  activeCount: number;
  medianListPrice: number | null;
  averageListPrice: number | null;
  medianDaysOnMarket: number | null;
  priceRange: { min: number; max: number } | null;
} {
  const prices = listings.map((l) => l.listPrice).filter((p): p is number => typeof p === "number");
  const dom = listings.map((l) => l.daysOnMarket).filter((d): d is number => typeof d === "number");
  return {
    activeCount: listings.length,
    medianListPrice: median(prices),
    averageListPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    medianDaysOnMarket: median(dom),
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
  };
}
