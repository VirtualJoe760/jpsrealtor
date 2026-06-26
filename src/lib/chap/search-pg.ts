// src/lib/chap/search-pg.ts
//
// Agent 14 — CHAP search glue on Postgres (Spec 5 Task A).
//
// The thin layer that fuses the two halves of a CHAP area/search query on the
// Postgres path:
//   1. items     ← the tenant `DbAdapter.listings.find(filter, opts)` (Agent 09)
//   2. areaStats ← `computeAreaStatsPg(adapter, filter)` (this package)
// …and shapes them into the `PreviewResult` the renderer/narrator already
// consume (src/lib/chat-search/types.ts), so the Postgres path is a drop-in for
// the Mongo `preview.ts` aggregate/listing-search/street-listings intents.
//
// This is GLUE, not logic: the SQL lives in `area-stats.ts` and the adapter; the
// intent classification lives in the parser. Here we only orchestrate the two
// repo calls and map DTOs → preview shapes.
//
// ATTRIBUTION INVARIANT (build_plan §3.8 — HARD RULE): every `ListingDTO` the
// adapter returns already carries `listAgentName` + `listOfficeName` (the DTO
// type makes them non-optional; the contract test enforces it). We CARRY those
// straight onto the preview listing so no serving surface can drop attribution.
// The Mongo preview's `PreviewListing` had no attribution slot; the Postgres
// path ADDS `listAgentName`/`listOfficeName`/phones so the narrator can cite
// "Listed by {office} — {agent}".
//
// TENANT SCOPING (build_plan §3.3): the adapter is already bound to one tenant's
// Neon DB by the keystone resolver. This module never opens a connection.

import type { DbAdapter, ListingFilter, ListingDTO, SortSpec } from "@/lib/db/adapter";
import type { AreaStats } from "@/lib/chat-v2/listing-query";
import type { PreviewListing, PreviewStats } from "@/lib/chat-search/types";
import { computeAreaStatsPg } from "./area-stats";

// -----------------------------------------------------------------------------
// Preview listing + attribution
// -----------------------------------------------------------------------------
//
// Extends the base `PreviewListing` with the attribution block. Optional-typed
// only because `PreviewListing` itself has no slot for them — but the adapter's
// DTO ALWAYS supplies non-null `listAgentName`/`listOfficeName`, so in practice
// they are always present on a Postgres result.

export interface PreviewListingWithAttribution extends PreviewListing {
  readonly listAgentName: string;
  readonly listOfficeName: string;
  readonly listAgentPreferredPhone: string | null;
  readonly listOfficePhone: string | null;
}

/** Map an adapter `ListingDTO` → the renderer's `PreviewListing` + attribution. */
export function dtoToPreviewListing(dto: ListingDTO): PreviewListingWithAttribution {
  return {
    listingKey: dto.listingKey,
    slugAddress: dto.slug,
    address: dto.address ?? "",
    city: dto.city ?? undefined,
    subdivision: dto.subdivision ?? undefined,
    price: dto.listPrice ?? dto.currentPrice ?? undefined,
    beds: dto.beds ?? undefined,
    baths: dto.baths ?? undefined,
    sqft: dto.sqft ?? undefined,
    yearBuilt: dto.yearBuilt ?? undefined,
    primaryPhotoUrl: dto.primaryPhotoUrl ?? dto.thumbUrl ?? undefined,
    onMarketDate: dto.onMarketDate ?? undefined,
    daysOnMarket: dto.daysOnMarket ?? undefined,
    standardStatus: dto.status ?? undefined,
    latitude: dto.latitude ?? undefined,
    longitude: dto.longitude ?? undefined,
    // ATTRIBUTION (§3.8) — carried verbatim from the DTO, never dropped.
    listAgentName: dto.listAgentName,
    listOfficeName: dto.listOfficeName,
    listAgentPreferredPhone: dto.listAgentPreferredPhone,
    listOfficePhone: dto.listOfficePhone,
  };
}

/** Map the full `AreaStats` → the renderer's lighter `PreviewStats`. */
export function areaStatsToPreviewStats(s: AreaStats): PreviewStats {
  return {
    totalListings: s.totalListings,
    newListingsCount: s.newListingsCount,
    avgPrice: s.avgPrice,
    medianPrice: s.medianPrice,
    priceRange: s.priceRange,
    avgPricePerSqft: s.avgPricePerSqft,
    medianPricePerSqft: s.medianPricePerSqft,
    hoa: s.hoa,
    amenities: s.amenities,
    propertyTypes: s.propertyTypes,
  };
}

// -----------------------------------------------------------------------------
// Options + result
// -----------------------------------------------------------------------------

export interface ChapSearchOptions {
  /** Page size (clamped by the adapter; defaults to the adapter default). */
  readonly limit?: number;
  /** Offset. */
  readonly skip?: number;
  /** Structured ordering (priority order). */
  readonly sort?: readonly SortSpec[];
  /** Skip the area-stats CTE (e.g. street-listings only wants items + count). */
  readonly withStats?: boolean;
  /** Request an exact total alongside the page. */
  readonly withCount?: boolean;
}

/** The preview-shaped result of a CHAP area/search query on Postgres. */
export interface ChapSearchResult {
  /** The page of listings, attribution included. */
  readonly listings: PreviewListingWithAttribution[];
  /** Full-set area stats (null when `withStats` is false). */
  readonly stats: PreviewStats | null;
  /** Exact total when requested/derivable, else null. */
  readonly totalCount: number | null;
  /** True when more pages exist beyond this one. */
  readonly hasMore: boolean;
}

// -----------------------------------------------------------------------------
// searchListingsPg — the glue entry point
// -----------------------------------------------------------------------------

/**
 * Run a CHAP listing search on the Postgres path: fetch a page of listings via
 * the tenant adapter and (unless suppressed) compute full-set area stats over
 * the same filter, returning the preview-shaped result.
 *
 * Both halves run against the SAME tenant `DbAdapter`, so they share one pooled
 * connection. `stats` and `listings` run in parallel — the stats CTE is a single
 * round-trip independent of the page fetch.
 *
 * @param adapter  The tenant-scoped Postgres adapter (from the keystone).
 * @param filter   The structured listing filter (the search predicate).
 * @param opts     Pagination / sort / stats knobs.
 */
export async function searchListingsPg(
  adapter: DbAdapter,
  filter: ListingFilter,
  opts: ChapSearchOptions = {},
): Promise<ChapSearchResult> {
  const wantStats = opts.withStats !== false; // default ON (aggregate intent)

  const pagePromise = adapter.listings.find(filter, {
    limit: opts.limit,
    skip: opts.skip,
    sort: opts.sort,
    withCount: opts.withCount,
  });

  const statsPromise: Promise<AreaStats | null> = wantStats
    ? computeAreaStatsPg(adapter, filter)
    : Promise.resolve(null);

  const [page, stats] = await Promise.all([pagePromise, statsPromise]);

  // Prefer the stats CTE's total (full-set count) when available, else the
  // page's own total (set when withCount or when the last page was reached).
  const totalCount =
    stats?.totalListings != null ? stats.totalListings : page.total;

  return {
    listings: page.items.map(dtoToPreviewListing),
    stats: stats ? areaStatsToPreviewStats(stats) : null,
    totalCount,
    hasMore: page.hasMore,
  };
}
