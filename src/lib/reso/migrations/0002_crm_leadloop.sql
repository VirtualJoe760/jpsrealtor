-- ============================================================================
-- ChatRealty per-tenant data-plane schema — migration 0002_crm_leadloop
--
-- The CRM + lead-loop expansion (build_plan §8.3). Adds, to each tenant's own
-- Neon database, the three tables the lead loop runs on:
--
--   • contact    — the per-tenant CRM. NO userId agent-scoping: in the product
--                  model THE DATABASE IS THE AGENT (build_plan §3.3 — "isolation
--                  is the database boundary itself"), so a contact dedupes on a
--                  per-tenant unique phone + a soft email match, mirroring the
--                  legacy `linkUserToAgent` upsert (build_plan §8.3) rather than
--                  the legacy `(userId, phone)` compound key. The structured
--                  phones[]/emails[] jsonb + the legacy scalar mirrors (phone,
--                  email) match the Mongo `Contact` shape so the same
--                  `toContactDTO` collapses a row identically.
--   • end_user   — the consumer account that registers through a tenant surface
--                  (favorites / saved searches / auto-contact work out of the
--                  box). Linked to a contact via `contact.linked_user_id`.
--   • saved_search — a stored search owned by an end_user; the lead signal that
--                  the Contact accrues (build_plan §8.3 lead loop).
--
-- IDEMPOTENT: every statement is IF NOT EXISTS / guarded so re-applying is a
-- no-op. Applied at tenant-provision time over the DIRECT (non-pooled)
-- connection (pgBouncer cannot run CREATE EXTENSION / session DDL).
--
-- NOTE on `contact`: 0001_init.sql does NOT ship a `contact` table (CRM-on-
-- Postgres is a later cutover); this migration is its canonical home. The
-- Drizzle definition in src/lib/db/schema/crm.ts mirrors this exactly.
-- ============================================================================

-- citext gives a case-insensitive UNIQUE on end_user.email without a functional
-- index, matching the legacy lowercase email dedup.
CREATE EXTENSION IF NOT EXISTS citext;

-- ----------------------------------------------------------------------------
-- contact — per-tenant CRM (NOT owner-scoped; the DB is the boundary)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  display_name text,
  -- Structured contact info (build_plan §8.3): jsonb arrays of
  -- { number, label, isPrimary, isValid } / { address, label, isPrimary, isValid }.
  phones jsonb,
  emails jsonb,
  -- Legacy scalar mirrors (primary phone / email) — mirror the Mongo Contact
  -- deprecated fields so the same toContactDTO collapses a row identically.
  phone text,
  email text,
  labels text[],
  source text,
  status text,
  -- Opaque link to the end_user account (no cross-store FK).
  linked_user_id uuid,
  fub_id text,
  notes jsonb,
  extras jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-tenant dedup: a phone is unique when present (web leads with no phone do
-- not collide on NULL). Mirrors the legacy sparse-unique (userId, phone) minus
-- the userId — the DB is the tenant boundary.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_phone
  ON contact (phone) WHERE phone IS NOT NULL;

-- FUB person id is unique when present (dedup the Follow Up Boss sync).
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_fub_id
  ON contact (fub_id) WHERE fub_id IS NOT NULL;

-- Soft email match for the upsert lookup (NOT unique — multiple contacts may
-- legitimately share a mirrored email before promotion).
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact (email);
CREATE INDEX IF NOT EXISTS idx_contact_linked_user_id ON contact (linked_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact (status);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact (created_at);

-- ----------------------------------------------------------------------------
-- end_user — the consumer account (registers through a tenant surface)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS end_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- citext → case-insensitive UNIQUE, matching the legacy lowercase email key.
  email citext UNIQUE,
  name text,
  phone text,
  -- { smsOptIn, emailOptIn, marketingConsent, consentDate, consentIp, ... }.
  marketing_consent jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_end_user_phone ON end_user (phone);

-- ----------------------------------------------------------------------------
-- saved_search — a stored search owned by an end_user (lead-loop signal)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_search (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  end_user_id uuid REFERENCES end_user(id) ON DELETE CASCADE,
  name text,
  -- The OData-flavored search criteria the search re-runs.
  criteria jsonb,
  notify boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_search_end_user_id ON saved_search (end_user_id);
