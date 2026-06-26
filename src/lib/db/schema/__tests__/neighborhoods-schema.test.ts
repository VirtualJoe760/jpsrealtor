// src/lib/db/schema/__tests__/neighborhoods-schema.test.ts
//
// LIVE test for the neighborhoods schema (migration 0003_neighborhoods,
// build_plan §8.2). Asserts every table — regions, counties, cities,
// subdivisions, location_index, points_of_interest, community_facts, cma_stats,
// cma_stats_by_subtype, cma_top_comps, subdivision_rent_stats — exists on the
// live Neon DB, then round-trips an insert → select → delete of uniquely-marked
// marker rows: a city (with PostGIS geom), a subdivision (with geom, linked to
// city by string name + stamped source='derived'), and a POI (with geom).
//
// SAFETY (wave rules):
//   • Loads NEON_DIRECT_CONN_URI from .env.local via dotenv.
//   • SKIPS the whole suite cleanly (logging why) when the conn string is absent
//     — never fails for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Cleans up EVERY seeded row in a finally, even on assertion failure.
//   • Closes the Neon WS pool in an after() hook.
//
// Run: npx tsx --test src/lib/db/schema/__tests__/neighborhoods-schema.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); runtime import is
// fine and tsx does not type-check.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_DIRECT_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique marker so a partial/aborted run never collides and cleanup is exact.
const MARKER = `__crt_test_nbhd_${Date.now()}_`;

// Every table 0003 ships, in dependency order (children last).
const TABLES = [
  "regions",
  "counties",
  "cities",
  "subdivisions",
  "location_index",
  "points_of_interest",
  "community_facts",
  "cma_stats",
  "cma_stats_by_subtype",
  "cma_top_comps",
  "subdivision_rent_stats",
] as const;

if (!LIVE) {
  test("neighborhoods-schema LIVE suite — SKIPPED (NEON_DIRECT_CONN_URI absent)", { skip: true }, () => {
    // Intentionally empty. The conn string is not configured in this environment,
    // so the live suite cannot run. Clean skip, not a failure (wave rules).
    // Configure NEON_DIRECT_CONN_URI in .env.local to run it.
  });
} else {
  const pool = new Pool({ connectionString: CONN! });

  after(async () => {
    await pool.end();
  });

  test("neighborhoods-schema — tables exist + round-trip insert/select/delete", async (t) => {
    // ---- existence: every 0003 table present --------------------------------
    await t.test("all neighborhoods tables exist on Neon", async () => {
      const selects = TABLES.map(
        (tbl, i) => `to_regclass('public.${tbl}') AS t${i}`,
      ).join(",\n               ");
      const { rows } = await pool.query<Record<string, string | null>>(
        `SELECT ${selects}`,
      );
      TABLES.forEach((tbl, i) => {
        assert.equal(rows[0]?.[`t${i}`], tbl, `${tbl} table must exist`);
      });
    });

    // ---- 0003 stamped in the migration ledger -------------------------------
    await t.test("schema_migrations carries version 0003", async () => {
      const { rows } = await pool.query(
        `SELECT version FROM schema_migrations WHERE version = '0003'`,
      );
      assert.equal(rows.length, 1, "schema_migrations must carry 0003");
    });

    // ---- city round-trip (with PostGIS geom) --------------------------------
    await t.test("cities: insert (with geom) → select → delete", async () => {
      const slug = MARKER + "palm-desert";
      try {
        const ins = await pool.query<{ id: string; lng: number; lat: number }>(
          `INSERT INTO cities
             (name, slug, normalized_name, county, region, latitude, longitude, geom,
              listing_count, avg_price, property_types, mls_sources)
           VALUES ($1, $2, $3, $4, $5, $6, $7,
                   ST_SetSRID(ST_MakePoint($7, $6), 4326),
                   $8, $9, $10::jsonb, $11)
           RETURNING id,
                     ST_X(geom) AS lng,
                     ST_Y(geom) AS lat`,
          [
            MARKER + "Palm Desert",
            slug,
            MARKER + "palm desert",
            "Riverside",
            "Coachella Valley",
            33.7222,
            -116.3744,
            5,
            750000,
            JSON.stringify({ residential: 4, lease: 1 }),
            [MARKER + "GPS"],
          ],
        );
        const row = ins.rows[0];
        // node-postgres returns int8 (bigint) as a numeric string to avoid
        // precision loss — assert the identity shape accordingly.
        assert.match(String(row?.id), /^\d+$/, "city id is a bigint identity");
        // geom round-trips through PostGIS (ST_MakePoint takes lng, lat).
        assert.ok(Math.abs(row!.lng - -116.3744) < 1e-6, "geom longitude preserved");
        assert.ok(Math.abs(row!.lat - 33.7222) < 1e-6, "geom latitude preserved");

        const sel = await pool.query(
          `SELECT name, county, region, listing_count, is_ocean, created_at FROM cities WHERE id = $1`,
          [row!.id],
        );
        assert.equal(sel.rowCount, 1);
        assert.equal(sel.rows[0].county, "Riverside");
        assert.equal(sel.rows[0].is_ocean, false, "is_ocean defaults false");
        assert.equal(sel.rows[0].listing_count, 5);
        assert.ok(sel.rows[0].created_at instanceof Date, "created_at defaulted");

        const del = await pool.query(`DELETE FROM cities WHERE id = $1`, [row!.id]);
        assert.equal(del.rowCount, 1);
      } finally {
        await pool.query(`DELETE FROM cities WHERE slug = $1`, [slug]);
      }
    });

    // ---- subdivision round-trip (geom + source='derived') + CMA child -------
    await t.test("subdivisions: insert (geom, derived) + cma_stats child → cascade delete", async () => {
      const slug = MARKER + "indian-ridge";
      const city = MARKER + "Palm Desert";
      let subId: string | undefined;
      try {
        const ins = await pool.query<{ id: string; src: string }>(
          `INSERT INTO subdivisions
             (name, slug, normalized_name, source, city, county, region,
              latitude, longitude, geom, listing_count, avg_price, community_facts)
           VALUES ($1, $2, $3, 'derived', $4, $5, $6,
                   $7, $8, ST_SetSRID(ST_MakePoint($8, $7), 4326),
                   $9, $10, $11::jsonb)
           RETURNING id, source AS src`,
          [
            MARKER + "Indian Ridge",
            slug,
            MARKER + "indian ridge",
            city,
            "Riverside",
            "Coachella Valley",
            33.74,
            -116.32,
            12,
            1250000,
            JSON.stringify({ communityType: "golf-community", golfCourses: 2 }),
          ],
        );
        subId = ins.rows[0]?.id;
        assert.match(String(subId), /^\d+$/, "subdivision id is a bigint identity");
        assert.equal(ins.rows[0]?.src, "derived", "source stamped 'derived'");

        // CMA child: ratio fields are fractions (numeric(6,4)).
        await pool.query(
          `INSERT INTO cma_stats
             (subdivision_id, active_count, closed_count,
              closed_sale_to_list_ratio, quality_confidence, quality_notes, totals)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            subId,
            8,
            14,
            0.9823, // fraction, not int percent
            "good",
            [MARKER + "sample note"],
            JSON.stringify({ legacy: true }),
          ],
        );
        const selCma = await pool.query(
          `SELECT active_count, closed_sale_to_list_ratio, quality_confidence
             FROM cma_stats WHERE subdivision_id = $1`,
          [subId],
        );
        assert.equal(selCma.rowCount, 1);
        assert.equal(selCma.rows[0].active_count, 8);
        assert.equal(
          Number(selCma.rows[0].closed_sale_to_list_ratio),
          0.9823,
          "sale-to-list ratio stored as a fraction",
        );

        // by-subtype + top-comp + rent-stats children all FK to the subdivision.
        await pool.query(
          `INSERT INTO cma_stats_by_subtype (subdivision_id, sub_type, count, avg_price)
           VALUES ($1, $2, $3, $4)`,
          [subId, MARKER + "Single Family", 6, 1100000],
        );
        await pool.query(
          `INSERT INTO cma_top_comps (subdivision_id, comp_kind, position, close_price)
           VALUES ($1, 'closed', 0, $2)`,
          [subId, 1195000],
        );
        await pool.query(
          `INSERT INTO subdivision_rent_stats (subdivision_id, going_rate, payload)
           VALUES ($1, $2, $3::jsonb)`,
          [subId, 8500, JSON.stringify({ goingRate: 8500, byBedroom: { "3": 7500 } })],
        );

        // ON DELETE CASCADE: deleting the subdivision wipes all child rows.
        const delSub = await pool.query(`DELETE FROM subdivisions WHERE id = $1`, [subId]);
        assert.equal(delSub.rowCount, 1);
        const orphanCma = await pool.query(
          `SELECT subdivision_id FROM cma_stats WHERE subdivision_id = $1`,
          [subId],
        );
        assert.equal(orphanCma.rowCount, 0, "cma_stats cascade-deleted with its subdivision");
        const orphanRent = await pool.query(
          `SELECT subdivision_id FROM subdivision_rent_stats WHERE subdivision_id = $1`,
          [subId],
        );
        assert.equal(orphanRent.rowCount, 0, "rent_stats cascade-deleted with its subdivision");
        subId = undefined;
      } finally {
        // Belt-and-suspenders: cascade should already have cleared children.
        if (subId !== undefined) {
          await pool.query(`DELETE FROM subdivisions WHERE id = $1`, [subId]);
        }
        await pool.query(`DELETE FROM subdivisions WHERE slug = $1`, [slug]);
      }
    });

    // ---- POI round-trip (with PostGIS geom) ---------------------------------
    await t.test("points_of_interest: insert (with geom) → select → delete", async () => {
      const placeId = MARKER + "place123";
      try {
        const ins = await pool.query<{ id: string; lng: number; lat: number }>(
          `INSERT INTO points_of_interest
             (place_id, name, types, category, latitude, longitude, geom, rating, region)
           VALUES ($1, $2, $3, $4, $5, $6,
                   ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8)
           RETURNING id, ST_X(geom) AS lng, ST_Y(geom) AS lat`,
          [
            placeId,
            MARKER + "Test Golf Club",
            [MARKER + "golf_course"],
            "golf",
            33.73,
            -116.35,
            4.6,
            "coachella-valley",
          ],
        );
        const row = ins.rows[0];
        assert.match(String(row?.id), /^\d+$/, "poi id is a bigint identity");
        assert.ok(Math.abs(row!.lng - -116.35) < 1e-6, "poi geom longitude preserved");
        assert.ok(Math.abs(row!.lat - 33.73) < 1e-6, "poi geom latitude preserved");

        // ST_DWithin geography query (the nearby-POI access pattern) finds it.
        const near = await pool.query(
          `SELECT id FROM points_of_interest
             WHERE ST_DWithin(geom::geography,
                              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                              $3)
               AND place_id = $4`,
          [-116.35, 33.73, 1000, placeId],
        );
        assert.equal(near.rowCount, 1, "ST_DWithin radius query resolves the POI");

        const del = await pool.query(`DELETE FROM points_of_interest WHERE id = $1`, [row!.id]);
        assert.equal(del.rowCount, 1);
      } finally {
        await pool.query(`DELETE FROM points_of_interest WHERE place_id = $1`, [placeId]);
      }
    });
  });
}
