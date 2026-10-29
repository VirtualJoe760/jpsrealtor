// src/lib/reso/web-api/lookup.ts
//
// The RESO Lookup resource (RCP-032/039): the catalog of string-enumeration
// values. `reso-cert core` queries `/Lookup?$filter=LookupName eq 'X'` and
// FAILS (not skips) when a value present in the data is missing here.
//
// Rows = the Data Dictionary's standard values for each lookup field, plus any
// value actually found in the data (so a local value can never be missing).
// Computed, cached for an hour — enumerations change rarely, and recomputing
// costs a `distinct` over the listings collection.

import { filterToMongo } from "./filter-to-mongo";
import { LOOKUP_FIELDS, PROPERTY_FIELDS, fieldMap } from "./fields";
import { matches } from "./match";
import { distinctPropertyValues } from "./property-store";

export const LOOKUP_FIELD_MAP = fieldMap(LOOKUP_FIELDS);

/** DD 2.0 StandardStatus — display value → legacy OData (machine) value. */
const STANDARD_VALUES: Record<string, Record<string, string>> = {
  StandardStatus: {
    Active: "Active",
    "Active Under Contract": "ActiveUnderContract",
    Canceled: "Canceled",
    Closed: "Closed",
    "Coming Soon": "ComingSoon",
    Delete: "Delete",
    Expired: "Expired",
    Hold: "Hold",
    Incomplete: "Incomplete",
    Pending: "Pending",
    Withdrawn: "Withdrawn",
  },
};

// Stable while the value set is unchanged; a fixed instant keeps
// ModificationTimestamp honest-but-cheap for a computed catalog.
const CATALOG_TIMESTAMP = "2026-10-29T00:00:00Z";
const TTL_MS = 60 * 60 * 1000;

export type LookupRow = Record<string, string | null>;
let cache: { at: number; rows: LookupRow[] } | null = null;

async function buildRows(): Promise<LookupRow[]> {
  const rows: LookupRow[] = [];
  for (const f of PROPERTY_FIELDS) {
    if (!f.lookupName) continue;
    const standard = STANDARD_VALUES[f.lookupName] ?? {};
    const legacyToDisplay = new Map(Object.entries(standard).map(([d, l]) => [l, d]));
    const values = new Map<string, string | null>(Object.entries(standard)); // display → legacy
    for (const v of await distinctPropertyValues(f.source)) {
      // A stored machine value ("ComingSoon") is the same entry as its display form.
      const display = legacyToDisplay.get(v) ?? v;
      if (!values.has(display)) values.set(display, null);
    }
    for (const [display, legacy] of values) {
      rows.push({
        LookupKey: `${f.lookupName}:${display}`,
        LookupName: f.lookupName,
        LookupValue: display,
        StandardLookupValue: legacy !== null ? display : null,
        LegacyODataValue: legacy,
        ModificationTimestamp: CATALOG_TIMESTAMP,
      });
    }
  }
  return rows.sort((a, b) => a.LookupKey!.localeCompare(b.LookupKey!));
}

export async function lookupRows(filter: string | null): Promise<LookupRow[]> {
  if (!cache || Date.now() - cache.at > TTL_MS) cache = { at: Date.now(), rows: await buildRows() };
  if (!filter) return cache.rows;
  const query = filterToMongo(filter, LOOKUP_FIELD_MAP);
  return cache.rows.filter((r) => matches(r, query));
}
