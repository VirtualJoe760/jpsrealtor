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
} from "./listings.ts";

export {
  contact,
  customFieldRegistry,
  schemaMigrations,
  type ContactRow,
  type CustomFieldRegistryRow,
  type SchemaMigrationRow,
} from "./contacts.ts";
