// src/lib/cma/adapt-prebuilt-stats.ts
//
// Adapter: pre-computed cmaStats (written by build-listing-cma.py) →
// CMAResult shape consumed by CMAReport / CMASubjectCard / CMACompTable.
//
// Why an adapter is needed: the Python script writes a flat shape designed
// to be small and JSON-friendly:
//
//   subject.pool: bool | null
//   subject.view: str | null
//   activeComps[].pool: bool | null
//
// But the TypeScript components were built around the on-demand engine's
// shape, which wraps each attribute in a ResolvedAttribute with confidence
// metadata:
//
//   subject.resolved.pool: { value: boolean, confidence: number, level: ... }
//   activeComps[].pool: ResolvedAttribute<boolean>
//
// Rather than rewrite the Python script (and lose the small JSON
// representation in Mongo), we wrap on the client side. Pre-computed data
// claims confidence: 1.0 + level: "confirmed" because the cron evaluated
// MLS fields + remarks parser the same way the on-demand engine does;
// the difference is just storage shape, not provenance.
//
// Returns null if the input clearly isn't pre-built cmaStats (missing
// subject), letting the caller fall back to the on-demand fetch.

import {
  CMAResult,
  CMASubject,
  CMAComp,
  ResolvedAttribute,
  ResolvedListingAttributes,
  parseViewCategories,
} from "./types";

const SOURCE = "Pre-computed CMA (cmaStats)";

function resolvedBool(value: boolean | null | undefined): ResolvedAttribute<boolean> {
  if (value === true || value === false) {
    return { value, confidence: 1, level: "confirmed", source: SOURCE };
  }
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

/**
 * Read a boolean from any of several possible field-name variants. Different
 * MLS sync paths populate the listing differently — on the unified_listings
 * doc itself we see `poolYn`, `poolYN`, and bare `pool` co-existing across
 * sources. The Python build-listing-cma script tries to normalize these on
 * the subject but the comp objects passed through with whatever the source
 * MLS document had. So we try the same set of variants here.
 */
function readBoolFlexible(obj: any, names: string[]): boolean | null | undefined {
  if (!obj) return undefined;
  for (const n of names) {
    const v = obj[n];
    if (v === true || v === false) return v;
  }
  return undefined;
}

const POOL_FIELDS = ["pool", "poolYn", "poolYN", "Pool", "PoolPrivateYN"];
const SPA_FIELDS = ["spa", "spaYn", "spaYN", "Spa", "SpaYN"];

function resolvedString(value: string | null | undefined): ResolvedAttribute<string> {
  if (typeof value === "string" && value.length > 0) {
    return { value, confidence: 1, level: "confirmed", source: SOURCE };
  }
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

function resolvedNumber(value: number | null | undefined): ResolvedAttribute<number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, confidence: 1, level: "confirmed", source: SOURCE };
  }
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

function unknownBool(): ResolvedAttribute<boolean> {
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

function unknownString(): ResolvedAttribute<string> {
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

function unknownNumber(): ResolvedAttribute<number> {
  return { value: null, confidence: 0, level: "unknown", source: SOURCE };
}

/**
 * Wrap the flat pool/spa/view/garage on a Python-shape comp into the
 * ResolvedAttribute shape CMACompTable expects. Returns the comp with
 * those four fields converted; everything else passes through.
 */
function adaptComp(c: any): CMAComp {
  return {
    ...c,
    listingKey: c.listingKey,
    listingId: c.listingId ?? c.listingKey,
    address: c.address,
    city: c.city,
    subdivisionName: c.subdivisionName ?? null,
    yearBuilt: c.yearBuilt ?? 0,
    bedsTotal: c.bedsTotal ?? 0,
    bathsTotal: c.bathsTotal ?? 0,
    livingArea: c.livingArea ?? 0,
    lotSize: c.lotSize ?? 0,
    lotSizeAcres: c.lotSizeAcres ?? (c.lotSize ? c.lotSize / 43560 : 0),
    garageSpaces: c.garageSpaces ?? 0,
    pool: resolvedBool(readBoolFlexible(c, POOL_FIELDS)),
    spa: resolvedBool(readBoolFlexible(c, SPA_FIELDS)),
    date: c.closeDate ?? c.onMarketDate ?? "",
    listPricePerSqft: c.listPricePerSqft ?? 0,
    // Python builder writes `listPrice`; the TS comp shape expects
    // `currentListPrice`. Normalize so the LP column has a value.
    currentListPrice: c.currentListPrice ?? c.listPrice ?? 0,
    similarityScore: c.similarityScore ?? 0,
  } as CMAComp;
}

/**
 * Haversine distance in miles between two lat/lng pairs. Used to drop
 * obviously-out-of-region comps the Python builder lets through (it
 * doesn't always constrain by geography, so a La Quinta subject can end
 * up with closed comps from San Clemente or Oakland — see backend
 * handoff at docs/cma/BACKEND_FIX_COMP_RADIUS.md).
 */
function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const MAX_COMP_DISTANCE_MILES = 30;

/**
 * Drop comps that are too far from the subject to be meaningful. A
 * 30-mile cap covers typical metro-area comp shopping (whole Coachella
 * Valley, all of west LA, etc.) without being so tight that it cuts
 * legitimate cross-city comps. Comps without lat/lng pass through —
 * we can't safely filter them and prefer false positives over false
 * negatives.
 */
function filterCompsByDistance(comps: any[], subject: any): any[] {
  const sLat = subject?.latitude;
  const sLon = subject?.longitude;
  if (typeof sLat !== "number" || typeof sLon !== "number" || (sLat === 0 && sLon === 0)) {
    return comps; // subject has no usable coords — can't filter
  }
  return comps.filter((c) => {
    const cLat = c?.latitude;
    const cLon = c?.longitude;
    if (typeof cLat !== "number" || typeof cLon !== "number" || (cLat === 0 && cLon === 0)) {
      return true; // comp has no usable coords — keep it
    }
    return haversineMiles(sLat, sLon, cLat, cLon) <= MAX_COMP_DISTANCE_MILES;
  });
}

/**
 * Compute the stats fields the TypeScript CMAStats interface requires but
 * the Python script doesn't currently write: minSqft / maxSqft /
 * medianSqft / avgBedsTotal / avgBathsTotal. Derived from the comp array.
 */
function fillMissingStats(rawStats: any, comps: any[], priceField: "listPrice" | "closePrice"): any {
  const stats = { ...(rawStats || {}) };

  // Computed safely even when comps is empty — avoids divide-by-zero +
  // makes the table render with zero placeholders instead of crashing.
  const sqfts = comps
    .map((c) => c?.livingArea)
    .filter((v) => typeof v === "number" && v > 0) as number[];
  const beds = comps
    .map((c) => c?.bedsTotal)
    .filter((v) => typeof v === "number") as number[];
  const baths = comps
    .map((c) => c?.bathsTotal)
    .filter((v) => typeof v === "number") as number[];

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  if (stats.minSqft == null) stats.minSqft = sqfts.length ? Math.min(...sqfts) : 0;
  if (stats.maxSqft == null) stats.maxSqft = sqfts.length ? Math.max(...sqfts) : 0;
  if (stats.medianSqft == null) stats.medianSqft = median(sqfts);
  if (stats.avgBedsTotal == null) stats.avgBedsTotal = avg(beds);
  if (stats.avgBathsTotal == null) stats.avgBathsTotal = avg(baths);

  // Defensive defaults for fields the Python script DOES write but might
  // be missing on edge cases (e.g., a single-comp result set).
  stats.count = stats.count ?? comps.length;
  stats.avgPrice = stats.avgPrice ?? 0;
  stats.minPrice = stats.minPrice ?? 0;
  stats.maxPrice = stats.maxPrice ?? 0;
  stats.medianPrice = stats.medianPrice ?? 0;
  stats.avgPricePerSqft = stats.avgPricePerSqft ?? 0;
  stats.avgSqft = stats.avgSqft ?? 0;
  stats.avgLotSize = stats.avgLotSize ?? 0;
  stats.avgDaysOnMarket = stats.avgDaysOnMarket ?? 0;

  // Suppress unused-param warning — priceField reserved for future use
  // (e.g., recomputing avgPrice from comps if missing).
  void priceField;

  return stats;
}

/**
 * Convert a pre-computed cmaStats object (Python shape) into a CMAResult
 * the existing components can render. Returns null when the input doesn't
 * look like pre-built stats — caller should fall back to the on-demand
 * /api/cma/generate flow.
 *
 * The `listing` argument supplies fields the Python script doesn't write
 * (latitude/longitude/associationFee/etc.) so the subject card stays
 * complete.
 */
export function adaptPrebuiltCmaStats(
  cmaStats: any,
  listing: any
): CMAResult | null {
  if (!cmaStats || typeof cmaStats !== "object") return null;
  if (!cmaStats.subject || typeof cmaStats.subject !== "object") return null;

  const ps = cmaStats.subject;

  // Build the resolved attribute block. Pool/spa/view/garage come from
  // the Python output; the rest (golf/gated/senior/remodeled/furnished)
  // weren't in scope for the pre-build script — leave them as unknown so
  // CMASubjectCard renders a "—" instead of a hard crash.
  // Read pool/spa/view from EITHER the cmaStats subject (Python output)
  // OR the listing doc directly. The Python script reads from the listing
  // and normalizes onto subject, but if the script's field-name handling
  // diverged, the listing is the canonical source for these.
  const subjectPool =
    readBoolFlexible(ps, POOL_FIELDS) ?? readBoolFlexible(listing, POOL_FIELDS);
  const subjectSpa =
    readBoolFlexible(ps, SPA_FIELDS) ?? readBoolFlexible(listing, SPA_FIELDS);
  const subjectView =
    [ps?.view, ps?.View, listing?.view, listing?.View].find(
      (v) => typeof v === "string" && v.length > 0
    ) ?? null;

  const resolved: ResolvedListingAttributes = {
    pool: resolvedBool(subjectPool),
    spa: resolvedBool(subjectSpa),
    view: resolvedString(subjectView),
    viewCategories: parseViewCategories(subjectView),
    garage: resolvedNumber(ps.garageSpaces ?? listing?.garageSpaces),
    gatedCommunity: unknownBool(),
    seniorCommunity: unknownBool(),
    golf: unknownBool(),
    remodeled: unknownBool(),
    furnished: unknownString(),
  };

  // Compose the CMASubject. Pull what's not in cmaStats.subject from the
  // listing document directly (lat/lng/associationFee/etc.).
  const subject: CMASubject = {
    listingKey: listing?.listingKey ?? "",
    address:
      listing?.unparsedAddress ||
      listing?.unparsedFirstLineAddress ||
      listing?.address ||
      "",
    city: listing?.city ?? ps.city ?? "",
    subdivisionName: listing?.subdivisionName ?? ps.subdivisionName ?? null,
    listPrice: ps.listPrice ?? listing?.listPrice ?? 0,
    livingArea: ps.livingArea ?? listing?.livingArea ?? 0,
    lotSize: ps.lotSize ?? listing?.lotSizeSqft ?? listing?.lotSizeArea ?? 0,
    lotSizeAcres: ps.lotSize ? ps.lotSize / 43560 : 0,
    bedsTotal: ps.bedsTotal ?? listing?.bedsTotal ?? 0,
    bathsTotal: ps.bathsTotal ?? listing?.bathsTotal ?? 0,
    yearBuilt: ps.yearBuilt ?? listing?.yearBuilt ?? 0,
    pricePerSqft:
      ps.pricePerSqft ??
      (ps.listPrice && ps.livingArea ? Math.round(ps.listPrice / ps.livingArea) : 0),
    propertyType: ps.propertyType ?? listing?.propertyType ?? "A",
    propertySubType: ps.propertySubType ?? listing?.propertySubType ?? "",
    landType: ps.landType ?? listing?.landType ?? "Fee",
    view: ps.view ?? listing?.view ?? null,
    viewCategories: parseViewCategories(ps.view ?? listing?.view),
    architecturalStyle: listing?.architecturalStyle ?? null,
    stories: listing?.stories ?? 0,
    garageSpaces: ps.garageSpaces ?? listing?.garageSpaces ?? 0,
    associationFee: listing?.associationFee ?? 0,
    lotFeatures: listing?.lotFeatures ?? null,
    schoolDistrict: listing?.elementarySchoolDistrict ?? null,
    latitude: listing?.latitude ?? 0,
    longitude: listing?.longitude ?? 0,
    resolved,
  };

  // Filter out-of-region comps (Python builder doesn't always constrain
  // by geography). Drop nothing the Python author intends — we just trim
  // obviously-wrong outliers like an Oakland comp on a La Quinta subject.
  const rawActive = Array.isArray(cmaStats.activeComps) ? cmaStats.activeComps : [];
  const rawClosed = Array.isArray(cmaStats.closedComps) ? cmaStats.closedComps : [];
  const filteredActive = filterCompsByDistance(rawActive, subject);
  const filteredClosed = filterCompsByDistance(rawClosed, subject);
  const droppedActive = rawActive.length - filteredActive.length;
  const droppedClosed = rawClosed.length - filteredClosed.length;

  // Stats need to be recomputed from the filtered arrays — the Python
  // pre-computed stats include the now-dropped comps, so leaving them
  // unchanged would show medians that don't match the visible table.
  // fillMissingStats happily recomputes whatever wasn't provided, so we
  // pass an empty input to force a full recompute over the filtered comps.
  const recomputedActive = fillMissingStats({}, filteredActive, "listPrice");
  const recomputedClosed = fillMissingStats({}, filteredClosed, "closePrice");

  // Tack a limitation entry on if anything got dropped, so the rendered
  // report can surface "we trimmed N out-of-region comps".
  const limitations = Array.isArray(cmaStats.limitations) ? [...cmaStats.limitations] : [];
  if (droppedActive > 0 || droppedClosed > 0) {
    const parts: string[] = [];
    if (droppedActive > 0) parts.push(`${droppedActive} active`);
    if (droppedClosed > 0) parts.push(`${droppedClosed} closed`);
    limitations.push(
      `Trimmed ${parts.join(" and ")} comp${droppedActive + droppedClosed === 1 ? "" : "s"} more than ${MAX_COMP_DISTANCE_MILES} miles from the subject.`
    );
  }

  return {
    subject,
    tier: cmaStats.tier ?? "residential",
    activeComps: filteredActive.map(adaptComp),
    closedComps: filteredClosed.map(adaptComp),
    stats: {
      active: recomputedActive,
      closed: recomputedClosed,
    },
    limitations,
    inferences: Array.isArray(cmaStats.inferences) ? cmaStats.inferences : [],
    narrative: cmaStats.narrative ?? "",
    generatedAt: cmaStats.lastUpdated ?? new Date().toISOString(),
    searchCriteria: {
      levelsUsed: cmaStats.searchCriteria?.levelsUsed ?? { active: 0, closed: 0 },
      subdivisionMatched: cmaStats.searchCriteria?.subdivisionMatched ?? false,
      dateRangeUsed: cmaStats.searchCriteria?.dateRangeUsed ?? { active: "", closed: "" },
      sqftRangeUsed: cmaStats.searchCriteria?.sqftRangeUsed ?? "",
      totalCandidatesEvaluated:
        cmaStats.searchCriteria?.totalCandidatesEvaluated ?? { active: 0, closed: 0 },
    },
  };
}
