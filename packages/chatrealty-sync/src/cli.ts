#!/usr/bin/env node
// packages/chatrealty-sync/src/cli.ts
//
// Spec 8 — the `chatrealty-sync` CLI. The daily cron entry the customer (or
// their Claude) runs to pull their MLS RESO feed into their own ChatRealty
// database.
//
//   chatrealty-sync run            # full seed on first run, incremental after
//   chatrealty-sync run --once     # one bounded pass (smoke test, capped)
//   chatrealty-sync run --dry-run  # map everything, write nothing
//
// Secrets are read from the environment (.env.local auto-loaded). Nothing
// secret is printed. NEVER deletes — there is no purge subcommand by design
// (build_plan §6.8, the April-6-2026 incident).

import { config as loadDotenv } from "dotenv";
import { Command } from "commander";

import { configFromEnv, runSync } from "./index.js";

// Load .env.local (preferred) then .env, without overriding real process env.
loadDotenv({ path: ".env.local" });
loadDotenv();

const program = new Command();

program
  .name("chatrealty-sync")
  .description(
    "Sync your MLS RESO Web API feed into your ChatRealty database. " +
      "Full seed on first run, incremental thereafter. Never deletes.",
  )
  .version("0.1.0");

program
  .command("init")
  .description(
    "Provision (or reconnect to) your ChatRealty database and write CHATREALTY_DB_URL into .env.local. Self-serve — no waiting on anyone.",
  )
  .option("--token <crt_live_token>", "Your ChatRealty API token (Settings → Integrations). Falls back to CHATREALTY_API_TOKEN in the env.")
  .option("--api-base <url>", "ChatRealty API base.", "https://www.chatrealty.io")
  .action(async (opts: { token?: string; apiBase: string }) => {
    const token = opts.token || process.env.CHATREALTY_API_TOKEN || "";
    if (!token) {
      console.error("[init] a token is required: --token crt_live_… (mint one at Settings → Integrations on your ChatRealty site).");
      process.exitCode = 1;
      return;
    }
    const base = opts.apiBase.replace(/\/+$/, "");
    console.log(`[init] provisioning your ChatRealty database via ${base} …`);
    let res: Response;
    try {
      res = await fetch(`${base}/api/skill/tenant/provision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error(`[init] network error: ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[init] failed (HTTP ${res.status}): ${body?.message || body?.error || "unknown error"}`);
      process.exitCode = 1;
      return;
    }

    // Merge CHATREALTY_DB_URL into .env.local (create if missing). The URL is
    // a credential: written 0600, printed only masked.
    const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
    const envPath = ".env.local";
    let lines: string[] = existsSync(envPath)
      ? readFileSync(envPath, "utf8").split("\n")
      : [];
    lines = lines.filter((l) => !l.startsWith("CHATREALTY_DB_URL="));
    if (lines.length && lines[lines.length - 1].trim() !== "") lines.push("");
    lines.push(`CHATREALTY_DB_URL=${body.dbUrl}`);
    if (!lines.some((l) => l.startsWith("RESO_BASE_URL"))) {
      lines.push(
        "",
        "# Your MLS feed credentials — fill in ONE auth mode:",
        "# Mode A (Spark access token — simplest):",
        "# RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData",
        "# RESO_BEARER_TOKEN=",
        "# Mode B (RESO Web API OAuth2 client-credentials):",
        "# RESO_TOKEN_URL=",
        "# RESO_CLIENT_ID=",
        "# RESO_CLIENT_SECRET=",
      );
    }
    writeFileSync(envPath, lines.join("\n") + "\n", { mode: 0o600 });

    const masked = String(body.dbUrl || "").replace(/\/\/([^:]+):[^@]+@/, "//$1:****@");
    console.log(`[init] ${body.created ? "database created" : "reconnected to your existing database"} — tenant ${body.tenantId}`);
    console.log(`[init] wrote CHATREALTY_DB_URL to .env.local (${masked})`);
    console.log("[init] next steps:");
    console.log("  1. Add your MLS feed credentials to .env.local (see the RESO_ lines).");
    console.log("  2. Validate everything:        npx chatrealty-sync doctor");
    console.log("  3. Small local test fetch:     npx chatrealty-sync run --once --dry-run --max 25");
    console.log("  4. Full seed:                  npx chatrealty-sync run");
    console.log("  5. Daily sync (VPS, cron):     0 6 * * * cd /path/to/project && npx chatrealty-sync run >> sync.log 2>&1");
  });

program
  .command("doctor")
  .description("Validate your setup: database reachable + schema present, MLS feed credentials work.")
  .action(async () => {
    let failures = 0;
    const okMark = (m: string) => console.log(`  ✓ ${m}`);
    const bad = (m: string) => {
      console.log(`  ✗ ${m}`);
      failures++;
    };

    console.log("[doctor] 1. ChatRealty database");
    const conn = process.env.CHATREALTY_DB_URL || process.env.NEON_POOLED_CONN_URI || "";
    if (!conn) {
      bad("CHATREALTY_DB_URL is not set — run `npx chatrealty-sync init --token crt_live_…` first.");
    } else {
      try {
        const pgMod = await import("pg");
        const client = new pgMod.default.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const t = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property') AS ok;`,
        );
        const c = await client.query(`SELECT count(*)::int AS n FROM property;`);
        await client.end();
        if (t.rows[0]?.ok) okMark(`connected — property table present, ${c.rows[0]?.n} rows`);
        else bad("connected, but the property table is missing (re-run init).");
      } catch (err) {
        bad(`connection failed: ${(err as Error).message}`);
      }
    }

    console.log("[doctor] 2. MLS feed credentials");
    const missing = ["RESO_BASE_URL", "RESO_TOKEN_URL", "RESO_CLIENT_ID", "RESO_CLIENT_SECRET"].filter(
      (k) => !process.env[k],
    );
    const hasBearer = !!process.env.RESO_BEARER_TOKEN;
    if (missing.length > 0 && !hasBearer) {
      bad(`missing env: ${missing.join(", ")} (or RESO_BEARER_TOKEN)`);
    } else {
      try {
        const cfg = configFromEnv(process.env, { dryRun: true, maxRecords: 1 });
        const { ResoClient } = await import("./index.js");
        const client = new ResoClient(cfg.reso);
        let got = 0;
        for await (const _rec of client.pullProperties({ since: null, maxRecords: 1 })) {
          got++;
          break;
        }
        if (got > 0) okMark("feed reachable — pulled a sample record");
        else bad("feed authenticated but returned no records.");
      } catch (err) {
        bad(`feed check failed: ${(err as Error).message}`);
      }
    }

    if (failures === 0) {
      console.log("[doctor] all green — you're ready: npx chatrealty-sync run");
    } else {
      console.log(`[doctor] ${failures} check(s) failed.`);
      process.exitCode = 1;
    }
  });

program
  .command("run", { isDefault: true })
  .description("Run the sync (seed first time, incremental after).")
  .option("--once", "Single bounded pass: cap records and exit (smoke test).")
  .option("--dry-run", "Pull + map but do NOT write to the database.")
  .option("--max <n>", "Cap the number of records pulled.", (v) => parseInt(v, 10))
  .action(async (opts: { once?: boolean; dryRun?: boolean; max?: number }) => {
    const maxRecords = opts.max ?? (opts.once ? 500 : undefined);
    let cfg;
    try {
      cfg = configFromEnv(process.env, { dryRun: !!opts.dryRun, maxRecords });
    } catch (err) {
      console.error(`[chatrealty-sync] config error: ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    const startedAt = Date.now();
    console.log(
      `[chatrealty-sync] starting ${opts.dryRun ? "(dry-run) " : ""}` +
        `state=${cfg.statePath} overlap=${cfg.overlapHours}h batch=${cfg.batchSize}` +
        (maxRecords ? ` max=${maxRecords}` : ""),
    );

    try {
      const result = await runSync(cfg);
      const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `[chatrealty-sync] done in ${secs}s — mode=${result.mode} ` +
          `pulled=${result.pulled} mapped=${result.mapped} ` +
          `upserted=${result.upserted} skippedKeyless=${result.skippedKeyless} ` +
          `watermark=${result.newWatermark ?? "none"}` +
          (result.dryRun ? " (no writes)" : ""),
      );
    } catch (err) {
      console.error(`[chatrealty-sync] sync failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
