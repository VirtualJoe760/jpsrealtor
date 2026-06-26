#!/usr/bin/env -S npx tsx
// packages/chatrealty-sync/src/cli.ts
//
// Spec 8 — the `chatrealty-sync` CLI. The daily cron entry the customer (or
// their Claude) runs to pull their MLS RESO feed into their own ChatRealty Neon
// tenant DB.
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

import { configFromEnv, runSync } from "./index";

// Load .env.local (preferred) then .env, without overriding real process env.
loadDotenv({ path: ".env.local" });
loadDotenv();

const program = new Command();

program
  .name("chatrealty-sync")
  .description(
    "Sync your MLS RESO Web API feed into your ChatRealty Neon tenant database. " +
      "Full seed on first run, incremental thereafter. Never deletes.",
  )
  .version("0.1.0");

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
