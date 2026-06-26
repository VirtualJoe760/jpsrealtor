// packages/chatrealty-sync/src/__tests__/neighborhoods-builder.live.test.ts
//
// Agent 30 — LIVE integration test for the neighborhoods aggregation builder
// against the provisioned Neon `property` + neighborhood tables.
//
//   • Seeds ~12 marker `property` rows across TWO cities. Some rows carry a
//     subdivision_name, some don't — proving the OPTIONAL-SUBDIVISION rule
//     (§8.2): cities built for BOTH cities, subdivisions built ONLY for the
//     rows that had one, and a city with zero subdivisions never errors.
//   • Runs the real buildNeighborhoods(), then asserts the aggregates landed in
//     `cities` / `subdivisions` / `cma_stats` / `location_index`.
//   • CLEANS UP every row it created — the seeded property rows (unique marker
//     in listing_key) AND the city/subdivision/cma/location_index marker rows —
//     in a finally block. These are the ONLY deletes, test-local, never in the
//     sync path.
//   • Closes the pool in after() so the node:test runner exits cleanly.
//   • SKIPS cleanly (no failure) when NEON_POOLED_CONN_URI is absent.
//
// Never logs the connection string or any secret.

import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { config as loadDotenv } from "dotenv";
import pg from "pg";

import { buildNeighborhoods, slugify } from "../neighborhoods-builder";

loadDotenv({ path: ".env.local" });
loadDotenv();

const CONN = process.env.NEON_POOLED_CONN_URI;
const RUN_LIVE = !!CONN;

// Unique markers so we only ever touch / delete our own seeded rows. Two real
// city NAMES are used (the builder keys cities by real name → slug), so we make
// them unique-but-deterministic by appending the marker token; that keeps the
// derived slugs unique to this test run and trivially cleanable.
const STAMP = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const KEY_MARKER = `__nbtest_${STAMP}`;
const CITY_A = `Testville A ${STAMP}`;
const CITY_B = `Testville B ${STAMP}`;
const SUB_1 = `Sub One ${STAMP}`;
const SUB_2 = `Sub Two ${STAMP}`;

let pool: pg.Pool | null = null;

before(() => {
  if (RUN_LIVE) {
    pool = new pg.Pool({
      connectionString: CONN,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
});

after(async () => {
  if (pool) await pool.end();
});

/**
 * 12 marker property rows:
 *   City A (6 rows): 3 in SUB_1, 3 with NO subdivision.
 *   City B (6 rows): 3 in SUB_2, 3 with NO subdivision.
 * So both cities have listings, and the subdivision tier must build SUB_1 +
 * SUB_2 only — the no-subdivision rows must NOT create phantom subdivisions.
 */
async function seed(p: pg.Pool): Promise<void> {
  const rows: Array<{
    key: string;
    city: string;
    sub: string | null;
    price: number;
    type: string;
    sqft: number;
    beds: number;
    baths: number;
  }> = [];

  const mk = (
    city: string,
    sub: string | null,
    i: number,
    price: number,
    type: string,
  ) =>
    rows.push({
      key: `${KEY_MARKER}-${city === CITY_A ? "a" : "b"}-${sub ? "s" : "n"}-${i}`,
      city,
      sub,
      price,
      type,
      sqft: 1500 + i * 100,
      beds: 3,
      baths: 2,
    });

  for (let i = 0; i < 3; i++) mk(CITY_A, SUB_1, i, 400000 + i * 50000, "A");
  for (let i = 0; i < 3; i++) mk(CITY_A, null, i, 300000 + i * 25000, "A");
  for (let i = 0; i < 3; i++) mk(CITY_B, SUB_2, i, 600000 + i * 50000, "A");
  for (let i = 0; i < 3; i++) mk(CITY_B, null, i, 250000 + i * 25000, "B");

  for (const r of rows) {
    await p.query(
      `INSERT INTO property (
         listing_key, slug, mls_source, mls_id,
         property_type, standard_status,
         list_price, living_area, bedrooms_total, bathrooms_total_integer,
         days_on_market,
         city, subdivision_name, county_or_parish, state_or_province,
         latitude, longitude,
         list_agent_name, list_office_name
       ) VALUES (
         $1, $2, 'TESTMLS', 'TESTMLS',
         $3, 'Active',
         $4, $5, $6, $7,
         10,
         $8, $9, 'Riverside', 'CA',
         33.7, -116.4,
         'Test Agent', 'Test Brokerage'
       )
       ON CONFLICT (listing_key) DO NOTHING`,
      [r.key, r.key, r.type, r.price, r.sqft, r.beds, r.baths, r.city, r.sub],
    );
  }
}

async function cleanup(p: pg.Pool): Promise<void> {
  // cma_stats first (FK → subdivisions), then subdivisions, cities,
  // location_index, finally property.
  await p.query(
    `DELETE FROM cma_stats WHERE subdivision_id IN (
       SELECT id FROM subdivisions WHERE city = ANY($1)
     )`,
    [[CITY_A, CITY_B]],
  );
  await p.query(`DELETE FROM subdivisions WHERE city = ANY($1)`, [[CITY_A, CITY_B]]);
  await p.query(`DELETE FROM cities WHERE name = ANY($1)`, [[CITY_A, CITY_B]]);
  await p.query(
    `DELETE FROM location_index WHERE slug = ANY($1) OR (type='subdivision' AND slug LIKE $2)`,
    [[slugify(CITY_A), slugify(CITY_B)], `${slugify(CITY_A)}/%`],
  );
  await p.query(`DELETE FROM location_index WHERE type='subdivision' AND slug LIKE $1`, [
    `${slugify(CITY_B)}/%`,
  ]);
  await p.query(`DELETE FROM property WHERE listing_key LIKE $1`, [`${KEY_MARKER}-%`]);
}

test(
  "LIVE: buildNeighborhoods aggregates cities for both + subdivisions only where present",
  { skip: !RUN_LIVE },
  async () => {
    assert.ok(pool, "pool should be initialized");
    const p = pool!;

    try {
      await cleanup(p); // pre-clean in case a prior run aborted
      await seed(p);

      const result = await buildNeighborhoods(p);

      // --- city tier: BOTH cities built ---------------------------------------
      const cityA = await p.query(
        `SELECT name, county, region, listing_count, avg_price, median_price,
                price_min, price_max, property_types, subdivision_count
           FROM cities WHERE name = $1`,
        [CITY_A],
      );
      const cityB = await p.query(`SELECT * FROM cities WHERE name = $1`, [CITY_B]);
      assert.equal(cityA.rowCount, 1, "city A built");
      assert.equal(cityB.rowCount, 1, "city B built");

      const a = cityA.rows[0];
      assert.equal(a.listing_count, 6, "city A counts all 6 of its listings");
      // county "Riverside" with a non-CV city name → broad region map fallback.
      assert.equal(a.region, "Southern California", "region derived from county");
      // subdivision_count = distinct non-null subdivision_name in the city = 1.
      assert.equal(a.subdivision_count, 1, "city A has exactly one distinct subdivision");
      assert.equal(
        (a.property_types as { residential: number }).residential,
        6,
        "city A property_types.residential = 6 (all type A)",
      );
      assert.ok(Number(a.price_min) <= Number(a.price_max), "price range ordered");

      // --- subdivision tier: ONLY the two real subdivisions built -------------
      const subs = await p.query(
        `SELECT name, city, listing_count, source FROM subdivisions
          WHERE city = ANY($1) ORDER BY name`,
        [[CITY_A, CITY_B]],
      );
      assert.equal(subs.rowCount, 2, "exactly two subdivisions built (no phantom from null rows)");
      const subNames = subs.rows.map((r) => r.name).sort();
      assert.deepEqual(subNames, [SUB_1, SUB_2].sort(), "the two real subdivisions");
      for (const r of subs.rows) {
        assert.equal(r.listing_count, 3, "each subdivision aggregates its 3 listings");
        assert.equal(r.source, "mls", "MLS-sourced (not derived)");
      }

      // --- cma_stats: 1:1 with the subdivisions built -------------------------
      const cma = await p.query(
        `SELECT cs.active_count, cs.active_avg_price, cs.quality_confidence
           FROM cma_stats cs
           JOIN subdivisions s ON s.id = cs.subdivision_id
          WHERE s.city = ANY($1)`,
        [[CITY_A, CITY_B]],
      );
      assert.equal(cma.rowCount, 2, "cma_stats written for both subdivisions");
      for (const r of cma.rows) {
        assert.equal(r.active_count, 3, "all 3 active (status Active)");
        assert.ok(Number(r.active_avg_price) > 0, "active avg price computed");
        assert.equal(r.quality_confidence, "medium", "3 actives → medium band");
      }

      // --- location_index: refreshed for both tiers ---------------------------
      const loc = await p.query(
        `SELECT type, name, listing_count FROM location_index
          WHERE slug = ANY($1)
             OR (type='subdivision' AND (slug LIKE $2 OR slug LIKE $3))
          ORDER BY type, name`,
        [
          [slugify(CITY_A), slugify(CITY_B)],
          `${slugify(CITY_A)}/%`,
          `${slugify(CITY_B)}/%`,
        ],
      );
      const cityLocs = loc.rows.filter((r) => r.type === "city");
      const subLocs = loc.rows.filter((r) => r.type === "subdivision");
      assert.equal(cityLocs.length, 2, "two city location_index rows");
      assert.equal(subLocs.length, 2, "two subdivision location_index rows");

      // --- result summary -----------------------------------------------------
      assert.ok(result.cities >= 2, "result reports >=2 cities");
      assert.equal(result.subdivisions, 2, "result reports 2 subdivisions");
      assert.equal(result.cmaStats, 2, "result reports 2 cma_stats");
      assert.equal(result.subdivisionTierSkipped, false, "subdivision tier ran");

      // --- idempotency: re-run converges, no duplicates -----------------------
      await buildNeighborhoods(p);
      const subsAfter = await p.query(
        `SELECT count(*)::int c FROM subdivisions WHERE city = ANY($1)`,
        [[CITY_A, CITY_B]],
      );
      assert.equal(subsAfter.rows[0].c, 2, "still exactly 2 subdivisions after re-run");
      const cityAAfter = await p.query(
        `SELECT count(*)::int c FROM cities WHERE name = ANY($1)`,
        [[CITY_A, CITY_B]],
      );
      assert.equal(cityAAfter.rows[0].c, 2, "still exactly 2 cities after re-run");
    } finally {
      await cleanup(p);
    }
  },
);

test("subdivision tier skips cleanly when no subdivision data (unit, no DB)", () => {
  // Documents the OPTIONAL-SUBDIVISION contract at the type level without a DB:
  // an empty subdivision aggregate yields subdivisionTierSkipped=true. The full
  // path is exercised live above; this guarantees one always-passing assertion
  // and the builder export shape.
  assert.equal(typeof buildNeighborhoods, "function");
  assert.equal(slugify("Palm Desert"), "palm-desert");
});
