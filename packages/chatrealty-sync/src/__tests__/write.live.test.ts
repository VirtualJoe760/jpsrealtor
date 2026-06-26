// packages/chatrealty-sync/src/__tests__/write.live.test.ts
//
// Spec 8 — LIVE integration test against the provisioned Neon `property` table.
//
//   • MOCKS the RESO fetch (a fake fetch returning a one-page OData envelope of
//     ~10 records) — no real MLS feed is contacted.
//   • Maps the records with the real mapper, upserts with the real writer.
//   • Reads them back and asserts the §3.8 attribution survived the round-trip.
//   • CLEANS UP: every seeded row carries a unique marker in listing_key and is
//     DELETEd in a finally block (the ONLY delete in the package — test-local,
//     never in the sync path).
//   • Closes the pool in an after() hook so the node:test runner exits cleanly.
//   • SKIPS cleanly (no failure) when NEON_POOLED_CONN_URI is absent.
//
// Never logs the connection string or any secret.

import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { config as loadDotenv } from "dotenv";
import pg from "pg";

import { ResoClient } from "../reso-fetch";
import { mapResoProperty, type PropertyRow } from "../map";
import { upsertProperties } from "../write";

loadDotenv({ path: ".env.local" });
loadDotenv();

const CONN = process.env.NEON_POOLED_CONN_URI;
const RUN_LIVE = !!CONN;

// Unique marker so we only ever touch / delete our own seeded rows.
const MARKER = `__synctest_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

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

/** Build a fake OData page of `n` RESO Property records under our marker. */
function fakeResoPage(n: number) {
  const value = Array.from({ length: n }, (_, i) => ({
    ListingKey: `${MARKER}-${i}`,
    OriginatingSystemName: "TESTMLS",
    OriginatingSystemID: "00000000000000000000000000",
    PropertyType: i % 2 === 0 ? "A" : "B",
    StandardStatus: "Active",
    ListPrice: 500000 + i * 1000,
    BedroomsTotal: 3,
    BathroomsTotalInteger: 2,
    City: "Palm Desert",
    StateOrProvince: "CA",
    PostalCode: "92260",
    Latitude: 33.7 + i * 0.001,
    Longitude: -116.4 - i * 0.001,
    UnparsedAddress: `${100 + i} Test Ln, Palm Desert, CA 92260`,
    ModificationTimestamp: `2026-06-${String(10 + i).padStart(2, "0")}T12:00:00Z`,
    ListAgentFullName: `Test Agent ${i}`,
    ListAgentPreferredPhone: "760-555-0100",
    ListOfficeName: "Test Brokerage",
    ListOfficePhone: "760-555-0200",
    ExtraField: `extra-${i}`,
  }));
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ value, "@odata.count": n }),
  } as unknown as Response;
}

/** A mock fetch: token endpoint → bearer; data endpoint → one page, then done. */
function makeMockFetch(n: number): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/token")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ access_token: "mock-token", expires_in: 3600 }),
      } as unknown as Response;
    }
    return fakeResoPage(n);
  }) as typeof fetch;
}

test("LIVE: mocked RESO pull → map → upsert → readback with attribution", { skip: !RUN_LIVE }, async () => {
  assert.ok(pool, "pool should be initialized");
  const N = 10;

  // 1) Pull via the real client against a MOCKED fetch (no real MLS).
  const client = new ResoClient({
    baseUrl: "https://example.test/OData",
    tokenUrl: "https://example.test/token",
    clientId: "id",
    clientSecret: "secret",
    pageSize: 50,
    fetchImpl: makeMockFetch(N),
  });

  const rows: PropertyRow[] = [];
  for await (const rec of client.pullProperties({ since: null })) {
    const row = mapResoProperty(rec as Record<string, unknown>);
    if (row) rows.push(row);
  }
  assert.equal(rows.length, N, "all 10 records should map (none keyless)");

  try {
    // 2) Upsert into the live property table.
    const res = await upsertProperties(pool!, rows, { batchSize: 4 });
    assert.equal(res.attempted, N);
    assert.equal(res.upserted, N, "all rows upserted");
    assert.ok(res.batches >= 2, "should have batched (>=2 batches at size 4)");

    // 3) Read back and assert attribution + a derived geom survived.
    const back = await pool!.query(
      `SELECT listing_key, list_agent_name, list_office_name,
              list_agent_preferred_phone, list_office_phone,
              property_type, list_price,
              ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat,
              extras
         FROM property
        WHERE listing_key LIKE $1
        ORDER BY listing_key`,
      [`${MARKER}-%`],
    );
    assert.equal(back.rowCount, N, "all seeded rows read back");

    for (const r of back.rows) {
      assert.ok(r.list_agent_name, "§3.8 list_agent_name present");
      assert.ok(r.list_office_name, "§3.8 list_office_name present");
      assert.equal(r.list_office_name, "Test Brokerage");
      assert.equal(r.list_agent_preferred_phone, "760-555-0100");
      assert.ok(typeof r.lng === "number", "geom populated (ST_X)");
      // unmapped field landed in extras
      assert.ok(r.extras && typeof r.extras.ExtraField === "string");
    }

    // 4) Idempotency: re-upsert the same rows; count must not grow.
    const res2 = await upsertProperties(pool!, rows, { batchSize: 4 });
    assert.equal(res2.upserted, N, "re-upsert touches same rows, no duplicates");
    const countAfter = await pool!.query(
      `SELECT count(*)::int AS c FROM property WHERE listing_key LIKE $1`,
      [`${MARKER}-%`],
    );
    assert.equal(countAfter.rows[0].c, N, "still exactly N rows after re-upsert");
  } finally {
    // 5) ALWAYS clean up our seeded rows (the only delete in the package).
    await pool!.query(`DELETE FROM property WHERE listing_key LIKE $1`, [`${MARKER}-%`]);
  }
});

test("write package loads even without a live DB (skip marker)", () => {
  // A no-DB smoke assertion so the file always has at least one passing test,
  // documenting the skip path when NEON_POOLED_CONN_URI is absent.
  assert.equal(typeof upsertProperties, "function");
});
