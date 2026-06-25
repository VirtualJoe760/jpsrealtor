// src/lib/db/to-dto.ts
//
// Agent 01 — the ONE place raw rows collapse into canonical camelCase DTOs.
//
// Both adapters (Mongo, Postgres) and every route funnel through these mappers
// so the dialects can never drift (build_plan §6.3: "the only place fields are
// collapsed; routes touch DTOs only or dialects drift"). The output is
// byte-identical to today's inline `.map(...)` in
// `src/app/api/skill/listings/search/route.ts` and `contacts/search/route.ts`.
//
// COLLAPSES PERFORMED HERE (build_plan Agent 01 acceptance):
//   - beds:  bedroomsTotal || bedsTotal
//   - baths: bathroomsTotalInteger || bathsTotal
//   - pool:  poolYN || poolYn || pool || (poolFeatures && !== "None")
//   - photo: the media-URL fallback chain → primaryPhotoUrl, then a render-ready
//            optimized thumbUrl
//
// ATTRIBUTION INVARIANT (build_plan §3.8 — HARD RULE): every ListingDTO carries
// `listAgentName` + `listOfficeName`. They are NON-OPTIONAL on the DTO and this
// mapper ALWAYS populates them (empty string when the row genuinely lacks the
// data — never `undefined`, never dropped). A listing DTO without attribution
// is a compliance bug; the contract test fails if these are absent.

import type { ListingDTO, ContactDTO } from "./adapter";

/**
 * The site the public listing-detail page lives on. Matches today's search
 * route (www avoids the apex→www redirect; the page resolves by listingKey).
 */
const SITE_BASE = "https://www.chatrealty.io";

/** Coerce to a finite number, else null. */
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Coerce to a non-empty string, else null. */
function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v.length > 0 ? v : null;
}

/**
 * First photo URL (raw original) for a listing.
 *
 * Reproduces the search route's `rawPhotoUrl` fallback chain, then extends it
 * with `primaryPhotoUrl` (top-level, written by the photo-sync) and the
 * PascalCase Spark variants so a Postgres row, a lean Mongo row, and a hydrated
 * doc all resolve to the same URL. Order matters — largest render-quality
 * variant first, smallest/legacy last.
 */
function rawPhotoUrl(l: Record<string, any>): string | null {
  const m = Array.isArray(l.media) ? l.media[0] : undefined;
  return (
    strOrNull(l.primaryPhotoUrl) ||
    strOrNull(m?.uriLarge) ||
    strOrNull(m?.UriLarge) ||
    strOrNull(m?.uri1024) ||
    strOrNull(m?.Uri1024) ||
    strOrNull(m?.uri800) ||
    strOrNull(m?.Uri800) ||
    strOrNull(m?.uri640) ||
    strOrNull(m?.Uri640) ||
    strOrNull(m?.MediaURL) ||
    strOrNull(m?.mediaURL) ||
    null
  );
}

/**
 * A small optimized webp via our own image optimizer — render-ready for an
 * `<img>` in a Claude artifact (~10-30KB vs the ~700KB original). Identical to
 * the search route's `optimizedThumb`.
 */
function optimizedThumb(raw: string | null): string | null {
  return raw
    ? `${SITE_BASE}/_next/image?url=${encodeURIComponent(raw)}&w=640&q=75`
    : null;
}

/** Collapse the latitude across top-level + GeoJSON coordinate shapes. */
function latOf(l: Record<string, any>): number | null {
  if (typeof l.latitude === "number") return l.latitude;
  // GeoJSON is [lng, lat]; some lean reads surface coordinates as a bare array,
  // others as { coordinates: [...] }.
  return (
    numOrNull(l.coordinates?.coordinates?.[1]) ?? numOrNull(l.coordinates?.[1])
  );
}

/** Collapse the longitude across top-level + GeoJSON coordinate shapes. */
function lngOf(l: Record<string, any>): number | null {
  if (typeof l.longitude === "number") return l.longitude;
  return (
    numOrNull(l.coordinates?.coordinates?.[0]) ?? numOrNull(l.coordinates?.[0])
  );
}

/**
 * Pool presence. Collapses every casing the sync has ever written —
 * `poolYN` (canonical), `poolYn` (alias), `pool` (legacy boolean) — and falls
 * back to the `poolFeatures` string heuristic the search route uses (present and
 * not literally "None").
 */
function poolOf(l: Record<string, any>): boolean {
  if (typeof l.poolYN === "boolean") return l.poolYN;
  if (typeof l.poolYn === "boolean") return l.poolYn;
  if (typeof l.pool === "boolean") return l.pool;
  return !!(l.poolFeatures && !/^\s*none\s*$/i.test(String(l.poolFeatures)));
}

/**
 * Days on market. Prefer the MLS-provided snapshot; else derive from
 * `onMarketDate` (same formula as the search route).
 */
function daysOnMarketOf(l: Record<string, any>): number | null {
  if (typeof l.daysOnMarket === "number") return l.daysOnMarket;
  if (l.onMarketDate) {
    const t = new Date(l.onMarketDate).getTime();
    if (Number.isFinite(t)) {
      return Math.max(0, Math.floor((Date.now() - t) / 86400000));
    }
  }
  return null;
}

/** Normalize a possibly-Date `onMarketDate` to its ISO string (or null). */
function onMarketDateOf(l: Record<string, any>): string | null {
  const v = l.onMarketDate;
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return strOrNull(v);
}

/**
 * Map a raw listing row (Mongo lean doc, hydrated doc, or Postgres row) to the
 * canonical `ListingDTO`.
 *
 * ATTRIBUTION (build_plan §3.8): `listAgentName` and `listOfficeName` are ALWAYS
 * set — falling back through the marketing/view-name aliases the sync may have
 * written, and finally to `""` so the field is structurally present even when
 * the source row is missing it. Never `undefined`, never omitted.
 */
export function toListingDTO(l: Record<string, any>): ListingDTO {
  const raw = rawPhotoUrl(l);
  const listingKey = String(l.listingKey ?? "");

  return {
    // identity
    listingKey,
    slug: `/mls-listings/${listingKey}`,
    detailUrl: `${SITE_BASE}/mls-listings/${listingKey}`,

    // location
    address: strOrNull(l.unparsedAddress) ?? strOrNull(l.address),
    city: strOrNull(l.city),
    subdivision: strOrNull(l.subdivisionName) ?? strOrNull(l.subdivision),
    latitude: latOf(l),
    longitude: lngOf(l),

    // classification
    propertyType: strOrNull(l.propertyTypeLabel) ?? strOrNull(l.propertyType),
    status: strOrNull(l.standardStatus) ?? strOrNull(l.status),

    // price
    listPrice: numOrNull(l.listPrice),
    currentPrice:
      numOrNull(l.currentPrice) ??
      numOrNull(l.currentPricePublic) ??
      numOrNull(l.listPrice),

    // facts — dual-column collapse
    beds: numOrNull(l.bedroomsTotal) ?? numOrNull(l.bedsTotal),
    baths: numOrNull(l.bathroomsTotalInteger) ?? numOrNull(l.bathsTotal),
    sqft: numOrNull(l.livingArea) ?? numOrNull(l.buildingAreaTotal),
    yearBuilt: numOrNull(l.yearBuilt),
    pool: poolOf(l),

    // market timing
    daysOnMarket: daysOnMarketOf(l),
    onMarketDate: onMarketDateOf(l),

    // media — fallback chain collapsed
    primaryPhotoUrl: raw,
    thumbUrl: optimizedThumb(raw),

    // ATTRIBUTION — required, always populated (§3.8)
    listAgentName:
      strOrNull(l.listAgentName) ??
      strOrNull(l.listAgentMarketingName) ??
      strOrNull(l.listAgentViewName) ??
      "",
    listOfficeName:
      strOrNull(l.listOfficeName) ?? strOrNull(l.listOfficeViewName) ?? "",
    listAgentPreferredPhone: strOrNull(l.listAgentPreferredPhone),
    listOfficePhone: strOrNull(l.listOfficePhone),
  };
}

/**
 * Map a raw contact row to `ContactDTO`. Collapses the structured
 * phones[]/emails[] arrays (primary first) with the deprecated scalar
 * `phone`/`email` as the final fallback — identical to the contacts search
 * route's inline mapper.
 */
export function toContactDTO(c: Record<string, any>): ContactDTO {
  const phones: any[] = Array.isArray(c.phones) ? c.phones : [];
  const emails: any[] = Array.isArray(c.emails) ? c.emails : [];

  const primaryPhone =
    phones.find((p) => p?.isPrimary)?.number ||
    phones[0]?.number ||
    strOrNull(c.phone) ||
    null;
  const primaryEmail =
    emails.find((e) => e?.isPrimary)?.address ||
    emails[0]?.address ||
    strOrNull(c.email) ||
    null;

  const fullName =
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    strOrNull(c.organization) ||
    "Unnamed contact";

  return {
    id: String(c._id ?? c.id ?? ""),
    name: fullName,
    organization: strOrNull(c.organization),
    status: strOrNull(c.status),
    tags: Array.isArray(c.tags) ? c.tags : [],
    primaryPhone,
    primaryEmail,
    source: strOrNull(c.source),
    lastContactDate: c.lastContactDate ?? null,
    lastContactMethod: strOrNull(c.lastContactMethod),
    createdAt: c.createdAt ?? null,
  };
}
