-- ============================================================================
-- ChatRealty per-tenant data-plane schema — migration 0003_neighborhoods
--
-- The neighborhoods subsystem (build_plan §8.2): a fast, pre-aggregated
-- Region → County → City → Subdivision hierarchy + POIs + the nightly-cron
-- subdivision CMA blob, ported from Mongo to the per-tenant Neon PostGIS DB.
-- It is the data-plane home for what `src/models/{regions,counties,cities,
-- subdivisions,LocationIndex,PointOfInterest,community-facts}.ts` carry today.
--
-- The strict `cma_stats` design (+ child `cma_stats_by_subtype`, `cma_top_comps`,
-- and the sibling `subdivision_rent_stats`) follows the read-only spike
-- docs/chatrealty-api/spike-cmastats-schema.md verbatim — it covers BOTH the
-- new-schema (`active`/`closed`/`bySubType`/`top{Active,Closed}Comps`) AND the
-- old-schema (`totals`/`profile`/`topComps`) blob shapes that coexist in
-- production, so neither reader breaks during cutover.
--
-- KEY DESIGN POINTS (build_plan §8.2 + spike):
--   • PostGIS geometry(Point,4326) `geom` on cities / subdivisions /
--     points_of_interest, each with a GiST index, for viewport / radius queries.
--   • subdivisions: COMPOSITE UNIQUE (slug, city) — slugs collide across cities
--     (the subdivision tier is OPTIONAL; city + county are the guaranteed tiers).
--   • subdivisions.source ('mls' | 'derived', default 'mls') — Claude-derived
--     subdivisions are stamped 'derived' so they are never presented as official.
--   • Listings link to neighborhoods by STRING NAME (subdivision_name + city) —
--     NO foreign key from property → subdivisions (matches the legacy string
--     match; a derived/missing subdivision must not break a listing).
--   • CMA ratio fields are numeric(6,4) FRACTIONS (e.g. 0.9823), NOT integer
--     percents — the readers multiply by 100 themselves (spike §5 trap #4).
--   • The cma_* / rent tables FK → subdivisions(id) ON DELETE CASCADE so a
--     nightly subdivision rebuild can wipe + reinsert (spike §5 trap #7).
--
-- IDEMPOTENT: every statement is IF NOT EXISTS / guarded so re-applying is a
-- no-op. Applied at tenant-provision time over the DIRECT (non-pooled)
-- connection (pgBouncer cannot run CREATE EXTENSION / session DDL, build_plan
-- §6.2). PostGIS + pg_trgm are already ensured by 0001_init.sql; re-declared
-- here so 0003 is self-contained on a fresh DB.
--
-- The Drizzle definition in src/lib/db/schema/neighborhoods.ts mirrors this
-- EXACTLY — the migration is the authoritative DDL; the Drizzle defs are the
-- typed view so the adapter, drizzle-kit, and raw-SQL consumers cannot drift.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- regions — top of the hierarchy (Region → County → City → Subdivision)
-- ----------------------------------------------------------------------------
-- No `geom` point column: a region is a polygon/centroid concept. The GeoJSON
-- boundary polygon is kept as jsonb (`polygon`); the centroid lives in
-- latitude/longitude. Pre-computed `top_counties` jsonb mirrors the legacy
-- fast-map array.

CREATE TABLE IF NOT EXISTS regions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  normalized_name   text NOT NULL,

  latitude          double precision,
  longitude         double precision,
  polygon           jsonb,                    -- GeoJSON Polygon | MultiPolygon

  listing_count     integer NOT NULL DEFAULT 0,
  county_count      integer NOT NULL DEFAULT 0,
  city_count        integer NOT NULL DEFAULT 0,
  price_min         numeric(14,2),
  price_max         numeric(14,2),
  avg_price         numeric(14,2),
  median_price      numeric(14,2),

  property_types    jsonb,                    -- { residential, lease, multiFamily }
  top_counties      jsonb,                    -- pre-computed fast-map array

  description       text,
  photo             text,
  features          text[],
  keywords          text[],

  mls_sources       text[],
  last_updated      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  extras            jsonb
);

CREATE INDEX IF NOT EXISTS idx_regions_normalized_name ON regions (normalized_name);
CREATE INDEX IF NOT EXISTS idx_regions_listing_count ON regions (listing_count DESC);

-- ----------------------------------------------------------------------------
-- counties — Region → County tier
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS counties (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  normalized_name   text NOT NULL,

  region            text NOT NULL,

  latitude          double precision,
  longitude         double precision,

  listing_count     integer NOT NULL DEFAULT 0,
  city_count        integer NOT NULL DEFAULT 0,
  price_min         numeric(14,2),
  price_max         numeric(14,2),
  avg_price         numeric(14,2),
  median_price      numeric(14,2),

  property_types    jsonb,                    -- { residential, lease, multiFamily }
  top_cities        jsonb,                    -- pre-computed fast-map array

  description       text,
  photo             text,
  features          text[],
  keywords          text[],

  mls_sources       text[],
  is_ocean          boolean NOT NULL DEFAULT false,
  last_updated      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  extras            jsonb
);

CREATE INDEX IF NOT EXISTS idx_counties_region ON counties (region);
CREATE INDEX IF NOT EXISTS idx_counties_normalized_name ON counties (normalized_name);
CREATE INDEX IF NOT EXISTS idx_counties_ocean_listing_count ON counties (is_ocean, listing_count DESC);

-- ----------------------------------------------------------------------------
-- cities — County → City tier (a GUARANTEED tier: every listing has a city)
-- ----------------------------------------------------------------------------
-- PostGIS `geom geometry(Point,4326)` for the city centroid + a GiST index for
-- viewport queries. latitude/longitude kept as the cheap scalar read.

CREATE TABLE IF NOT EXISTS cities (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  normalized_name   text NOT NULL,

  county            text NOT NULL,
  region            text NOT NULL,

  latitude          double precision,
  longitude         double precision,
  geom              geometry(Point,4326),

  listing_count     integer NOT NULL DEFAULT 0,
  price_min         numeric(14,2),
  price_max         numeric(14,2),
  avg_price         numeric(14,2),
  median_price      numeric(14,2),

  property_types    jsonb,                    -- { residential, lease, multiFamily }
  subdivision_count integer,

  description       text,
  photo             text,
  features          text[],
  keywords          text[],

  mls_sources       text[],
  is_ocean          boolean NOT NULL DEFAULT false,
  last_updated      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  extras            jsonb
);

CREATE INDEX IF NOT EXISTS idx_cities_county_region ON cities (county, region);
CREATE INDEX IF NOT EXISTS idx_cities_normalized_name ON cities (normalized_name);
CREATE INDEX IF NOT EXISTS idx_cities_ocean_listing_count ON cities (is_ocean, listing_count DESC);
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING gist (geom);

-- ----------------------------------------------------------------------------
-- subdivisions — City → Subdivision tier (OPTIONAL: not every MLS carries it)
-- ----------------------------------------------------------------------------
-- COMPOSITE UNIQUE (slug, city): slugs collide across cities (e.g. two
-- "country-club" subdivisions in different cities). `source` distinguishes
-- authoritative MLS data ('mls') from Claude-derived values ('derived'). The
-- curated `community_facts`-style enrichment is kept inline as jsonb
-- (`community_facts`) — see also the standalone `community_facts` table below
-- for the legacy per-community record. PostGIS `geom` + GiST index for the
-- subdivision centroid.

CREATE TABLE IF NOT EXISTS subdivisions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text NOT NULL,
  slug              text NOT NULL,
  normalized_name   text NOT NULL,
  -- 'mls' = authoritative MLS subdivision; 'derived' = Claude-derived (build_plan
  -- §8.2 — stamped so it is never presented as official, easy to exclude).
  source            text NOT NULL DEFAULT 'mls'
                      CHECK (source IN ('mls', 'derived')),

  city              text NOT NULL,
  county            text NOT NULL,
  region            text NOT NULL,

  latitude          double precision,
  longitude         double precision,
  geom              geometry(Point,4326),

  listing_count     integer NOT NULL DEFAULT 0,
  price_min         numeric(14,2),
  price_max         numeric(14,2),
  avg_price         numeric(14,2),
  median_price      numeric(14,2),

  property_types    jsonb,                    -- { residential, lease, multiFamily }

  description       text,
  photo             text,
  features          text[],
  keywords          text[],

  community_features text,
  senior_community  boolean,
  community_facts   jsonb,                    -- curated deep-data blob (ISubdivision.communityFacts)

  mls_sources       text[],
  has_manual_data   boolean NOT NULL DEFAULT false,
  last_updated      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  extras            jsonb,

  -- Slugs collide across cities → uniqueness is per (slug, city), not slug alone.
  UNIQUE (slug, city)
);

-- Listings link by STRING NAME (subdivision_name + city) — index the natural
-- match key. Subdivision indexes tolerate emptiness (the tier may be absent).
CREATE INDEX IF NOT EXISTS idx_subdivisions_region_city ON subdivisions (region, city);
CREATE INDEX IF NOT EXISTS idx_subdivisions_county_city ON subdivisions (county, city);
CREATE INDEX IF NOT EXISTS idx_subdivisions_normalized_name_city ON subdivisions (normalized_name, city);
CREATE INDEX IF NOT EXISTS idx_subdivisions_listing_count ON subdivisions (listing_count DESC);
CREATE INDEX IF NOT EXISTS idx_subdivisions_avg_price ON subdivisions (avg_price);
CREATE INDEX IF NOT EXISTS idx_subdivisions_source ON subdivisions (source);
CREATE INDEX IF NOT EXISTS idx_subdivisions_geom ON subdivisions USING gist (geom);

-- ----------------------------------------------------------------------------
-- location_index — autocomplete / center lookup across all four tiers
-- ----------------------------------------------------------------------------
-- Mirrors the legacy LocationIndex: one searchable row per place (city /
-- subdivision / county / region) with center + bounds + cached counts +
-- aliases (e.g. "PDCC" → "Palm Desert Country Club"). pg_trgm GIN on
-- normalized_name powers fast fuzzy autocomplete.

CREATE TABLE IF NOT EXISTS location_index (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text NOT NULL,
  normalized_name     text NOT NULL,
  type                text NOT NULL
                        CHECK (type IN ('city', 'subdivision', 'county', 'region')),

  latitude            double precision,
  longitude           double precision,
  bounds_north        double precision,
  bounds_south        double precision,
  bounds_east         double precision,
  bounds_west         double precision,

  -- Hierarchy back-refs (string match, mirroring the legacy doc shape).
  city                text,                   -- for subdivisions
  county              text,                   -- for cities
  region              text,                   -- for counties

  listing_count       integer NOT NULL DEFAULT 0,
  active_listing_count integer NOT NULL DEFAULT 0,

  slug                text,
  aliases             text[],

  last_updated        timestamptz,
  extras              jsonb
);

CREATE INDEX IF NOT EXISTS idx_location_index_type_normalized_name ON location_index (type, normalized_name);
CREATE INDEX IF NOT EXISTS idx_location_index_type_listing_count ON location_index (type, listing_count DESC);
CREATE INDEX IF NOT EXISTS idx_location_index_slug ON location_index (slug);
CREATE INDEX IF NOT EXISTS idx_location_index_name_trgm
  ON location_index USING gin (normalized_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- points_of_interest — cached Google Places POI data, bounding-box queried
-- ----------------------------------------------------------------------------
-- PostGIS `geom geometry(Point,4326)` + GiST index for ST_DWithin / viewport
-- queries (the POI hover/nearby bundle). place_id is the Google unique key.

CREATE TABLE IF NOT EXISTS points_of_interest (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  place_id            text NOT NULL UNIQUE,
  name                text NOT NULL,
  types               text[],
  category            text NOT NULL,

  latitude            double precision NOT NULL,
  longitude           double precision NOT NULL,
  geom                geometry(Point,4326),

  address             text,
  city                text,
  rating              numeric(3,2),           -- 1.00–5.00
  user_ratings_total  integer,
  price_level         integer,                -- 0–4
  description         text,
  phone_number        text,
  website             text,
  hours               text[],                 -- weekday text array
  photo_url           text,
  photo_reference     text,
  photo_attribution   text,
  is_open             boolean,
  business_status     text,                   -- OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  fetched_at          timestamptz,
  region              text NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  extras              jsonb
);

CREATE INDEX IF NOT EXISTS idx_poi_category ON points_of_interest (category);
CREATE INDEX IF NOT EXISTS idx_poi_category_region ON points_of_interest (category, region);
CREATE INDEX IF NOT EXISTS idx_poi_region ON points_of_interest (region);
CREATE INDEX IF NOT EXISTS idx_poi_geom ON points_of_interest USING gist (geom);

-- ----------------------------------------------------------------------------
-- community_facts — curated per-community deep data (legacy CommunityFact)
-- ----------------------------------------------------------------------------
-- The legacy model nests financials / membership / amenities / environment /
-- security / restrictions / demographics / market_data / property_details as
-- structured sub-objects; here each group is one jsonb column (read-by-key,
-- not searched per-field). `community_name` is the natural unique key.

CREATE TABLE IF NOT EXISTS community_facts (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  community_name      text NOT NULL UNIQUE,
  alternate_names     text[],
  city                text NOT NULL,
  type                text NOT NULL,

  financials          jsonb,
  membership          jsonb,
  amenities           jsonb,
  environment         jsonb,
  security            jsonb,
  restrictions        jsonb,
  demographics        jsonb,
  market_data         jsonb,
  property_details    jsonb,

  description         text,
  pros_cons           jsonb,                  -- { pros, cons }
  best_for            text,

  data_source         text,
  last_verified       timestamptz,
  needs_update        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  extras              jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_facts_city_type ON community_facts (city, type);
CREATE INDEX IF NOT EXISTS idx_community_facts_alternate_names
  ON community_facts USING gin (alternate_names);

-- ----------------------------------------------------------------------------
-- cma_stats — 1:1 with subdivision; the nightly-cron market-analytics blob
-- ----------------------------------------------------------------------------
-- Strict, denormalized per spike-cmastats-schema.md §3.1. ALL analytic columns
-- nullable (the cron emits partial blobs; "parent" subdivisions carry empty
-- totals). Ratio columns numeric(6,4) = FRACTIONS (spike §5 trap #4). The
-- old-schema `profile` / `totals` stay jsonb (deprecated readers) until retired.

CREATE TABLE IF NOT EXISTS cma_stats (
  subdivision_id              bigint PRIMARY KEY
    REFERENCES subdivisions(id) ON DELETE CASCADE,
  last_updated                timestamptz,
  sample_window_months        integer,
  sample_window_start         timestamptz,
  sample_window_end           timestamptz,
  sample_window_listing_cap   integer,

  active_count                integer,        -- also the leaf-vs-parent sentinel
  active_median_price         numeric(14,2),
  active_avg_price            numeric(14,2),
  active_min_price            numeric(14,2),
  active_max_price            numeric(14,2),
  active_median_ppsf          numeric(10,2),
  active_avg_ppsf             numeric(10,2),
  active_avg_dom              numeric(8,2),
  active_median_sqft          numeric(10,2),
  active_avg_sqft             numeric(10,2),
  active_avg_beds             numeric(5,2),
  active_avg_baths            numeric(5,2),

  closed_count                integer,
  closed_median_close_price   numeric(14,2),
  closed_avg_close_price      numeric(14,2),
  closed_min_close_price      numeric(14,2),
  closed_max_close_price      numeric(14,2),
  closed_median_ppsf          numeric(10,2),
  closed_avg_ppsf             numeric(10,2),
  closed_avg_dom              numeric(8,2),
  closed_sale_to_list_ratio   numeric(6,4),   -- fraction (e.g. 0.9823)
  closed_avg_price_reduction_pct numeric(6,4),-- fraction
  closed_sample_start         timestamptz,
  closed_sample_end           timestamptz,

  absorption_rate             numeric(8,4),

  quality_confidence          text
    CHECK (quality_confidence IN ('high','good','medium','low','insufficient')),
  quality_notes               text[],

  narrative                   text,
  narrative_generated_at      timestamptz,

  -- old-schema compatibility (deprecated readers); drop when retired (spike §3).
  profile                     jsonb,
  totals                      jsonb,

  subdivision_profile         jsonb,
  trends                      jsonb,
  extras                      jsonb
);

-- Supports the leaf-vs-parent sentinel query in market/subdivisions/[slug].
CREATE INDEX IF NOT EXISTS idx_cma_stats_active_count ON cma_stats (active_count);

-- ----------------------------------------------------------------------------
-- cma_stats_by_subtype — 1:N; carries BOTH the interface shape and the
-- CmaSubTypeBreakdown shape (all nullable) so either producer maps cleanly.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cma_stats_by_subtype (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subdivision_id      bigint NOT NULL REFERENCES subdivisions(id) ON DELETE CASCADE,
  sub_type            text   NOT NULL,
  count               integer,                -- builder / CmaSubTypeBreakdown shape
  avg_price           numeric(14,2),
  avg_ppsf            numeric(10,2),
  active_count        integer,                -- interface shape
  closed_count        integer,
  median_sale_price   numeric(14,2),
  avg_sale_ppsf       numeric(10,2),
  avg_dom             numeric(8,2),
  avg_sale_to_list_ratio numeric(6,4),        -- fraction
  sample_start        timestamptz,
  sample_end          timestamptz,
  UNIQUE (subdivision_id, sub_type)
);

CREATE INDEX IF NOT EXISTS idx_cma_stats_by_subtype_subdivision
  ON cma_stats_by_subtype (subdivision_id);

-- ----------------------------------------------------------------------------
-- cma_top_comps — 1:N; denormalizes topActiveComps / topClosedComps (new) AND
-- the old-schema flat topComps (→ comp_kind 'closed'), discriminated by
-- comp_kind. May be sparse/empty in current data (spike §5 trap #3).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cma_top_comps (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subdivision_id      bigint NOT NULL REFERENCES subdivisions(id) ON DELETE CASCADE,
  comp_kind           text   NOT NULL CHECK (comp_kind IN ('active','closed')),
  position            integer,                -- preserve array order for stable render
  listing_key         text,
  address             text,
  slug_address        text,
  property_sub_type   text,
  close_date          timestamptz,
  close_price         numeric(14,2),
  list_price          numeric(14,2),
  original_list_price numeric(14,2),
  sale_ppsf           numeric(10,2),
  sale_to_list_ratio  numeric(6,4),           -- fraction
  living_area         numeric(10,2),
  beds_total          numeric(5,2),
  baths_total         numeric(5,2),
  year_built          integer,
  garage_spaces       numeric(5,2),
  days_on_market      integer,
  extras              jsonb
);

CREATE INDEX IF NOT EXISTS idx_cma_top_comps_lookup
  ON cma_top_comps (subdivision_id, comp_kind, position);

-- ----------------------------------------------------------------------------
-- subdivision_rent_stats — 1:1; the sibling rentStats going-rate blob
-- ----------------------------------------------------------------------------
-- rentStats has no field-level consumer (passed through whole), so it is a thin
-- row + one jsonb payload. `going_rate` promoted for cheap area sorting.

CREATE TABLE IF NOT EXISTS subdivision_rent_stats (
  subdivision_id      bigint PRIMARY KEY REFERENCES subdivisions(id) ON DELETE CASCADE,
  going_rate          numeric(12,2),
  quality_confidence  text,
  last_updated        timestamptz,
  payload             jsonb NOT NULL
);

-- ----------------------------------------------------------------------------
-- schema_migrations ledger — stamp 0003 (idempotent; ledger created in 0001).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('0003')
  ON CONFLICT (version) DO NOTHING;
