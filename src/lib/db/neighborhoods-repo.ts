// src/lib/db/neighborhoods-repo.ts
//
// Agent 27 — the neighborhoods read repo (build_plan §8.2).
//
// Driver-AGNOSTIC by construction: every query routes through the `DbAdapter`'s
// `query<T>(sql, params)` raw runner (Agent 01 contract). It NEVER imports the
// neon driver, Drizzle, Mongoose, or a connection string — the tenant-scoped
// adapter is handed in by the keystone resolver (build_plan §3.3), so a global
// data-plane connection is structurally impossible here. The same code therefore
// runs against any adapter whose `query()` speaks parameterized Postgres SQL.
//
// PARAMETER STYLE: the adapter's `query()` binds POSITIONAL `$1, $2, …` params
// (postgres-adapter routes a parameterized statement over the WS Pool, which
// binds `$N` natively). Every value is a bound param — no value interpolation,
// ever.
//
// WHAT THIS OWNS (the four read methods the neighborhood skill routes + CHAP
// consume):
//   • getDirectoryTree()                     — Region → County → City → Subdivision
//   • getCityBySlug(slug)                     — one city row
//   • getSubdivisionBySlug(citySlug, slug)    — one subdivision + its joined CMA
//   • nearbyPois(lat, lng, radiusMiles)       — PostGIS ST_DWithin, grouped by category
//
// The hierarchy is built from the pre-aggregated 0003 tables (cities/subdivisions
// carry `region`/`county` as denormalized string columns — the same string-match
// model the legacy `neighborhoods-data.ts` builder uses). The SUBDIVISION tier is
// OPTIONAL (build_plan §8.2): a city with no subdivisions simply has none; this
// never errors.
//
// PLACEHOLDER FILTERING: MLS feeds carry junk subdivision names ("Not
// Applicable", "N/A", "Other", …). The legacy builder drops them; we drop them
// here too so the directory and by-slug reads never surface a placeholder
// neighborhood.

import type { DbAdapter } from "./adapter";

// -----------------------------------------------------------------------------
// Placeholder subdivision names (ported from neighborhoods-data.ts) — excluded
// from the directory tree and treated as "no subdivision" by-slug.
// -----------------------------------------------------------------------------

const PLACEHOLDER_SUBDIVISION_NAMES = new Set(
  [
    "Not Applicable",
    "N/A",
    "NA",
    "None",
    "NONE",
    "Other",
    "Unknown",
    "Custom",
    "not applicable",
  ].map((s) => s.toLowerCase()),
);

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  return PLACEHOLDER_SUBDIVISION_NAMES.has(name.trim().toLowerCase());
}

// -----------------------------------------------------------------------------
// Output shapes — the directory tree (mirrors the legacy Region/County/City
// shape so a route can emit byte-parity output for DEFAULT_TENANT_ID).
// -----------------------------------------------------------------------------

export interface DirectorySubdivision {
  name: string;
  slug: string;
  listings: number;
}

export interface DirectoryCity {
  name: string;
  slug: string;
  listings: number;
  subdivisions: DirectorySubdivision[];
}

export interface DirectoryCounty {
  name: string;
  slug: string;
  listings: number;
  cities: DirectoryCity[];
}

export interface DirectoryRegion {
  name: string;
  slug: string;
  listings: number;
  counties: DirectoryCounty[];
}

// -----------------------------------------------------------------------------
// Row shapes returned by the city / subdivision by-slug reads. These are the
// full pre-aggregated rows (camelCase aliased in the SELECT) plus, for a
// subdivision, the joined CMA bundle (cma_stats 1:1 + by_subtype 1:N + top_comps
// 1:N). All analytic fields are nullable — the CMA cron emits partial blobs.
// -----------------------------------------------------------------------------

export interface CityRecord {
  id: number;
  name: string;
  slug: string;
  normalizedName: string;
  county: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  listingCount: number;
  priceMin: number | null;
  priceMax: number | null;
  avgPrice: number | null;
  medianPrice: number | null;
  propertyTypes: unknown;
  subdivisionCount: number | null;
  description: string | null;
  photo: string | null;
  features: string[] | null;
  keywords: string[] | null;
  isOcean: boolean;
  lastUpdated: string | null;
}

export interface CmaStatsRecord {
  [key: string]: unknown;
}

export interface CmaSubtypeRecord {
  subType: string;
  [key: string]: unknown;
}

export interface CmaTopCompRecord {
  compKind: string;
  position: number | null;
  [key: string]: unknown;
}

export interface SubdivisionRecord {
  id: number;
  name: string;
  slug: string;
  normalizedName: string;
  source: string;
  city: string;
  county: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  listingCount: number;
  priceMin: number | null;
  priceMax: number | null;
  avgPrice: number | null;
  medianPrice: number | null;
  propertyTypes: unknown;
  description: string | null;
  photo: string | null;
  features: string[] | null;
  keywords: string[] | null;
  communityFeatures: string | null;
  seniorCommunity: boolean | null;
  communityFacts: unknown;
  hasManualData: boolean;
  lastUpdated: string | null;
  // Joined CMA bundle (null/empty when the subdivision has no CMA row yet).
  cmaStats: CmaStatsRecord | null;
  cmaBySubtype: CmaSubtypeRecord[];
  cmaTopComps: CmaTopCompRecord[];
}

// -----------------------------------------------------------------------------
// POI shapes — the nearby bundle, grouped by category (the snapshot narrator /
// map hover consumer). Mirrors the legacy `POISummary`/`POIBundle` shape.
// -----------------------------------------------------------------------------

export interface NearbyPoi {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  rating: number | null;
  userRatingsTotal: number | null;
  description: string | null;
  city: string | null;
  address: string | null;
}

export interface NearbyPoiBundle {
  center: { latitude: number; longitude: number };
  radiusMiles: number;
  total: number;
  byCategory: Record<string, NearbyPoi[]>;
}

// -----------------------------------------------------------------------------
// Internal row helpers
// -----------------------------------------------------------------------------

// Column projections — snake_case → camelCase, fixed literal fragments (no user
// input; these are constant strings, never interpolated from a param).
const CITY_COLS = `
  id,
  name,
  slug,
  normalized_name        AS "normalizedName",
  county,
  region,
  latitude,
  longitude,
  listing_count          AS "listingCount",
  price_min              AS "priceMin",
  price_max              AS "priceMax",
  avg_price              AS "avgPrice",
  median_price           AS "medianPrice",
  property_types         AS "propertyTypes",
  subdivision_count      AS "subdivisionCount",
  description,
  photo,
  features,
  keywords,
  is_ocean               AS "isOcean",
  last_updated           AS "lastUpdated"
`;

const SUBDIVISION_COLS = `
  id,
  name,
  slug,
  normalized_name        AS "normalizedName",
  source,
  city,
  county,
  region,
  latitude,
  longitude,
  listing_count          AS "listingCount",
  price_min              AS "priceMin",
  price_max              AS "priceMax",
  avg_price              AS "avgPrice",
  median_price           AS "medianPrice",
  property_types         AS "propertyTypes",
  description,
  photo,
  features,
  keywords,
  community_features     AS "communityFeatures",
  senior_community       AS "seniorCommunity",
  community_facts        AS "communityFacts",
  has_manual_data        AS "hasManualData",
  last_updated           AS "lastUpdated"
`;

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

// -----------------------------------------------------------------------------
// The repo factory — binds the four read methods to a tenant-scoped adapter.
// -----------------------------------------------------------------------------

export interface NeighborhoodsRepo {
  getDirectoryTree(): Promise<DirectoryRegion[]>;
  getCityBySlug(slug: string): Promise<CityRecord | null>;
  getSubdivisionBySlug(
    citySlug: string,
    slug: string,
  ): Promise<SubdivisionRecord | null>;
  nearbyPois(
    lat: number,
    lng: number,
    radiusMiles?: number,
  ): Promise<NearbyPoiBundle>;
}

const DEFAULT_POI_RADIUS_MILES = 3;
const MILES_TO_METERS = 1609.344;

export function createNeighborhoodsRepo(adapter: DbAdapter): NeighborhoodsRepo {
  // ---------------------------------------------------------------------------
  // getDirectoryTree — Region → County → City → Subdivision
  // ---------------------------------------------------------------------------
  //
  // Built from the pre-aggregated `cities` (guaranteed tier) + `subdivisions`
  // (optional tier) tables, both of which denormalize `region`/`county` as
  // string columns. We read only the rows with listings (`listing_count > 0`),
  // group cities by (region, county), attach each city's subdivisions by string
  // match on (subdivision.city = city.name), filter placeholder subdivision
  // names, and sort every tier by listing count desc — exactly mirroring the
  // legacy `getNeighborhoodsDirectory()` shape.

  async function getDirectoryTree(): Promise<DirectoryRegion[]> {
    type CityRow = {
      name: string;
      slug: string;
      county: string;
      region: string;
      listingCount: unknown;
    };
    type SubRow = {
      name: string;
      slug: string;
      city: string;
      listingCount: unknown;
    };

    const [cities, subs] = await Promise.all([
      adapter.query<CityRow>(
        `SELECT name,
                slug,
                county,
                region,
                listing_count AS "listingCount"
           FROM cities
          WHERE listing_count > 0
          ORDER BY listing_count DESC`,
      ),
      adapter.query<SubRow>(
        `SELECT name,
                slug,
                city,
                listing_count AS "listingCount"
           FROM subdivisions
          WHERE listing_count > 0
          ORDER BY listing_count DESC`,
      ),
    ]);

    // Index subdivisions by their city name (string match — no FK), dropping
    // placeholder names.
    const subsByCity: Record<string, DirectorySubdivision[]> = {};
    for (const s of subs) {
      if (isPlaceholderName(s.name)) continue;
      const key = s.city;
      if (!key) continue;
      (subsByCity[key] ??= []).push({
        name: s.name,
        slug: s.slug,
        listings: num(s.listingCount),
      });
    }

    // Region → County → City[]
    const regionMap: Record<string, Record<string, DirectoryCity[]>> = {};
    for (const c of cities) {
      const region = c.region || "Other";
      const county = c.county || "Other";
      ((regionMap[region] ??= {})[county] ??= []).push({
        name: c.name,
        slug: c.slug,
        listings: num(c.listingCount),
        subdivisions: (subsByCity[c.name] || []).sort(
          (a, b) => b.listings - a.listings,
        ),
      });
    }

    const result: DirectoryRegion[] = Object.entries(regionMap)
      .map(([regionName, counties]) => {
        const countiesData: DirectoryCounty[] = Object.entries(counties)
          .map(([countyName, citiesList]) => ({
            name: countyName,
            slug: slugifyCounty(countyName),
            listings: citiesList.reduce((sum, x) => sum + x.listings, 0),
            cities: citiesList.sort((a, b) => b.listings - a.listings),
          }))
          .sort((a, b) => b.listings - a.listings);

        return {
          name: regionName,
          slug: slugify(regionName),
          listings: countiesData.reduce((sum, x) => sum + x.listings, 0),
          counties: countiesData,
        };
      })
      .sort((a, b) => b.listings - a.listings);

    return result;
  }

  // ---------------------------------------------------------------------------
  // getCityBySlug — one city by its unique slug
  // ---------------------------------------------------------------------------

  async function getCityBySlug(slug: string): Promise<CityRecord | null> {
    const rows = await adapter.query<Record<string, unknown>>(
      `SELECT ${CITY_COLS} FROM cities WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const r = rows[0];
    if (!r) return null;
    return normalizeCity(r);
  }

  // ---------------------------------------------------------------------------
  // getSubdivisionBySlug — one subdivision (scoped by its city's slug, since
  // subdivision slugs collide across cities) + its joined CMA bundle.
  // ---------------------------------------------------------------------------
  //
  // The 0003 schema's subdivision UNIQUE is (slug, city) where `city` is the
  // city NAME, not its slug. So we resolve the city slug → city name first, then
  // the subdivision by (slug, cityName). Placeholder subdivisions resolve to
  // null (treated as "no subdivision", build_plan §8.2).

  async function getSubdivisionBySlug(
    citySlug: string,
    slug: string,
  ): Promise<SubdivisionRecord | null> {
    // Resolve the city slug → city name (the subdivision's natural FK is a
    // string name match).
    const cityRows = await adapter.query<{ name: string }>(
      `SELECT name FROM cities WHERE slug = $1 LIMIT 1`,
      [citySlug],
    );
    const cityName = cityRows[0]?.name;
    if (!cityName) return null;

    const rows = await adapter.query<Record<string, unknown>>(
      `SELECT ${SUBDIVISION_COLS} FROM subdivisions WHERE slug = $1 AND city = $2 LIMIT 1`,
      [slug, cityName],
    );
    const r = rows[0];
    if (!r) return null;
    if (isPlaceholderName(r.name as string)) return null;

    const sub = normalizeSubdivision(r);
    const subdivisionId = sub.id;

    // Join the CMA bundle: cma_stats (1:1) + cma_stats_by_subtype (1:N) +
    // cma_top_comps (1:N). All three keyed on subdivision_id.
    const [cmaRows, subtypeRows, compRows] = await Promise.all([
      adapter.query<Record<string, unknown>>(
        `SELECT * FROM cma_stats WHERE subdivision_id = $1 LIMIT 1`,
        [subdivisionId],
      ),
      adapter.query<Record<string, unknown>>(
        `SELECT * FROM cma_stats_by_subtype WHERE subdivision_id = $1 ORDER BY sub_type ASC`,
        [subdivisionId],
      ),
      adapter.query<Record<string, unknown>>(
        `SELECT * FROM cma_top_comps
           WHERE subdivision_id = $1
           ORDER BY comp_kind ASC, position ASC NULLS LAST`,
        [subdivisionId],
      ),
    ]);

    sub.cmaStats = (cmaRows[0] as CmaStatsRecord | undefined) ?? null;
    sub.cmaBySubtype = subtypeRows.map((row) => ({
      ...row,
      subType: (row.sub_type as string) ?? "",
    })) as CmaSubtypeRecord[];
    sub.cmaTopComps = compRows.map((row) => ({
      ...row,
      compKind: (row.comp_kind as string) ?? "",
      position: numOrNull(row.position),
    })) as CmaTopCompRecord[];

    return sub;
  }

  // ---------------------------------------------------------------------------
  // nearbyPois — PostGIS radius query, grouped by category.
  // ---------------------------------------------------------------------------
  //
  // ST_DWithin on the geography cast of the POI `geom` against the center point
  // — a true great-circle radius in METERS (radiusMiles × 1609.344). Permanently
  // closed POIs are excluded (mirrors the legacy `businessStatus != CLOSED_*`).
  // Distance is returned per-POI (ST_Distance, also geography/meters → miles) so
  // a caller can rank by proximity. Grouped by category for the snapshot
  // narrator. A null geom is tolerated via a lat/lng fallback so a row that has
  // coordinates but no geom still matches.

  async function nearbyPois(
    lat: number,
    lng: number,
    radiusMiles: number = DEFAULT_POI_RADIUS_MILES,
  ): Promise<NearbyPoiBundle> {
    const radiusMeters = radiusMiles * MILES_TO_METERS;

    type PoiRow = {
      name: string;
      category: string;
      latitude: unknown;
      longitude: unknown;
      distanceMeters: unknown;
      rating: unknown;
      userRatingsTotal: unknown;
      description: string | null;
      city: string | null;
      address: string | null;
    };

    // $1 = lng, $2 = lat, $3 = radiusMeters. ST_MakePoint takes (lng, lat).
    const rows = await adapter.query<PoiRow>(
      `WITH center AS (
         SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS g
       )
       SELECT p.name,
              p.category,
              p.latitude,
              p.longitude,
              ST_Distance(
                COALESCE(p.geom::geography,
                         ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography),
                center.g
              ) AS "distanceMeters",
              p.rating,
              p.user_ratings_total AS "userRatingsTotal",
              p.description,
              p.city,
              p.address
         FROM points_of_interest p, center
        WHERE (p.business_status IS DISTINCT FROM 'CLOSED_PERMANENTLY')
          AND ST_DWithin(
                COALESCE(p.geom::geography,
                         ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography),
                center.g,
                $3
              )
        ORDER BY "distanceMeters" ASC
        LIMIT 200`,
      [lng, lat, radiusMeters],
    );

    const byCategory: Record<string, NearbyPoi[]> = {};
    for (const r of rows) {
      const category = r.category || "other";
      const poi: NearbyPoi = {
        name: r.name,
        category,
        latitude: num(r.latitude),
        longitude: num(r.longitude),
        distanceMiles: round2(num(r.distanceMeters) / MILES_TO_METERS),
        rating: numOrNull(r.rating),
        userRatingsTotal: numOrNull(r.userRatingsTotal),
        description: r.description ?? null,
        city: r.city ?? null,
        address: r.address ?? null,
      };
      (byCategory[category] ??= []).push(poi);
    }

    return {
      center: { latitude: lat, longitude: lng },
      radiusMiles,
      total: rows.length,
      byCategory,
    };
  }

  return { getDirectoryTree, getCityBySlug, getSubdivisionBySlug, nearbyPois };
}

// -----------------------------------------------------------------------------
// Row normalizers (snake_case-safe; the SELECT already aliases, but numerics
// arrive as strings over the pg wire so we coerce).
// -----------------------------------------------------------------------------

function normalizeCity(r: Record<string, unknown>): CityRecord {
  return {
    id: num(r.id),
    name: r.name as string,
    slug: r.slug as string,
    normalizedName: r.normalizedName as string,
    county: r.county as string,
    region: r.region as string,
    latitude: numOrNull(r.latitude),
    longitude: numOrNull(r.longitude),
    listingCount: num(r.listingCount),
    priceMin: numOrNull(r.priceMin),
    priceMax: numOrNull(r.priceMax),
    avgPrice: numOrNull(r.avgPrice),
    medianPrice: numOrNull(r.medianPrice),
    propertyTypes: r.propertyTypes ?? null,
    subdivisionCount: numOrNull(r.subdivisionCount),
    description: (r.description as string) ?? null,
    photo: (r.photo as string) ?? null,
    features: (r.features as string[]) ?? null,
    keywords: (r.keywords as string[]) ?? null,
    isOcean: Boolean(r.isOcean),
    lastUpdated: (r.lastUpdated as string) ?? null,
  };
}

function normalizeSubdivision(r: Record<string, unknown>): SubdivisionRecord {
  return {
    id: num(r.id),
    name: r.name as string,
    slug: r.slug as string,
    normalizedName: r.normalizedName as string,
    source: (r.source as string) ?? "mls",
    city: r.city as string,
    county: r.county as string,
    region: r.region as string,
    latitude: numOrNull(r.latitude),
    longitude: numOrNull(r.longitude),
    listingCount: num(r.listingCount),
    priceMin: numOrNull(r.priceMin),
    priceMax: numOrNull(r.priceMax),
    avgPrice: numOrNull(r.avgPrice),
    medianPrice: numOrNull(r.medianPrice),
    propertyTypes: r.propertyTypes ?? null,
    description: (r.description as string) ?? null,
    photo: (r.photo as string) ?? null,
    features: (r.features as string[]) ?? null,
    keywords: (r.keywords as string[]) ?? null,
    communityFeatures: (r.communityFeatures as string) ?? null,
    seniorCommunity:
      r.seniorCommunity === null || r.seniorCommunity === undefined
        ? null
        : Boolean(r.seniorCommunity),
    communityFacts: r.communityFacts ?? null,
    hasManualData: Boolean(r.hasManualData),
    lastUpdated: (r.lastUpdated as string) ?? null,
    cmaStats: null,
    cmaBySubtype: [],
    cmaTopComps: [],
  };
}

// -----------------------------------------------------------------------------
// Slug helpers (match the legacy `createSlug` + county "-county" convention so
// the tree's county slugs line up with the legacy directory output).
// -----------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyCounty(s: string): string {
  return `${slugify(s)}-county`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
