// src/lib/reso/migrations/apply-0002.ts
//
// Tiny standalone runner that applies migration 0002_crm_leadloop (the CRM +
// lead-loop expansion, build_plan §8.3) to a tenant Neon database over the
// DIRECT (non-pooled) connection — pgBouncer cannot run `CREATE EXTENSION` /
// session DDL, so DDL MUST use the direct endpoint (build_plan §6.2).
//
// The whole 0002 file is idempotent (IF NOT EXISTS / guarded), so re-running is
// a no-op. After applying, it stamps `schema_migrations` with version `0002`.
//
// USAGE (one-shot, from the repo root):
//   npx tsx src/lib/reso/migrations/apply-0002.ts
//
// It loads NEON_DIRECT_CONN_URI from .env.local via dotenv. The connection
// string is NEVER logged. Exit code 0 on success, 1 on failure.
//
// This is a runner, not a library: it has a guarded `main()` that executes only
// when invoked directly, and it also exports `applyMigration0002(conn)` so the
// live schema test (and the provisioning runner) can drive it programmatically.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); the runtime import is
// fine and tsx does not type-check. Suppress the ambient-declaration diagnostic.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

// Node has no global WebSocket the Neon WS Pool can use; wire `ws`. DDL goes over
// the WS Pool (session-capable) on the DIRECT endpoint.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const MIGRATION_VERSION = "0002" as const;
const MIGRATION_FILE = "0002_crm_leadloop.sql" as const;

/** Resolve the 0002 SQL path next to this runner (ESM-safe). */
function migrationSqlPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, MIGRATION_FILE);
}

/**
 * Apply 0002 to the given DIRECT Neon connection string, idempotently, then
 * stamp `schema_migrations`. Resolves to `true` when the version row was newly
 * inserted, `false` when it was already present (re-run no-op). Throws on a real
 * SQL error. The caller owns pool lifecycle is NOT true here — this opens and
 * closes its own pool so it is safe to call standalone.
 */
export async function applyMigration0002(directConn: string): Promise<boolean> {
  const ddl = readFileSync(migrationSqlPath(), "utf8");
  const pool = new Pool({ connectionString: directConn });
  try {
    // The simple-query protocol runs the whole multi-statement DDL script in one
    // round-trip. Every statement is IF NOT EXISTS / guarded → re-run safe.
    await pool.query(ddl);
    // Stamp the ledger (idempotent: ON CONFLICT no-op). Returns the inserted row
    // count so we can report newly-applied vs already-present.
    const stamp = await pool.query(
      `INSERT INTO schema_migrations (version) VALUES ($1)
       ON CONFLICT (version) DO NOTHING
       RETURNING version`,
      [MIGRATION_VERSION],
    );
    return stamp.rowCount === 1;
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  loadEnv({ path: ".env.local" });
  const conn = process.env.NEON_DIRECT_CONN_URI;
  if (!conn) {
    // Never log the value — only that it is missing.
    console.error("[apply-0002] NEON_DIRECT_CONN_URI is not set in .env.local — aborting.");
    process.exit(1);
  }
  try {
    const inserted = await applyMigration0002(conn);
    console.log(
      inserted
        ? "[apply-0002] applied 0002_crm_leadloop and stamped schema_migrations (version 0002)."
        : "[apply-0002] 0002_crm_leadloop already applied (version 0002 present) — tables ensured, no-op.",
    );
    process.exit(0);
  } catch (err) {
    console.error(
      "[apply-0002] FAILED:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

// Run only when invoked directly (tsx/node), not when imported by a test.
// argv[1] may be a relative path; normalize both sides to an absolute file URL
// so the comparison is robust on Windows (backslashes / drive letter).
const invokedDirectly =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  void main();
}
