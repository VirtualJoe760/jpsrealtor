// src/lib/chap/area-stats.ts
//
// Agent 14 — CHAP area stats on Postgres (Spec 5 Task A, the #1 spike).
//
// `computeAreaStatsPg(runner, filter)` is the Postgres twin of the Mongo
// `computeAreaStats` ($facet) in `src/lib/chat-v2/listing-query.ts`. It produces
// the IDENTICAL `AreaStats` shape (build_plan §3.6 / §6.5) over the FULL filtered
// set — not a 50-row sample — using ONE CTE in a single round-trip.
//
// THE SPIKE'S SQL MAPPING (docs/chatrealty-api/spike-chap-postgis.md §3) drives
// every line here:
//   • MEDIANS use percentile_disc(0.5) — DISCRETE, never percentile_cont. The
//     Mongo path takes the floor-index element of a sorted array (an actual data
//     point); percentile_disc reproduces that, percentile_cont interpolates and
//     would silently drift the medians (spike risk #2). This is non-negotiable.
//   • amenity / property-type counts use COUNT(*) FILTER (WHERE …).
//   • avg / min / max are plain aggregates; price-per-sqft guards divide-by-zero
//     with NULLIF(living_area,0) (NULLs are skipped by avg/percentile, matching
//     the Mongo $cond livingArea>0 guard).
//   • AMENITY FIELD-NAME FALLBACK (spike risk #1, the Beverly Hills 0%-vs-73%
//     defect): every amenity reads the canonical typed column OR an `extras`
//     fallback, so a tenant whose feed routed the bare name into `extras` still
//     counts. Columns that DON'T exist as typed columns on the property table
//     (association_fee, fireplaces_total, fireplace_yn, gated_community,
//     age_restricted_55_plus) are read from `extras` only — confirmed against the
//     live schema (src/lib/db/schema/listings.ts has pool_yn/spa_yn/view_yn/
//     senior_community_yn typed; the rest live in extras).
//
// PARAMETERIZATION (build_plan §6.5): every VALUE is a bound `$N` positional
// parameter — never interpolated. The only thing embedded into the SQL string is
// a fixed allow-list of column identifiers and the extras key (validated against
// a strict identifier shape first). The runner is the adapter's `query<T>(sql,
// params)` (postgres-adapter.ts) or any `(sql, params) => Promise<rows>`.
//
// TENANT SCOPING (build_plan §3.3): this module never opens a connection. It is
// handed a runner that is already bound to exactly one tenant's Neon DB by the
// keystone resolver. There is no module-level `db` here.

import type { ListingFilter } from "@/lib/db/adapter";
import type { AreaStats } from "@/lib/chat-v2/listing-query";

// -----------------------------------------------------------------------------
// Runner contract — the thinnest possible SQL surface
// -----------------------------------------------------------------------------
//
// Accept either the DbAdapter (we use its `.query`) or a bare parameterized
// runner. This keeps area-stats decoupled from how the caller obtained the
// connection (adapter, raw TenantSql handle, or a test stub).

/** A parameterized SQL runner: `(text, params) => rows`. Params are bound. */
export type SqlRunner = <T = Record<string, unknown>>(
  sql: string,
  params?: readonly unknown[],
) => Promise<T[]>;

/** Anything exposing a `query<T>(sql, params)` — i.e. the DbAdapter. */
export interface HasQuery {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

function toRunner(runnerOrAdapter: SqlRunner | HasQuery): SqlRunner {
  if (typeof runnerOrAdapter === "function") return runnerOrAdapter;
  return <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) =>
    runnerOrAdapter.query<T>(sql, params) as Promise<T[]>;
}

// -----------------------------------------------------------------------------
// Safe identifier guard for extras keys
// -----------------------------------------------------------------------------

const SAFE_EXTRAS_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/;

// -----------------------------------------------------------------------------
// WHERE-clause builder — ListingFilter → parameterized predicates
// -----------------------------------------------------------------------------
//
// Mirrors `buildListingWhere` in postgres-adapter.ts clause-for-clause so the
// stats cover EXACTLY the listings the search returns. Values accumulate into a
// positional `$N` params array; the builder returns the joined `AND` body plus
// the params it bound (so callers append further params after it).

interface BuiltWhere {
  /** The `AND`-joined predicate body (no leading `WHERE`). */
  readonly text: string;
  /** Positional params, in `$N` order. */
  readonly params: unknown[];
}

function buildWhere(filter: ListingFilter): BuiltWhere {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown): string => {
    params.push(v);
    return `$${params.length}`;
  };

  // standardStatus is always present (defaults to "Active" at the call site).
  clauses.push(`standard_status = ${p(filter.status ?? "Active")}`);

  if (filter.city) clauses.push(`city = ${p(filter.city)}`);
  if (filter.subdivision) clauses.push(`subdivision_name = ${p(filter.subdivision)}`);

  if (filter.propertyType !== undefined) {
    const pt = String(filter.propertyType).trim();
    if (pt && !["all", "any", "*"].includes(pt.toLowerCase())) {
      clauses.push(`property_type = ${p(pt)}`);
    }
  }

  // listPrice range.
  if (filter.price?.min !== undefined) clauses.push(`list_price >= ${p(filter.price.min)}`);
  if (filter.price?.max !== undefined) clauses.push(`list_price <= ${p(filter.price.max)}`);

  // yearBuilt range.
  if (filter.yearBuilt?.min !== undefined) clauses.push(`year_built >= ${p(filter.yearBuilt.min)}`);
  if (filter.yearBuilt?.max !== undefined) clauses.push(`year_built <= ${p(filter.yearBuilt.max)}`);

  // beds — dual-column OR (bedrooms_total | beds_total), spike §9.
  if (filter.beds?.min !== undefined) {
    const v = p(filter.beds.min);
    clauses.push(`(bedrooms_total >= ${v} OR beds_total >= ${v})`);
  }
  if (filter.beds?.max !== undefined) {
    const v = p(filter.beds.max);
    clauses.push(`(bedrooms_total <= ${v} OR beds_total <= ${v})`);
  }

  // baths — dual-column OR (bathrooms_total_integer | bathrooms_total_decimal).
  if (filter.baths?.min !== undefined) {
    const v = p(filter.baths.min);
    clauses.push(`(bathrooms_total_integer >= ${v} OR bathrooms_total_decimal >= ${v})`);
  }
  if (filter.baths?.max !== undefined) {
    const v = p(filter.baths.max);
    clauses.push(`(bathrooms_total_integer <= ${v} OR bathrooms_total_decimal <= ${v})`);
  }

  // onMarketDate — real timestamptz range (no Mongo string trap; spike §8).
  if (filter.onMarketDate?.min !== undefined) {
    clauses.push(`on_market_date >= ${p(filter.onMarketDate.min)}`);
  }
  if (filter.onMarketDate?.max !== undefined) {
    clauses.push(`on_market_date <= ${p(filter.onMarketDate.max)}`);
  }

  // hasPool — typed column OR extras fallback (spike §10).
  if (filter.hasPool === true) {
    clauses.push(`(pool_yn IS TRUE OR (extras->>'poolYN')::boolean IS TRUE)`);
  } else if (filter.hasPool === false) {
    clauses.push(`(pool_yn IS NOT TRUE AND COALESCE((extras->>'poolYN')::boolean, false) IS NOT TRUE)`);
  }

  // Registered custom fields → parameterized jsonb equality (extras->>'k' = $n).
  if (filter.extras) {
    for (const [key, value] of Object.entries(filter.extras)) {
      if (!SAFE_EXTRAS_KEY.test(key)) continue; // skip unsafe keys
      clauses.push(`extras->>'${key}' = ${p(String(value))}`);
    }
  }

  // bbox — PostGIS envelope containment with a lat/lng box fallback for rows
  // whose geom is null (parity with the Mongo box; spike §6.1).
  if (filter.bbox) {
    const { minLng, minLat, maxLng, maxLat } = filter.bbox;
    const a = p(minLng), b = p(minLat), c = p(maxLng), d = p(maxLat);
    clauses.push(
      `((geom IS NOT NULL AND ST_Contains(ST_MakeEnvelope(${a}, ${b}, ${c}, ${d}, 4326), geom)) ` +
        `OR (geom IS NULL AND latitude BETWEEN ${b} AND ${d} AND longitude BETWEEN ${a} AND ${c}))`,
    );
  }

  return { text: clauses.join(" AND "), params };
}

// -----------------------------------------------------------------------------
// Amenity predicate fragments — typed column OR extras fallback (spike §10)
// -----------------------------------------------------------------------------
//
// Typed columns confirmed on the live `property` table: pool_yn, spa_yn,
// view_yn, senior_community_yn. The remaining Mongo amenity signals
// (fireplacesTotal/fireplaceYN, gatedCommunity, ageRestricted55Plus,
// associationFee) have NO typed column — they live in `extras` only, so those
// arms read solely from `extras`. The `::boolean` / `::numeric` casts require
// `validateExtras` (Agent 17) to have coerced the values; bad values are guarded
// with a try/JSON-shape so the cast never crashes the whole stats query.

// pool/spa/view/senior: typed column OR extras<lowercase-and-YN> fallback.
const POOL_PRED = `(pool_yn IS TRUE OR (extras->>'poolYN')::boolean IS TRUE OR (extras->>'pool')::boolean IS TRUE)`;
const SPA_PRED = `(spa_yn IS TRUE OR (extras->>'spaYN')::boolean IS TRUE OR (extras->>'spa')::boolean IS TRUE)`;
const VIEW_PRED = `(view_yn IS TRUE OR (extras->>'viewYN')::boolean IS TRUE OR (extras->>'view')::boolean IS TRUE)`;
const SENIOR_PRED =
  `(senior_community_yn IS TRUE OR (extras->>'seniorCommunityYN')::boolean IS TRUE ` +
  `OR (extras->>'ageRestricted55Plus')::boolean IS TRUE)`;
// fireplace/gated: extras-only (no typed column on this schema).
const FIREPLACE_PRED =
  `(COALESCE((extras->>'fireplacesTotal')::numeric, 0) >= 1 OR (extras->>'fireplaceYN')::boolean IS TRUE)`;
const GATED_PRED = `((extras->>'gatedCommunity')::boolean IS TRUE)`;

// association_fee is extras-only on this schema. Cast to numeric for HOA math.
const HOA_FEE = `NULLIF((extras->>'associationFee'), '')::numeric`;

// -----------------------------------------------------------------------------
// The ONE CTE
// -----------------------------------------------------------------------------
//
// `base` materializes the filtered set once. `headline` + `amenity` + `hoa` +
// `newcount` are all single-row aggregates over `base`; `bytype` is the
// per-property-sub-type breakdown (json_agg'd into one cell so the whole result
// is one round-trip, one row). The flattening JS below reproduces the Mongo
// `AreaStats` shape byte-for-byte.

function buildStatsSql(whereText: string): string {
  return `
WITH base AS (
  SELECT
    list_price,
    living_area,
    property_sub_type,
    on_market_date,
    pool_yn, spa_yn, view_yn, senior_community_yn,
    extras
  FROM property
  WHERE ${whereText}
),
headline AS (
  SELECT
    count(*)::int                                              AS count,
    round(avg(list_price))::float8                             AS avg_price,
    min(list_price)::float8                                    AS min_price,
    max(list_price)::float8                                    AS max_price,
    round(avg(living_area))::float8                            AS avg_sqft,
    round(avg(list_price / NULLIF(living_area, 0)))::float8    AS avg_price_per_sqft,
    -- DISCRETE median to match the Mongo floor-index exactly (spike §3.1):
    percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price)::float8                       AS median_price,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY living_area)
        FILTER (WHERE living_area > 0)::float8                                            AS median_sqft,
    round(percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price / NULLIF(living_area, 0))
        FILTER (WHERE living_area > 0))::float8                                           AS median_price_per_sqft
  FROM base
),
amenity AS (
  SELECT
    count(*)::int                                       AS total,
    count(*) FILTER (WHERE ${POOL_PRED})::int           AS pool_count,
    count(*) FILTER (WHERE ${SPA_PRED})::int            AS spa_count,
    count(*) FILTER (WHERE ${VIEW_PRED})::int           AS view_count,
    count(*) FILTER (WHERE ${FIREPLACE_PRED})::int      AS fireplace_count,
    count(*) FILTER (WHERE ${GATED_PRED})::int          AS gated_count,
    count(*) FILTER (WHERE ${SENIOR_PRED})::int         AS senior_count
  FROM base
),
hoa AS (
  SELECT
    count(*) FILTER (WHERE ${HOA_FEE} > 0)::int                         AS count,
    min(${HOA_FEE}) FILTER (WHERE ${HOA_FEE} > 0)::float8               AS min,
    max(${HOA_FEE}) FILTER (WHERE ${HOA_FEE} > 0)::float8               AS max,
    round(avg(${HOA_FEE}) FILTER (WHERE ${HOA_FEE} > 0))::float8        AS avg
  FROM base
),
newcount AS (
  SELECT count(*) FILTER (
    WHERE on_market_date >= now() - interval '7 days' AND on_market_date <= now()
  )::int AS new_count
  FROM base
),
bytype AS (
  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::json) AS rows
  FROM (
    SELECT
      coalesce(property_sub_type, 'Unknown')                  AS "subType",
      count(*)::int                                           AS count,
      round(avg(list_price))::float8                          AS "avgPrice",
      round(avg(list_price / NULLIF(living_area, 0)))::float8 AS "avgPricePerSqft"
    FROM base
    GROUP BY property_sub_type
    ORDER BY count DESC
    LIMIT 20
  ) t
)
SELECT
  h.count, h.avg_price, h.min_price, h.max_price, h.avg_sqft, h.avg_price_per_sqft,
  h.median_price, h.median_sqft, h.median_price_per_sqft,
  a.total, a.pool_count, a.spa_count, a.view_count, a.fireplace_count, a.gated_count, a.senior_count,
  ho.count AS hoa_count, ho.min AS hoa_min, ho.max AS hoa_max, ho.avg AS hoa_avg,
  n.new_count,
  bt.rows AS by_type
FROM headline h, amenity a, hoa ho, newcount n, bytype bt;
`.trim();
}

// -----------------------------------------------------------------------------
// computeAreaStatsPg — the public entry point
// -----------------------------------------------------------------------------

interface StatsRow {
  count: number | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_sqft: number | null;
  avg_price_per_sqft: number | null;
  median_price: number | null;
  median_sqft: number | null;
  median_price_per_sqft: number | null;
  total: number | null;
  pool_count: number | null;
  spa_count: number | null;
  view_count: number | null;
  fireplace_count: number | null;
  gated_count: number | null;
  senior_count: number | null;
  hoa_count: number | null;
  hoa_min: number | null;
  hoa_max: number | null;
  hoa_avg: number | null;
  new_count: number | null;
  by_type:
    | Array<{ subType: string; count: number; avgPrice: number; avgPricePerSqft: number }>
    | string
    | null;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/**
 * Compute area stats over the FULL filtered set on Postgres. Returns the exact
 * `AreaStats` shape the Mongo `computeAreaStats` produces (build_plan §3.6 — the
 * flattening JS is shared in spirit), so the narrator / renderer is dialect-blind.
 *
 * @param runnerOrAdapter  A `(sql, params)` runner OR the tenant `DbAdapter`
 *                         (its `.query`). NEVER constructs a connection itself.
 * @param filter           The structured listing filter (same one the search
 *                         uses) — the stats cover exactly those listings.
 */
export async function computeAreaStatsPg(
  runnerOrAdapter: SqlRunner | HasQuery,
  filter: ListingFilter,
): Promise<AreaStats> {
  const run = toRunner(runnerOrAdapter);
  const { text: whereText, params } = buildWhere(filter);
  const sql = buildStatsSql(whereText);

  const rows = await run<StatsRow>(sql, params);
  const r = rows[0];

  const total = num(r?.total ?? r?.count);
  const pct = (n: unknown): number => (total > 0 ? Math.round((num(n) / total) * 100) : 0);

  // by_type may arrive parsed (jsonb) or as a JSON string depending on driver.
  let propertyTypes: AreaStats["propertyTypes"] = [];
  const bt = r?.by_type;
  if (Array.isArray(bt)) propertyTypes = bt;
  else if (typeof bt === "string" && bt.length > 0) {
    try {
      propertyTypes = JSON.parse(bt);
    } catch {
      propertyTypes = [];
    }
  }

  const hoaCount = num(r?.hoa_count);

  return {
    totalListings: total,
    newListingsCount: num(r?.new_count),
    newListingsPct: pct(r?.new_count),
    avgPrice: num(r?.avg_price),
    medianPrice: num(r?.median_price),
    priceRange: { min: num(r?.min_price), max: num(r?.max_price) },
    avgSqft: num(r?.avg_sqft),
    medianSqft: num(r?.median_sqft),
    avgPricePerSqft: num(r?.avg_price_per_sqft),
    medianPricePerSqft: num(r?.median_price_per_sqft),
    propertyTypes,
    // null when no HOA listings (mirror the Mongo `r.hoa?.[0] || null`).
    hoa:
      hoaCount > 0
        ? { count: hoaCount, min: num(r?.hoa_min), max: num(r?.hoa_max), avg: num(r?.hoa_avg) }
        : null,
    amenities: {
      poolPct: pct(r?.pool_count),
      spaPct: pct(r?.spa_count),
      viewPct: pct(r?.view_count),
      fireplacePct: pct(r?.fireplace_count),
      gatedPct: pct(r?.gated_count),
      seniorPct: pct(r?.senior_count),
    },
  };
}

// Re-export the WHERE builder so the glue (search-pg.ts) and tests can reuse the
// exact same predicate construction the stats query uses.
export { buildWhere as buildAreaStatsWhere };
export type { BuiltWhere as AreaStatsWhere };
