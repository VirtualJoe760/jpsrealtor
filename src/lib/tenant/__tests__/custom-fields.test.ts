// src/lib/tenant/__tests__/custom-fields.test.ts
//
// Agent 17 test — the custom-field registry + extras filter helper.
//
// TWO LAYERS:
//   • PURE (always runs, no DB): the validation invariants — shadowing rejection
//     and bad-identifier rejection — and the parameterized `extrasFilterClause`
//     shape (the value is a bound `$N`, never interpolated).
//   • LIVE (Neon, skipped if no conn): register a `waterfront` field, list it
//     back, then build a filter clause and RUN it against a seeded row to prove
//     the full path end-to-end.
//
// SAFETY (per the wave rules):
//   • Loads NEON_POOLED_CONN_URI from .env.local via dotenv.
//   • SKIPS the live suite cleanly when the conn string is absent — never fails
//     for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Cleans up EVERY seeded/registered row in a finally (unique MARKER prefix).
//   • CLOSES the Pool in an `after()` hook so the test process exits cleanly (an
//     open Neon WS handle would hang the runner).
//
// Run: npx tsx --test src/lib/tenant/__tests__/custom-fields.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); the runtime import is
// fine and tsx does not type-check. Suppress the ambient-declaration diagnostic.
// @ts-ignore - no type declarations for 'ws'; test-only WebSocket shim
import ws from "ws";

// Node has no global WebSocket the Neon WS Pool can use; wire `ws` so the pool
// (which natively binds positional `$N` params — the path extrasFilterClause and
// the real DbAdapter take) can connect. This is test-only setup.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

import {
  registerCustomField,
  listCustomFields,
  getSearchableCustomFields,
  extrasFilterClause,
  validateCustomFieldName,
  shadowsCoreField,
  CustomFieldError,
  CUSTOM_FIELD_NAME_RE,
  type TenantDb,
} from "../custom-fields";

// -----------------------------------------------------------------------------
// PURE tests — no DB, always run
// -----------------------------------------------------------------------------

test("validateCustomFieldName: accepts a safe identifier", () => {
  // Does not throw.
  validateCustomFieldName("waterfront");
  validateCustomFieldName("has_casita");
  validateCustomFieldName("_internal");
  assert.ok(CUSTOM_FIELD_NAME_RE.test("waterfront"));
});

test("validateCustomFieldName: REJECTS names that shadow a core RESO column", () => {
  // snake_case pgColumn (matches a core column directly)…
  assert.throws(
    () => validateCustomFieldName("list_price"),
    (e: unknown) => e instanceof CustomFieldError && e.code === "shadows_core_field",
  );
  // …a single-token camelCase name that is also a core field name…
  assert.throws(
    () => validateCustomFieldName("city"),
    (e: unknown) => e instanceof CustomFieldError && e.code === "shadows_core_field",
  );
  // …and the canonical pool flag (pgColumn).
  assert.throws(
    () => validateCustomFieldName("pool_yn"),
    (e: unknown) => e instanceof CustomFieldError && e.code === "shadows_core_field",
  );
  // A camelCase core name with uppercase (e.g. "listingKey") fails the IDENTIFIER
  // gate first (it runs before shadowing) — both are rejections, just a different
  // code. Shadowing only reaches its own branch for identifier-valid names.
  assert.throws(
    () => validateCustomFieldName("listingKey"),
    (e: unknown) => e instanceof CustomFieldError && e.code === "invalid_name",
  );
  assert.equal(shadowsCoreField("city"), true);
  assert.equal(shadowsCoreField("waterfront"), false);
});

test("validateCustomFieldName: REJECTS invalid identifiers (anti-injection)", () => {
  for (const bad of [
    "Waterfront", // uppercase
    "1field", // leading digit
    "has casita", // whitespace
    "drop;table", // punctuation
    "name'); DROP", // injection attempt
    "name->x", // jsonb-path chars
    "", // empty
  ]) {
    assert.throws(
      () => validateCustomFieldName(bad),
      (e: unknown) => e instanceof CustomFieldError && e.code === "invalid_name",
      `expected "${bad}" to be rejected`,
    );
  }
});

test("registerCustomField: enum without enumValues is rejected (stub db)", async () => {
  let queryCount = 0;
  const stub: TenantDb = {
    async query() {
      queryCount += 1;
      return [];
    },
  };
  await assert.rejects(
    () => registerCustomField(stub, { name: "tier", type: "enum" }),
    (e: unknown) => e instanceof CustomFieldError && e.code === "enum_values_required",
  );
  // The write must NOT have been attempted.
  assert.equal(queryCount, 0);
});

test("registerCustomField: shadowing is rejected before any write (stub db)", async () => {
  let queried = false;
  const stub: TenantDb = {
    async query() {
      queried = true;
      return [];
    },
  };
  await assert.rejects(
    () => registerCustomField(stub, { name: "city", type: "string" }),
    (e: unknown) => e instanceof CustomFieldError && e.code === "shadows_core_field",
  );
  assert.equal(queried, false, "no SQL should run when the name shadows a core field");
});

test("extrasFilterClause: VALUE is a bound param, never interpolated", () => {
  const c = extrasFilterClause("waterfront", "eq", true);
  assert.equal(c.text, `(extras->>'waterfront')::boolean = $1`);
  assert.deepEqual(c.params, [true]);
  assert.equal(c.nextParamIndex, 2);

  // string comparison — no cast
  const s = extrasFilterClause("dock_type", "eq", "private");
  assert.equal(s.text, `extras->>'dock_type' = $1`);
  assert.deepEqual(s.params, ["private"]);

  // numeric comparison — numeric cast + ordering op
  const n = extrasFilterClause("dock_length_ft", "ge", 40, 3);
  assert.equal(n.text, `(extras->>'dock_length_ft')::numeric >= $3`);
  assert.deepEqual(n.params, [40]);
  assert.equal(n.nextParamIndex, 4);

  // An injection-attempt value never reaches the text — it is the bound param.
  const inj = extrasFilterClause("dock_type", "eq", "'; DROP TABLE property; --");
  assert.equal(inj.text, `extras->>'dock_type' = $1`);
  assert.deepEqual(inj.params, ["'; DROP TABLE property; --"]);
});

test("extrasFilterClause: rejects a bad identifier or unknown op", () => {
  assert.throws(
    () => extrasFilterClause("bad name", "eq", 1),
    (e: unknown) => e instanceof CustomFieldError && e.code === "invalid_name",
  );
  assert.throws(
    // @ts-expect-error — exercising the runtime op guard
    () => extrasFilterClause("waterfront", "like", 1),
    (e: unknown) => e instanceof CustomFieldError && e.code === "invalid_op",
  );
});

// -----------------------------------------------------------------------------
// LIVE suite — Neon (skipped if no conn)
// -----------------------------------------------------------------------------

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_POOLED_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique marker so a partial/aborted run never collides; cleanup is exact.
const MARKER = `__crt_test_a17_${Date.now()}_`;
const FIELD_NAME = `waterfront`; // the registered custom field under test
const LISTING_KEY = `${MARKER}wf1`;

if (!LIVE) {
  test("custom-fields LIVE suite — SKIPPED (NEON_POOLED_CONN_URI absent)", { skip: true }, () => {
    // Clean skip, not a failure (per the wave rules). Configure
    // NEON_POOLED_CONN_URI in .env.local to run it.
  });
} else {
  // One pool for the whole live suite. CLOSED in `after()` so the runner exits.
  const pool = new Pool({ connectionString: CONN! });

  // A `TenantDb` over the WS pool — positional `$N` params bind natively (exactly
  // the path the real DbAdapter takes for parameterized queries).
  const db: TenantDb = {
    async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
      const res = await pool.query(sql, params as unknown[]);
      return res.rows as T[];
    },
  };

  after(async () => {
    // CRITICAL: end the WS pool or the process hangs.
    await pool.end();
  });

  test("custom-fields — LIVE register / list / filter against Neon", async (t) => {
    try {
      // ---- register the 'waterfront' field ----------------------------------
      await t.test("registerCustomField upserts and returns the record", async () => {
        const rec = await registerCustomField(db, {
          name: FIELD_NAME,
          type: "boolean",
          label: "Waterfront",
          searchable: true,
        });
        assert.equal(rec.name, FIELD_NAME);
        assert.equal(rec.type, "boolean");
        assert.equal(rec.searchable, true);
        assert.equal(rec.resource, "Property");

        // Idempotent upsert: a second register with a changed label updates, not
        // duplicates.
        const rec2 = await registerCustomField(db, {
          name: FIELD_NAME,
          type: "boolean",
          label: "Waterfront (updated)",
          searchable: true,
        });
        assert.equal(rec2.label, "Waterfront (updated)");
      });

      // ---- list it back -----------------------------------------------------
      await t.test("listCustomFields / getSearchableCustomFields include it", async () => {
        const all = await listCustomFields(db);
        assert.ok(
          all.some((f) => f.name === FIELD_NAME),
          "registered field should appear in the list",
        );
        const searchable = await getSearchableCustomFields(db);
        assert.ok(
          searchable.some((f) => f.name === FIELD_NAME),
          "searchable field should appear in the searchable set",
        );
      });

      // ---- build a filter clause and RUN it ---------------------------------
      await t.test("extrasFilterClause runs against a seeded row", async () => {
        // Seed one property row with extras.waterfront = true (carrying the
        // NOT-NULL attribution + required columns).
        await db.query(
          `INSERT INTO property (
             listing_key, slug, mls_source, mls_id,
             property_type, standard_status, list_price,
             city, unparsed_address,
             list_agent_name, list_office_name,
             extras
           ) VALUES (
             $1, $2, $3, $4,
             $5, $6, $7,
             $8, $9,
             $10, $11,
             $12::jsonb
           )
           ON CONFLICT (listing_key) DO NOTHING`,
          [
            LISTING_KEY,
            `/mls-listings/${LISTING_KEY}`,
            "TEST",
            "TESTMLS",
            "A",
            "Active",
            999000,
            "Lake City",
            "1 Lakeside Test Way",
            "Jane Agent",
            "Desert Realty",
            JSON.stringify({ waterfront: true, testMarker: MARKER }),
          ],
        );

        // Build the parameterized predicate and splice it into a SELECT. The
        // clause uses $1; the marker scope uses $2.
        const clause = extrasFilterClause(FIELD_NAME, "eq", true, 1);
        const sql = `SELECT listing_key FROM property
                     WHERE ${clause.text}
                       AND extras->>'testMarker' = $${clause.nextParamIndex}
                       AND listing_key = $${clause.nextParamIndex + 1}`;
        const rows = await db.query<{ listing_key: string }>(sql, [
          ...clause.params,
          MARKER,
          LISTING_KEY,
        ]);
        assert.equal(rows.length, 1, "the waterfront predicate should match the seeded row");
        assert.equal(rows[0].listing_key, LISTING_KEY);

        // The inverse predicate (waterfront = false) must NOT match it.
        const falseClause = extrasFilterClause(FIELD_NAME, "eq", false, 1);
        const noneSql = `SELECT listing_key FROM property
                         WHERE ${falseClause.text}
                           AND listing_key = $${falseClause.nextParamIndex}`;
        const none = await db.query<{ listing_key: string }>(noneSql, [
          ...falseClause.params,
          LISTING_KEY,
        ]);
        assert.equal(none.length, 0, "waterfront=false must not match the waterfront row");
      });

      // ---- live shadowing + bad-identifier rejection ------------------------
      await t.test("live registration rejects shadowing + bad identifiers", async () => {
        await assert.rejects(
          () => registerCustomField(db, { name: "list_price", type: "number" }),
          (e: unknown) => e instanceof CustomFieldError && e.code === "shadows_core_field",
        );
        await assert.rejects(
          () => registerCustomField(db, { name: "Bad-Name", type: "string" }),
          (e: unknown) => e instanceof CustomFieldError && e.code === "invalid_name",
        );
      });
    } finally {
      // ---- cleanup: remove the seeded row AND the registry entry, always ----
      await pool.query(`DELETE FROM property WHERE listing_key LIKE $1`, [MARKER + "%"]);
      await pool.query(
        `DELETE FROM custom_field_registry WHERE resource = $1 AND name = $2`,
        ["Property", FIELD_NAME],
      );
    }
  });
}
