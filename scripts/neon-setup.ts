// scripts/neon-setup.ts
//
// One-shot, repeatable Neon setup CLI for the ChatRealty API product.
//
//   npx tsx scripts/neon-setup.ts
//
// Given NEON_API_KEY in the environment (or in .env.local), this:
//   1. Reuses NEON_PROJECT_ID if set, else creates a new Neon project + DB
//      ("chatrealty-dev", region from NEON_REGION or aws-us-west-2).
//   2. Connects to the DIRECT (non-pooled) connection URI with `pg` and runs
//      `CREATE EXTENSION IF NOT EXISTS postgis` and `... pg_trgm`. PostGIS is
//      mandatory for the geo/map layer — if it fails we print a LOUD warning and
//      keep going (do not crash).
//   3. Applies src/lib/reso/migrations/0001_init.sql (the per-tenant data-plane
//      schema). The migration is fully idempotent (all CREATE ... IF NOT EXISTS)
//      so re-running against an existing project is safe.
//   4. Verifies: SELECT postgis_version() and asserts the `property` table
//      exists.
//   5. Prints a SUCCESS summary — projectId, pooled + direct connection strings
//      (password MASKED), and exactly which env vars to set next.
//
// This is "drive the Neon setup": automated and repeatable. It CANNOT be live-
// tested without a real key; the live path is defensive and clearly logged.
//
// SECURITY: the API key and connection-string passwords are never logged. Any
// connection URI echoed to the console is run through `maskUriPassword` first.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { Client } from "pg";

import {
  createProject,
  getProject,
  derivePooledUri,
  DEFAULT_REGION_ID,
  NeonApiError,
  type CreatedProject,
} from "../src/lib/neon/client";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const MIGRATION_PATH = join(
  REPO_ROOT,
  "src",
  "lib",
  "reso",
  "migrations",
  "0001_init.sql",
);

// -----------------------------------------------------------------------------
// Small console helpers (no secrets ever pass through here unmasked)
// -----------------------------------------------------------------------------

const log = (msg: string) => console.log(msg);
const step = (msg: string) => console.log(`\n▶ ${msg}`);
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const warn = (msg: string) => console.warn(`  ⚠ ${msg}`);

/**
 * Mask the password in a Postgres connection URI for safe logging:
 *   postgresql://user:SECRET@host/db  ->  postgresql://user:****@host/db
 * Falls back to a blanket redaction if the URI does not parse.
 */
function maskUriPassword(uri: string): string {
  try {
    const u = new URL(uri);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return uri.replace(/:\/\/([^:@/]+):[^@]+@/, "://$1:****@");
  }
}

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Env loading + key guard
// -----------------------------------------------------------------------------

function loadEnv(): void {
  const envLocal = join(REPO_ROOT, ".env.local");
  if (existsSync(envLocal)) {
    loadDotenv({ path: envLocal });
    log(`Loaded env from ${envLocal}`);
  } else {
    // dotenv default (.env) as a fallback; harmless if absent.
    loadDotenv();
  }
}

function requireApiKey(): void {
  if (process.env.NEON_API_KEY) return;
  fail(
    [
      "NEON_API_KEY is not set.",
      "",
      "To get one:",
      "  1. Create a free Neon account at https://neon.tech",
      "  2. Open https://console.neon.tech/app/settings/api-keys",
      "  3. Create an API key and add it to .env.local as:",
      "       NEON_API_KEY=neon_api_xxxxxxxxxxxxxxxx",
      "",
      "Then re-run:  npx tsx scripts/neon-setup.ts",
    ].join("\n"),
  );
}

// -----------------------------------------------------------------------------
// Project: reuse or create
// -----------------------------------------------------------------------------

async function resolveProject(): Promise<CreatedProject> {
  const existingId = process.env.NEON_PROJECT_ID;

  if (existingId) {
    step(`Reusing existing Neon project NEON_PROJECT_ID=${existingId}`);
    // Confirm it exists; we cannot recover its connection URI from the API
    // (the password is only returned on creation), so the operator must supply
    // the conn string via env for a reused project.
    const project = await getProject(existingId);
    ok(`project "${project.name}" (${project.id}) is reachable`);

    const directConnUri =
      process.env.NEON_DIRECT_CONN_URI ?? process.env.DATABASE_URL_DIRECT;
    if (!directConnUri) {
      fail(
        [
          `NEON_PROJECT_ID is set (${existingId}) but no direct connection URI was provided.`,
          "Neon only returns the connection string (with password) at creation time, so",
          "for a REUSED project you must supply it yourself. Set one of:",
          "  NEON_DIRECT_CONN_URI=postgresql://...neon.tech/neondb?sslmode=require",
          "  DATABASE_URL_DIRECT=postgresql://...   (alias)",
          "",
          "Tip: to provision a brand-new project instead, unset NEON_PROJECT_ID and re-run.",
        ].join("\n"),
      );
    }

    return {
      projectId: project.id,
      directConnUri,
      pooledConnUri: process.env.NEON_POOLED_CONN_URI ?? derivePooledUri(directConnUri),
      defaultDatabase: process.env.NEON_DATABASE ?? "neondb",
      defaultRole: process.env.NEON_ROLE ?? "neondb_owner",
    };
  }

  const regionId = process.env.NEON_REGION ?? DEFAULT_REGION_ID;
  step(`Creating new Neon project "chatrealty-dev" in region ${regionId}`);
  const created = await createProject({ name: "chatrealty-dev", regionId });
  ok(`created project ${created.projectId}`);
  ok(`default database: ${created.defaultDatabase}, role: ${created.defaultRole}`);
  return created;
}

// -----------------------------------------------------------------------------
// Extensions + migration + verification over the DIRECT connection
// -----------------------------------------------------------------------------

async function applyExtensions(client: Client): Promise<boolean> {
  step("Enabling Postgres extensions (over the direct connection)");

  let postgisOk = true;
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    ok("postgis enabled");
  } catch (err) {
    postgisOk = false;
    const m = err instanceof Error ? err.message : String(err);
    warn("======================================================================");
    warn("PostGIS could not be enabled. The geo/map layer (map bounds, radius");
    warn("search, clustering) REQUIRES PostGIS. Check that your Neon plan/region");
    warn("allows the postgis extension, then re-run this script.");
    warn(`Neon error: ${m}`);
    warn("======================================================================");
  }

  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    ok("pg_trgm enabled");
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    warn(`pg_trgm could not be enabled (street-resolve search degrades): ${m}`);
  }

  return postgisOk;
}

async function applyMigration(client: Client): Promise<void> {
  step(`Applying migration ${MIGRATION_PATH}`);
  if (!existsSync(MIGRATION_PATH)) {
    fail(`migration file not found at ${MIGRATION_PATH}`);
  }
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  // The migration is a single idempotent script (all CREATE ... IF NOT EXISTS,
  // including the extension preamble). `pg` runs multi-statement strings in one
  // round-trip.
  await client.query(sql);
  ok("0001_init.sql applied (idempotent — safe to re-run)");

  // Stamp the migration ledger (idempotent via ON CONFLICT).
  await client.query(
    `INSERT INTO schema_migrations (version) VALUES ($1)
     ON CONFLICT (version) DO NOTHING;`,
    ["0001_init"],
  );
  ok("schema_migrations ledger stamped (0001_init)");
}

async function verify(client: Client, postgisOk: boolean): Promise<void> {
  step("Verifying the data plane");

  if (postgisOk) {
    try {
      const res = await client.query<{ postgis_version: string }>(
        "SELECT postgis_version();",
      );
      ok(`postgis_version() = ${res.rows[0]?.postgis_version ?? "(unknown)"}`);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      warn(`postgis_version() failed despite extension create: ${m}`);
    }
  } else {
    warn("skipping postgis_version() check (PostGIS not enabled)");
  }

  const tbl = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'property'
     ) AS exists;`,
  );
  if (!tbl.rows[0]?.exists) {
    fail("verification failed: the `property` table does not exist after migration.");
  }
  ok("`property` table exists");
}

// -----------------------------------------------------------------------------
// Persist connection details to .env.local (gitignored) on a fresh create, so
// the runtime tenant resolver and the live adapter tests can reach the DB
// without hand-copying a secret Neon only shows once at creation.
// -----------------------------------------------------------------------------

function upsertEnvLine(content: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  const sep = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  return content + sep + line + "\n";
}

function writeEnvLocal(project: CreatedProject): void {
  const envPath = join(REPO_ROOT, ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  content = upsertEnvLine(content, "NEON_PROJECT_ID", project.projectId);
  content = upsertEnvLine(content, "NEON_POOLED_CONN_URI", project.pooledConnUri);
  content = upsertEnvLine(content, "NEON_DIRECT_CONN_URI", project.directConnUri);
  writeFileSync(envPath, content, "utf8");
  ok("wrote NEON_PROJECT_ID + NEON_POOLED_CONN_URI + NEON_DIRECT_CONN_URI to .env.local");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------

function printSummary(project: CreatedProject, postgisOk: boolean): void {
  const maskedPooled = maskUriPassword(project.pooledConnUri);
  const maskedDirect = maskUriPassword(project.directConnUri);

  log("\n============================================================");
  log("  ✅ Neon setup complete");
  log("============================================================");
  log(`  Project id:        ${project.projectId}`);
  log(`  Database:          ${project.defaultDatabase}`);
  log(`  Role:              ${project.defaultRole}`);
  log(`  PostGIS:           ${postgisOk ? "enabled" : "NOT ENABLED (see warning above)"}`);
  log("");
  log("  Connection strings (passwords masked):");
  log(`    pooled (runtime): ${maskedPooled}`);
  log(`    direct (DDL):     ${maskedDirect}`);
  log("");
  log("  Connection env vars (on a fresh create these were just written to");
  log("  .env.local — gitignored; for a REUSED project, set them yourself):");
  log("");
  log(`    NEON_PROJECT_ID=${project.projectId}`);
  log("    NEON_POOLED_CONN_URI=<pooled connection string>   # runtime traffic");
  log("    NEON_DIRECT_CONN_URI=<direct connection string>   # migrations / DDL only");
  log("");
  log("  The pooled URI is what the tenant resolver should encrypt + store as the");
  log("  runtime connection. The direct URI is for migrations/DDL only (pgBouncer");
  log("  cannot run CREATE EXTENSION / session DDL).");
  log("");
  log("  Re-running this script against the same NEON_PROJECT_ID re-applies the");
  log("  migration safely (every statement is IF NOT EXISTS).");
  log("============================================================\n");
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  log("ChatRealty — Neon setup\n");
  loadEnv();
  requireApiKey();

  const freshlyCreated = !process.env.NEON_PROJECT_ID;

  let project: CreatedProject;
  try {
    project = await resolveProject();
  } catch (err) {
    if (err instanceof NeonApiError) {
      fail(`Neon API error (${err.status}) on ${err.endpoint}: ${err.message}`);
    }
    throw err;
  }

  // Connect over the DIRECT (non-pooled) URI for extensions + DDL.
  step("Connecting to the tenant database (direct connection)");
  ok(`connecting to ${maskUriPassword(project.directConnUri)}`);
  const client = new Client({ connectionString: project.directConnUri });

  let postgisOk = true;
  try {
    await client.connect();
    ok("connected");
    postgisOk = await applyExtensions(client);
    await applyMigration(client);
    await verify(client, postgisOk);
  } finally {
    await client.end().catch(() => {
      /* best-effort close */
    });
  }

  if (freshlyCreated) writeEnvLocal(project);

  printSummary(project, postgisOk);
}

main().catch((err) => {
  const m = err instanceof Error ? err.message : String(err);
  fail(`Unexpected error: ${m}`);
});
