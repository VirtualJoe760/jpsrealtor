// src/lib/db/__tests__/postgres-adapter.test.ts
//
// Agent 09 contract test — the Postgres adapter, run LIVE against Neon.
//
// This is the SAME adapter-contract surface the Mongo adapter test exercises
// (build_plan §3.6: "a single shared contract suite runs against both"), but
// here it runs against a real Neon PostGIS database: it seeds ~20 `property`
// rows under a unique test-marker `listing_key` prefix, exercises
// find/get/count with several `ListingFilter` inputs (city+price+beds, bbox,
// hasPool, a custom `extras` field), asserts DTO SHAPE + the ATTRIBUTION
// invariant (§3.8), then DELETES every seeded row in a `finally`.
//
// SAFETY (per the wave rules):
//   • Loads NEON_POOLED_CONN_URI from .env.local via dotenv.
//   • SKIPS the whole suite cleanly (logging why) when the conn string is absent
//     — never fails for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Cleans up ALL seeded rows in a finally, even on assertion failure.
//
// Run: npx tsx --test src/lib/db/__tests__/postgres-adapter.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";

import { createPostgresAdapter } from "../postgres-adapter.ts";
import type { ListingDTO } from "../adapter.ts";

// -----------------------------------------------------------------------------
// Env / skip gate
// -----------------------------------------------------------------------------

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_POOLED_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique marker so a partial/aborted run never collides and cleanup is exact.
const MARKER = `__crt_test_a09_${Date.now()}_`;

// -----------------------------------------------------------------------------
// Seed fixtures — ~20 property rows under the MARKER prefix
// -----------------------------------------------------------------------------
//
// Columns are the live snake_case names. Every row carries the NOT-NULL
// attribution + required columns (slug, mls_source, mls_id, list_agent_name,
// list_office_name). geom is built from longitude/latitude with ST_SetSRID so
// the bbox ST_Contains path is exercised against real PostGIS geometry.

interface SeedRow {
  readonly k: string; // suffix; listing_key = MARKER + k
  readonly city: string;
  readonly subdivision: string | null;
  readonly propertyType: string;
  readonly status: string;
  readonly listPrice: number;
  readonly beds: number;
  readonly baths: number;
  readonly yearBuilt: number;
  readonly poolYN: boolean | null;
  readonly extrasPoolYN: boolean | null; // poolYN inside extras (fallback path)
  readonly lat: number;
  readonly lng: number;
  readonly hasCasita: boolean; // custom extras field
}

// Two cities, a price spread, a pool split (typed vs extras), and a tight
// lat/lng cluster for the bbox case (Palm Desert ~33.7, -116.37).
function makeSeed(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (let i = 0; i < 20; i++) {
    const inPalmDesert = i % 2 === 0;
    rows.push({
      k: `pd${i}`,
      city: inPalmDesert ? "Palm Desert" : "Indian Wells",
      subdivision: i % 3 === 0 ? "Ironwood Country Club" : null,
      propertyType: "A",
      status: "Active",
      listPrice: 400000 + i * 100000, // 400k … 2.3M
      beds: 2 + (i % 4), // 2..5
      baths: 2 + (i % 3), // 2..4
      yearBuilt: 1980 + i,
      // Pool: even-i rows use the TYPED column; some odd-i rows use the extras
      // fallback ONLY (typed null) to prove the §6.5 dual read.
      poolYN: i % 2 === 0 ? true : null,
      extrasPoolYN: i % 2 === 1 && i % 6 === 1 ? true : null,
      lat: inPalmDesert ? 33.7 + i * 0.001 : 33.72 + i * 0.001,
      lng: inPalmDesert ? -116.37 + i * 0.001 : -116.34 + i * 0.001,
      hasCasita: i % 5 === 0,
    });
  }
  return rows;
}

// -----------------------------------------------------------------------------
// Live suite
// -----------------------------------------------------------------------------

if (!LIVE) {
  test("postgres-adapter LIVE suite — SKIPPED (NEON_POOLED_CONN_URI absent)", { skip: true }, () => {
    // Intentionally empty. The conn string is not configured in this
    // environment, so the live suite cannot run. This is a clean skip, not a
    // failure (per the wave rules). Configure NEON_POOLED_CONN_URI in .env.local
    // to run it.
  });
} else {
  const sql = neon(CONN!);
  const seed = makeSeed();

  test("postgres-adapter — LIVE contract suite against Neon", async (t) => {
    // ---- seed ----------------------------------------------------------------
    try {
      for (const r of seed) {
        const key = MARKER + r.k;
        const extras = JSON.stringify({
          ...(r.extrasPoolYN !== null ? { poolYN: r.extrasPoolYN } : {}),
          hasCasita: r.hasCasita,
          // Scope marker so test queries never page past real listings (the live
          // DB may hold thousands of rows; the adapter clamps to 50/page).
          testMarker: MARKER,
        });
        await sql`
          INSERT INTO property (
            listing_key, slug, mls_source, mls_id,
            property_type, standard_status, list_price,
            bedrooms_total, beds_total, bathrooms_total_integer,
            year_built, pool_yn, city, subdivision_name,
            unparsed_address, latitude, longitude, geom,
            on_market_date,
            list_agent_name, list_office_name,
            list_agent_preferred_phone, list_office_phone,
            extras
          ) VALUES (
            ${key}, ${"/mls-listings/" + key}, ${"TEST"}, ${"TESTMLS"},
            ${r.propertyType}, ${r.status}, ${r.listPrice},
            ${r.beds}, ${r.beds}, ${r.baths},
            ${r.yearBuilt}, ${r.poolYN}, ${r.city}, ${r.subdivision},
            ${r.k + " Test Way"}, ${r.lat}, ${r.lng},
            ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}), 4326),
            ${new Date(Date.now() - 86400000).toISOString()},
            ${"Jane Agent"}, ${"Desert Realty"},
            ${"+17601234567"}, ${"+17607654321"},
            ${extras}::jsonb
          )
          ON CONFLICT (listing_key) DO NOTHING
        `;
      }

      const adapter = createPostgresAdapter(CONN!);

      // Every test query is scoped by the `extras.testMarker` so it never pages
      // past the live DB's real listings (the adapter clamps to 50 rows/page and
      // orders by on_market_date DESC; without scoping, real rows would crowd
      // out our seeded fixtures). The adapter's `extras` predicate provides this.
      const mark = { testMarker: MARKER } as const;

      // ---- 1. city + price + beds (+ default Active status) ------------------
      await t.test("find: city + price + beds, DTO shape + attribution", async () => {
        const page = await adapter.listings.find(
          {
            city: "Palm Desert",
            price: { min: 400000, max: 1200000 },
            beds: { min: 3 },
            extras: mark,
          },
          { limit: 50, withCount: true },
        );

        // Only our seeded Palm Desert rows in this price/bed band should appear
        // among the marker rows; assert all returned marker rows satisfy it.
        const ours = page.items.filter((l) => l.listingKey.startsWith(MARKER));
        assert.ok(ours.length > 0, "expected at least one seeded Palm Desert match");
        for (const l of ours) {
          assert.equal(l.city, "Palm Desert");
          assert.ok((l.listPrice ?? 0) >= 400000 && (l.listPrice ?? 0) <= 1200000);
          assert.ok((l.beds ?? 0) >= 3);
          assertDtoShape(l);
        }
      });

      // ---- 2. bbox (PostGIS ST_Contains) -----------------------------------
      await t.test("find: bbox ST_Contains envelope", async () => {
        // A tight box around the Palm Desert cluster (lat ~33.70-33.72,
        // lng ~ -116.37..-116.35).
        const page = await adapter.listings.find(
          {
            bbox: { minLat: 33.69, maxLat: 33.715, minLng: -116.372, maxLng: -116.35 },
            extras: mark,
          },
          { limit: 50 },
        );
        const ours = page.items.filter((l) => l.listingKey.startsWith(MARKER));
        assert.ok(ours.length > 0, "expected bbox to capture seeded Palm Desert rows");
        for (const l of ours) {
          assert.ok(l.latitude !== null && l.longitude !== null);
          assert.ok(l.latitude! >= 33.69 && l.latitude! <= 33.715, `lat ${l.latitude} in box`);
          assert.ok(l.longitude! >= -116.372 && l.longitude! <= -116.35, `lng ${l.longitude} in box`);
          assertDtoShape(l);
        }
      });

      // ---- 3. hasPool — typed column OR extras fallback (§6.5) ---------------
      await t.test("find: hasPool reads typed column AND extras fallback", async () => {
        const page = await adapter.listings.find({ hasPool: true, extras: mark }, { limit: 50 });
        const ours = page.items.filter((l) => l.listingKey.startsWith(MARKER));
        assert.ok(ours.length > 0, "expected pool matches");
        for (const l of ours) assert.equal(l.pool, true);

        // The extras-only pool rows (typed pool_yn null, extras.poolYN true)
        // MUST be included — that's the dual-read guarantee.
        const extrasOnlyKeys = seed
          .filter((r) => r.poolYN === null && r.extrasPoolYN === true)
          .map((r) => MARKER + r.k);
        if (extrasOnlyKeys.length > 0) {
          const returned = new Set(ours.map((l) => l.listingKey));
          for (const k of extrasOnlyKeys) {
            assert.ok(returned.has(k), `extras-only pool row ${k} must match hasPool:true`);
          }
        }
      });

      // ---- 4. custom extras field (registry-style exact match) --------------
      await t.test("find: custom extras field predicate", async () => {
        const page = await adapter.listings.find(
          { city: "Palm Desert", extras: { hasCasita: true, testMarker: MARKER } },
          { limit: 50 },
        );
        const ours = page.items.filter((l) => l.listingKey.startsWith(MARKER));
        // Every seeded Palm Desert row with hasCasita:true should be present and
        // none without it.
        const expectKeys = new Set(
          seed.filter((r) => r.city === "Palm Desert" && r.hasCasita).map((r) => MARKER + r.k),
        );
        const gotKeys = new Set(ours.map((l) => l.listingKey));
        for (const k of expectKeys) assert.ok(gotKeys.has(k), `expected casita row ${k}`);
        for (const k of gotKeys) assert.ok(expectKeys.has(k), `unexpected non-casita row ${k}`);
      });

      // ---- 5. get(listingKey) single read ----------------------------------
      await t.test("get: single listing by key + null miss", async () => {
        const key = MARKER + seed[0].k;
        const dto = await adapter.listings.get(key);
        assert.ok(dto, "seeded row should resolve");
        assert.equal(dto!.listingKey, key);
        assertDtoShape(dto!);

        const miss = await adapter.listings.get(MARKER + "does-not-exist");
        assert.equal(miss, null);
      });

      // ---- 6. count() -------------------------------------------------------
      await t.test("count: filter count is a finite number", async () => {
        const n = await adapter.listings.count({ city: "Palm Desert", extras: mark });
        assert.equal(typeof n, "number");
        // Exactly the seeded Palm Desert fixtures (even-i rows).
        const expected = seed.filter((r) => r.city === "Palm Desert").length;
        assert.equal(n, expected);
      });

      // ---- 7. dialect + raw + close contract --------------------------------
      await t.test("adapter contract: dialect=postgres, raw read works, close ok", async () => {
        assert.equal(adapter.dialect, "postgres");
        const rows = await adapter.query<{ one: number }>(`SELECT 1 AS one`);
        assert.equal(rows[0]?.one, 1);
        await adapter.close(); // no WS pool opened by reads → no-op, must not throw
      });
    } finally {
      // ---- cleanup: delete EVERY seeded row, always -------------------------
      await sql`DELETE FROM property WHERE listing_key LIKE ${MARKER + "%"}`;
    }
  });
}

// -----------------------------------------------------------------------------
// Shared DTO-shape assertion (the contract bar — same as the Mongo suite)
// -----------------------------------------------------------------------------

function assertDtoShape(l: ListingDTO): void {
  // identity
  assert.equal(typeof l.listingKey, "string");
  assert.ok(l.slug.startsWith("/mls-listings/"));
  assert.ok(l.detailUrl.startsWith("https://"));
  // ATTRIBUTION invariant (§3.8) — present and a string, never undefined.
  assert.equal(typeof l.listAgentName, "string");
  assert.equal(typeof l.listOfficeName, "string");
  assert.ok("listAgentPreferredPhone" in l);
  assert.ok("listOfficePhone" in l);
  // facts collapsed
  assert.ok(l.beds === null || typeof l.beds === "number");
  assert.ok(l.baths === null || typeof l.baths === "number");
  assert.equal(typeof l.pool, "boolean");
  // market timing — onMarketDate normalized to an ISO string or null
  assert.ok(l.onMarketDate === null || typeof l.onMarketDate === "string");
}
