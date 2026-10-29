// src/lib/reso/web-api/fields.ts
//
// The fields the RESO Web API surface (/api/skill/reso) DECLARES in $metadata,
// and where each one lives in Mongo `unified_listings`.
//
// Why a separate list from src/lib/reso/data-dictionary.ts: that catalog is
// the casing map for the tenant Postgres schema. This one is narrower on
// purpose — RESO's test suite (`reso-cert core`) filters on EVERY declared
// field of a type, so a declared field we can't filter correctly is a failed
// test, while an undeclared one is just absent. Only add a field after checking
// how it is actually stored (see docs/chatrealty-api/reso-compliance-plan.md §4).
//
// Stored-type facts behind `stored` (probed 2026-10-29, 85,346 docs):
//   - every timestamp is an ISO string in exactly `YYYY-MM-DDTHH:MM:SSZ` form,
//     so lexical comparison is chronological;
//   - `listingContractDate` is `YYYY-MM-DD`; `onMarketDate` is a full timestamp
//     string, served as its date part;
//   - `bedroomsTotal` is never populated — `bedsTotal` is.

export type EdmType =
  | "Edm.String"
  | "Edm.Int64"
  | "Edm.Decimal"
  | "Edm.Boolean"
  | "Edm.Date"
  | "Edm.DateTimeOffset";

/** How the value is physically stored in Mongo — drives filter coercion. */
export type StoredAs =
  | "string"
  | "number"
  | "boolean"
  /** ISO string whose first 10 chars are the date (`YYYY-MM-DD…`). */
  | "isoDatePrefix"
  /** ISO string `YYYY-MM-DDTHH:MM:SSZ` (uniform — lexical order = time order). */
  | "isoTimestamp";

export interface ResoWebField {
  /** RESO Data Dictionary name, as served. */
  readonly name: string;
  readonly type: EdmType;
  /** Mongo field path in `unified_listings`. */
  readonly source: string;
  readonly stored: StoredAs;
  /** String-mode enumeration: the Lookup resource's LookupName. */
  readonly lookupName?: string;
  readonly nullable?: boolean;
  readonly precision?: number;
  readonly scale?: number;
}

export const PROPERTY_KEY = "ListingKey";

export const PROPERTY_FIELDS: readonly ResoWebField[] = [
  { name: "ListingKey", type: "Edm.String", source: "listingKey", stored: "string", nullable: false },
  { name: "ListingId", type: "Edm.String", source: "listingId", stored: "string" },
  { name: "OriginatingSystemName", type: "Edm.String", source: "mlsSource", stored: "string" },
  { name: "StandardStatus", type: "Edm.String", source: "standardStatus", stored: "string", lookupName: "StandardStatus" },
  { name: "ListPrice", type: "Edm.Decimal", source: "listPrice", stored: "number", precision: 14, scale: 2 },
  { name: "BedroomsTotal", type: "Edm.Int64", source: "bedsTotal", stored: "number" },
  { name: "BathroomsTotalInteger", type: "Edm.Int64", source: "bathroomsTotalInteger", stored: "number" },
  { name: "YearBuilt", type: "Edm.Int64", source: "yearBuilt", stored: "number" },
  { name: "LivingArea", type: "Edm.Decimal", source: "livingArea", stored: "number", precision: 14, scale: 2 },
  { name: "LotSizeAcres", type: "Edm.Decimal", source: "lotSizeAcres", stored: "number", precision: 16, scale: 4 },
  { name: "Latitude", type: "Edm.Decimal", source: "latitude", stored: "number", precision: 12, scale: 8 },
  { name: "Longitude", type: "Edm.Decimal", source: "longitude", stored: "number", precision: 12, scale: 8 },
  { name: "PoolPrivateYN", type: "Edm.Boolean", source: "poolYN", stored: "boolean" },
  { name: "UnparsedAddress", type: "Edm.String", source: "unparsedAddress", stored: "string" },
  { name: "City", type: "Edm.String", source: "city", stored: "string", lookupName: "City" },
  { name: "StateOrProvince", type: "Edm.String", source: "stateOrProvince", stored: "string", lookupName: "StateOrProvince" },
  { name: "PostalCode", type: "Edm.String", source: "postalCode", stored: "string" },
  { name: "SubdivisionName", type: "Edm.String", source: "subdivisionName", stored: "string" },
  // MLS/IDX attribution — always declared (data-dictionary.md §3.8).
  { name: "ListAgentFullName", type: "Edm.String", source: "listAgentName", stored: "string" },
  { name: "ListOfficeName", type: "Edm.String", source: "listOfficeName", stored: "string" },
  { name: "ListingContractDate", type: "Edm.Date", source: "listingContractDate", stored: "isoDatePrefix" },
  { name: "OnMarketDate", type: "Edm.Date", source: "onMarketDate", stored: "isoDatePrefix" },
  { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", source: "modificationTimestamp", stored: "isoTimestamp" },
  { name: "StatusChangeTimestamp", type: "Edm.DateTimeOffset", source: "statusChangeTimestamp", stored: "isoTimestamp" },
  { name: "OriginalOnMarketTimestamp", type: "Edm.DateTimeOffset", source: "originalOnMarketTimestamp", stored: "isoTimestamp" },
];

/**
 * Media rows are embedded in each listing (`media[]`, Spark's photo shape:
 * `id`, `name`, `uriLarge`, `uri1024`…). They are mapped, not filtered, so
 * `source` here is documentation only.
 */
export const MEDIA_KEY = "MediaKey";
export const MEDIA_FIELDS: readonly ResoWebField[] = [
  { name: "MediaKey", type: "Edm.String", source: "media[].id", stored: "string", nullable: false },
  { name: "ResourceRecordKey", type: "Edm.String", source: "listingKey", stored: "string" },
  { name: "ResourceName", type: "Edm.String", source: "'Property'", stored: "string", lookupName: "ResourceName" },
  { name: "MediaCategory", type: "Edm.String", source: "'Photo'", stored: "string", lookupName: "MediaCategory" },
  { name: "MediaURL", type: "Edm.String", source: "media[].uriLarge", stored: "string" },
  { name: "Order", type: "Edm.Int64", source: "media[] index", stored: "number" },
  { name: "ShortDescription", type: "Edm.String", source: "media[].name", stored: "string" },
];

/** RCP-032/039 Lookup resource — the string-enumeration catalog. Rows are
 *  computed in memory and keyed by RESO name, so `source` === `name`. */
export const LOOKUP_KEY = "LookupKey";
export const LOOKUP_FIELDS: readonly ResoWebField[] = [
  { name: "LookupKey", type: "Edm.String", source: "LookupKey", stored: "string", nullable: false },
  { name: "LookupName", type: "Edm.String", source: "LookupName", stored: "string" },
  { name: "LookupValue", type: "Edm.String", source: "LookupValue", stored: "string" },
  { name: "StandardLookupValue", type: "Edm.String", source: "StandardLookupValue", stored: "string" },
  { name: "LegacyODataValue", type: "Edm.String", source: "LegacyODataValue", stored: "string" },
  { name: "ModificationTimestamp", type: "Edm.DateTimeOffset", source: "ModificationTimestamp", stored: "isoTimestamp" },
];

export type ResoResourceName = "Property" | "Media" | "Lookup";

export const RESOURCES: Record<ResoResourceName, { key: string; fields: readonly ResoWebField[] }> = {
  Property: { key: PROPERTY_KEY, fields: PROPERTY_FIELDS },
  Media: { key: MEDIA_KEY, fields: MEDIA_FIELDS },
  Lookup: { key: LOOKUP_KEY, fields: LOOKUP_FIELDS },
};

/** Property's one navigation property. */
export const PROPERTY_NAV_MEDIA = "Media";

export function fieldMap(fields: readonly ResoWebField[]): Map<string, ResoWebField> {
  return new Map(fields.map((f) => [f.name, f]));
}
