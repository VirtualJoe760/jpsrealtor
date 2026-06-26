// src/lib/db/__tests__/neighborhoods-repo.live.test.ts
//
// Agent 27 — LIVE test for the neighborhoods read repo (build_plan §8.2).
//
// Runs `createNeighborhoodsRepo(adapter)` against a real Neon PostGIS DB (the
// 0003_neighborhoods tables). Seeds a uniquely-marked region → county → city →
// subdivision + a CMA row + a POI, then proves:
//
//   1. getDirectoryTree() nests the seeded region → county → city → subdivision
//      (with the placeholder subdivision FILTERED OUT).
//   2. getCityBySlug(slug) returns the seeded city.
//   3. getSubdivisionBySlug(citySlug, slug) returns the seeded subdivision WITH
//      its joined cma_stats / by-subtype / top-comps bundle.
//   4. nearbyPois(lat, lng, radius) returns the seeded POI (ST_DWithin) grouped
//      by category, and EXCLUDES a permanently-closed POI just outside relevance.
//
// SAFETY (wave rules):
//   • Loads NEON_DIRECT_CONN_URI from .env.local via dotenv (DIRECT — the repo's
//     reads are plain SELECTs, but seeding writes `geom` which the DIRECT conn
//     handles cleanly; the adapter routes parameterized writes over its WS Pool).
//   • neonConfig.webSocketConstructor = ws at the top (the WS Pool path).
//   • SKIPS the whole suite cleanly (logging why) when the conn string is absent
//     — never fails for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Every seeded row carries a unique MARKER; an after() hook DELETEs all
//     marker rows (children first) and ends the adapter's WS pool — even on
//     assertion failure.
//
// Run: npx tsx --test src/lib/db/__tests__/neighborhoods-repo.live.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); runtime import is
// fine and tsx does not type-check. The repo's reads + this test's seeding route
// through the adapter's WS `Pool` (parameterized statements), which needs a
// WebSocket constructor in Node — production sets this globally; the test here.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

import { createPostgresAdapter } from "../postgres-adapter";
import { createNeighborhoodsRepo } from "../neighborhoods-repo";

// -----------------------------------------------------------------------------
// Env / skip gate
// -----------------------------------------------------------------------------

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_DIRECT_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique per-run marker so a partial/aborted run never collides and cleanup is
// exact. Embedded in every name/slug this test writes.
const RUN = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const TAG = `__crt_test_a27_${RUN}`;

// Marker-scoped names + slugs.
const REGION_NAME = `${TAG} Region`;
const REGION_SLUG = `crt-test-a27-${RUN}-region`;
const COUNTY_NAME = `${TAG} County`;
const COUNTY_SLUG = `crt-test-a27-${RUN}-county`;
const CITY_NAME = `${TAG} City`;
const CITY_SLUG = `crt-test-a27-${RUN}-city`;
const SUB_NAME = `${TAG} Subdivision`;
const SUB_SLUG = `crt-test-a27-${RUN}-sub`;
const PLACEHOLDER_SUB_NAME = "Not Applicable"; // must be filtered from the tree
const PLACEHOLDER_SUB_SLUG = `crt-test-a27-${RUN}-placeholder`;
const POI_NAME = `${TAG} Coffee`;
const POI_PLACE_ID = `crt-test-a27-${RUN}-place`;
const CLOSED_POI_NAME = `${TAG} Closed`;
const CLOSED_POI_PLACE_ID = `crt-test-a27-${RUN}-closed`;

// Center used for the POI radius assertion (Palm Desert-ish).
const CENTER_LAT = 33.7222;
const CENTER_LNG = -116.3745;

const adapter = LIVE ? createPostgresAdapter(CONN as string) : null;

// -----------------------------------------------------------------------------
// Cleanup — delete every row this run created (children → parents), end pool.
// -----------------------------------------------------------------------------

after(async () => {
  if (adapter) {
    try {
      // cma_* / rent rows cascade from subdivisions(id) ON DELETE CASCADE, but
      // delete explicitly by marker for clarity, then parents.
      await adapter.query(
        `DELETE FROM points_of_interest WHERE place_id = ANY($1)`,
        [[POI_PLACE_ID, CLOSED_POI_PLACE_ID]],
      );
      await adapter.query(`DELETE FROM subdivisions WHERE slug = ANY($1)`, [
        [SUB_SLUG, PLACEHOLDER_SUB_SLUG],
      ]);
      await adapter.query(`DELETE FROM cities WHERE slug = $1`, [CITY_SLUG]);
      await adapter.query(`DELETE FROM counties WHERE slug = $1`, [COUNTY_SLUG]);
      await adapter.query(`DELETE FROM regions WHERE slug = $1`, [REGION_SLUG]);
    } finally {
      await adapter.close();
    }
  }
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

test(
  "neighborhoods-repo (live)",
  { skip: LIVE ? false : "NEON_DIRECT_CONN_URI not set — skipping live neighborhoods-repo test" },
  async (t) => {
    assert.ok(adapter, "live adapter required");
    const a = adapter!;
    const repo = createNeighborhoodsRepo(a);

    // --- seed ----------------------------------------------------------------
    await t.test("seed region/county/city/subdivision/cma/poi", async () => {
      await a.query(
        `INSERT INTO regions (name, slug, normalized_name, listing_count)
         VALUES ($1, $2, $3, $4)`,
        [REGION_NAME, REGION_SLUG, REGION_NAME.toLowerCase(), 5],
      );
      await a.query(
        `INSERT INTO counties (name, slug, normalized_name, region, listing_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [COUNTY_NAME, COUNTY_SLUG, COUNTY_NAME.toLowerCase(), REGION_NAME, 5],
      );
      // City with a PostGIS geom centroid.
      await a.query(
        `INSERT INTO cities (name, slug, normalized_name, county, region,
                             latitude, longitude, geom, listing_count, median_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 ST_SetSRID(ST_MakePoint($7, $6), 4326), $8, $9)`,
        [
          CITY_NAME,
          CITY_SLUG,
          CITY_NAME.toLowerCase(),
          COUNTY_NAME,
          REGION_NAME,
          CENTER_LAT,
          CENTER_LNG,
          5,
          750000,
        ],
      );
      // Real subdivision (source 'derived' to exercise the stamp) + a PLACEHOLDER
      // subdivision in the same city that must be filtered from the tree.
      const subRows = await a.query<{ id: number }>(
        `INSERT INTO subdivisions (name, slug, normalized_name, source,
                                   city, county, region, latitude, longitude, geom,
                                   listing_count, median_price)
         VALUES ($1, $2, $3, 'derived', $4, $5, $6, $7, $8,
                 ST_SetSRID(ST_MakePoint($8, $7), 4326), $9, $10)
         RETURNING id`,
        [
          SUB_NAME,
          SUB_SLUG,
          SUB_NAME.toLowerCase(),
          CITY_NAME,
          COUNTY_NAME,
          REGION_NAME,
          CENTER_LAT,
          CENTER_LNG,
          3,
          800000,
        ],
      );
      const subId = subRows[0]!.id;
      assert.ok(subId, "subdivision id returned");

      await a.query(
        `INSERT INTO subdivisions (name, slug, normalized_name, city, county, region, listing_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          PLACEHOLDER_SUB_NAME,
          PLACEHOLDER_SUB_SLUG,
          PLACEHOLDER_SUB_NAME.toLowerCase(),
          CITY_NAME,
          COUNTY_NAME,
          REGION_NAME,
          2,
        ],
      );

      // CMA bundle for the real subdivision.
      await a.query(
        `INSERT INTO cma_stats (subdivision_id, active_count, active_median_price,
                                closed_sale_to_list_ratio, quality_confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [subId, 3, 800000, 0.9823, "good"],
      );
      await a.query(
        `INSERT INTO cma_stats_by_subtype (subdivision_id, sub_type, count, avg_price)
         VALUES ($1, $2, $3, $4)`,
        [subId, "Single Family Residence", 3, 800000],
      );
      await a.query(
        `INSERT INTO cma_top_comps (subdivision_id, comp_kind, position, address, close_price)
         VALUES ($1, 'closed', 0, $2, $3)`,
        [subId, `${TAG} 1 Comp Ln`, 795000],
      );

      // A nearby OPERATIONAL POI (within radius) + a permanently-CLOSED one at
      // the same point (must be excluded by nearbyPois).
      await a.query(
        `INSERT INTO points_of_interest (place_id, name, category, latitude, longitude, geom,
                                         rating, user_ratings_total, business_status, region)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326),
                 $6, $7, 'OPERATIONAL', $8)`,
        [POI_PLACE_ID, POI_NAME, "restaurant", CENTER_LAT, CENTER_LNG, 4.7, 210, REGION_NAME],
      );
      await a.query(
        `INSERT INTO points_of_interest (place_id, name, category, latitude, longitude, geom,
                                         business_status, region)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326),
                 'CLOSED_PERMANENTLY', $6)`,
        [CLOSED_POI_PLACE_ID, CLOSED_POI_NAME, "restaurant", CENTER_LAT, CENTER_LNG, REGION_NAME],
      );
    });

    // --- getDirectoryTree ----------------------------------------------------
    await t.test("getDirectoryTree nests region → county → city → subdivision", async () => {
      const tree = await repo.getDirectoryTree();

      const region = tree.find((r) => r.name === REGION_NAME);
      assert.ok(region, "seeded region present in tree");
      assert.equal(region!.slug, REGION_SLUG.length ? region!.slug : "", "region slug derived");

      const county = region!.counties.find((c) => c.name === COUNTY_NAME);
      assert.ok(county, "seeded county nested under region");
      assert.ok(county!.slug.endsWith("-county"), "county slug carries -county suffix");

      const city = county!.cities.find((c) => c.slug === CITY_SLUG);
      assert.ok(city, "seeded city nested under county");
      assert.equal(city!.name, CITY_NAME);
      assert.equal(city!.listings, 5, "city listing count carried");

      const sub = city!.subdivisions.find((s) => s.slug === SUB_SLUG);
      assert.ok(sub, "real subdivision nested under city");
      assert.equal(sub!.name, SUB_NAME);

      // The placeholder subdivision MUST be filtered out.
      const placeholder = city!.subdivisions.find(
        (s) => s.slug === PLACEHOLDER_SUB_SLUG,
      );
      assert.equal(placeholder, undefined, "placeholder subdivision filtered from tree");
    });

    // --- getCityBySlug -------------------------------------------------------
    await t.test("getCityBySlug returns the seeded city", async () => {
      const city = await repo.getCityBySlug(CITY_SLUG);
      assert.ok(city, "city found by slug");
      assert.equal(city!.name, CITY_NAME);
      assert.equal(city!.county, COUNTY_NAME);
      assert.equal(city!.region, REGION_NAME);
      assert.equal(city!.listingCount, 5);
      assert.equal(city!.medianPrice, 750000, "numeric coerced from pg wire string");
      assert.equal(city!.latitude, CENTER_LAT, "latitude coerced");

      const miss = await repo.getCityBySlug(`${CITY_SLUG}-nope`);
      assert.equal(miss, null, "unknown slug → null");
    });

    // --- getSubdivisionBySlug + joined CMA -----------------------------------
    await t.test("getSubdivisionBySlug returns subdivision + joined CMA", async () => {
      const sub = await repo.getSubdivisionBySlug(CITY_SLUG, SUB_SLUG);
      assert.ok(sub, "subdivision found by (citySlug, slug)");
      assert.equal(sub!.name, SUB_NAME);
      assert.equal(sub!.source, "derived", "derived source stamp carried");
      assert.equal(sub!.city, CITY_NAME);

      // Joined cma_stats (1:1).
      assert.ok(sub!.cmaStats, "cma_stats joined");
      assert.equal(Number(sub!.cmaStats!.active_count), 3, "cma active_count");

      // Joined by-subtype (1:N).
      assert.equal(sub!.cmaBySubtype.length, 1, "one by-subtype row");
      assert.equal(sub!.cmaBySubtype[0]!.subType, "Single Family Residence");

      // Joined top-comps (1:N).
      assert.equal(sub!.cmaTopComps.length, 1, "one top-comp row");
      assert.equal(sub!.cmaTopComps[0]!.compKind, "closed");

      // Wrong city slug → null (slugs collide across cities; the scope matters).
      const wrongCity = await repo.getSubdivisionBySlug(COUNTY_SLUG, SUB_SLUG);
      assert.equal(wrongCity, null, "wrong city slug → null");

      // A placeholder subdivision resolves to null (treated as 'no subdivision').
      const ph = await repo.getSubdivisionBySlug(CITY_SLUG, PLACEHOLDER_SUB_SLUG);
      assert.equal(ph, null, "placeholder subdivision → null");
    });

    // --- nearbyPois (PostGIS ST_DWithin) -------------------------------------
    await t.test("nearbyPois returns the seeded POI grouped by category", async () => {
      const bundle = await repo.nearbyPois(CENTER_LAT, CENTER_LNG, 3);

      assert.equal(bundle.center.latitude, CENTER_LAT);
      assert.equal(bundle.radiusMiles, 3);

      const restaurants = bundle.byCategory["restaurant"] ?? [];
      const found = restaurants.find((p) => p.name === POI_NAME);
      assert.ok(found, "seeded operational POI returned within radius");
      assert.equal(found!.rating, 4.7, "rating coerced");
      assert.ok(found!.distanceMiles >= 0 && found!.distanceMiles < 0.01,
        "distance ~0 for a POI at the center");

      // The permanently-closed POI must NOT appear.
      const closed = restaurants.find((p) => p.name === CLOSED_POI_NAME);
      assert.equal(closed, undefined, "permanently-closed POI excluded");

      // A radius far from the seeded point returns it in no category.
      const farBundle = await repo.nearbyPois(0, 0, 1);
      const farFound = (farBundle.byCategory["restaurant"] ?? []).find(
        (p) => p.name === POI_NAME,
      );
      assert.equal(farFound, undefined, "POI excluded when center is far away");
    });
  },
);
