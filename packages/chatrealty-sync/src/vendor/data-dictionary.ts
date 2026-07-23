// src/lib/reso/data-dictionary.ts
//
// Agent 03 — the RESO Data Dictionary catalog (Spec 4 Task A).
//
// THE SOURCE OF TRUTH FOR COLUMN NAMING. Every Postgres column, every Drizzle
// table definition (Agent 09), every DDL clause (Agent 04), and every sync
// mapper (Agent 24) consumes the catalog here. It carries ALL THREE casings
// explicitly per build_plan §3.4 — the three never derive from one another by
// naive transform:
//
//   • name     — camelCase TS/DTO field   (`listingKey`, `onMarketDate`, `poolYN`)
//   • resoName — PascalCase RESO source    (`ListingKey`, `OnMarketDate`, `PoolYN`)
//   • pgColumn — snake_case Postgres column (`listing_key`, `on_market_date`, `pool_yn`)
//
// Hand-mapping is deliberate: `poolYN`→`pool_yn` (not `pool_y_n`),
// `bathroomsTotalInteger`→`bathrooms_total_integer`, and reserved words
// (`view`, `order`) are quoted in DDL by Agent 04 — never inferred.
//
// ATTRIBUTION INVARIANT (build_plan §3.8 — HARD RULE, MLS/IDX compliance):
// the listing-attribution fields are marked `required: true` in the Property
// resource. `listAgentName` (from `ListAgentFullName`) and `listOfficeName`
// (from `ListOfficeName`), plus the agent/office phones, MUST be present on
// every listing surface. Serving listing data without them is a compliance bug
// of the same severity as a tenant leak.
//
// PURE DATA + LOOKUP HELPERS. No Mongoose, no Drizzle, no Neon, no Next imports —
// this is a Phase-0 contract publisher that the whole fleet imports.

/** Catalog version. Bump when fields are added/renamed so consumers can gate. */
export const DATA_DICTIONARY_VERSION = "2026-06-25.1" as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** The RESO resources this catalog describes. */
export type ResoResource = "Property" | "Member" | "Office" | "Media";

/**
 * The TS-level type of a field's DTO value. This is the abstract type the
 * adapter/DTO uses; `pgType` carries the concrete Postgres column type.
 */
export type ResoFieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date" // ISO-8601 timestamp / timestamptz
  | "enum"
  | "geography" // PostGIS geometry(Point,4326)
  | "json"; // jsonb

/** One field in a resource's catalog. */
export interface ResoField {
  /** camelCase TS/DTO field name (build_plan §3.4). Unique within a resource. */
  readonly name: string;
  /** PascalCase RESO Data Dictionary source name. Hand-mapped, never derived. */
  readonly resoName: string;
  /** snake_case Postgres column name. Hand-mapped, never derived. */
  readonly pgColumn: string;
  /** Concrete Postgres column type (consumed by the DDL generator, Agent 04). */
  readonly pgType: string;
  /** Abstract TS/DTO type. */
  readonly type: ResoFieldType;
  /** Whether the column is nullable. Attribution fields are NOT nullable. */
  readonly nullable: boolean;
  /** Whether the field is REQUIRED on every serving surface (§3.8 attribution). */
  readonly required: boolean;
  /** Whether the column carries an index (or participates in a compound one). */
  readonly indexed: boolean;
  /** Allowed values for an `enum` field. Present iff `type === "enum"`. */
  readonly enumValues?: readonly string[];
  /** One-line human note (surfaced in the generated markdown doc). */
  readonly description?: string;
}

/** A resource: its primary key plus its ordered field catalog. */
export interface ResoResourceDef {
  readonly resource: ResoResource;
  /** Postgres table name (snake_case, singular). */
  readonly table: string;
  /** The `name` of the primary-key field within `fields`. */
  readonly primaryKey: string;
  readonly fields: readonly ResoField[];
}

// -----------------------------------------------------------------------------
// Field-builder helpers (keep the catalog terse and consistent)
// -----------------------------------------------------------------------------

type FieldOverrides = Partial<Omit<ResoField, "name" | "resoName" | "pgColumn">>;

function field(
  name: string,
  resoName: string,
  pgColumn: string,
  type: ResoFieldType,
  overrides: FieldOverrides = {},
): ResoField {
  return {
    name,
    resoName,
    pgColumn,
    type,
    pgType: overrides.pgType ?? defaultPgType(type),
    nullable: overrides.nullable ?? true,
    required: overrides.required ?? false,
    indexed: overrides.indexed ?? false,
    ...(overrides.enumValues ? { enumValues: overrides.enumValues } : {}),
    ...(overrides.description ? { description: overrides.description } : {}),
  };
}

function defaultPgType(type: ResoFieldType): string {
  switch (type) {
    case "string":
    case "enum":
      return "text";
    case "number":
      return "double precision";
    case "integer":
      return "integer";
    case "boolean":
      return "boolean";
    case "date":
      return "timestamptz";
    case "geography":
      return "geometry(Point,4326)";
    case "json":
      return "jsonb";
    default: {
      // exhaustiveness guard
      const _never: never = type;
      throw new Error(`unhandled field type: ${String(_never)}`);
    }
  }
}

// -----------------------------------------------------------------------------
// Property (listings) — the RESO `Property` resource
// -----------------------------------------------------------------------------
//
// Grounded in src/models/unified-listing.ts. The dual bed/bath columns are kept
// (the adapter collapses them, build_plan §6.3). `standardStatus` is an enum.
// The attribution block (§3.8) is REQUIRED + NOT NULL.

const PROPERTY_FIELDS: readonly ResoField[] = [
  // --- identity ---
  field("listingKey", "ListingKey", "listing_key", "string", {
    nullable: false,
    indexed: true,
    description: "Unique MLS listing key (primary key).",
  }),
  field("listingId", "ListingId", "listing_id", "string", { indexed: true }),
  field("slug", "Slug", "slug", "string", {
    nullable: false,
    indexed: true,
    description: "URL slug derived at sync time.",
  }),
  field("slugAddress", "SlugAddress", "slug_address", "string", { indexed: true }),

  // --- MLS provenance ---
  field("mlsSource", "OriginatingSystemName", "mls_source", "string", {
    nullable: false,
    indexed: true,
    description: "Human-readable MLS name (GPS, CRMLS, …).",
  }),
  field("mlsId", "OriginatingSystemID", "mls_id", "string", {
    nullable: false,
    indexed: true,
  }),

  // --- classification ---
  field("propertyType", "PropertyType", "property_type", "string", {
    indexed: true,
    description: "Normalized bucket A=sale, B=rental, C=multifamily, D=land.",
  }),
  field("propertySubType", "PropertySubType", "property_sub_type", "string"),
  field("standardStatus", "StandardStatus", "standard_status", "enum", {
    indexed: true,
    enumValues: [
      "Active",
      "ActiveUnderContract",
      "Pending",
      "Closed",
      "Expired",
      "Canceled",
      "Withdrawn",
      "ComingSoon",
      "Hold",
      "Delete",
      "Incomplete",
    ],
    description: "RESO standard status enum.",
  }),

  // --- price ---
  field("listPrice", "ListPrice", "list_price", "number", {
    indexed: true,
    description: "List price. For propertyType B (rental) this doubles as monthly rent.",
  }),
  field("currentPrice", "ListPrice", "current_price", "number"),
  field("originalListPrice", "OriginalListPrice", "original_list_price", "number"),

  // --- facts (dual bed/bath columns kept; adapter collapses) ---
  field("bedroomsTotal", "BedroomsTotal", "bedrooms_total", "integer", { indexed: true }),
  field("bedsTotal", "BedsTotal", "beds_total", "integer", {
    indexed: true,
    description: "Legacy dual of bedroomsTotal; adapter OR-collapses the two.",
  }),
  field("bathroomsTotalInteger", "BathroomsTotalInteger", "bathrooms_total_integer", "integer", {
    indexed: true,
  }),
  field("bathroomsFull", "BathroomsFull", "bathrooms_full", "integer"),
  field("bathroomsHalf", "BathroomsHalf", "bathrooms_half", "integer"),
  field("bathroomsTotalDecimal", "BathroomsTotalDecimal", "bathrooms_total_decimal", "number"),
  field("livingArea", "LivingArea", "living_area", "number"),
  field("buildingAreaTotal", "BuildingAreaTotal", "building_area_total", "number"),
  field("yearBuilt", "YearBuilt", "year_built", "integer", { indexed: true }),
  field("lotSizeSqft", "LotSizeSquareFeet", "lot_size_sqft", "number"),
  field("lotSizeAcres", "LotSizeAcres", "lot_size_acres", "number"),

  // --- amenities (canonical YN; sync normalizes the poolYn/poolYN/pool soup) ---
  field("poolYN", "PoolPrivateYN", "pool_yn", "boolean", {
    indexed: true,
    description:
      "Canonical pool flag. Sync MUST normalize poolYn/poolYN/pool to this one column (build_plan §6.5 — Beverly Hills 0%-vs-73% defect).",
  }),
  field("spaYN", "SpaYN", "spa_yn", "boolean"),
  field("viewYN", "ViewYN", "view_yn", "boolean"),
  field("view", "View", "view", "string", {
    description: 'Reserved word — quoted as "view" in DDL (Agent 04).',
  }),
  field("garageSpaces", "GarageSpaces", "garage_spaces", "integer"),
  field("stories", "Stories", "stories", "integer"),
  field("seniorCommunityYN", "SeniorCommunityYN", "senior_community_yn", "boolean"),

  // --- location ---
  field("unparsedAddress", "UnparsedAddress", "unparsed_address", "string", {
    indexed: true,
    description: "Full street address; pg_trgm GIN index backs street resolve.",
  }),
  field("streetName", "StreetName", "street_name", "string"),
  field("streetNumber", "StreetNumber", "street_number", "string"),
  field("city", "City", "city", "string", { indexed: true }),
  field("subdivisionName", "SubdivisionName", "subdivision_name", "string", { indexed: true }),
  field("stateOrProvince", "StateOrProvince", "state_or_province", "string"),
  field("postalCode", "PostalCode", "postal_code", "string", { indexed: true }),
  field("countyOrParish", "CountyOrParish", "county_or_parish", "string"),
  field("latitude", "Latitude", "latitude", "number"),
  field("longitude", "Longitude", "longitude", "number"),
  field("geom", "Geom", "geom", "geography", {
    indexed: true,
    description: "PostGIS point (GiST indexed). Derived from longitude/latitude at sync time.",
  }),

  // --- market timing ---
  field("onMarketDate", "OnMarketDate", "on_market_date", "date", {
    indexed: true,
    description:
      "On-market timestamp. The Mongo path stores this as an ISO string and compares lexically (StrRange trap); Postgres stores a real timestamptz.",
  }),
  field("daysOnMarket", "DaysOnMarket", "days_on_market", "integer"),
  field("cumulativeDaysOnMarket", "CumulativeDaysOnMarket", "cumulative_days_on_market", "integer"),
  field("modificationTimestamp", "ModificationTimestamp", "modification_timestamp", "date", {
    indexed: true,
    description: "Sync watermark source (build_plan §6.8).",
  }),
  field("priceChangeTimestamp", "PriceChangeTimestamp", "price_change_timestamp", "date", {
    indexed: true,
  }),

  // --- media + remarks ---
  field("primaryPhotoUrl", "PrimaryPhotoUrl", "primary_photo_url", "string"),
  field("publicRemarks", "PublicRemarks", "public_remarks", "string"),

  // --- ATTRIBUTION (REQUIRED — IDX display rule §3.8, NOT NULL) ---
  field("listAgentName", "ListAgentFullName", "list_agent_name", "string", {
    nullable: false,
    required: true,
    description:
      "ATTRIBUTION (§3.8). From ListAgentFullName. Required on every listing surface.",
  }),
  field("listAgentMlsId", "ListAgentMlsId", "list_agent_mls_id", "string"),
  field("listAgentPreferredPhone", "ListAgentPreferredPhone", "list_agent_preferred_phone", "string", {
    required: true,
    description: "ATTRIBUTION (§3.8). Listing agent phone where the surface allows.",
  }),
  field("listOfficeName", "ListOfficeName", "list_office_name", "string", {
    nullable: false,
    required: true,
    description: "ATTRIBUTION (§3.8). From ListOfficeName. Required on every listing surface.",
  }),
  field("listOfficeMlsId", "ListOfficeMlsId", "list_office_mls_id", "string"),
  field("listOfficePhone", "ListOfficePhone", "list_office_phone", "string", {
    required: true,
    description: "ATTRIBUTION (§3.8). Listing brokerage phone where the surface allows.",
  }),

  // --- pre-computed / freeform ---
  field("cmaStats", "CmaStats", "cma_stats", "json", {
    description: "Pre-computed listing-level CMA (cron-written).",
  }),
  field("cashflowStats", "CashflowStats", "cashflow_stats", "json", {
    description: "Pre-computed rental cash-flow scenarios (cron-written).",
  }),
  field("extras", "Extras", "extras", "json", {
    description: "Unmapped/custom RESO fields (GIN jsonb_path_ops indexed). Registry-validated.",
  }),
  field("raw", "Raw", "raw", "json", {
    description: "Raw source payload retained for debugging.",
  }),
] as const;

// -----------------------------------------------------------------------------
// Member (agent identity) — the RESO `Member` resource
// -----------------------------------------------------------------------------

const MEMBER_FIELDS: readonly ResoField[] = [
  field("memberKey", "MemberKey", "member_key", "string", {
    nullable: false,
    indexed: true,
    description: "Unique agent key (primary key).",
  }),
  field("memberMlsId", "MemberMlsId", "member_mls_id", "string", { indexed: true }),
  field("memberFullName", "MemberFullName", "member_full_name", "string", {
    description: "ATTRIBUTION source — joins to Property.listAgentName.",
  }),
  field("memberFirstName", "MemberFirstName", "member_first_name", "string"),
  field("memberLastName", "MemberLastName", "member_last_name", "string"),
  field("memberEmail", "MemberEmail", "member_email", "string"),
  field("memberPreferredPhone", "MemberPreferredPhone", "member_preferred_phone", "string"),
  field("memberType", "MemberType", "member_type", "string"),
  field("officeMlsId", "OfficeMlsId", "office_mls_id", "string", {
    indexed: true,
    description: "Foreign key to Office.officeMlsId.",
  }),
  field("modificationTimestamp", "ModificationTimestamp", "modification_timestamp", "date", {
    indexed: true,
  }),
  field("extras", "Extras", "extras", "json", {
    description: "Unmapped fields (GIN indexed).",
  }),
] as const;

// -----------------------------------------------------------------------------
// Office (brokerage identity) — the RESO `Office` resource
// -----------------------------------------------------------------------------

const OFFICE_FIELDS: readonly ResoField[] = [
  field("officeKey", "OfficeKey", "office_key", "string", {
    nullable: false,
    indexed: true,
    description: "Unique office key (primary key).",
  }),
  field("officeMlsId", "OfficeMlsId", "office_mls_id", "string", { indexed: true }),
  field("officeName", "OfficeName", "office_name", "string", {
    description: "ATTRIBUTION source — joins to Property.listOfficeName.",
  }),
  field("officePhone", "OfficePhone", "office_phone", "string"),
  field("officeEmail", "OfficeEmail", "office_email", "string"),
  field("officeAddress1", "OfficeAddress1", "office_address1", "string"),
  field("officeCity", "OfficeCity", "office_city", "string"),
  field("officeStateOrProvince", "OfficeStateOrProvince", "office_state_or_province", "string"),
  field("officePostalCode", "OfficePostalCode", "office_postal_code", "string"),
  field("modificationTimestamp", "ModificationTimestamp", "modification_timestamp", "date", {
    indexed: true,
  }),
  field("extras", "Extras", "extras", "json", {
    description: "Unmapped fields (GIN indexed).",
  }),
] as const;

// -----------------------------------------------------------------------------
// Media (photos) — the RESO `Media` resource
// -----------------------------------------------------------------------------

const MEDIA_FIELDS: readonly ResoField[] = [
  field("mediaKey", "MediaKey", "media_key", "string", {
    nullable: false,
    indexed: true,
    description: "Unique media key (primary key).",
  }),
  field("resourceRecordKey", "ResourceRecordKey", "resource_record_key", "string", {
    indexed: true,
    description: "Foreign key to Property.listingKey.",
  }),
  field("mediaUrl", "MediaURL", "media_url", "string", {
    description: "Source media URL.",
  }),
  field("mediaType", "MediaType", "media_type", "string"),
  field("mediaCategory", "MediaCategory", "media_category", "string"),
  field("order", "Order", "media_order", "integer", {
    description: 'RESO field is "Order" (reserved word) — column renamed media_order in DDL.',
  }),
  field("caption", "ShortDescription", "caption", "string"),
  field("imageWidth", "ImageWidth", "image_width", "integer"),
  field("imageHeight", "ImageHeight", "image_height", "integer"),
  field("modificationTimestamp", "ModificationTimestamp", "modification_timestamp", "date", {
    indexed: true,
  }),
  field("extras", "Extras", "extras", "json", {
    description: "Unmapped fields (GIN indexed).",
  }),
] as const;

// -----------------------------------------------------------------------------
// The catalog
// -----------------------------------------------------------------------------

export const RESOURCES: Readonly<Record<ResoResource, ResoResourceDef>> = {
  Property: {
    resource: "Property",
    table: "property",
    primaryKey: "listingKey",
    fields: PROPERTY_FIELDS,
  },
  Member: {
    resource: "Member",
    table: "member",
    primaryKey: "memberKey",
    fields: MEMBER_FIELDS,
  },
  Office: {
    resource: "Office",
    table: "office",
    primaryKey: "officeKey",
    fields: OFFICE_FIELDS,
  },
  Media: {
    resource: "Media",
    table: "media",
    primaryKey: "mediaKey",
    fields: MEDIA_FIELDS,
  },
} as const;

/** All resource names, in catalog order. */
export const RESOURCE_NAMES: readonly ResoResource[] = [
  "Property",
  "Member",
  "Office",
  "Media",
] as const;

// -----------------------------------------------------------------------------
// Lookup helpers
// -----------------------------------------------------------------------------

/** Return a resource definition, or `undefined` for an unknown resource. */
export function getResource(resource: ResoResource): ResoResourceDef | undefined {
  return RESOURCES[resource];
}

/**
 * Resolve a single field by its camelCase `name`, its PascalCase `resoName`, or
 * its snake_case `pgColumn` within a resource. Returns `undefined` on miss.
 *
 * Accepting all three casings is intentional: the sync mapper looks up by
 * `resoName`, the DDL generator by `name`, the OData layer by `resoName`, and
 * raw-SQL consumers by `pgColumn`.
 */
export function getField(resource: ResoResource, nameOrResoOrColumn: string): ResoField | undefined {
  const def = RESOURCES[resource];
  if (!def) return undefined;
  return def.fields.find(
    (f) =>
      f.name === nameOrResoOrColumn ||
      f.resoName === nameOrResoOrColumn ||
      f.pgColumn === nameOrResoOrColumn,
  );
}

/** All fields for a resource (empty array for an unknown resource). */
export function getFields(resource: ResoResource): readonly ResoField[] {
  return RESOURCES[resource]?.fields ?? [];
}

/** The REQUIRED attribution/serving fields for a resource (§3.8). */
export function getRequiredFields(resource: ResoResource): readonly ResoField[] {
  return getFields(resource).filter((f) => f.required);
}

/** The indexed fields for a resource (consumed by the DDL generator). */
export function getIndexedFields(resource: ResoResource): readonly ResoField[] {
  return getFields(resource).filter((f) => f.indexed);
}

/** Map a PascalCase RESO source name to its camelCase DTO field name. */
export function resoNameToFieldName(resource: ResoResource, resoName: string): string | undefined {
  return getFields(resource).find((f) => f.resoName === resoName)?.name;
}

/** Map a camelCase DTO field name to its snake_case Postgres column. */
export function fieldNameToColumn(resource: ResoResource, name: string): string | undefined {
  return getFields(resource).find((f) => f.name === name)?.pgColumn;
}
