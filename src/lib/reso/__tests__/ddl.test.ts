// src/lib/reso/__tests__/ddl.test.ts
//
// Agent 04 — DDL generator invariants + the 0001_init.sql reconciliation lock.
// Node built-in runner only (no vitest/jest):
//   npx tsx --test src/lib/reso/__tests__/ddl.test.ts
//
// Pure-logic tests (build_plan §3.6 / Agent 04 acceptance): NO live Postgres.
// We assert the emitted SQL's STRUCTURE (every table, the PostGIS/GIN/GiST/trgm
// index lines, reserved-word quoting) and — the keystone of this task — that the
// committed migration file is BYTE-IDENTICAL to buildFullSchemaDDL() so the two
// can never drift.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildFullSchemaDDL,
  buildResourceDDL,
  pgColumnClause,
  quoteIdent,
  ddlResourceTables,
  INIT_MIGRATION_VERSION,
} from "../ddl.ts";
import { RESOURCE_NAMES, getResource, getField } from "../data-dictionary.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(HERE, "..", "migrations", "0001_init.sql");

// --- emission: non-empty, deterministic ---

test("buildFullSchemaDDL emits non-empty SQL", () => {
  const sql = buildFullSchemaDDL();
  assert.equal(typeof sql, "string");
  assert.ok(sql.length > 0);
});

test("buildFullSchemaDDL is deterministic (same output every call)", () => {
  assert.equal(buildFullSchemaDDL(), buildFullSchemaDDL());
});

// --- every table present ---

test("emits a CREATE TABLE for every RESO resource", () => {
  const sql = buildFullSchemaDDL();
  for (const r of RESOURCE_NAMES) {
    const def = getResource(r)!;
    assert.ok(
      sql.includes(`CREATE TABLE IF NOT EXISTS ${def.table} (`),
      `missing CREATE TABLE for ${def.table}`,
    );
  }
});

test("emits the housekeeping tables (custom_field_registry, schema_migrations)", () => {
  const sql = buildFullSchemaDDL();
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS custom_field_registry ("));
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS schema_migrations ("));
});

// --- extensions preamble ---

test("emits the PostGIS + pg_trgm extension preamble", () => {
  const sql = buildFullSchemaDDL();
  assert.ok(sql.includes("CREATE EXTENSION IF NOT EXISTS postgis;"));
  assert.ok(sql.includes("CREATE EXTENSION IF NOT EXISTS pg_trgm;"));
});

// --- the index lines the acceptance criteria call out by name ---

test("emits a PostGIS GiST index on property.geom", () => {
  const sql = buildFullSchemaDDL();
  assert.ok(
    sql.includes("ON property USING GIST (geom);"),
    "missing GiST index on property.geom",
  );
});

test("emits a GIN(jsonb_path_ops) index on EVERY extras column", () => {
  const sql = buildFullSchemaDDL();
  for (const r of RESOURCE_NAMES) {
    const def = getResource(r)!;
    // every resource in the catalog carries an `extras` jsonb column
    assert.ok(getField(r, "extras"), `${r} unexpectedly has no extras field`);
    assert.ok(
      sql.includes(`ON ${def.table} USING GIN (extras jsonb_path_ops);`),
      `missing GIN(jsonb_path_ops) on ${def.table}.extras`,
    );
  }
});

test("emits a pg_trgm GIN index on property.unparsed_address (street resolve)", () => {
  const sql = buildFullSchemaDDL();
  assert.ok(
    sql.includes("USING GIN (unparsed_address gin_trgm_ops);"),
    "missing pg_trgm index on unparsed_address",
  );
});

test("emits the ported compound indexes", () => {
  const sql = buildFullSchemaDDL();
  for (const name of [
    "idx_property_mls_source_id",
    "idx_property_city_status",
    "idx_property_subdivision_status",
    "idx_property_type_status",
    "idx_property_city_type_price",
    "idx_property_city_status_type_beds",
    "idx_property_city_status_type_bedrooms",
    "idx_property_city_status_type_baths",
    "idx_property_subdiv_status_type_beds",
    "idx_property_subdiv_status_type_bedrooms",
    "idx_property_subdiv_status_type_baths",
    "idx_property_city_cashflow20",
    "idx_property_zip_cashflow20",
  ]) {
    assert.ok(sql.includes(name), `missing ported compound index ${name}`);
  }
});

// --- reserved words ---

test("reserved word `view` is quoted as an identifier", () => {
  const sql = buildFullSchemaDDL();
  // the column definition line uses the quoted form
  assert.ok(sql.includes(`  "view" text,`), 'reserved column "view" not quoted in DDL');
  // and the bare token never appears unquoted as a column clause
  assert.ok(!/\n  view text/.test(sql), "found an unquoted `view` column clause");
});

test("quoteIdent quotes reserved words and leaves others bare", () => {
  assert.equal(quoteIdent("view"), '"view"');
  assert.equal(quoteIdent("order"), '"order"');
  assert.equal(quoteIdent("View"), '"View"'); // case-insensitive
  assert.equal(quoteIdent("city"), "city");
  assert.equal(quoteIdent("list_price"), "list_price");
});

// --- column clause ---

test("pgColumnClause emits PRIMARY KEY, NOT NULL, and the catalog pgType", () => {
  const pk = getField("Property", "listingKey")!;
  assert.equal(pgColumnClause(pk, true), "listing_key text PRIMARY KEY");

  const notNull = getField("Property", "listOfficeName")!;
  assert.equal(pgColumnClause(notNull, false), "list_office_name text NOT NULL");

  const nullable = getField("Property", "listPrice")!;
  assert.equal(pgColumnClause(nullable, false), "list_price double precision");

  const geom = getField("Property", "geom")!;
  assert.equal(pgColumnClause(geom, false), "geom geometry(Point,4326)");

  const view = getField("Property", "view")!;
  assert.equal(pgColumnClause(view, false), '"view" text');
});

// --- per-resource builder ---

test("buildResourceDDL emits one CREATE TABLE and indexes for a resource", () => {
  const member = getResource("Member")!;
  const ddl = buildResourceDDL(member);
  assert.ok(ddl.includes("CREATE TABLE IF NOT EXISTS member ("));
  assert.ok(ddl.includes("member_key text PRIMARY KEY"));
  assert.ok(ddl.includes("USING GIN (extras jsonb_path_ops)"));
  // primary key does not get a redundant secondary index
  assert.ok(!ddl.includes("idx_member_member_key "));
});

test("ddlResourceTables enumerates the four resource tables", () => {
  const tables = ddlResourceTables().map((t) => t.table).sort();
  assert.deepEqual(tables, ["media", "member", "office", "property"]);
});

test("INIT_MIGRATION_VERSION is 0001_init", () => {
  assert.equal(INIT_MIGRATION_VERSION, "0001_init");
});

// --- THE RECONCILIATION LOCK ---
// The committed 0001_init.sql MUST equal buildFullSchemaDDL() output byte-for-
// byte. If this fails, someone hand-edited the migration or changed the catalog/
// generator without regenerating. Fix: regenerate 0001_init.sql from the
// generator (it is the source of truth), never patch the SQL by hand.

test("0001_init.sql is byte-identical to buildFullSchemaDDL() output", () => {
  const committed = readFileSync(MIGRATION_PATH, "utf8");
  const generated = buildFullSchemaDDL();
  assert.equal(
    committed,
    generated,
    "0001_init.sql has drifted from the generator — regenerate it from buildFullSchemaDDL()",
  );
});
