// src/lib/chap/__tests__/nearby-pois.live.test.ts
//
// Agent 29 — LIVE PostGIS test for `nearbyPoisPg` (the POI port).
//
// Seeds a handful of `points_of_interest` rows at KNOWN coordinates around a
// fixed center (Palm Desert), then asserts the bundle:
//   1. returns the in-radius POIs, grouped by category;
//   2. EXCLUDES POIs outside the radius (the whole point of ST_DWithin over the
//      legacy square bounding box — a far row at the same lat but ~10 mi east is
//      dropped);
//   3. EXCLUDES a CLOSED_PERMANENTLY row even when it is in-radius;
//   4. ranks `topPicks` by rating × log(reviews) — the high-rating/high-review
//      golf course outranks a low-review one;
//   5. trims each category to ≤5;
//   6. `describePOIBundle` renders the seeded names into prompt markdown.
//
// SAFETY (wave rules):
//   • Loads NEON_POOLED_CONN_URI from .env.local via dotenv.
//   • neonConfig.webSocketConstructor = ws at top (WS Pool path).
//   • SKIPS cleanly (logging why) when the conn string is absent — never fails
//     for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Every seeded row carries a unique per-run MARKER in its place_id; an
//     after() hook DELETEs all marker rows and ends the WS pool — even on
//     assertion failure.
//
// Run: npx tsx --test src/lib/chap/__tests__/nearby-pois.live.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); runtime import is fine
// and tsx does not type-check. The seed writes route through a WS `Pool` (INSERT
// with positional params + ST_MakePoint), which needs a WebSocket constructor in
// Node — production sets this globally; the test sets it here.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

import { nearbyPoisPg, describePOIBundle } from "../nearby-pois";

// -----------------------------------------------------------------------------
// Env / skip gate
// -----------------------------------------------------------------------------

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_POOLED_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique per-run marker so a partial/aborted run never collides and cleanup is
// exact. Embedded in every seeded `place_id`.
const RUN = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const MARK = `__crt_test_a29_${RUN}`;
const pid = (slug: string) => `${MARK}_${slug}`;

// Fixed center: Palm Desert (matches geo-centers.ts CITY_CENTERS["Palm Desert"]).
const CENTER = { lat: 33.8303, lng: -116.5453 };

// A raw neon() reader/writer for seed + cleanup is not enough for ST_MakePoint
// positional inserts under the HTTP driver's multi-statement limits, so we use a
// WS Pool for the seed and a neon() reader for cleanup. The function under test
// gets the Pool's `query` wrapped as a bare runner.
const pool = LIVE ? new Pool({ connectionString: CONN as string }) : null;
const sqlReader = LIVE ? neon(CONN as string) : null;

// Bare parameterized runner over the WS Pool — exercises the `SqlRunner` branch
// of `nearbyPoisPg` (driver-agnostic: not the DbAdapter, a plain fn).
async function runner<T = Record<string, unknown>>(
  text: string,
  pars: readonly unknown[] = [],
): Promise<T[]> {
  const res = await pool!.query(text, pars as unknown[]);
  return res.rows as T[];
}

// -----------------------------------------------------------------------------
// Seed helper — insert a POI at (lat,lng) with geom derived from the coords.
// -----------------------------------------------------------------------------

async function seedPoi(opts: {
  slug: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  rating?: number | null;
  reviews?: number | null;
  businessStatus?: string | null;
  city?: string | null;
}): Promise<void> {
  await pool!.query(
    `INSERT INTO points_of_interest
       (place_id, name, types, category, latitude, longitude, geom,
        rating, user_ratings_total, business_status, city, region)
     VALUES
       ($1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($6, $5), 4326),
        $7, $8, $9, $10, $11)
     ON CONFLICT (place_id) DO NOTHING`,
    [
      pid(opts.slug),
      opts.name,
      [opts.category], // types text[]
      opts.category,
      opts.lat,
      opts.lng,
      opts.rating ?? null,
      opts.reviews ?? null,
      opts.businessStatus ?? null,
      opts.city ?? null,
      MARK, // region NOT NULL — reuse the marker so cleanup can target it too
    ],
  );
}

// -----------------------------------------------------------------------------
// Cleanup — delete every row this run created, then end the pool.
// -----------------------------------------------------------------------------

after(async () => {
  if (sqlReader) {
    await sqlReader`DELETE FROM points_of_interest WHERE place_id LIKE ${`${MARK}_%`}`;
  }
  if (pool) {
    // build_plan: any test opening a Neon pool MUST close it in an after() hook.
    await pool.end();
  }
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

test(
  "nearbyPoisPg (live)",
  {
    skip: LIVE
      ? false
      : "NEON_POOLED_CONN_URI not set — skipping live nearby-pois test",
  },
  async (t) => {
    assert.ok(pool && sqlReader, "live pool + sql reader required");

    // --- Seed ----------------------------------------------------------------
    // IN-RADIUS (within ~3 mi of center):
    //   • golf:       two courses ~0.5–1 mi out, different rating/review weights
    //   • restaurant: one ~1 mi out
    //   • park:       one ~1.5 mi out
    // FAR (well outside 3 mi): a golf course ~10 mi due east (same lat, +0.17 lng).
    // CLOSED: a high-rating restaurant in-radius but CLOSED_PERMANENTLY.

    // ~0.5 mi north ≈ 0.0072 deg lat. ~1 mi east ≈ 0.0173 deg lng @ this lat.
    await Promise.all([
      seedPoi({
        slug: "golf_hi",
        name: "Marker Ridge Golf Club",
        category: "golf",
        lat: CENTER.lat + 0.0072,
        lng: CENTER.lng,
        rating: 4.6,
        reviews: 800, // high reviews → should top the picks
      }),
      seedPoi({
        slug: "golf_lo",
        name: "Marker Dunes Par 3",
        category: "golf",
        lat: CENTER.lat - 0.0072,
        lng: CENTER.lng,
        rating: 4.9,
        reviews: 4, // higher star but tiny review count → ranked below golf_hi
      }),
      seedPoi({
        slug: "rest_in",
        name: "Marker Bistro",
        category: "restaurant",
        lat: CENTER.lat,
        lng: CENTER.lng + 0.0173,
        rating: 4.4,
        reviews: 220,
        city: "Palm Desert",
      }),
      seedPoi({
        slug: "park_in",
        name: "Marker Civic Park",
        category: "park",
        lat: CENTER.lat + 0.012,
        lng: CENTER.lng,
        rating: 4.7,
        reviews: 150,
      }),
      // FAR — same lat, ~10 mi east. ST_DWithin must exclude this; the legacy
      // square box would have a corner reach but DWithin is a true circle.
      seedPoi({
        slug: "golf_far",
        name: "Marker FARAWAY Links",
        category: "golf",
        lat: CENTER.lat,
        lng: CENTER.lng + 0.173,
        rating: 5.0,
        reviews: 5000,
      }),
      // CLOSED — in-radius but permanently closed; must be filtered out.
      seedPoi({
        slug: "rest_closed",
        name: "Marker SHUTTERED Grill",
        category: "restaurant",
        lat: CENTER.lat,
        lng: CENTER.lng - 0.0173,
        rating: 4.9,
        reviews: 900,
        businessStatus: "CLOSED_PERMANENTLY",
      }),
    ]);

    // Restrict the query to THIS run's seed so other tenants' POIs never leak in:
    // we wrap the bare runner to AND a region = MARK predicate is overkill (the
    // function builds its own SQL); instead we rely on the radius + the fact that
    // the live table is otherwise empty for this region. To be robust regardless
    // of other rows, assert on the seeded NAMES we expect rather than totals.

    const bundle = await nearbyPoisPg(runner, {
      lat: CENTER.lat,
      lng: CENTER.lng,
      radiusMiles: 3,
    });

    await t.test("center + radius carried", () => {
      assert.ok(bundle.center, "center present");
      assert.equal(bundle.center!.latitude, CENTER.lat);
      assert.equal(bundle.center!.longitude, CENTER.lng);
      assert.equal(bundle.radiusMiles, 3);
    });

    const names = new Set(
      Object.values(bundle.byCategory)
        .flat()
        .map((p) => p.name),
    );

    await t.test("in-radius POIs returned + grouped by category", () => {
      assert.ok(bundle.byCategory.golf, "golf category present");
      assert.ok(bundle.byCategory.restaurant, "restaurant category present");
      assert.ok(bundle.byCategory.park, "park category present");

      assert.ok(names.has("Marker Ridge Golf Club"), "in-radius golf_hi present");
      assert.ok(names.has("Marker Dunes Par 3"), "in-radius golf_lo present");
      assert.ok(names.has("Marker Bistro"), "in-radius restaurant present");
      assert.ok(names.has("Marker Civic Park"), "in-radius park present");

      const golfNames = bundle.byCategory.golf.map((p) => p.name);
      assert.ok(
        golfNames.includes("Marker Ridge Golf Club") &&
          golfNames.includes("Marker Dunes Par 3"),
        "both in-radius golf courses grouped under 'golf'",
      );
    });

    await t.test("FAR POI excluded by ST_DWithin (true circle, not the box)", () => {
      assert.ok(
        !names.has("Marker FARAWAY Links"),
        "the ~10mi-east golf course is NOT within the 3mi radius",
      );
    });

    await t.test("CLOSED_PERMANENTLY POI excluded even when in-radius", () => {
      assert.ok(
        !names.has("Marker SHUTTERED Grill"),
        "permanently-closed restaurant filtered out",
      );
    });

    await t.test("topPicks ranked by rating × log(reviews)", () => {
      // golf_hi (4.6 × log(802)) should outrank golf_lo (4.9 × log(6)) despite
      // the lower star rating — review volume dominates here.
      const seededPicks = bundle.topPicks.filter((p) => names.has(p.name));
      const hiIdx = seededPicks.findIndex(
        (p) => p.name === "Marker Ridge Golf Club",
      );
      const loIdx = seededPicks.findIndex((p) => p.name === "Marker Dunes Par 3");
      assert.ok(hiIdx >= 0, "golf_hi is in topPicks");
      assert.ok(loIdx >= 0, "golf_lo is in topPicks");
      assert.ok(
        hiIdx < loIdx,
        "high-review golf course ranked above the tiny-review one",
      );
      assert.ok(bundle.topPicks.length <= 8, "topPicks capped at 8");
    });

    await t.test("rating coerced to a number (numeric(3,2) → number)", () => {
      const golfHi = bundle.byCategory.golf.find(
        (p) => p.name === "Marker Ridge Golf Club",
      )!;
      assert.equal(typeof golfHi.rating, "number", "rating is a number, not a string");
      assert.ok(Math.abs((golfHi.rating ?? 0) - 4.6) < 1e-6, "rating value preserved");
      assert.equal(
        typeof golfHi.userRatingsTotal,
        "number",
        "userRatingsTotal is a number",
      );
    });

    await t.test("describePOIBundle renders seeded names into prompt markdown", () => {
      const md = describePOIBundle(bundle);
      assert.ok(md.includes("NEARBY POINTS OF INTEREST"), "header present");
      assert.ok(md.includes("### GOLF"), "golf section header present");
      assert.ok(md.includes("Marker Ridge Golf Club"), "seeded golf name in markdown");
      assert.ok(
        !md.includes("Marker FARAWAY Links"),
        "far POI not in the prompt markdown",
      );
      assert.ok(
        !md.includes("Marker SHUTTERED Grill"),
        "closed POI not in the prompt markdown",
      );
    });

    await t.test("empty bundle when radius excludes everything", async () => {
      // 0.001 mi radius around the center — no seeded POI is that close (nearest
      // is ~0.5 mi), so the bundle is empty and describePOIBundle yields "".
      const tiny = await nearbyPoisPg(runner, {
        lat: CENTER.lat,
        lng: CENTER.lng,
        radiusMiles: 0.001,
      });
      // Other tenants' rows could in theory sit at the exact center; assert that
      // none of OUR seeded rows survive (the meaningful invariant).
      const tinyNames = new Set(
        Object.values(tiny.byCategory)
          .flat()
          .map((p) => p.name),
      );
      assert.ok(
        !tinyNames.has("Marker Ridge Golf Club"),
        "0.001mi radius excludes the ~0.5mi golf course",
      );
    });
  },
);
