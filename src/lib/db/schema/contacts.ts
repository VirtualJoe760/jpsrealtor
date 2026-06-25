// src/lib/db/schema/contacts.ts
//
// Agent 09 — Drizzle table definitions for the per-tenant CRM `contact` table
// plus the per-tenant control tables that ship in `0001_init.sql`
// (`custom_field_registry`, `schema_migrations`).
//
// CONTACTS ON THE POSTGRES PATH (build_plan §6.3): the DbAdapter contract
// (Agent 01) requires a `contacts` repo on EVERY adapter. The legacy single-
// tenant deployment keeps contacts in Mongo (the `Contact` Mongoose model,
// owner-scoped by `userId`), which the Mongo adapter (Agent 02) serves. In the
// per-tenant Postgres model the database IS the isolation boundary, so a tenant
// CRM `contact` table lives in the tenant's own Neon DB with NO `userId`
// scoping (build_plan §3.3 — "isolation is the database boundary itself").
//
// NOTE: `0001_init.sql` (Agent 04) currently provisions only the RESO resource
// tables + `custom_field_registry` + `schema_migrations`; a `contact` table is
// NOT yet in that migration (CRM-on-Postgres is a later cutover — Agent 21). The
// table is defined here so the adapter's `contacts` repo is typed and ready, and
// so the live contract test SKIPS the contacts assertions cleanly when the table
// is absent (it probes `to_regclass('public.contact')` first). The column shape
// mirrors `ContactDTO` (Agent 01) and the Mongo `Contact` model's primary fields
// so the same `toContactDTO` mapper collapses a Postgres row identically.

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// contact — per-tenant CRM contact (NOT owner-scoped; the DB is the boundary)
// -----------------------------------------------------------------------------

export const contact = pgTable(
  "contact",
  {
    // String PK so the `ContactDTO.id` shape matches the Mongo `_id` string.
    id: text("id").primaryKey(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    organization: text("organization"),
    status: text("status"),
    /** jsonb array of tag strings (collapsed to `string[]` in the DTO). */
    tags: jsonb("tags"),
    /** jsonb array of `{ number, isPrimary }` (collapsed to a primary phone). */
    phones: jsonb("phones"),
    /** jsonb array of `{ address, isPrimary }` (collapsed to a primary email). */
    emails: jsonb("emails"),
    /** Deprecated scalar fallbacks (mirror the Mongo legacy fields). */
    phone: text("phone"),
    email: text("email"),
    source: text("source"),
    lastContactDate: timestamp("last_contact_date", { withTimezone: true }),
    lastContactMethod: text("last_contact_method"),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (t) => ({
    idxStatus: index("idx_contact_status").on(t.status),
    idxLastContactDate: index("idx_contact_last_contact_date").on(t.lastContactDate),
    idxCreatedAt: index("idx_contact_created_at").on(t.createdAt),
  }),
);

export type ContactRow = typeof contact.$inferSelect;

// -----------------------------------------------------------------------------
// custom_field_registry — per-tenant custom-field catalog (Agent 17 owns CRUD)
// -----------------------------------------------------------------------------
//
// Mirrors the `0001_init.sql` table exactly. The Drizzle definition exists so
// the adapter and drizzle-kit see the same shape; Agent 17 operates it through
// the injected TenantDb.

export const customFieldRegistry = pgTable(
  "custom_field_registry",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    resource: text("resource").notNull(),
    name: text("name").notNull(),
    fieldType: text("field_type").notNull(),
    label: text("label"),
    searchable: boolean("searchable").notNull().default(false),
    enumValues: jsonb("enum_values"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uqResourceName: uniqueIndex("custom_field_registry_resource_name_key").on(
      t.resource,
      t.name,
    ),
    idxResource: index("idx_custom_field_registry_resource").on(t.resource),
  }),
);

export type CustomFieldRegistryRow = typeof customFieldRegistry.$inferSelect;

// -----------------------------------------------------------------------------
// schema_migrations — the migration ledger the provisioning runner stamps
// -----------------------------------------------------------------------------

export const schemaMigrations = pgTable("schema_migrations", {
  version: text("version").primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SchemaMigrationRow = typeof schemaMigrations.$inferSelect;
