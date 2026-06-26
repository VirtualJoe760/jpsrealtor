// src/lib/db/schema/index.ts
//
// Agent 09 — the Drizzle schema barrel. This is the single `schema` object
// `drizzle(neon(conn), { schema })` is constructed with, and the entry
// `drizzle.config.ts` points `drizzle-kit` at.
//
// It re-exports every per-tenant data-plane table: the four RESO resources
// (`property` / `member` / `office` / `media`), the per-tenant CRM `contact`
// table, and the control tables that ship in `0001_init.sql`
// (`custom_field_registry`, `schema_migrations`). Keeping one barrel means the
// adapter, the migration generator, and any raw-SQL consumer all reference the
// same table objects — they cannot drift.

export {
  property,
  member,
  office,
  media,
  type PropertyRow,
  type MemberRow,
  type OfficeRow,
  type MediaRow,
} from "./listings";

export {
  contact,
  customFieldRegistry,
  schemaMigrations,
  type ContactRow,
  type CustomFieldRegistryRow,
  type SchemaMigrationRow,
} from "./contacts";

// CRM + lead-loop tables (migration 0002_crm_leadloop, build_plan §8.3).
//
// NOTE: `crm.ts` also defines a `contact` table — the per-tenant CRM home that
// migration 0002 provisions with a uuid PK + structured phones/emails + dedup
// indexes. It is re-exported here as `crmContact` to avoid clashing with the
// placeholder `contact` from `./contacts` (the text-PK shape `0001_init.sql`
// never created). The lead-loop adapters use the `crm.ts` tables.
export {
  contact as crmContact,
  endUser,
  savedSearch,
  type CrmContactRow,
  type EndUserRow,
  type SavedSearchRow,
} from "./crm";

// Neighborhoods subsystem tables (migration 0003_neighborhoods, build_plan §8.2).
// The Region → County → City → Subdivision hierarchy + location_index + POIs +
// curated community_facts + the strict nightly-cron CMA blob (cma_stats +
// children + subdivision_rent_stats). Ported from the Mongo neighborhood models;
// `neighborhoods.ts` mirrors `0003_neighborhoods.sql` exactly.
export {
  regions,
  counties,
  cities,
  subdivisions,
  locationIndex,
  pointsOfInterest,
  communityFacts,
  cmaStats,
  cmaStatsBySubtype,
  cmaTopComps,
  subdivisionRentStats,
  type RegionRow,
  type CountyRow,
  type CityRow,
  type SubdivisionRow,
  type LocationIndexRow,
  type PointOfInterestRow,
  type CommunityFactRow,
  type CmaStatsRow,
  type CmaStatsBySubtypeRow,
  type CmaTopCompRow,
  type SubdivisionRentStatsRow,
} from "./neighborhoods";
