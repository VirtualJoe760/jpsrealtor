// packages/chatrealty-sync/src/neighborhoods-builder.ts
//
// Agent 30 — the neighborhoods aggregation builder (build_plan §8.2). The
// customer-side replacement for the Python `master_sync.py` aggregate step,
// now per-tenant and running after every listing seed/sync.
//
// WHAT IT DOES
//   buildNeighborhoods(pgClient) recomputes the pre-aggregated neighborhood
//   hierarchy from the tenant's own `property` table via SQL GROUP BY:
//     • CITY tier      → `cities`        (always — every listing has a city)
//     • SUBDIVISION    → `subdivisions`  (ONLY for rows that have a
//                        + `cma_stats`     subdivision_name — skipped cleanly
//                                          when absent; never errors on missing)
//     • `location_index` refreshed for both tiers (autocomplete / center lookup)
//   All writes are idempotent UPSERTs so re-running after each sync converges
//   instead of duplicating (build_plan §3.7 DoD #3 — no global connection; the
//   caller owns the pg client lifecycle, exactly like write.ts).
//
// OPTIONAL-SUBDIVISION RULE (§8.2): city + county are the only guaranteed
// tiers. `subdivision_name` is nullable; a tenant whose MLS carries no
// subdivision data simply gets city neighborhoods — no empty subdivision rows,
// no error. The subdivision GROUP BY filters `subdivision_name IS NOT NULL`.
//
// AGGREGATES (per build_plan §8.2 "Grounded current shape"):
//   listing_count, price min/max, avg_price, median_price (percentile_disc for
//   exact-cell parity with the Mongo `$sortArray` floor — §6.5/§7), and the
//   A/B/C property-type breakdown (residential/lease/multiFamily; D=land kept
//   in extras). cma_stats gets the BASIC active block (count + median/avg/min/
//   max price + median/avg ppsf + avg beds/baths/sqft) — the nightly heavy CMA
//   (closed comps, absorption, narrative) stays a separate daily job (§0/§8.2).
//
// COLUMN NAMING: snake_case targets come straight from the live schema mirrored
// in src/lib/db/schema/{listings,neighborhoods}.ts. property.property_type uses
// the RESO single-letter codes A=sale, B=rental/lease, C=multifamily, D=land
// (memory: UnifiedListing propertyType). region is NOT on a listing, so it is
// derived from county via a compact, self-contained map (ported from
// src/lib/neighborhoods-data.ts) — the sync package stays dependency-free.
//
// Takes a pg Client or Pool (anything with `.query`). No conn string is read or
// logged here; secrets never touch this module.
// -----------------------------------------------------------------------------
// region / county derivation (self-contained port of neighborhoods-data.ts)
// -----------------------------------------------------------------------------
const COACHELLA_VALLEY_CITIES = new Set([
    "Palm Springs", "Palm Desert", "La Quinta", "Indio", "Rancho Mirage",
    "Indian Wells", "Cathedral City", "Desert Hot Springs", "Coachella",
    "Thousand Palms", "Bermuda Dunes", "Thermal", "Mecca", "Sky Valley",
    "North Shore", "Desert Center", "North Palm Springs", "Oasis", "Cabazon",
    "Whitewater",
]);
const JOSHUA_TREE_AREA_CITIES = new Set([
    "Yucca Valley", "Twentynine Palms", "29 Palms", "Joshua Tree",
    "Morongo Valley", "Pioneertown", "Landers", "Wonder Valley", "Sunfair",
]);
const COUNTY_TO_REGION = {
    "Los Angeles": "Southern California", Orange: "Southern California",
    Riverside: "Southern California", "San Bernardino": "Southern California",
    "San Diego": "Southern California", Ventura: "Southern California",
    Imperial: "Southern California", "Santa Barbara": "Southern California",
};
/** Normalize a county string for the region lookup (drop a trailing "County"). */
function cleanCounty(raw) {
    return raw.replace(/\s+county$/i, "").trim();
}
/**
 * Region for a (county, city). Coachella Valley / Joshua Tree are the curated
 * sub-regions; otherwise fall back to the broad region map, then to the county
 * name itself so the NOT NULL `region` column is always satisfied (§8.2 —
 * degrade gracefully, never error).
 */
export function deriveRegion(county, city) {
    const c = cleanCounty(county);
    if (c === "Riverside" && COACHELLA_VALLEY_CITIES.has(city))
        return "Coachella Valley";
    if (c === "San Bernardino" && JOSHUA_TREE_AREA_CITIES.has(city))
        return "Joshua Tree Area";
    return COUNTY_TO_REGION[c] ?? c ?? "Unknown";
}
/** Kebab-case slug from a free-text name (matches the sync mapper's slug rule). */
export function slugify(name) {
    return (name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "unknown");
}
/** Lowercase normalized name for matching (mirrors the Mongo normalizedName). */
function normalize(name) {
    return name.trim().toLowerCase();
}
// -----------------------------------------------------------------------------
// SQL — the GROUP BY aggregate rows
// -----------------------------------------------------------------------------
//
// "active" for the basic cma_stats = a non-terminal status. We treat anything
// that is NOT Closed/Sold/Expired/Withdrawn/Cancelled as active; a NULL status
// (common in a freshly-seeded BYOD feed) counts as active so a clean seed still
// produces stats. property_type codes: A=sale, B=lease, C=multifamily, D=land.
const ACTIVE_STATUS_PREDICATE = `
  (standard_status IS NULL OR standard_status NOT IN
    ('Closed','Sold','Expired','Withdrawn','Canceled','Cancelled'))
`;
const CITY_AGG_SQL = `
  SELECT
    city,
    COALESCE(NULLIF(btrim(county_or_parish), ''), 'Unknown')      AS county,
    COUNT(*)::int                                                  AS listing_count,
    MIN(list_price)                                                AS price_min,
    MAX(list_price)                                                AS price_max,
    AVG(list_price)                                                AS avg_price,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price)        AS median_price,
    AVG(latitude)                                                  AS latitude,
    AVG(longitude)                                                 AS longitude,
    COUNT(*) FILTER (WHERE property_type = 'A')::int               AS residential,
    COUNT(*) FILTER (WHERE property_type = 'B')::int               AS lease,
    COUNT(*) FILTER (WHERE property_type = 'C')::int               AS multi_family,
    COUNT(*) FILTER (WHERE property_type = 'D')::int               AS land,
    COUNT(DISTINCT subdivision_name)::int                          AS subdivision_count
  FROM property
  WHERE city IS NOT NULL AND btrim(city) <> ''
  GROUP BY city, COALESCE(NULLIF(btrim(county_or_parish), ''), 'Unknown')
`;
const SUBDIVISION_AGG_SQL = `
  SELECT
    subdivision_name,
    city,
    COALESCE(NULLIF(btrim(county_or_parish), ''), 'Unknown')      AS county,
    COUNT(*)::int                                                  AS listing_count,
    MIN(list_price)                                                AS price_min,
    MAX(list_price)                                                AS price_max,
    AVG(list_price)                                                AS avg_price,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price)        AS median_price,
    AVG(latitude)                                                  AS latitude,
    AVG(longitude)                                                 AS longitude,
    COUNT(*) FILTER (WHERE property_type = 'A')::int               AS residential,
    COUNT(*) FILTER (WHERE property_type = 'B')::int               AS lease,
    COUNT(*) FILTER (WHERE property_type = 'C')::int               AS multi_family,
    COUNT(*) FILTER (WHERE property_type = 'D')::int               AS land,
    0::int                                                         AS subdivision_count,
    -- basic active cma block --------------------------------------------------
    COUNT(*) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})::int        AS active_count,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price)
      FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})                    AS active_median_price,
    AVG(list_price) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})      AS active_avg_price,
    MIN(list_price) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})      AS active_min_price,
    MAX(list_price) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})      AS active_max_price,
    percentile_disc(0.5) WITHIN GROUP (
      ORDER BY (list_price / NULLIF(living_area, 0))
    ) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE} AND living_area > 0) AS active_median_ppsf,
    AVG(list_price / NULLIF(living_area, 0))
      FILTER (WHERE ${ACTIVE_STATUS_PREDICATE} AND living_area > 0) AS active_avg_ppsf,
    AVG(days_on_market) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})  AS active_avg_dom,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY living_area)
      FILTER (WHERE ${ACTIVE_STATUS_PREDICATE} AND living_area > 0) AS active_median_sqft,
    AVG(living_area) FILTER (WHERE ${ACTIVE_STATUS_PREDICATE} AND living_area > 0) AS active_avg_sqft,
    AVG(COALESCE(bedrooms_total, beds_total))
      FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})                    AS active_avg_beds,
    AVG(COALESCE(bathrooms_total_integer, bathrooms_total_decimal))
      FILTER (WHERE ${ACTIVE_STATUS_PREDICATE})                    AS active_avg_baths
  FROM property
  WHERE city IS NOT NULL AND btrim(city) <> ''
    AND subdivision_name IS NOT NULL AND btrim(subdivision_name) <> ''
  GROUP BY subdivision_name, city,
           COALESCE(NULLIF(btrim(county_or_parish), ''), 'Unknown')
`;
// -----------------------------------------------------------------------------
// builder
// -----------------------------------------------------------------------------
/**
 * Recompute the neighborhood hierarchy from the tenant's `property` table.
 * Idempotent: re-running after each sync converges (UPSERTs keyed on the live
 * unique constraints — cities(slug), subdivisions(slug, city)).
 *
 * @param client a pg Client or Pool (caller owns connect/end).
 */
export async function buildNeighborhoods(client) {
    // ---- CITY TIER (always) ----------------------------------------------------
    const cityRes = await client.query(CITY_AGG_SQL);
    const cityRows = cityRes.rows;
    let citiesUpserted = 0;
    for (const c of cityRows) {
        await upsertCity(client, c);
        citiesUpserted += 1;
    }
    // ---- SUBDIVISION TIER (optional — only rows with a subdivision_name) -------
    const subRes = await client.query(SUBDIVISION_AGG_SQL);
    const subRows = subRes.rows;
    const subdivisionTierSkipped = subRows.length === 0;
    let subsUpserted = 0;
    let cmaUpserted = 0;
    for (const s of subRows) {
        const subdivisionId = await upsertSubdivision(client, s);
        subsUpserted += 1;
        if (subdivisionId != null) {
            await upsertCmaStats(client, subdivisionId, s);
            cmaUpserted += 1;
        }
    }
    // ---- location_index refresh (both tiers) -----------------------------------
    const locCount = await refreshLocationIndex(client, cityRows, subRows);
    return {
        cities: citiesUpserted,
        subdivisions: subsUpserted,
        cmaStats: cmaUpserted,
        locationIndex: locCount,
        subdivisionTierSkipped,
    };
}
// -----------------------------------------------------------------------------
// per-row UPSERTs
// -----------------------------------------------------------------------------
async function upsertCity(client, c) {
    const region = deriveRegion(c.county, c.city);
    const propertyTypes = {
        residential: c.residential,
        lease: c.lease,
        multiFamily: c.multi_family,
        land: c.land,
    };
    await client.query(`INSERT INTO cities (
       name, slug, normalized_name, county, region,
       latitude, longitude,
       listing_count, price_min, price_max, avg_price, median_price,
       property_types, subdivision_count, last_updated, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, now(), now()
     )
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       normalized_name = EXCLUDED.normalized_name,
       county = EXCLUDED.county,
       region = EXCLUDED.region,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       listing_count = EXCLUDED.listing_count,
       price_min = EXCLUDED.price_min,
       price_max = EXCLUDED.price_max,
       avg_price = EXCLUDED.avg_price,
       median_price = EXCLUDED.median_price,
       property_types = EXCLUDED.property_types,
       subdivision_count = EXCLUDED.subdivision_count,
       last_updated = now(),
       updated_at = now()`, [
        c.city,
        slugify(c.city),
        normalize(c.city),
        c.county,
        region,
        c.latitude,
        c.longitude,
        c.listing_count,
        c.price_min,
        c.price_max,
        c.avg_price,
        c.median_price,
        JSON.stringify(propertyTypes),
        c.subdivision_count,
    ]);
}
/**
 * Upsert one subdivision, returning its (generated) id so cma_stats can be
 * written 1:1. ON CONFLICT (slug, city) — slugs collide across cities.
 */
async function upsertSubdivision(client, s) {
    const region = deriveRegion(s.county, s.city);
    const propertyTypes = {
        residential: s.residential,
        lease: s.lease,
        multiFamily: s.multi_family,
        land: s.land,
    };
    const res = await client.query(`INSERT INTO subdivisions (
       name, slug, normalized_name, source, city, county, region,
       latitude, longitude,
       listing_count, price_min, price_max, avg_price, median_price,
       property_types, last_updated, updated_at
     ) VALUES (
       $1, $2, $3, 'mls', $4, $5, $6,
       $7, $8,
       $9, $10, $11, $12, $13,
       $14, now(), now()
     )
     ON CONFLICT (slug, city) DO UPDATE SET
       name = EXCLUDED.name,
       normalized_name = EXCLUDED.normalized_name,
       county = EXCLUDED.county,
       region = EXCLUDED.region,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       listing_count = EXCLUDED.listing_count,
       price_min = EXCLUDED.price_min,
       price_max = EXCLUDED.price_max,
       avg_price = EXCLUDED.avg_price,
       median_price = EXCLUDED.median_price,
       property_types = EXCLUDED.property_types,
       last_updated = now(),
       updated_at = now()
     RETURNING id`, [
        s.subdivision_name,
        slugify(s.subdivision_name),
        normalize(s.subdivision_name),
        s.city,
        s.county,
        region,
        s.latitude,
        s.longitude,
        s.listing_count,
        s.price_min,
        s.price_max,
        s.avg_price,
        s.median_price,
        JSON.stringify(propertyTypes),
    ]);
    const id = res.rows[0]?.id;
    return typeof id === "number" ? id : id != null ? Number(id) : null;
}
/** Upsert the basic active cma_stats block 1:1 with the subdivision. */
async function upsertCmaStats(client, subdivisionId, s) {
    await client.query(`INSERT INTO cma_stats (
       subdivision_id, last_updated,
       active_count, active_median_price, active_avg_price,
       active_min_price, active_max_price,
       active_median_ppsf, active_avg_ppsf, active_avg_dom,
       active_median_sqft, active_avg_sqft, active_avg_beds, active_avg_baths,
       quality_confidence
     ) VALUES (
       $1, now(),
       $2, $3, $4,
       $5, $6,
       $7, $8, $9,
       $10, $11, $12, $13,
       $14
     )
     ON CONFLICT (subdivision_id) DO UPDATE SET
       last_updated = now(),
       active_count = EXCLUDED.active_count,
       active_median_price = EXCLUDED.active_median_price,
       active_avg_price = EXCLUDED.active_avg_price,
       active_min_price = EXCLUDED.active_min_price,
       active_max_price = EXCLUDED.active_max_price,
       active_median_ppsf = EXCLUDED.active_median_ppsf,
       active_avg_ppsf = EXCLUDED.active_avg_ppsf,
       active_avg_dom = EXCLUDED.active_avg_dom,
       active_median_sqft = EXCLUDED.active_median_sqft,
       active_avg_sqft = EXCLUDED.active_avg_sqft,
       active_avg_beds = EXCLUDED.active_avg_beds,
       active_avg_baths = EXCLUDED.active_avg_baths,
       quality_confidence = EXCLUDED.quality_confidence`, [
        subdivisionId,
        s.active_count,
        s.active_median_price,
        s.active_avg_price,
        s.active_min_price,
        s.active_max_price,
        s.active_median_ppsf,
        s.active_avg_ppsf,
        s.active_avg_dom,
        s.active_median_sqft,
        s.active_avg_sqft,
        s.active_avg_beds,
        s.active_avg_baths,
        cmaConfidence(s.active_count),
    ]);
}
/** A coarse confidence band from the active sample size (mirrors §8.2 intent). */
function cmaConfidence(activeCount) {
    if (activeCount >= 20)
        return "high";
    if (activeCount >= 8)
        return "good";
    if (activeCount >= 3)
        return "medium";
    if (activeCount >= 1)
        return "low";
    return "insufficient";
}
// -----------------------------------------------------------------------------
// location_index refresh
// -----------------------------------------------------------------------------
//
// location_index has no unique constraint in the live schema, so we cannot
// ON CONFLICT. Instead we DELETE the rows THIS builder owns (the city +
// subdivision tiers it just computed, matched by (type, slug)) and re-INSERT —
// targeted so we never touch region/county/POI rows owned by other tooling.
// Subdivision slugs collide across cities, so a subdivision's location_index
// slug is namespaced "<city-slug>/<sub-slug>" to stay unambiguous.
async function refreshLocationIndex(client, cityRows, subRows) {
    const rows = [];
    for (const c of cityRows) {
        rows.push({
            name: c.city,
            type: "city",
            slug: slugify(c.city),
            latitude: c.latitude,
            longitude: c.longitude,
            city: null,
            county: c.county,
            region: deriveRegion(c.county, c.city),
            listing_count: c.listing_count,
        });
    }
    for (const s of subRows) {
        rows.push({
            name: s.subdivision_name,
            type: "subdivision",
            slug: `${slugify(s.city)}/${slugify(s.subdivision_name)}`,
            latitude: s.latitude,
            longitude: s.longitude,
            city: s.city,
            county: s.county,
            region: deriveRegion(s.county, s.city),
            listing_count: s.listing_count,
        });
    }
    if (rows.length === 0)
        return 0;
    // Delete the exact (type, slug) pairs we are about to (re)insert.
    const citySlugs = rows.filter((r) => r.type === "city").map((r) => r.slug);
    const subSlugs = rows.filter((r) => r.type === "subdivision").map((r) => r.slug);
    if (citySlugs.length > 0) {
        await client.query(`DELETE FROM location_index WHERE type = 'city' AND slug = ANY($1)`, [citySlugs]);
    }
    if (subSlugs.length > 0) {
        await client.query(`DELETE FROM location_index WHERE type = 'subdivision' AND slug = ANY($1)`, [subSlugs]);
    }
    // Batched multi-row insert.
    const values = [];
    const clauses = [];
    let p = 0;
    for (const r of rows) {
        const ph = [];
        for (const v of [
            r.name,
            normalize(r.name),
            r.type,
            r.latitude,
            r.longitude,
            r.city,
            r.county,
            r.region,
            r.listing_count,
            r.listing_count, // active_listing_count — basic builder mirrors total
            r.slug,
        ]) {
            p += 1;
            ph.push(`$${p}`);
            values.push(v ?? null);
        }
        ph.push("now()"); // last_updated
        clauses.push(`(${ph.join(", ")})`);
    }
    await client.query(`INSERT INTO location_index (
       name, normalized_name, type, latitude, longitude,
       city, county, region, listing_count, active_listing_count, slug,
       last_updated
     ) VALUES ${clauses.join(", ")}`, values);
    return rows.length;
}
