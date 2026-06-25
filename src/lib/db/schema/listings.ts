// src/lib/db/schema/listings.ts
//
// Agent 09 — Drizzle table definitions for the RESO `Property` / `Member` /
// `Office` / `Media` resources (Spec 3 Task B).
//
// THESE TABLES MUST EXACTLY MIRROR THE LIVE SCHEMA emitted by
// `src/lib/reso/ddl.ts` → `src/lib/reso/migrations/0001_init.sql` (Agent 04).
// The migration is the source of truth that runs at tenant-provision time;
// these Drizzle definitions are the typed view of those same tables that the
// Postgres adapter (`postgres-adapter.ts`) reads through and that `drizzle-kit`
// introspects/generates against. Column NAMES and TYPES are copied straight
// from the catalog (`data-dictionary.ts`) so the three never drift:
//
//   • column name  → `pgColumn`  (snake_case)
//   • column type  → `pgType`    (the concrete Postgres type)
//   • TS field key  → `name`      (camelCase — the Drizzle property name)
//
// SPECIAL COLUMNS (build_plan §6.3):
//   • geom            → PostGIS `geometry(Point,4326)` — Drizzle has no native
//                       PostGIS type, so it's declared via a `customType` that
//                       maps to the `geometry(Point,4326)` SQL type. The adapter
//                       never SELECTs the raw geom blob; it derives lat/lng and
//                       runs ST_* predicates in raw SQL.
//   • on_market_date  → real `timestamptz` (NOT a string — the Mongo
//                       string-vs-Date trap does not exist on the Postgres path).
//   • extras / raw / cma_stats / cashflow_stats → `jsonb`.
//   • dual bed/bath columns (bedrooms_total / beds_total,
//     bathrooms_total_integer / baths_total*) are BOTH kept; the adapter
//     OR-collapses them.
//   • "view" is a reserved word — Drizzle quotes the SQL name automatically.
//
// `list_agent_name` and `list_office_name` are NOT NULL here, mirroring the
// attribution invariant (§3.8) baked into the DDL.

import {
  pgTable,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  jsonb,
  customType,
  index,
} from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// PostGIS geometry custom type
// -----------------------------------------------------------------------------
//
// Drizzle ships no first-class PostGIS column. We declare a custom type whose
// SQL data type is `geometry(Point,4326)` so `drizzle-kit` emits the right DDL
// and introspection lines up with the live column. The TS-side value is opaque
// (`string` — WKT/WKB hex); the adapter NEVER reads it directly. It derives
// latitude/longitude from the dedicated numeric columns and uses ST_* functions
// in raw SQL for spatial predicates, so this type only needs to exist for the
// column definition to round-trip — it is not a read surface.

const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point,4326)";
  },
});

// -----------------------------------------------------------------------------
// property — the RESO Property resource
// -----------------------------------------------------------------------------

export const property = pgTable(
  "property",
  {
    // --- identity ---
    listingKey: text("listing_key").primaryKey(),
    listingId: text("listing_id"),
    slug: text("slug").notNull(),
    slugAddress: text("slug_address"),

    // --- MLS provenance ---
    mlsSource: text("mls_source").notNull(),
    mlsId: text("mls_id").notNull(),

    // --- classification ---
    propertyType: text("property_type"),
    propertySubType: text("property_sub_type"),
    standardStatus: text("standard_status"),

    // --- price ---
    listPrice: doublePrecision("list_price"),
    currentPrice: doublePrecision("current_price"),
    originalListPrice: doublePrecision("original_list_price"),

    // --- facts (dual bed/bath columns kept; adapter collapses) ---
    bedroomsTotal: integer("bedrooms_total"),
    bedsTotal: integer("beds_total"),
    bathroomsTotalInteger: integer("bathrooms_total_integer"),
    bathroomsFull: integer("bathrooms_full"),
    bathroomsHalf: integer("bathrooms_half"),
    bathroomsTotalDecimal: doublePrecision("bathrooms_total_decimal"),
    livingArea: doublePrecision("living_area"),
    buildingAreaTotal: doublePrecision("building_area_total"),
    yearBuilt: integer("year_built"),
    lotSizeSqft: doublePrecision("lot_size_sqft"),
    lotSizeAcres: doublePrecision("lot_size_acres"),

    // --- amenities (canonical YN) ---
    poolYN: boolean("pool_yn"),
    spaYN: boolean("spa_yn"),
    viewYN: boolean("view_yn"),
    view: text("view"), // reserved word — Drizzle quotes it in SQL
    garageSpaces: integer("garage_spaces"),
    stories: integer("stories"),
    seniorCommunityYN: boolean("senior_community_yn"),

    // --- location ---
    unparsedAddress: text("unparsed_address"),
    streetName: text("street_name"),
    streetNumber: text("street_number"),
    city: text("city"),
    subdivisionName: text("subdivision_name"),
    stateOrProvince: text("state_or_province"),
    postalCode: text("postal_code"),
    countyOrParish: text("county_or_parish"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geom: geometryPoint("geom"),

    // --- market timing (real timestamptz — no string trap on Postgres) ---
    onMarketDate: timestamp("on_market_date", { withTimezone: true }),
    daysOnMarket: integer("days_on_market"),
    cumulativeDaysOnMarket: integer("cumulative_days_on_market"),
    modificationTimestamp: timestamp("modification_timestamp", { withTimezone: true }),
    priceChangeTimestamp: timestamp("price_change_timestamp", { withTimezone: true }),

    // --- media + remarks ---
    primaryPhotoUrl: text("primary_photo_url"),
    publicRemarks: text("public_remarks"),

    // --- ATTRIBUTION (NOT NULL — IDX display rule §3.8) ---
    listAgentName: text("list_agent_name").notNull(),
    listAgentMlsId: text("list_agent_mls_id"),
    listAgentPreferredPhone: text("list_agent_preferred_phone"),
    listOfficeName: text("list_office_name").notNull(),
    listOfficeMlsId: text("list_office_mls_id"),
    listOfficePhone: text("list_office_phone"),

    // --- pre-computed / freeform jsonb ---
    cmaStats: jsonb("cma_stats"),
    cashflowStats: jsonb("cashflow_stats"),
    extras: jsonb("extras"),
    raw: jsonb("raw"),
  },
  (t) => ({
    // Single-column indexes mirrored from 0001_init.sql (the ones the adapter's
    // predicates actually use). drizzle-kit emits these; the live DB already has
    // them, so generate is a no-op against the provisioned schema.
    idxListingId: index("idx_property_listing_id").on(t.listingId),
    idxSlug: index("idx_property_slug").on(t.slug),
    idxSlugAddress: index("idx_property_slug_address").on(t.slugAddress),
    idxMlsSource: index("idx_property_mls_source").on(t.mlsSource),
    idxMlsId: index("idx_property_mls_id").on(t.mlsId),
    idxPropertyType: index("idx_property_property_type").on(t.propertyType),
    idxStandardStatus: index("idx_property_standard_status").on(t.standardStatus),
    idxListPrice: index("idx_property_list_price").on(t.listPrice),
    idxBedroomsTotal: index("idx_property_bedrooms_total").on(t.bedroomsTotal),
    idxBedsTotal: index("idx_property_beds_total").on(t.bedsTotal),
    idxBathsInt: index("idx_property_bathrooms_total_integer").on(t.bathroomsTotalInteger),
    idxYearBuilt: index("idx_property_year_built").on(t.yearBuilt),
    idxPoolYn: index("idx_property_pool_yn").on(t.poolYN),
    idxUnparsedAddress: index("idx_property_unparsed_address").on(t.unparsedAddress),
    idxCity: index("idx_property_city").on(t.city),
    idxSubdivisionName: index("idx_property_subdivision_name").on(t.subdivisionName),
    idxPostalCode: index("idx_property_postal_code").on(t.postalCode),
    idxOnMarketDate: index("idx_property_on_market_date").on(t.onMarketDate),
    idxModificationTs: index("idx_property_modification_timestamp").on(t.modificationTimestamp),
    idxPriceChangeTs: index("idx_property_price_change_timestamp").on(t.priceChangeTimestamp),
  }),
);

// -----------------------------------------------------------------------------
// member — the RESO Member resource (agent identity / attribution source)
// -----------------------------------------------------------------------------

export const member = pgTable(
  "member",
  {
    memberKey: text("member_key").primaryKey(),
    memberMlsId: text("member_mls_id"),
    memberFullName: text("member_full_name"),
    memberFirstName: text("member_first_name"),
    memberLastName: text("member_last_name"),
    memberEmail: text("member_email"),
    memberPreferredPhone: text("member_preferred_phone"),
    memberType: text("member_type"),
    officeMlsId: text("office_mls_id"),
    modificationTimestamp: timestamp("modification_timestamp", { withTimezone: true }),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxMemberMlsId: index("idx_member_member_mls_id").on(t.memberMlsId),
    idxOfficeMlsId: index("idx_member_office_mls_id").on(t.officeMlsId),
    idxModificationTs: index("idx_member_modification_timestamp").on(t.modificationTimestamp),
  }),
);

// -----------------------------------------------------------------------------
// office — the RESO Office resource (brokerage identity / attribution source)
// -----------------------------------------------------------------------------

export const office = pgTable(
  "office",
  {
    officeKey: text("office_key").primaryKey(),
    officeMlsId: text("office_mls_id"),
    officeName: text("office_name"),
    officePhone: text("office_phone"),
    officeEmail: text("office_email"),
    officeAddress1: text("office_address1"),
    officeCity: text("office_city"),
    officeStateOrProvince: text("office_state_or_province"),
    officePostalCode: text("office_postal_code"),
    modificationTimestamp: timestamp("modification_timestamp", { withTimezone: true }),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxOfficeMlsId: index("idx_office_office_mls_id").on(t.officeMlsId),
    idxModificationTs: index("idx_office_modification_timestamp").on(t.modificationTimestamp),
  }),
);

// -----------------------------------------------------------------------------
// media — the RESO Media resource (photos)
// -----------------------------------------------------------------------------
//
// The RESO `Order` field is reserved-word-renamed to the `media_order` column
// in the catalog/DDL; the Drizzle property is `order` (camelCase `name`), the
// SQL column is `media_order`.

export const media = pgTable(
  "media",
  {
    mediaKey: text("media_key").primaryKey(),
    resourceRecordKey: text("resource_record_key"),
    mediaUrl: text("media_url"),
    mediaType: text("media_type"),
    mediaCategory: text("media_category"),
    order: integer("media_order"),
    caption: text("caption"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    modificationTimestamp: timestamp("modification_timestamp", { withTimezone: true }),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxResourceRecordKey: index("idx_media_resource_record_key").on(t.resourceRecordKey),
    idxModificationTs: index("idx_media_modification_timestamp").on(t.modificationTimestamp),
  }),
);

// -----------------------------------------------------------------------------
// Inferred row types
// -----------------------------------------------------------------------------

export type PropertyRow = typeof property.$inferSelect;
export type MemberRow = typeof member.$inferSelect;
export type OfficeRow = typeof office.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
