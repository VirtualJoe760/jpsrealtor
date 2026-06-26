// src/lib/db/schema/neighborhoods.ts
//
// Drizzle table definitions for the neighborhoods subsystem (build_plan §8.2).
// These mirror `src/lib/reso/migrations/0003_neighborhoods.sql` EXACTLY — the
// migration is the authoritative DDL applied at provision time; these Drizzle
// defs exist so the adapter, drizzle-kit, and any raw-SQL consumer all
// reference the same table objects and cannot drift.
//
// The hierarchy is Region → County → City → Subdivision (+ POIs + the curated
// community_facts + the nightly-cron CMA blob). Ported from the Mongo models
// `src/models/{regions,counties,cities,subdivisions,LocationIndex,
// PointOfInterest,community-facts}.ts`. The strict cma_* tables follow the
// read-only spike docs/chatrealty-api/spike-cmastats-schema.md verbatim.
//
// KEY POINTS (mirror the SQL):
//   • PostGIS `geom geometry(Point,4326)` on cities / subdivisions /
//     pointsOfInterest (declared via a customType — Drizzle has no native
//     PostGIS type; the adapter never reads the raw geom, it derives lat/lng and
//     runs ST_* in raw SQL). GiST indexes emitted via `index(...).using("gist")`.
//   • subdivisions: COMPOSITE UNIQUE (slug, city) — slugs collide across cities.
//   • subdivisions.source: 'mls' | 'derived' (default 'mls') — Claude-derived
//     subdivisions are stamped 'derived'.
//   • CMA ratio fields are numeric(6,4) FRACTIONS (NOT int percents).
//   • Listings link by string name (subdivision_name + city) — NO FK to here.

import {
  pgTable,
  bigint,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  customType,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// PostGIS geometry(Point,4326) custom type + text[] helper
// -----------------------------------------------------------------------------
//
// Mirrors the `geometryPoint` type in listings.ts: a custom type whose SQL data
// type is `geometry(Point,4326)` so drizzle-kit emits the right DDL and
// introspection lines up. The TS value is opaque (WKT/WKB hex); the adapter
// never reads it directly.

const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point,4326)";
  },
});

// `text[]` for the array columns (features / keywords / mls_sources / aliases /
// types / hours / quality_notes / alternate_names).
const textArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return "text[]";
  },
});

// `bigint GENERATED ALWAYS AS IDENTITY` surrogate PK. Drizzle's
// `.generatedAlwaysAsIdentity()` emits the matching DDL; `bigint({ mode })` is
// "number" so the JS value is a number (counts/ids fit in safe-int range here).
const identityPk = () =>
  bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey();

// -----------------------------------------------------------------------------
// regions — top of the hierarchy
// -----------------------------------------------------------------------------

export const regions = pgTable(
  "regions",
  {
    id: identityPk(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    normalizedName: text("normalized_name").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    polygon: jsonb("polygon"),

    listingCount: integer("listing_count").notNull().default(0),
    countyCount: integer("county_count").notNull().default(0),
    cityCount: integer("city_count").notNull().default(0),
    priceMin: numeric("price_min", { precision: 14, scale: 2 }),
    priceMax: numeric("price_max", { precision: 14, scale: 2 }),
    avgPrice: numeric("avg_price", { precision: 14, scale: 2 }),
    medianPrice: numeric("median_price", { precision: 14, scale: 2 }),

    propertyTypes: jsonb("property_types"),
    topCounties: jsonb("top_counties"),

    description: text("description"),
    photo: text("photo"),
    features: textArray("features"),
    keywords: textArray("keywords"),

    mlsSources: textArray("mls_sources"),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxNormalizedName: index("idx_regions_normalized_name").on(t.normalizedName),
    idxListingCount: index("idx_regions_listing_count").on(t.listingCount.desc()),
  }),
);

// -----------------------------------------------------------------------------
// counties — Region → County
// -----------------------------------------------------------------------------

export const counties = pgTable(
  "counties",
  {
    id: identityPk(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    normalizedName: text("normalized_name").notNull(),

    region: text("region").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    listingCount: integer("listing_count").notNull().default(0),
    cityCount: integer("city_count").notNull().default(0),
    priceMin: numeric("price_min", { precision: 14, scale: 2 }),
    priceMax: numeric("price_max", { precision: 14, scale: 2 }),
    avgPrice: numeric("avg_price", { precision: 14, scale: 2 }),
    medianPrice: numeric("median_price", { precision: 14, scale: 2 }),

    propertyTypes: jsonb("property_types"),
    topCities: jsonb("top_cities"),

    description: text("description"),
    photo: text("photo"),
    features: textArray("features"),
    keywords: textArray("keywords"),

    mlsSources: textArray("mls_sources"),
    isOcean: boolean("is_ocean").notNull().default(false),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxRegion: index("idx_counties_region").on(t.region),
    idxNormalizedName: index("idx_counties_normalized_name").on(t.normalizedName),
    idxOceanListingCount: index("idx_counties_ocean_listing_count").on(
      t.isOcean,
      t.listingCount.desc(),
    ),
  }),
);

// -----------------------------------------------------------------------------
// cities — County → City (a guaranteed tier)
// -----------------------------------------------------------------------------

export const cities = pgTable(
  "cities",
  {
    id: identityPk(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    normalizedName: text("normalized_name").notNull(),

    county: text("county").notNull(),
    region: text("region").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geom: geometryPoint("geom"),

    listingCount: integer("listing_count").notNull().default(0),
    priceMin: numeric("price_min", { precision: 14, scale: 2 }),
    priceMax: numeric("price_max", { precision: 14, scale: 2 }),
    avgPrice: numeric("avg_price", { precision: 14, scale: 2 }),
    medianPrice: numeric("median_price", { precision: 14, scale: 2 }),

    propertyTypes: jsonb("property_types"),
    subdivisionCount: integer("subdivision_count"),

    description: text("description"),
    photo: text("photo"),
    features: textArray("features"),
    keywords: textArray("keywords"),

    mlsSources: textArray("mls_sources"),
    isOcean: boolean("is_ocean").notNull().default(false),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxCountyRegion: index("idx_cities_county_region").on(t.county, t.region),
    idxNormalizedName: index("idx_cities_normalized_name").on(t.normalizedName),
    idxOceanListingCount: index("idx_cities_ocean_listing_count").on(
      t.isOcean,
      t.listingCount.desc(),
    ),
    idxGeom: index("idx_cities_geom").using("gist", t.geom),
  }),
);

// -----------------------------------------------------------------------------
// subdivisions — City → Subdivision (OPTIONAL tier; slugs collide across cities)
// -----------------------------------------------------------------------------

export const subdivisions = pgTable(
  "subdivisions",
  {
    id: identityPk(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    normalizedName: text("normalized_name").notNull(),
    // 'mls' | 'derived' — Claude-derived subdivisions stamped 'derived'.
    source: text("source").notNull().default("mls"),

    city: text("city").notNull(),
    county: text("county").notNull(),
    region: text("region").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geom: geometryPoint("geom"),

    listingCount: integer("listing_count").notNull().default(0),
    priceMin: numeric("price_min", { precision: 14, scale: 2 }),
    priceMax: numeric("price_max", { precision: 14, scale: 2 }),
    avgPrice: numeric("avg_price", { precision: 14, scale: 2 }),
    medianPrice: numeric("median_price", { precision: 14, scale: 2 }),

    propertyTypes: jsonb("property_types"),

    description: text("description"),
    photo: text("photo"),
    features: textArray("features"),
    keywords: textArray("keywords"),

    communityFeatures: text("community_features"),
    seniorCommunity: boolean("senior_community"),
    communityFacts: jsonb("community_facts"),

    mlsSources: textArray("mls_sources"),
    hasManualData: boolean("has_manual_data").notNull().default(false),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    // Composite unique — slugs collide across cities.
    uqSlugCity: uniqueIndex("subdivisions_slug_city_key").on(t.slug, t.city),
    idxRegionCity: index("idx_subdivisions_region_city").on(t.region, t.city),
    idxCountyCity: index("idx_subdivisions_county_city").on(t.county, t.city),
    idxNormalizedNameCity: index("idx_subdivisions_normalized_name_city").on(
      t.normalizedName,
      t.city,
    ),
    idxListingCount: index("idx_subdivisions_listing_count").on(t.listingCount.desc()),
    idxAvgPrice: index("idx_subdivisions_avg_price").on(t.avgPrice),
    idxSource: index("idx_subdivisions_source").on(t.source),
    idxGeom: index("idx_subdivisions_geom").using("gist", t.geom),
  }),
);

// -----------------------------------------------------------------------------
// location_index — autocomplete / center lookup across all four tiers
// -----------------------------------------------------------------------------

export const locationIndex = pgTable(
  "location_index",
  {
    id: identityPk(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    type: text("type").notNull(),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    boundsNorth: doublePrecision("bounds_north"),
    boundsSouth: doublePrecision("bounds_south"),
    boundsEast: doublePrecision("bounds_east"),
    boundsWest: doublePrecision("bounds_west"),

    city: text("city"),
    county: text("county"),
    region: text("region"),

    listingCount: integer("listing_count").notNull().default(0),
    activeListingCount: integer("active_listing_count").notNull().default(0),

    slug: text("slug"),
    aliases: textArray("aliases"),

    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxTypeNormalizedName: index("idx_location_index_type_normalized_name").on(
      t.type,
      t.normalizedName,
    ),
    idxTypeListingCount: index("idx_location_index_type_listing_count").on(
      t.type,
      t.listingCount.desc(),
    ),
    idxSlug: index("idx_location_index_slug").on(t.slug),
    idxNameTrgm: index("idx_location_index_name_trgm").using(
      "gin",
      sql`${t.normalizedName} gin_trgm_ops`,
    ),
  }),
);

// -----------------------------------------------------------------------------
// points_of_interest — cached Google Places, bounding-box queried
// -----------------------------------------------------------------------------

export const pointsOfInterest = pgTable(
  "points_of_interest",
  {
    id: identityPk(),
    placeId: text("place_id").notNull().unique(),
    name: text("name").notNull(),
    types: textArray("types"),
    category: text("category").notNull(),

    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    geom: geometryPoint("geom"),

    address: text("address"),
    city: text("city"),
    rating: numeric("rating", { precision: 3, scale: 2 }),
    userRatingsTotal: integer("user_ratings_total"),
    priceLevel: integer("price_level"),
    description: text("description"),
    phoneNumber: text("phone_number"),
    website: text("website"),
    hours: textArray("hours"),
    photoUrl: text("photo_url"),
    photoReference: text("photo_reference"),
    photoAttribution: text("photo_attribution"),
    isOpen: boolean("is_open"),
    businessStatus: text("business_status"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    region: text("region").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxCategory: index("idx_poi_category").on(t.category),
    idxCategoryRegion: index("idx_poi_category_region").on(t.category, t.region),
    idxRegion: index("idx_poi_region").on(t.region),
    idxGeom: index("idx_poi_geom").using("gist", t.geom),
  }),
);

// -----------------------------------------------------------------------------
// community_facts — curated per-community deep data (legacy CommunityFact)
// -----------------------------------------------------------------------------

export const communityFacts = pgTable(
  "community_facts",
  {
    id: identityPk(),
    communityName: text("community_name").notNull().unique(),
    alternateNames: textArray("alternate_names"),
    city: text("city").notNull(),
    type: text("type").notNull(),

    financials: jsonb("financials"),
    membership: jsonb("membership"),
    amenities: jsonb("amenities"),
    environment: jsonb("environment"),
    security: jsonb("security"),
    restrictions: jsonb("restrictions"),
    demographics: jsonb("demographics"),
    marketData: jsonb("market_data"),
    propertyDetails: jsonb("property_details"),

    description: text("description"),
    prosCons: jsonb("pros_cons"),
    bestFor: text("best_for"),

    dataSource: text("data_source"),
    lastVerified: timestamp("last_verified", { withTimezone: true }),
    needsUpdate: boolean("needs_update").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxCityType: index("idx_community_facts_city_type").on(t.city, t.type),
    idxAlternateNames: index("idx_community_facts_alternate_names").using(
      "gin",
      t.alternateNames,
    ),
  }),
);

// -----------------------------------------------------------------------------
// cma_stats — 1:1 with subdivision; nightly-cron market analytics
// -----------------------------------------------------------------------------
// Ratio columns are numeric(6,4) FRACTIONS (e.g. 0.9823), NOT int percents.

export const cmaStats = pgTable(
  "cma_stats",
  {
    subdivisionId: bigint("subdivision_id", { mode: "number" })
      .primaryKey()
      .references(() => subdivisions.id, { onDelete: "cascade" }),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    sampleWindowMonths: integer("sample_window_months"),
    sampleWindowStart: timestamp("sample_window_start", { withTimezone: true }),
    sampleWindowEnd: timestamp("sample_window_end", { withTimezone: true }),
    sampleWindowListingCap: integer("sample_window_listing_cap"),

    activeCount: integer("active_count"),
    activeMedianPrice: numeric("active_median_price", { precision: 14, scale: 2 }),
    activeAvgPrice: numeric("active_avg_price", { precision: 14, scale: 2 }),
    activeMinPrice: numeric("active_min_price", { precision: 14, scale: 2 }),
    activeMaxPrice: numeric("active_max_price", { precision: 14, scale: 2 }),
    activeMedianPpsf: numeric("active_median_ppsf", { precision: 10, scale: 2 }),
    activeAvgPpsf: numeric("active_avg_ppsf", { precision: 10, scale: 2 }),
    activeAvgDom: numeric("active_avg_dom", { precision: 8, scale: 2 }),
    activeMedianSqft: numeric("active_median_sqft", { precision: 10, scale: 2 }),
    activeAvgSqft: numeric("active_avg_sqft", { precision: 10, scale: 2 }),
    activeAvgBeds: numeric("active_avg_beds", { precision: 5, scale: 2 }),
    activeAvgBaths: numeric("active_avg_baths", { precision: 5, scale: 2 }),

    closedCount: integer("closed_count"),
    closedMedianClosePrice: numeric("closed_median_close_price", { precision: 14, scale: 2 }),
    closedAvgClosePrice: numeric("closed_avg_close_price", { precision: 14, scale: 2 }),
    closedMinClosePrice: numeric("closed_min_close_price", { precision: 14, scale: 2 }),
    closedMaxClosePrice: numeric("closed_max_close_price", { precision: 14, scale: 2 }),
    closedMedianPpsf: numeric("closed_median_ppsf", { precision: 10, scale: 2 }),
    closedAvgPpsf: numeric("closed_avg_ppsf", { precision: 10, scale: 2 }),
    closedAvgDom: numeric("closed_avg_dom", { precision: 8, scale: 2 }),
    closedSaleToListRatio: numeric("closed_sale_to_list_ratio", { precision: 6, scale: 4 }),
    closedAvgPriceReductionPct: numeric("closed_avg_price_reduction_pct", { precision: 6, scale: 4 }),
    closedSampleStart: timestamp("closed_sample_start", { withTimezone: true }),
    closedSampleEnd: timestamp("closed_sample_end", { withTimezone: true }),

    absorptionRate: numeric("absorption_rate", { precision: 8, scale: 4 }),

    qualityConfidence: text("quality_confidence"),
    qualityNotes: textArray("quality_notes"),

    narrative: text("narrative"),
    narrativeGeneratedAt: timestamp("narrative_generated_at", { withTimezone: true }),

    // old-schema compatibility (deprecated readers); drop when retired.
    profile: jsonb("profile"),
    totals: jsonb("totals"),

    subdivisionProfile: jsonb("subdivision_profile"),
    trends: jsonb("trends"),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxActiveCount: index("idx_cma_stats_active_count").on(t.activeCount),
  }),
);

// -----------------------------------------------------------------------------
// cma_stats_by_subtype — 1:N (both interface + CmaSubTypeBreakdown shapes)
// -----------------------------------------------------------------------------

export const cmaStatsBySubtype = pgTable(
  "cma_stats_by_subtype",
  {
    id: identityPk(),
    subdivisionId: bigint("subdivision_id", { mode: "number" })
      .notNull()
      .references(() => subdivisions.id, { onDelete: "cascade" }),
    subType: text("sub_type").notNull(),
    count: integer("count"),
    avgPrice: numeric("avg_price", { precision: 14, scale: 2 }),
    avgPpsf: numeric("avg_ppsf", { precision: 10, scale: 2 }),
    activeCount: integer("active_count"),
    closedCount: integer("closed_count"),
    medianSalePrice: numeric("median_sale_price", { precision: 14, scale: 2 }),
    avgSalePpsf: numeric("avg_sale_ppsf", { precision: 10, scale: 2 }),
    avgDom: numeric("avg_dom", { precision: 8, scale: 2 }),
    avgSaleToListRatio: numeric("avg_sale_to_list_ratio", { precision: 6, scale: 4 }),
    sampleStart: timestamp("sample_start", { withTimezone: true }),
    sampleEnd: timestamp("sample_end", { withTimezone: true }),
  },
  (t) => ({
    uqSubdivisionSubType: uniqueIndex("cma_stats_by_subtype_subdivision_id_sub_type_key").on(
      t.subdivisionId,
      t.subType,
    ),
    idxSubdivision: index("idx_cma_stats_by_subtype_subdivision").on(t.subdivisionId),
  }),
);

// -----------------------------------------------------------------------------
// cma_top_comps — 1:N (new topActive/topClosed + old flat topComps)
// -----------------------------------------------------------------------------

export const cmaTopComps = pgTable(
  "cma_top_comps",
  {
    id: identityPk(),
    subdivisionId: bigint("subdivision_id", { mode: "number" })
      .notNull()
      .references(() => subdivisions.id, { onDelete: "cascade" }),
    compKind: text("comp_kind").notNull(),
    position: integer("position"),
    listingKey: text("listing_key"),
    address: text("address"),
    slugAddress: text("slug_address"),
    propertySubType: text("property_sub_type"),
    closeDate: timestamp("close_date", { withTimezone: true }),
    closePrice: numeric("close_price", { precision: 14, scale: 2 }),
    listPrice: numeric("list_price", { precision: 14, scale: 2 }),
    originalListPrice: numeric("original_list_price", { precision: 14, scale: 2 }),
    salePpsf: numeric("sale_ppsf", { precision: 10, scale: 2 }),
    saleToListRatio: numeric("sale_to_list_ratio", { precision: 6, scale: 4 }),
    livingArea: numeric("living_area", { precision: 10, scale: 2 }),
    bedsTotal: numeric("beds_total", { precision: 5, scale: 2 }),
    bathsTotal: numeric("baths_total", { precision: 5, scale: 2 }),
    yearBuilt: integer("year_built"),
    garageSpaces: numeric("garage_spaces", { precision: 5, scale: 2 }),
    daysOnMarket: integer("days_on_market"),
    extras: jsonb("extras"),
  },
  (t) => ({
    idxLookup: index("idx_cma_top_comps_lookup").on(
      t.subdivisionId,
      t.compKind,
      t.position,
    ),
  }),
);

// -----------------------------------------------------------------------------
// subdivision_rent_stats — 1:1 (the rentStats going-rate blob)
// -----------------------------------------------------------------------------

export const subdivisionRentStats = pgTable("subdivision_rent_stats", {
  subdivisionId: bigint("subdivision_id", { mode: "number" })
    .primaryKey()
    .references(() => subdivisions.id, { onDelete: "cascade" }),
  goingRate: numeric("going_rate", { precision: 12, scale: 2 }),
  qualityConfidence: text("quality_confidence"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }),
  payload: jsonb("payload").notNull(),
});

// -----------------------------------------------------------------------------
// Inferred row types
// -----------------------------------------------------------------------------

export type RegionRow = typeof regions.$inferSelect;
export type CountyRow = typeof counties.$inferSelect;
export type CityRow = typeof cities.$inferSelect;
export type SubdivisionRow = typeof subdivisions.$inferSelect;
export type LocationIndexRow = typeof locationIndex.$inferSelect;
export type PointOfInterestRow = typeof pointsOfInterest.$inferSelect;
export type CommunityFactRow = typeof communityFacts.$inferSelect;
export type CmaStatsRow = typeof cmaStats.$inferSelect;
export type CmaStatsBySubtypeRow = typeof cmaStatsBySubtype.$inferSelect;
export type CmaTopCompRow = typeof cmaTopComps.$inferSelect;
export type SubdivisionRentStatsRow = typeof subdivisionRentStats.$inferSelect;
