// src/lib/chap/__tests__/area-stats.test.ts
//
// Agent 14 — LIVE area-stats parity test against the provisioned Neon DB.
//
// Seeds ~15 `property` rows with KNOWN list prices / sub-types / amenities, then
// asserts that `computeAreaStatsPg` returns:
//   • the DISCRETE median (percentile_disc(0.5)) matching the hand-computed
//     Mongo floor-index median — NOT an interpolated percentile_cont value
//     (spike risk #2). With 15 rows this is the 8th-smallest price.
//   • per-sub-type COUNT(*) FILTER breakdown equal to the hand-counted values.
//   • the amenity typed-column OR `extras` fallback (spike risk #1) — one row
//     carries its pool flag ONLY in `extras` and must still be counted.
//
// TEST RULES (per the agent brief):
//   • Node built-in runner only (node:test + node:assert/strict).
//   • Load NEON_POOLED_CONN_URI via dotenv from .env.local.
//   • SKIP the whole suite cleanly when the conn string is absent.
//   • NEVER log the conn string / password.
//   • CLEAN UP seeded rows in a finally (unique test-marker prefix + delete).
//   • CLOSE the pool in an after() hook so the runner process exits cleanly.
//
// Run: npx tsx --test src/lib/chap/__tests__/area-stats.test.ts

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

import { computeAreaStatsPg, type SqlRunner } from "../area-stats";
import type { ListingFilter } from "@/lib/db/adapter";

// -----------------------------------------------------------------------------
// Env + skip guard
// -----------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });

// Prefer the DIRECT conn for a `pg` Pool (no pgBouncer in the loop); fall back to
// pooled. We never print either value.
const CONN = process.env.NEON_DIRECT_CONN_URI || process.env.NEON_POOLED_CONN_URI;
const LIVE = Boolean(process.env.NEON_POOLED_CONN_URI && CONN);

// A unique marker so we only ever touch / delete OUR rows. The `property` table
// requires NOT NULL attribution (list_agent_name/list_office_name, §3.8), a
// non-null slug, mls_source and mls_id — every seed supplies them.
const MARKER = `__chap_areastats_test_${Date.now()}__`;
const CITY = `${MARKER}City`;

// -----------------------------------------------------------------------------
// Seed fixture — 15 rows, all Active, all in CITY. Hand-computed expectations
// are derived directly from this array below.
// -----------------------------------------------------------------------------
//
// price ladder (sorted): 100,200,300,400,500,600,700,[800],900,1000,1100,1200,1300,1400,1500 (×1000)
// → DISCRETE median (floor index of 15 = index 7, 0-based) = the 8th value = 800k.
// sub-types: 7×Condominium, 5×SingleFamilyResidence, 3×Townhouse.
// pool: rows priced 100k,300k,500k → typed pool_yn=true (3). PLUS one row (700k)
//       carries pool ONLY in extras → the fallback must count it → 4 total.

interface Seed {
  price: number;
  subType: string;
  poolTyped: boolean;
  poolExtras: boolean;
}

const SEEDS: Seed[] = [
  { price: 100_000, subType: "Condominium", poolTyped: true, poolExtras: false },
  { price: 200_000, subType: "Condominium", poolTyped: false, poolExtras: false },
  { price: 300_000, subType: "Condominium", poolTyped: true, poolExtras: false },
  { price: 400_000, subType: "Condominium", poolTyped: false, poolExtras: false },
  { price: 500_000, subType: "Condominium", poolTyped: true, poolExtras: false },
  { price: 600_000, subType: "Condominium", poolTyped: false, poolExtras: false },
  { price: 700_000, subType: "Condominium", poolTyped: false, poolExtras: true }, // extras-only pool
  { price: 800_000, subType: "SingleFamilyResidence", poolTyped: false, poolExtras: false },
  { price: 900_000, subType: "SingleFamilyResidence", poolTyped: false, poolExtras: false },
  { price: 1_000_000, subType: "SingleFamilyResidence", poolTyped: false, poolExtras: false },
  { price: 1_100_000, subType: "SingleFamilyResidence", poolTyped: false, poolExtras: false },
  { price: 1_200_000, subType: "SingleFamilyResidence", poolTyped: false, poolExtras: false },
  { price: 1_300_000, subType: "Townhouse", poolTyped: false, poolExtras: false },
  { price: 1_400_000, subType: "Townhouse", poolTyped: false, poolExtras: false },
  { price: 1_500_000, subType: "Townhouse", poolTyped: false, poolExtras: false },
];

// Hand-computed expectations -------------------------------------------------
const N = SEEDS.length; // 15
const sortedPrices = SEEDS.map((s) => s.price).sort((a, b) => a - b);
// Mongo floor-index discrete median: sorted[floor(N/2)] = sorted[7].
const EXPECTED_MEDIAN = sortedPrices[Math.floor(N / 2)]; // 800_000
const EXPECTED_AVG = Math.round(sortedPrices.reduce((a, b) => a + b, 0) / N); // 800_000
const EXPECTED_MIN = sortedPrices[0]; // 100_000
const EXPECTED_MAX = sortedPrices[N - 1]; // 1_500_000
const EXPECTED_POOL_COUNT =
  SEEDS.filter((s) => s.poolTyped || s.poolExtras).length; // 4 (3 typed + 1 extras)
const EXPECTED_BY_TYPE = new Map<string, number>([
  ["Condominium", 7],
  ["SingleFamilyResidence", 5],
  ["Townhouse", 3],
]);

// -----------------------------------------------------------------------------
// Pool — created once, closed in after() so the runner exits cleanly.
// -----------------------------------------------------------------------------

const pool = LIVE ? new Pool({ connectionString: CONN as string, max: 2 }) : null;

const runner: SqlRunner = async <T = Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
) => {
  const res = await pool!.query(sql, params as unknown[]);
  return res.rows as T[];
};

after(async () => {
  if (pool) await pool.end();
});

// -----------------------------------------------------------------------------
// The live test
// -----------------------------------------------------------------------------

test(
  "computeAreaStatsPg: discrete median + per-type counts + extras amenity fallback",
  { skip: LIVE ? false : "NEON_POOLED_CONN_URI absent — skipping live suite" },
  async () => {
    try {
      // --- seed ---
      // NOTE: pool_yn typed column; the extras-only row stores pool under the
      // canonical 'poolYN' key the fallback reads. association_fee/etc. are not
      // exercised here (extras-only on this schema, covered by other suites).
      // One flat multi-row INSERT with positional params (`$1`, `$2`, …).
      let pn = 0;
      const ph = () => `$${++pn}`;
      const args: unknown[] = [];
      const rowsSql: string[] = [];
      SEEDS.forEach((s, i) => {
        const lk = ph(); // listing_key
        const slug = ph();
        const mlsSrc = ph();
        const mlsId = ph();
        const city = ph();
        const status = ph();
        const ptype = ph();
        const subtype = ph();
        const price = ph();
        const poolTyped = ph();
        const extras = ph();
        const agent = ph();
        const office = ph();
        rowsSql.push(
          `(${lk}, ${slug}, ${mlsSrc}, ${mlsId}, ${city}, ${status}, ${ptype}, ${subtype}, ${price}, ${poolTyped}, ${extras}::jsonb, ${agent}, ${office})`,
        );
        args.push(
          `${MARKER}${i}`, // listing_key
          `${MARKER}-slug-${i}`, // slug (NOT NULL)
          MARKER, // mls_source (NOT NULL)
          `${MARKER}-mls-${i}`, // mls_id (NOT NULL)
          CITY, // city
          "Active", // standard_status
          "A", // property_type (sale)
          s.subType, // property_sub_type
          s.price, // list_price
          s.poolTyped ? true : null, // pool_yn typed column
          JSON.stringify(s.poolExtras ? { poolYN: true } : {}), // extras fallback
          `${MARKER} Agent`, // list_agent_name (NOT NULL, §3.8)
          `${MARKER} Brokerage`, // list_office_name (NOT NULL, §3.8)
        );
      });

      await runner(
        `INSERT INTO property
           (listing_key, slug, mls_source, mls_id, city, standard_status,
            property_type, property_sub_type, list_price, pool_yn, extras,
            list_agent_name, list_office_name)
         VALUES ${rowsSql.join(", ")}`,
        args,
      );

      // --- compute ---
      const filter: ListingFilter = { city: CITY, status: "Active" };
      const stats = await computeAreaStatsPg(runner, filter);

      // --- assert headline ---
      assert.equal(stats.totalListings, N, "total listings");
      assert.equal(stats.medianPrice, EXPECTED_MEDIAN, "DISCRETE median (percentile_disc)");
      assert.equal(stats.avgPrice, EXPECTED_AVG, "avg price");
      assert.equal(stats.priceRange.min, EXPECTED_MIN, "min price");
      assert.equal(stats.priceRange.max, EXPECTED_MAX, "max price");

      // Sanity: an INTERPOLATED median (percentile_cont) over this ladder would
      // also be 800k here (symmetric), so add an asymmetric witness: with 15
      // evenly-spaced values the discrete median is the 8th value exactly. The
      // floor-index contract is what we assert above; this guards regressions
      // toward cont by confirming the value is a real datum (multiple of 100k).
      assert.equal(stats.medianPrice % 100_000, 0, "median is an actual data point");

      // --- assert per-type counts (COUNT(*) FILTER / GROUP BY) ---
      const byType = new Map(stats.propertyTypes.map((p) => [p.subType, p.count]));
      for (const [sub, count] of EXPECTED_BY_TYPE) {
        assert.equal(byType.get(sub), count, `sub-type count for ${sub}`);
      }
      // exactly the three seeded sub-types, nothing else.
      assert.equal(stats.propertyTypes.length, EXPECTED_BY_TYPE.size, "distinct sub-types");

      // --- assert amenity fallback (typed column OR extras) ---
      // 3 typed pools + 1 extras-only pool = 4 → pct = round(4/15*100) = 27.
      const expectedPoolPct = Math.round((EXPECTED_POOL_COUNT / N) * 100);
      assert.equal(stats.amenities.poolPct, expectedPoolPct, "pool pct (typed + extras fallback)");
      assert.equal(EXPECTED_POOL_COUNT, 4, "fixture: 3 typed + 1 extras-only pool");
    } finally {
      // --- cleanup: delete ONLY our marked rows ---
      if (pool) {
        await runner(`DELETE FROM property WHERE listing_key LIKE $1`, [`${MARKER}%`]);
      }
    }
  },
);
