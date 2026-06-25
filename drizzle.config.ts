// drizzle.config.ts
//
// Agent 09 — drizzle-kit configuration for the per-tenant data-plane schema.
//
// drizzle-kit reads this to `generate` migrations from the schema barrel and to
// `migrate`/`push`/`introspect` against a tenant database. It uses the DIRECT
// (non-pooled) Neon connection — `NEON_DIRECT_CONN_URI` — because DDL and
// `CREATE EXTENSION` cannot run over the pgBouncer pooled endpoint (build_plan
// §6.2). The pooled URI is for runtime reads only; migrations use the direct one.
//
// The schema source of truth is `src/lib/db/schema/index.ts` (the barrel). The
// per-tenant migration applied at provision time is `0001_init.sql` (Agent 04);
// drizzle-kit-generated migrations land under `src/lib/db/migrations/` and are
// reconciled to match the live tables.
//
// The conn string is loaded from `.env.local` (not committed). When it is
// absent, `dbCredentials.url` is left empty — `drizzle-kit generate` (which only
// reads the schema, not the DB) still works; only DB-touching commands need it.

import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local for the direct connection string (migrations only).
loadEnv({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: {
    // DIRECT (non-pooled) URI — DDL / CREATE EXTENSION cannot run over pgBouncer.
    url: process.env.NEON_DIRECT_CONN_URI ?? "",
  },
  // PostGIS / pg_trgm extension tables live in `public`; never let drizzle-kit
  // try to drop the spatial bookkeeping tables it doesn't manage.
  extensionsFilters: ["postgis"],
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
