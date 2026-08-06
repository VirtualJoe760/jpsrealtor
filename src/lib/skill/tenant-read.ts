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
export function tenantNotReadyResponse(
  feature = "This data",
  /**
   * What the caller CAN use instead, if anything. Without it the reply says
   * only "not yet", and a session hunting a missing gallery has no way to tell
   * "unimplemented" from "broken" — one judged session filed the photos route
   * as a 404 bug when the honest answer was "your database holds one photo per
   * listing, and the detail page is already showing it."
   */
  alternative?: string
): NextResponse {
  return NextResponse.json(
    {
      error: "not_available_on_tenant_yet",
      message:
        `${feature} isn't wired to your ChatRealty database yet — it's coming online.` +
        (alternative
          ? ` ${alternative}`
          : " Your listing search already reads your own data."),
    },
    { status: 501, headers: NO_STORE }
  );
}

// TRUE median, including the even-length average. This used to return
// `sorted[floor(n/2)]` unconditionally, which on an even-sized set is the
// UPPER middle value, not the median. On a 2-listing market that is simply the
// larger number: a judged tenant site showed "$697,777 median list price / 269
// median days on market" for a market of $697,777 (DOM 194) and $49,000 (DOM
// 269) — both stats were the max, and the homepage read as if the cheaper home
// did not exist. Small tenant markets are the normal case here, so the even
// branch is the common path, not an edge case. The legacy Mongo route
// (api/skill/market/stats) always averaged; this is what "mirrors the legacy
// computation" was supposed to mean.
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

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
  // Rounded: the even-length branch halves, and neither a half dollar nor half
  // a day on market is a thing anyone means. averageListPrice already rounded.
  const mp = median(prices);
  const md = median(dom);
  return {
    activeCount: listings.length,
    medianListPrice: mp === null ? null : Math.round(mp),
    averageListPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    medianDaysOnMarket: md === null ? null : Math.round(md),
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
  };
}
