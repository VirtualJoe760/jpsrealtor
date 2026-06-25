// src/lib/reso/ddl.ts
//
// Agent 04 — the per-tenant data-plane DDL generator (Spec 4 Task B).
//
// SINGLE SOURCE OF TRUTH FOR THE TENANT SCHEMA SQL. `buildFullSchemaDDL()`
// emits the complete CREATE-TABLE / CREATE-INDEX script for one tenant's Neon
// Postgres database from the RESO Data Dictionary catalog (Agent 03). The
// canonical migration file `migrations/0001_init.sql` is BYTE-IDENTICAL to this
// generator's output — a reconciliation test (`__tests__/ddl.test.ts`) asserts
// they never drift. The provisioning runner (Agent 16) applies `0001_init.sql`
// at tenant-provision time, never at app boot (build_plan §3.2).
//
// WHAT THIS EMITS (build_plan §6.3 / §6.4):
//   • the four RESO resource tables — property / member / office / media —
//     with every column typed from `data-dictionary.ts` (snake_case columns,
//     hand-mapped, never naively transformed);
//   • `custom_field_registry` — the per-tenant custom-field catalog (Agent 17);
//   • `schema_migrations` — the migration ledger the runner stamps;
//   • the PostGIS extension preamble (postgis + pg_trgm);
//   • a PostGIS GiST index on `property.geom`;
//   • a GIN(jsonb_path_ops) index on EVERY `extras` jsonb column;
//   • a pg_trgm GIN index on `property.unparsed_address` (street resolve,
//     build_plan §6.5 — replaces the 68s Mongo COLLSCAN);
//   • the ported compound indexes from `unified-listing.ts`;
//   • single-column indexes for every `indexed` catalog field.
//
// RESERVED WORDS (build_plan §3.4): `view` is a Postgres reserved word and is
// quoted as `"view"` wherever it appears as an identifier. The Media `Order`
// RESO field is already re-homed to the non-reserved column `media_order` in
// the catalog, but the quoting helper is reserved-word-aware regardless so a
// future reserved column name can never emit invalid SQL.
//
// PURE STRING GENERATION. No Neon, no pg, no Drizzle, no live database — this
// file builds SQL text only. Validating it against a throwaway PostGIS Postgres
// is a separate integration step; the unit tests here assert structure, not a
// live apply (build_plan §3.6 / the Agent 04 acceptance note "Do NOT require a
// live Postgres").

import {
  RESOURCE_NAMES,
  getResource,
  type ResoField,
  type ResoResource,
  type ResoResourceDef,
} from "./data-dictionary.ts";

// -----------------------------------------------------------------------------
// Identifier quoting (reserved-word-aware)
// -----------------------------------------------------------------------------

/**
 * Postgres reserved words that appear (or could appear) as identifiers in this
 * schema and MUST be double-quoted. Kept deliberately small and explicit rather
 * than embedding the full SQL keyword list — these are the ones the catalog can
 * actually surface (build_plan §3.4 names `view` and `order`).
 */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  "view",
  "order",
  "user",
  "group",
  "select",
  "table",
  "column",
  "default",
  "references",
  "primary",
  "check",
  "constraint",
]);

/**
 * Quote a snake_case identifier when it is a Postgres reserved word; otherwise
 * emit it bare. Matching is case-insensitive (Postgres folds unquoted
 * identifiers to lower-case). This keeps the generated SQL readable (most
 * columns are bare) while making reserved names like `view` valid.
 */
export function quoteIdent(ident: string): string {
  return RESERVED_WORDS.has(ident.toLowerCase()) ? `"${ident}"` : ident;
}

// -----------------------------------------------------------------------------
// Column clause
// -----------------------------------------------------------------------------

/**
 * Build a single `CREATE TABLE` column clause for a catalog field, e.g.
 * `list_price double precision` or `listing_key text NOT NULL`.
 *
 * The primary-key field gets `PRIMARY KEY` inline (it is always NOT NULL in the
 * catalog). NOT NULL is emitted for any non-nullable field. The Postgres type
 * comes straight from `field.pgType` (the catalog hand-maps every type,
 * including `geometry(Point,4326)` for geography and `jsonb` for json).
 */
export function pgColumnClause(field: ResoField, isPrimaryKey: boolean): string {
  const col = quoteIdent(field.pgColumn);
  const parts = [col, field.pgType];
  if (isPrimaryKey) {
    parts.push("PRIMARY KEY");
  } else if (!field.nullable) {
    parts.push("NOT NULL");
  }
  return parts.join(" ");
}

// -----------------------------------------------------------------------------
// Per-resource table + index DDL
// -----------------------------------------------------------------------------

/** Index-name-safe slug for an identifier (strip quotes). */
function bareName(ident: string): string {
  return ident.replace(/"/g, "");
}

/**
 * Emit the `CREATE TABLE` + per-resource index statements for one RESO
 * resource. The compound/PostGIS/trigram indexes specific to `property` are
 * appended by `buildFullSchemaDDL`; this function emits the table plus the
 * generic single-column indexes for every `indexed` field, the GIN
 * jsonb_path_ops index on any `extras` column, and the GiST index on any
 * `geom` column.
 */
export function buildResourceDDL(def: ResoResourceDef): string {
  const table = quoteIdent(def.table);
  const lines: string[] = [];

  // --- CREATE TABLE ---
  const colClauses = def.fields.map((f) =>
    `  ${pgColumnClause(f, f.name === def.primaryKey)}`,
  );
  lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`);
  lines.push(colClauses.join(",\n"));
  lines.push(`);`);
  lines.push("");

  // --- per-field indexes ---
  for (const f of def.fields) {
    if (f.type === "geography") {
      // PostGIS GiST index.
      lines.push(
        `CREATE INDEX IF NOT EXISTS idx_${def.table}_${bareName(f.pgColumn)}_gist ` +
          `ON ${table} USING GIST (${quoteIdent(f.pgColumn)});`,
      );
    } else if (f.type === "json" && f.pgColumn === "extras") {
      // GIN(jsonb_path_ops) on every extras column (build_plan §6.3).
      lines.push(
        `CREATE INDEX IF NOT EXISTS idx_${def.table}_extras_gin ` +
          `ON ${table} USING GIN (${quoteIdent(f.pgColumn)} jsonb_path_ops);`,
      );
    } else if (f.indexed && f.type !== "json") {
      // Plain btree single-column index for catalog-indexed fields. The
      // primary key already has a unique index from PRIMARY KEY; skip it.
      if (f.name === def.primaryKey) continue;
      lines.push(
        `CREATE INDEX IF NOT EXISTS idx_${def.table}_${bareName(f.pgColumn)} ` +
          `ON ${table} (${quoteIdent(f.pgColumn)});`,
      );
    }
  }

  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// Ported compound indexes (from src/models/unified-listing.ts)
// -----------------------------------------------------------------------------
//
// These mirror the Mongoose compound indexes verbatim so the Postgres search
// path keeps the same access patterns (build_plan §6.3 "ported compound
// indexes"). Mongo's cashflow indexes target nested `cashflowStats.scenarios…`
// paths; in Postgres `cashflow_stats` is a jsonb column, so those become
// expression indexes on the jsonb path.

function propertyCompoundIndexes(): string {
  const t = "property";
  const tq = quoteIdent(t);
  const idx = (name: string, cols: string): string =>
    `CREATE INDEX IF NOT EXISTS ${name} ON ${tq} (${cols});`;

  const cashflowExpr =
    "((cashflow_stats #>> '{scenarios,down20,monthlyCashflow}')::numeric DESC)";

  return [
    idx("idx_property_mls_source_id", "mls_source, mls_id"),
    idx("idx_property_city_status", "city, standard_status"),
    idx("idx_property_subdivision_status", "subdivision_name, standard_status"),
    idx("idx_property_type_status", "property_type, standard_status"),
    // city stats (city + propertyType + listPrice)
    idx("idx_property_city_type_price", "city, property_type, list_price"),
    // bed/bath filtering — city scope (dual bed/bath columns kept)
    idx("idx_property_city_status_type_beds", "city, standard_status, property_type, beds_total"),
    idx(
      "idx_property_city_status_type_bedrooms",
      "city, standard_status, property_type, bedrooms_total",
    ),
    idx(
      "idx_property_city_status_type_baths",
      "city, standard_status, property_type, bathrooms_total_integer",
    ),
    // bed/bath filtering — subdivision scope
    idx(
      "idx_property_subdiv_status_type_beds",
      "subdivision_name, standard_status, property_type, beds_total",
    ),
    idx(
      "idx_property_subdiv_status_type_bedrooms",
      "subdivision_name, standard_status, property_type, bedrooms_total",
    ),
    idx(
      "idx_property_subdiv_status_type_baths",
      "subdivision_name, standard_status, property_type, bathrooms_total_integer",
    ),
    // cash-flow scan (area + monthly cash flow @ 20% down), jsonb expression idx
    `CREATE INDEX IF NOT EXISTS idx_property_city_cashflow20 ON ${tq} (city, ${cashflowExpr});`,
    `CREATE INDEX IF NOT EXISTS idx_property_zip_cashflow20 ON ${tq} (postal_code, ${cashflowExpr});`,
    // street resolve — pg_trgm GIN on unparsed_address (build_plan §6.5)
    `CREATE INDEX IF NOT EXISTS idx_property_unparsed_address_trgm ON ${tq} ` +
      `USING GIN (unparsed_address gin_trgm_ops);`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Control / housekeeping tables
// -----------------------------------------------------------------------------

/**
 * `custom_field_registry` — the per-tenant catalog of registered custom fields
 * (Agent 17). Each row declares one `extras` key: its name, declared type, the
 * RESO resource it extends, whether it's searchable, and enum values when the
 * declared type is enum. `(resource, name)` is unique so a key can't be
 * registered twice for the same resource.
 */
function customFieldRegistryDDL(): string {
  return [
    `CREATE TABLE IF NOT EXISTS custom_field_registry (`,
    `  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`,
    `  resource text NOT NULL,`,
    `  name text NOT NULL,`,
    `  field_type text NOT NULL,`,
    `  label text,`,
    `  searchable boolean NOT NULL DEFAULT false,`,
    `  enum_values jsonb,`,
    `  created_at timestamptz NOT NULL DEFAULT now(),`,
    `  CONSTRAINT custom_field_registry_resource_name_key UNIQUE (resource, name)`,
    `);`,
    "",
    `CREATE INDEX IF NOT EXISTS idx_custom_field_registry_resource ` +
      `ON custom_field_registry (resource);`,
  ].join("\n");
}

/**
 * `schema_migrations` — the migration ledger. The provisioning runner inserts
 * one row per applied migration (`version` is the file's leading number /
 * filename). `applied_at` stamps when it ran.
 */
function schemaMigrationsDDL(): string {
  return [
    `CREATE TABLE IF NOT EXISTS schema_migrations (`,
    `  version text PRIMARY KEY,`,
    `  applied_at timestamptz NOT NULL DEFAULT now()`,
    `);`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Full schema
// -----------------------------------------------------------------------------

const PREAMBLE = [
  "-- ============================================================================",
  "-- ChatRealty per-tenant data-plane schema — migration 0001_init",
  "--",
  "-- GENERATED by src/lib/reso/ddl.ts (buildFullSchemaDDL). Do NOT hand-edit:",
  "-- src/lib/reso/migrations/0001_init.sql is asserted byte-identical to this",
  "-- generator's output by src/lib/reso/__tests__/ddl.test.ts. Change the",
  "-- catalog (data-dictionary.ts) or the generator, then regenerate.",
  "--",
  "-- Applied at tenant-provision time over the DIRECT (non-pooled) connection",
  "-- (pgBouncer cannot run CREATE EXTENSION / session DDL). build_plan §6.2.",
  "-- ============================================================================",
  "",
  "CREATE EXTENSION IF NOT EXISTS postgis;",
  "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
].join("\n");

/**
 * Build the complete per-tenant schema DDL as a single SQL string. This is the
 * canonical `0001_init.sql` content. Emission order is stable (preamble →
 * each resource table+indexes in catalog order → property compound indexes →
 * custom_field_registry → schema_migrations) so the output is deterministic and
 * the reconciliation test can byte-compare it against the committed migration.
 */
export function buildFullSchemaDDL(): string {
  const blocks: string[] = [PREAMBLE];

  for (const resourceName of RESOURCE_NAMES) {
    const def = getResource(resourceName);
    // getResource is total over RESOURCE_NAMES, but guard for strictness.
    if (!def) throw new Error(`missing resource definition: ${resourceName}`);
    blocks.push(sectionHeader(`${def.resource} (${def.table})`));
    blocks.push(buildResourceDDL(def));
    if (def.resource === "Property") {
      blocks.push(sectionHeader("Property — ported compound indexes"));
      blocks.push(propertyCompoundIndexes());
    }
  }

  blocks.push(sectionHeader("custom_field_registry"));
  blocks.push(customFieldRegistryDDL());

  blocks.push(sectionHeader("schema_migrations"));
  blocks.push(schemaMigrationsDDL());

  // Single trailing newline; sections separated by a blank line.
  return blocks.join("\n\n") + "\n";
}

function sectionHeader(label: string): string {
  return `-- ----------------------------------------------------------------------------\n-- ${label}\n-- ----------------------------------------------------------------------------`;
}

/** The migration version string the runner stamps into `schema_migrations`. */
export const INIT_MIGRATION_VERSION = "0001_init" as const;

/** Convenience: the catalog resources this DDL covers, for callers/tests. */
export function ddlResourceTables(): readonly { resource: ResoResource; table: string }[] {
  return RESOURCE_NAMES.map((r) => {
    const def = getResource(r)!;
    return { resource: def.resource, table: def.table };
  });
}
