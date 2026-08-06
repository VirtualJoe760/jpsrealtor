-- ============================================================================
-- ChatRealty per-tenant data-plane schema — migration 0004_leadloop_repair
--
-- WHY THIS EXISTS (session 14, 2026-08-05): every lead submitted to a self-serve
-- tenant site returned `500 Internal Server Error` from
-- `POST /api/skill/contacts/from-signup`. The route was fine. The tenant's
-- database was missing the table it writes to.
--
-- Two provisioning paths had drifted apart:
--
--   • `src/lib/tenant/provision-service.ts` applies `0001_init.sql` — the RESO
--     resources only, no CRM.
--   • `src/lib/tenant/provision.ts` — the SELF-SERVE path every real tenant
--     actually takes (`npx @chatrealty/sync init` → POST /api/skill/tenant/
--     provision) — applies the Drizzle migration
--     `src/lib/db/migrations/0000_supreme_maginty.sql`.
--
-- Neither applies `0002_crm_leadloop.sql`, and nothing ever called
-- `applyMigration0002()` (it had zero callers). So a provisioned tenant got:
--
--   • NO `end_user` table  → `registerEndUser()` threw `relation "end_user"
--     does not exist`, which is the 500. This is the whole bug.
--   • NO `saved_search` table → saved searches would have failed the same way.
--   • A `contact` table of the WRONG SHAPE: the Drizzle placeholder from
--     `schema/contacts.ts` (`id text` with no default, no `linked_user_id`, no
--     `labels`, no `updated_at`), not the lead-loop shape from `schema/crm.ts`
--     that `upsertContactFromSignup` inserts into. That insert would have
--     failed too — silently, because the CRM mirror is non-blocking by design.
--
-- WHAT THIS DOES: brings any tenant database — freshly created or already live
-- with rows in it — to the lead-loop schema, without dropping anything.
--
--   1. Creates `contact` in the canonical 0002 shape if it is absent.
--   2. If it is present in the placeholder shape, ADDs the missing columns and
--      gives `id` a default so an INSERT that omits it works. Existing rows and
--      columns are untouched — this migration never drops or retypes.
--   3. Creates `end_user` + `saved_search` (the tables whose absence was the 500).
--   4. Creates the dedup indexes. The two UNIQUE ones are attempted inside an
--      exception guard: on a tenant that already accumulated duplicate phones,
--      a failed index must not abort the rest of the repair.
--
-- IDEMPOTENT: every statement is IF NOT EXISTS / guarded. Re-applying is a
-- no-op, which is what lets provisioning run it on EVERY init — including the
-- reconnect path, so tenants provisioned before this migration self-heal the
-- next time their owner runs `npx @chatrealty/sync init`.
--
-- Runs over the DIRECT (non-pooled) connection: pgBouncer cannot run
-- CREATE EXTENSION or session DDL.
-- ============================================================================

-- citext gives a case-insensitive UNIQUE on end_user.email without a functional
-- index, matching the legacy lowercase email dedup.
CREATE EXTENSION IF NOT EXISTS citext;

-- ----------------------------------------------------------------------------
-- contact — create in the canonical shape when absent
-- ----------------------------------------------------------------------------
-- Mirrors 0002_crm_leadloop.sql exactly. On a tenant that already has the
-- Drizzle placeholder table this is a no-op and the ALTERs below do the work.

CREATE TABLE IF NOT EXISTS contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  display_name text,
  phones jsonb,
  emails jsonb,
  phone text,
  email text,
  labels text[],
  source text,
  status text,
  linked_user_id uuid,
  fub_id text,
  notes jsonb,
  extras jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- contact — fill in what the placeholder shape is missing
-- ----------------------------------------------------------------------------

ALTER TABLE contact ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS phones jsonb;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS emails jsonb;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS labels text[];
ALTER TABLE contact ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS linked_user_id uuid;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS fub_id text;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS notes jsonb;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS extras jsonb;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE contact ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- The placeholder ships created_at with no default, so every mirrored lead
-- landed with a NULL timestamp and sorted last in the agent's CRM.
ALTER TABLE contact ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE contact ALTER COLUMN updated_at SET DEFAULT now();
UPDATE contact SET created_at = now() WHERE created_at IS NULL;
UPDATE contact SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;

-- `upsertContactFromSignup` INSERTs without an id and relies on the default.
-- The placeholder's `id text PRIMARY KEY` has none, so the insert violated NOT
-- NULL. Give it one, matching whatever type the column already is.
DO $$
DECLARE
  col_type text;
  col_default text;
BEGIN
  SELECT data_type, column_default
    INTO col_type, col_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'contact' AND column_name = 'id';

  IF col_type IS NOT NULL AND col_default IS NULL THEN
    IF col_type = 'uuid' THEN
      EXECUTE 'ALTER TABLE contact ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSE
      EXECUTE 'ALTER TABLE contact ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- end_user — the table whose absence was the 500
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS end_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  name text,
  phone text,
  marketing_consent jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_end_user_phone ON end_user (phone);

-- ----------------------------------------------------------------------------
-- saved_search
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_search (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  end_user_id uuid REFERENCES end_user(id) ON DELETE CASCADE,
  name text,
  criteria jsonb,
  notify boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_search_end_user_id ON saved_search (end_user_id);

-- ----------------------------------------------------------------------------
-- contact dedup indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_contact_email ON contact (email);
CREATE INDEX IF NOT EXISTS idx_contact_linked_user_id ON contact (linked_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact (status);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact (created_at);

-- The UNIQUE ones can legitimately fail on a tenant that already collected
-- duplicate phone numbers through some other path. Dedup is a nice-to-have;
-- having an `end_user` table at all is not. Never let one abort the other.
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_phone
      ON contact (phone) WHERE phone IS NOT NULL;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'uq_contact_phone skipped: %', SQLERRM;
  END;
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_fub_id
      ON contact (fub_id) WHERE fub_id IS NOT NULL;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'uq_contact_fub_id skipped: %', SQLERRM;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('0004_leadloop_repair')
ON CONFLICT (version) DO NOTHING;
