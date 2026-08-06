// scripts/repair-tenant-leadloop.mjs
//
// Apply migration 0004_leadloop_repair to tenant databases that were
// provisioned before it existed.
//
// WHY: `POST /api/skill/contacts/from-signup` returned 500 for every lead a
// self-serve tenant site captured. The route was correct; the tenant database
// had no `end_user` table — the self-serve provisioning path applied only the
// Drizzle listings migration and nothing ever applied 0002_crm_leadloop
// (`applyMigration0002()` had zero callers). Provisioning now runs the repair on
// both create and reconnect, so a tenant heals the next time its owner runs
// `npx @chatrealty/sync init`. This script heals the ones already out there
// without waiting for that.
//
// USAGE (repo root):
//   node scripts/repair-tenant-leadloop.mjs --all
//   node scripts/repair-tenant-leadloop.mjs t-someagent-abc123
//   node scripts/repair-tenant-leadloop.mjs --all --dry-run
//
// Reads MONGODB_URI + SECRETS_ENCRYPTION_KEY from .env.local. Never prints a
// connection string. Idempotent: re-running is a no-op.

import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import pg from "pg";

loadEnv({ path: ".env.local" });
loadEnv({ path: "env.local" });
loadEnv();

const DDL_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "reso",
  "migrations",
  "0004_leadloop_repair.sql",
);

/** AES-256-GCM, `<iv>:<ciphertext>:<authTag>` base64 — mirrors src/lib/secrets.ts. */
function decryptSecret(payload) {
  const [ivB64, ctB64, tagB64] = String(payload).split(":");
  const key = Buffer.from(process.env.SECRETS_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32) throw new Error("SECRETS_ENCRYPTION_KEY must decode to 32 bytes");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  d.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([d.update(Buffer.from(ctB64, "base64")), d.final()]).toString("utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");
  const ids = args.filter((a) => !a.startsWith("--"));
  if (!all && ids.length === 0) {
    console.error("usage: node scripts/repair-tenant-leadloop.mjs (--all | <tenantId> …) [--dry-run]");
    process.exit(1);
  }

  const ddl = readFileSync(DDL_PATH, "utf8");
  await mongoose.connect(process.env.MONGODB_URI);
  const tenants = mongoose.connection.db.collection("tenants");
  const query = all ? { status: "active" } : { tenantId: { $in: ids } };
  const rows = await tenants.find(query).toArray();
  if (rows.length === 0) {
    console.log("[repair] no matching tenants");
    await mongoose.disconnect();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const t of rows) {
    if (!t.directConnStringEncrypted) {
      console.log(`[repair] ${t.tenantId}: no stored direct connection — skipped`);
      failed++;
      continue;
    }
    if (dryRun) {
      console.log(`[repair] ${t.tenantId}: would apply 0004_leadloop_repair`);
      continue;
    }
    const client = new pg.Client({ connectionString: decryptSecret(t.directConnStringEncrypted) });
    try {
      await client.connect();
      await client.query(ddl);
      const check = await client.query(
        `SELECT
           EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='end_user') AS end_user,
           EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='contact'
                      AND column_name='linked_user_id') AS contact_linked;`,
      );
      const r = check.rows[0];
      console.log(
        `[repair] ${t.tenantId}: end_user=${r.end_user ? "yes" : "NO"} contact.linked_user_id=${r.contact_linked ? "yes" : "NO"}`,
      );
      if (r.end_user && r.contact_linked) ok++;
      else failed++;
    } catch (err) {
      console.error(`[repair] ${t.tenantId}: FAILED — ${err.message}`);
      failed++;
    } finally {
      await client.end().catch(() => {});
    }
  }

  console.log(`[repair] done — ${ok} repaired, ${failed} failed/skipped`);
  await mongoose.disconnect();
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[repair] fatal:", err.message);
  process.exit(1);
});
