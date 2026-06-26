// src/lib/db/schema/crm.ts
//
// CRM + lead-loop Drizzle table definitions (build_plan §8.3). These mirror
// `src/lib/reso/migrations/0002_crm_leadloop.sql` EXACTLY — the migration is the
// authoritative DDL applied at provision time; these Drizzle defs exist so the
// adapter, drizzle-kit, and any raw-SQL consumer all reference the same table
// objects and cannot drift.
//
// THE DATABASE IS THE AGENT (build_plan §3.3 / §8.3): the per-tenant `contact`
// table carries NO `userId` agent-scoping — isolation is the database boundary
// itself. Dedup is a per-tenant unique on `phone` (when present) + a soft `email`
// match, mirroring the legacy `linkUserToAgent` upsert. The structured
// `phones[]`/`emails[]` jsonb + the legacy scalar mirrors (`phone`, `email`)
// match the Mongo `Contact` shape so the same `toContactDTO` collapses a row.
//
// `end_user` is the consumer account; `saved_search` is the stored-search lead
// signal the Contact accrues. `contact.linked_user_id` is an opaque link to
// `end_user.id` (no cross-store FK).

import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
  customType,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// citext — case-insensitive text (matches the 0002 `email citext UNIQUE`)
// -----------------------------------------------------------------------------

const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

// `text[]` for the contact `labels` column.
const textArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return "text[]";
  },
});

// -----------------------------------------------------------------------------
// contact — per-tenant CRM (NOT owner-scoped; the DB is the boundary)
// -----------------------------------------------------------------------------

export const contact = pgTable(
  "contact",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    firstName: text("first_name"),
    lastName: text("last_name"),
    displayName: text("display_name"),
    /** jsonb array of { number, label, isPrimary, isValid } (Mongo IPhone[]). */
    phones: jsonb("phones"),
    /** jsonb array of { address, label, isPrimary, isValid } (Mongo IEmail[]). */
    emails: jsonb("emails"),
    /** Deprecated scalar mirrors (primary phone / email) — Mongo legacy fields. */
    phone: text("phone"),
    email: text("email"),
    labels: textArray("labels"),
    source: text("source"),
    status: text("status"),
    /** Opaque link to end_user.id (no cross-store FK). */
    linkedUserId: uuid("linked_user_id"),
    fubId: text("fub_id"),
    notes: jsonb("notes"),
    extras: jsonb("extras"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Per-tenant dedup: phone unique WHERE phone IS NOT NULL.
    uqPhone: uniqueIndex("uq_contact_phone").on(t.phone).where(sql`phone IS NOT NULL`),
    // FUB id unique WHERE fub_id IS NOT NULL.
    uqFubId: uniqueIndex("uq_contact_fub_id").on(t.fubId).where(sql`fub_id IS NOT NULL`),
    idxEmail: index("idx_contact_email").on(t.email),
    idxLinkedUserId: index("idx_contact_linked_user_id").on(t.linkedUserId),
    idxStatus: index("idx_contact_status").on(t.status),
    idxCreatedAt: index("idx_contact_created_at").on(t.createdAt),
  }),
);

export type CrmContactRow = typeof contact.$inferSelect;

// -----------------------------------------------------------------------------
// end_user — the consumer account (registers through a tenant surface)
// -----------------------------------------------------------------------------

export const endUser = pgTable(
  "end_user",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** citext → case-insensitive UNIQUE (legacy lowercase email key). */
    email: citext("email").unique(),
    name: text("name"),
    phone: text("phone"),
    /** { smsOptIn, emailOptIn, marketingConsent, consentDate, consentIp, ... }. */
    marketingConsent: jsonb("marketing_consent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxPhone: index("idx_end_user_phone").on(t.phone),
  }),
);

export type EndUserRow = typeof endUser.$inferSelect;

// -----------------------------------------------------------------------------
// saved_search — a stored search owned by an end_user (lead-loop signal)
// -----------------------------------------------------------------------------

export const savedSearch = pgTable(
  "saved_search",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    endUserId: uuid("end_user_id").references(() => endUser.id, { onDelete: "cascade" }),
    name: text("name"),
    /** The OData-flavored search criteria the search re-runs. */
    criteria: jsonb("criteria"),
    notify: boolean("notify").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxEndUserId: index("idx_saved_search_end_user_id").on(t.endUserId),
  }),
);

export type SavedSearchRow = typeof savedSearch.$inferSelect;
