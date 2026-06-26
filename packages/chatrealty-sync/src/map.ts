// packages/chatrealty-sync/src/map.ts
//
// Spec 8 — mapResoProperty: one raw RESO Property record (PascalCase off the
// wire) → the snake_case `property` row shape that the Postgres `property` table
// expects (the columns defined in src/lib/reso/data-dictionary.ts and emitted by
// 0001_init.sql).
//
// COLUMN NAMING IS NOT GUESSED. The snake_case targets come straight from the
// RESO Data Dictionary catalog (src/lib/reso/data-dictionary.ts): every Property
// field carries its PascalCase `resoName` and its snake_case `pgColumn`. We build
// a resoName→{pgColumn,type} index from the catalog and walk it. Hand-mapped
// quirks (poolYN→pool_yn, the dual ListPrice→list_price/current_price, the
// "Order" reserved word) are already encoded in the catalog, so this mapper never
// re-derives names by naive transform.
//
// ATTRIBUTION INVARIANT (build_plan §3.8 — HARD RULE, MLS/IDX compliance):
//   ListAgentFullName        → list_agent_name      (NOT NULL)
//   ListOfficeName           → list_office_name     (NOT NULL)
//   ListAgentPreferredPhone  → list_agent_preferred_phone
//   ListOfficePhone          → list_office_phone
//   ListAgentMlsId / ListOfficeMlsId → the MLS ids
// A row without list_agent_name / list_office_name is a compliance bug; the
// mapper substitutes a safe placeholder ("Information Not Available") rather than
// emitting NULL into a NOT NULL column, but always preserves real attribution
// when present.
//
// Unmapped RESO fields fall to `extras` (jsonb) so nothing is silently lost
// (build_plan §6.8). An optional Claude-derived `subdivisionName` with a
// `source` marker is tolerated.
//
// PURE: no DB, no network. Unit-tested in __tests__/map.test.ts.

import {
  RESOURCES,
  type ResoField,
} from "../../../src/lib/reso/data-dictionary";

/** A mapped property row: snake_case column → value, ready for upsert. */
export type PropertyRow = Record<string, unknown>;

/** Optional Claude-derived subdivision, stamped with provenance. */
export interface DerivedSubdivision {
  readonly subdivisionName: string;
  /** "mls" = authoritative; "derived" = Claude-inferred (§8.2). */
  readonly source: "mls" | "derived";
}

export interface MapOptions {
  /** Optional opt-in Claude-derived subdivision (§8.2). */
  readonly derivedSubdivision?: DerivedSubdivision;
  /** Retain the raw record in the `raw` jsonb column. Default true. */
  readonly keepRaw?: boolean;
}

const ATTRIBUTION_PLACEHOLDER = "Information Not Available";

// Build resoName → field index from the catalog (the source of truth).
const PROPERTY_FIELDS: readonly ResoField[] = RESOURCES.Property.fields;
const BY_RESO_NAME = new Map<string, ResoField>(
  PROPERTY_FIELDS.map((f) => [f.resoName, f]),
);
// The set of pgColumns the catalog OWNS — anything not here is an "extra".
const CORE_RESO_NAMES = new Set<string>(PROPERTY_FIELDS.map((f) => f.resoName));
// jsonb / geometry columns the sync derives, not copied verbatim from a scalar.
const DERIVED_COLUMNS = new Set<string>([
  "geom",
  "extras",
  "raw",
  "cma_stats",
  "cashflow_stats",
]);

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

/** Coerce a wire value to the catalog's declared abstract type. */
function coerce(field: ResoField, value: unknown): unknown {
  if (isBlank(value)) return null;
  switch (field.type) {
    case "boolean":
      return coerceBoolean(value);
    case "integer": {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case "date":
      return coerceDate(value);
    case "string":
    case "enum":
      return String(value);
    default:
      return value;
  }
}

/** RESO YN flags arrive as true/false, "Y"/"N", "1"/"0", "true"/"false". */
function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (["y", "yes", "true", "1", "t"].includes(s)) return true;
  if (["n", "no", "false", "0", "f"].includes(s)) return false;
  return null;
}

/** Normalize a RESO timestamp to an ISO-8601 string (pg parses it as timestamptz). */
function coerceDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Map one RESO Property record to the snake_case `property` row shape.
 *
 * Returns `null` when the record has no `ListingKey` — a keyless record cannot
 * be upserted (it has no primary key) and is dropped, matching the Python
 * pipeline's `flatten.py` (null-on-no-ListingKey) behavior.
 */
export function mapResoProperty(
  record: Record<string, unknown>,
  opts: MapOptions = {},
): PropertyRow | null {
  const listingKey = record.ListingKey;
  if (isBlank(listingKey)) return null;

  const row: PropertyRow = {};
  const extras: Record<string, unknown> = {};

  // 1) Walk every wire key; map the ones the catalog knows by resoName, send the
  //    rest to `extras`. Multiple resoNames can share a column (ListPrice maps to
  //    both list_price and current_price) — handle that by iterating the catalog,
  //    not the wire, for core columns; iterate the wire only to harvest extras.
  for (const [rawKey, rawVal] of Object.entries(record)) {
    if (!CORE_RESO_NAMES.has(rawKey)) {
      // Unmapped field → extras (skip blanks to keep the jsonb tight).
      if (!isBlank(rawVal)) extras[rawKey] = rawVal;
    }
  }

  // 2) Fill core columns from the catalog. Iterating the catalog (not the wire)
  //    means a single source resoName can populate several columns and we never
  //    miss a NOT NULL attribution column.
  for (const field of PROPERTY_FIELDS) {
    if (DERIVED_COLUMNS.has(field.pgColumn)) continue; // handled below
    const wireVal = record[field.resoName];
    row[field.pgColumn] = coerce(field, wireVal);
  }

  // 3) Geometry: derive geom from longitude/latitude when both present. The
  //    Postgres adapter does spatial math in raw SQL; here we hand the writer a
  //    GeoJSON Point string, which the writer wraps with ST_GeomFromGeoJSON.
  const lng = row["longitude"];
  const lat = row["latitude"];
  if (typeof lng === "number" && typeof lat === "number") {
    row["geom"] = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
  } else {
    row["geom"] = null;
  }

  // 4) Slug — derive a stable URL slug if the feed didn't supply one. Falls back
  //    to the listing key so the NOT NULL slug column is always satisfied.
  if (isBlank(row["slug"])) {
    row["slug"] = deriveSlug(record) ?? String(listingKey);
  }

  // 5) ATTRIBUTION (§3.8) — list_agent_name / list_office_name are NOT NULL.
  //    Never emit NULL into them; substitute a placeholder if the feed omitted
  //    attribution (rare, but a NULL would break the insert AND the compliance
  //    invariant). Real values are always preserved.
  row["list_agent_name"] = nonNullAttribution(row["list_agent_name"]);
  row["list_office_name"] = nonNullAttribution(row["list_office_name"]);

  // 6) mls_source / mls_id are NOT NULL too — backfill from OriginatingSystem*.
  if (isBlank(row["mls_source"])) row["mls_source"] = String(record.OriginatingSystemName ?? "UNKNOWN");
  if (isBlank(row["mls_id"])) row["mls_id"] = String(record.OriginatingSystemID ?? record.OriginatingSystemKey ?? "UNKNOWN");

  // 7) Optional Claude-derived subdivision (§8.2). Only fills the gap when the
  //    MLS had none, and records provenance into extras so it's never presented
  //    as authoritative.
  if (opts.derivedSubdivision) {
    if (isBlank(row["subdivision_name"])) {
      row["subdivision_name"] = opts.derivedSubdivision.subdivisionName;
    }
    extras["subdivisionSource"] = opts.derivedSubdivision.source;
  }

  // 8) extras + raw jsonb.
  row["extras"] = Object.keys(extras).length > 0 ? extras : null;
  row["raw"] = opts.keepRaw === false ? null : record;

  return row;
}

function nonNullAttribution(v: unknown): string {
  return isBlank(v) ? ATTRIBUTION_PLACEHOLDER : String(v);
}

/** Derive a kebab slug from address parts (best-effort; null if nothing usable). */
function deriveSlug(record: Record<string, unknown>): string | null {
  const parts = [
    record.UnparsedAddress ??
      [record.StreetNumber, record.StreetName].filter(Boolean).join(" "),
    record.City,
    record.StateOrProvince,
  ]
    .filter((p) => !isBlank(p))
    .map((p) => String(p));
  if (parts.length === 0) return null;
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || null;
}

/** The ordered list of property columns this mapper writes (used by the writer). */
export function mappedPropertyColumns(): string[] {
  const cols = PROPERTY_FIELDS.filter(
    (f) => !DERIVED_COLUMNS.has(f.pgColumn),
  ).map((f) => f.pgColumn);
  // De-dupe (ListPrice → list_price + current_price are distinct columns; the
  // catalog already lists each column once, so this is defensive).
  const uniq = Array.from(new Set([...cols, "geom", "extras", "raw"]));
  return uniq;
}
