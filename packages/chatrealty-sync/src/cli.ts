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
import { ResoClient } from "./reso-fetch.js";
import {
  STORAGE_LIMIT_MB,
  STORAGE_LIMIT_BYTES,
  isStorageLimitError,
  storageLimitHelp,
} from "./errors.js";

// Load .env.local (preferred) then .env, without overriding real process env.
loadDotenv({ path: ".env.local" });
loadDotenv();

// STORAGE EXHAUSTION — the failure that reads as "everything is broken".
//
// The database `init` provisions is a Neon free-tier project with a hard 512 MB
// ceiling. A large multi-association MLS does not fit. Two judged sessions
// seeded ~21k then ~28k rows and the next write died with:
//
//   could not extend file because project size limit (512 MB) has been exceeded
//
// Nothing in this CLI or the build guide named that limit, so the session read
// a storage wall as a broken connection string — and `doctor` agreed with it,
// printing "the problem is CHATREALTY_DB_URL, not your MLS" at a tenant whose
// URL was perfect and whose 39 Active listings were serving correctly. The
// person running this is a real-estate agent: "project size limit", "Neon" and
// "could not extend file" are not words they can act on.
//
// The words now live in ./errors.ts, NOT here. They used to live in this file,
// which meant the scaffolded site's cron route — the other way a sync runs —
// returned the raw Postgres string while the CLI translated it, and a fix note
// claimed both paths translated. One importable module, every caller renders it.

/**
 * Print a multi-line help block with the CLI's own prefix on every line.
 * Paragraphs arrive unwrapped (the same text is rendered as JSON by the cron
 * route, where hard line breaks would be noise), so wrap for the terminal here.
 */
function printHelp(help: string): void {
  const width = 84;
  for (const para of help.split("\n")) {
    if (!para) {
      console.error("[chatrealty-sync] ");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (line && line.length + 1 + word.length > width) {
        console.error(`[chatrealty-sync] ${line}`);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) console.error(`[chatrealty-sync] ${line}`);
  }
}

const program = new Command();

program
  .name("chatrealty-sync")
  .description(
    "Sync your MLS RESO Web API feed into your ChatRealty database. " +
      "Full seed on first run, incremental thereafter. Never deletes.",
  )
  // Keep in step with package.json — `--version` reporting 0.1.0 from a 0.5.x
  // install makes every "which version are you on?" answer wrong. It drifted
  // again (0.5.1 while package.json said 0.6.0), which is exactly how a session
  // concludes it is running an old build and re-installs for nothing.
  .version("0.6.2");

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
    // "see the RESO_ lines" meant nothing to the licensed agent reading it —
    // RESO is a standards body, not a word anyone outside MLS plumbing knows.
    // Say what to open and what to paste.
    console.log(
      "  1. Open .env.local and fill in the lines starting with RESO_ — those are the\n" +
        "     feed credentials your MLS issued you (the comment above each one says what\n" +
        "     to paste). RESO is just the industry's name for the standard MLS feed.",
    );
    console.log("  2. Check it all works:         npx @chatrealty/sync doctor");
    console.log("  3. Small test fetch:           npx @chatrealty/sync run --once --dry-run --max 25");
    console.log("  4. Load your listings:         npx @chatrealty/sync run");
    // Step 5 used to be a VPS crontab line. Following it verbatim meant building
    // a server-side cron and never noticing the nightly refresh the site already
    // ships — so the built-in one sat idle. Lead with the thing that needs no work.
    console.log(
      "  5. Daily updates: nothing to set up — your site ships with a built-in nightly\n" +
        "     refresh (/api/sync/cron) that runs on its own once the site is deployed.\n" +
        "     Running `npx @chatrealty/sync run` yourself any time is also fine; both\n" +
        "     share the same checkpoint in your database. To run it from your own\n" +
        "     server instead, see 'Running the sync yourself' in the README.",
    );
  });

program
  .command("networks")
  .description(
    "List the MLS networks/associations your data key can see, with a sampled share of each."
  )
  .option("--pages <n>", "How many pages to sample (default 5)", "5")
  .option("--field <name>", "Network field to group on (default OriginatingSystemName)")
  .action(async (opts: { pages?: string; field?: string }) => {
    // One data key often grants several associations sharing a data network.
    // Seeding all of them can be 85k+ listings and ~26 minutes — most agents
    // serve one or two. Look before you sync.
    const cfg = configFromEnv(process.env, { dryRun: true });
    const client = new ResoClient({
      ...cfg.reso,
      networkField: opts.field || cfg.reso.networkField,
    });

    console.log("[networks] sampling your feed…");
    try {
      const { field, networks, sampled } = await client.discoverNetworks(
        Math.max(1, parseInt(opts.pages || "5", 10) || 5)
      );
      if (networks.length === 0) {
        console.log("[networks] no records returned — check credentials with `doctor`.");
        return;
      }
      console.log("");
      console.log(`  Grouped on: ${field}   (sampled ${sampled} listings)`);
      console.log("");
      for (const n of networks) {
        const pct = ((n.sampled / sampled) * 100).toFixed(1).padStart(5);
        console.log(`  ${pct}%  ${n.name}`);
      }
      console.log("");
      console.log("  Sync ONE or a FEW instead of everything — set in .env.local:");
      console.log(`    RESO_NETWORKS=${networks[0].name}`);
      console.log("    (comma-separated for several; unset = sync everything)");
      console.log("");
    } catch (err) {
      console.error(`[networks] failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// `status` — "is the seed making progress?", answered from OUTSIDE the run.
//
// A sync that is working prints nothing for minutes at a time, and a run
// redirected to a log file gives even less to watch. The checkpoint in the
// database is the ground truth and was previously only reachable by writing SQL
// or curling the site's cron route with a secret. This is that answer, in one
// command, runnable in another terminal while the seed is still going.
program
  .command("status")
  .description("Where the seed is right now — safe to run while a sync is in progress.")
  .action(async () => {
    const conn = process.env.CHATREALTY_DB_URL || process.env.NEON_POOLED_CONN_URI || "";
    if (!conn) {
      console.error(
        "[status] CHATREALTY_DB_URL is not set — run `npx @chatrealty/sync init --token crt_live_…` first.",
      );
      process.exitCode = 1;
      return;
    }
    try {
      const { readSyncStatus } = await import("./index.js");
      const st = await readSyncStatus(conn);
      const inFlight = Boolean(st.cursor);
      console.log(
        `[status] ${inFlight ? `a ${st.passMode ?? "seed"} pass is RUNNING` : "no pass in flight"}`,
      );
      console.log(`[status]   pulled this pass:  ${st.passPulled.toLocaleString()}`);
      console.log(`[status]   written this pass: ${st.passUpserted.toLocaleString()}`);
      // The feed is walked oldest-first, so "through" is the honest measure of
      // how far a seed has come — a record count says nothing about whether
      // today's listings have been reached yet.
      console.log(
        `[status]   reached listings modified through: ${st.cursorWatermark?.slice(0, 10) ?? "—"}`,
      );
      console.log(
        `[status]   completed watermark: ${st.watermark?.slice(0, 10) ?? "none yet — the first full pass hasn't finished"}`,
      );
      if (inFlight) {
        console.log(
          "[status] Run it again in a minute: if the numbers moved, it's working. Nothing to\n" +
            "[status] restart — progress is saved after every page.",
        );
      } else if (!st.watermark) {
        console.log("[status] Nothing has been seeded yet — start with `npx @chatrealty/sync run`.");
      } else {
        console.log("[status] The last pass finished. `npx @chatrealty/sync doctor` checks what landed.");
      }
    } catch (err) {
      console.error(`[status] failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("doctor")
  .description("Validate your setup: database reachable + schema present, MLS feed credentials work.")
  .action(async () => {
    let failures = 0;
    // WHICH KIND of check-1 failure, not just how many. The advice block at the
    // bottom used to key off "did anything in check 1 fail" and always answered
    // "the problem is CHATREALTY_DB_URL" — so a tenant whose connection was
    // perfect and whose seed was merely unfinished (or whose database was full)
    // was told to re-provision. Every one of those failures is reported by code
    // that already knows it is NOT a URL problem; carry that knowledge down.
    type FailKind = "connection" | "seeding" | "storage";
    const failKinds = new Set<FailKind>();
    const okMark = (m: string) => console.log(`  ✓ ${m}`);
    const bad = (m: string, kind?: FailKind) => {
      console.log(`  ✗ ${m}`);
      failures++;
      if (kind) failKinds.add(kind);
    };
    // A warning is something to fix that is NOT blocking the site from working.
    // It must not move the exit code: a CI script or an agent running `echo $?`
    // reads a 1 as "the setup is broken", and telling someone their working site
    // is broken costs more than the warning saves.
    let warnings = 0;
    const warn = (m: string) => {
      console.log(`  ! ${m}`);
      warnings++;
    };

    console.log("[doctor] 1. ChatRealty database");
    const conn = process.env.CHATREALTY_DB_URL || process.env.NEON_POOLED_CONN_URI || "";
    if (!conn) {
      bad(
        "CHATREALTY_DB_URL is not set — run `npx @chatrealty/sync init --token crt_live_…` first.",
        "connection",
      );
    } else {
      try {
        const pgMod = await import("pg");
        const { pgOptions } = await import("./pgconn.js");
        const client = new pgMod.default.Client(pgOptions(conn));
        await client.connect();
        const t = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property') AS ok;`,
        );
        if (!t.rows[0]?.ok) {
          await client.end();
          bad("connected, but the property table is missing (re-run init).", "connection");
        } else {
          // A bare row count is the most misleading number this tool prints.
          // A judged session ran `run --once`, saw "500 rows", concluded the
          // data step was DONE, and filed a critical API bug when the site
          // showed nothing — but 499 of those 500 were Closed archival records
          // and the seed was 0.6% complete. The count was true and the
          // conclusion was wrong, so report what actually determines whether
          // the site has anything to show: ACTIVE rows, and whether the seed
          // pass is still in flight.
          const c = await client.query(`SELECT count(*)::int AS n FROM property;`);
          // Active BY TYPE, not a flat Active count. The site's default browse
          // filters to bucket A (residential FOR SALE) — a lease or a land
          // parcel is Active and still shows nothing. A judged session had
          // exactly 1 Active row, it was a $12,500/mo Residential Lease, doctor
          // said "1 Active listings — this is what your site can show", the
          // browse was empty, and the session filed a critical API bug against
          // a correctly-working API. Every number was true; the sentence was
          // not. Count what the browse actually shows.
          const a = await client.query(
            `SELECT property_type, count(*)::int AS n FROM property
              WHERE standard_status = 'Active' GROUP BY 1;`,
          );
          const s = await client
            .query(`SELECT cursor, pass_mode, pass_upserted, watermark FROM sync_state WHERE id = 1;`)
            .catch(() => ({ rows: [] as any[] }));
          // Photo coverage on the rows the site actually shows. Rows seeded
          // before 0.6.0 have no primary_photo_url at all — the column was
          // never written — and a browse of photo-less cards is the single most
          // visible way a correctly-seeded site still looks broken.
          const ph = await client
            .query(
              `SELECT count(*) FILTER (WHERE primary_photo_url IS NOT NULL)::int AS with_photo,
                      count(*)::int AS n
                 FROM property WHERE standard_status = 'Active';`,
            )
            .catch(() => ({ rows: [{ with_photo: 0, n: 0 }] as any[] }));
          // HOW FULL IS IT. The 512 MB ceiling was invisible until a write hit
          // it, so a tenant found out by watching a seed die — twice, across
          // two sessions, with doctor reporting all-clear in between. Ask the
          // database its own size and say so BEFORE the wall, while there is
          // still time to narrow RESO_NETWORKS instead of starting over.
          const sz = await client
            .query(`SELECT pg_database_size(current_database())::bigint AS bytes;`)
            .catch(() => ({ rows: [] as any[] }));
          await client.end();

          const total = c.rows[0]?.n ?? 0;
          const st = s.rows[0];
          const seedInFlight = Boolean(st?.cursor);

          // Rows seeded before the bucket normalization still hold RESO labels
          // ("Residential"), so normalize both spellings before counting.
          const { normalizePropertyType } = await import("./map.js");
          let activeForSale = 0;
          let activeOther = 0;
          const otherLabels: string[] = [];
          for (const row of a.rows as { property_type: string | null; n: number }[]) {
            if (normalizePropertyType(row.property_type) === "A") {
              activeForSale += row.n;
            } else {
              activeOther += row.n;
              otherLabels.push(`${row.n} ${row.property_type ?? "(untyped)"}`);
            }
          }

          okMark(`connected — property table present, ${total} rows`);
          if (activeForSale > 0) {
            okMark(
              `${activeForSale} Active FOR-SALE listings — this is what your site's browse shows` +
                (activeOther > 0 ? ` (plus ${otherLabels.join(", ")}, which the browse excludes)` : ""),
            );
          } else if (activeOther > 0) {
            bad(
              `0 Active FOR-SALE listings. You do have ${activeOther} Active row(s) —\n` +
                `    ${otherLabels.join(", ")} — but a site's browse shows homes FOR SALE, so it\n` +
                "    will be EMPTY. Leases, land and income property are filtered out by design\n" +
                "    (they're reachable at ?propertyType=B / D / C). This is a SEEDING gap, not\n" +
                "    an API failure: keep seeding until for-sale inventory arrives.",
              "seeding",
            );
          } else {
            bad(
              `0 Active listings (${total} rows, all non-Active). Your site will show an\n` +
                "    empty catalog: Active is what a browse displays. Closed records are\n" +
                "    comps, not inventory. This is a SEEDING gap, not an API failure.",
              "seeding",
            );
          }

          // Storage headroom. Reported BEFORE the seed/photo verdicts below,
          // because when the database is full every one of those is a symptom
          // and this is the cause — and the recovery is different (make room,
          // don't keep running the sync into a wall).
          const usedBytes = Number(sz.rows[0]?.bytes ?? 0);
          if (usedBytes > 0) {
            const usedMb = Math.round(usedBytes / (1024 * 1024));
            const pct = Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100);
            if (pct >= 90) {
              bad(
                `database storage is ${pct}% full (${usedMb} MB of about ${STORAGE_LIMIT_MB} MB).\n` +
                  "    New listings can no longer be written — the load will stop, and everything\n" +
                  "    below about an unfinished load is a SYMPTOM of this, not a separate problem.\n" +
                  "    Your existing listings keep serving. See 'What to do next' at the end.",
                "storage",
              );
            } else if (pct >= 70) {
              warn(
                `database storage is ${pct}% full (${usedMb} MB of about ${STORAGE_LIMIT_MB} MB).\n` +
                  "    Not blocking yet. If the load is still running it may not fit: narrowing\n" +
                  "    RESO_NETWORKS to the associations you actually serve is the cheapest fix,\n" +
                  "    and it is much easier to do now than after the database fills.",
              );
            } else {
              okMark(`database storage ${usedMb} MB used of about ${STORAGE_LIMIT_MB} MB (${pct}%)`);
            }
          }
          const withPhoto = ph.rows[0]?.with_photo ?? 0;
          const activeRows = ph.rows[0]?.n ?? 0;
          if (activeRows > 0) {
            if (withPhoto === 0) {
              warn(
                "none of your Active listings have a photo. Cards, the map popups and the\n" +
                  "    detail hero will all read 'No photo available'. Photos arrive with the\n" +
                  "    listing itself from 0.6.0 on — re-run `npx @chatrealty/sync run` on the\n" +
                  "    current version to backfill them. (Not blocking: the site works, it just\n" +
                  "    looks empty. If your feed can't serve $expand=Media the run says so.)",
              );
            } else {
              okMark(
                `${withPhoto} of ${activeRows} Active listings have a photo` +
                  (withPhoto < activeRows ? " (the rest have none in the feed)" : ""),
              );
            }
          }

          if (seedInFlight) {
            bad(
              `the seed is INCOMPLETE — pass "${st?.pass_mode ?? "seed"}" is still in flight\n` +
                `    (${st?.pass_upserted ?? 0} rows written so far, a saved cursor is waiting).\n` +
                "    The feed is walked oldest-first, so an unfinished seed holds mostly old\n" +
                "    archival records. Finish it: `npx @chatrealty/sync run` (no --once, no --max),\n" +
                "    or let the deployed hourly Vercel cron finish it over a few ticks.",
              "seeding",
            );
          } else if (total > 0 && !st?.watermark) {
            // Rows present, no cursor, no watermark: a pass wrote data but none
            // ever completed. Historically this was invisible — the tenant that
            // triggered this check had 3,600 rows, no checkpoint at all, and
            // doctor called it "all green" while the seed restarted from 1998
            // on every run and never reached current inventory.
            //
            // Severity depends on whether the site can show homes TODAY. With
            // for-sale inventory present this is a freshness problem: real, worth
            // fixing, not a broken setup — so it warns and leaves the exit code
            // alone. `--once` / `--max` runs land here by design (a capped run
            // deliberately never commits a checkpoint), and a session that read
            // exit 1 after a correct capped run reported the whole install as
            // failing. With NO for-sale inventory it stays a hard failure.
            const msg =
              `${total} rows are here but NO checkpoint was ever committed — every run has been\n` +
              "    restarting the seed from the oldest record in your feed, so it never reaches\n" +
              "    today's listings. Re-run `npx @chatrealty/sync run` with no --once and no\n" +
              "    --max (0.5.1 or newer): it checkpoints into your database after every page\n" +
              "    and resumes from there. (A capped run never checkpoints, on purpose.)";
            if (activeForSale > 0) {
              warn(
                msg +
                  "\n    Not blocking: your site HAS for-sale listings to show right now — this is\n" +
                  "    about staying current, so this check does not fail.",
              );
            } else {
              bad(msg, "seeding");
            }
          }
        }
      } catch (err) {
        // A full database can fail mid-query too. Calling that "connection
        // failed" is how a storage wall got diagnosed as a bad URL.
        const msg = (err as Error).message;
        if (isStorageLimitError(msg)) {
          bad(`the database is full: ${msg}`, "storage");
        } else {
          bad(`connection failed: ${msg}`, "connection");
        }
      }
    }

    // Which half failed decides what advice is worth printing below.
    const dbFailures = failures;

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
        // "pulled a sample record" reads as jargon to an agent, who then can't
        // tell whether it means the setup is finished. Say what it proves.
        if (got > 0) okMark("your MLS credentials work — we fetched one test listing from your feed");
        else bad("feed authenticated but returned no records.");
      } catch (err) {
        const e = err as Error;
        if (e.name === "RateLimitedError" || /\b429\b/.test(e.message)) {
          // 429 is not a broken setup and should never read like one. The limit
          // is on the API KEY, so an earlier run — even one from a different
          // session on the same credentials — can leave the next one throttled
          // at its first request.
          bad(
            "your MLS is rate-limiting this API key (HTTP 429). Your credentials are FINE —\n" +
              "    the key's request quota is spent, and quotas are per KEY, so an earlier run on\n" +
              "    the same credentials can use it up. Wait and re-check (15-60 min is typical;\n" +
              "    your MLS sets the window). Seeding resumes from its checkpoint — nothing lost.",
          );
        } else {
          bad(`feed check failed: ${e.message}`);
        }
      }
    }

    if (failures === 0) {
      if (warnings > 0) {
        console.log("[doctor] no blockers — you're ready: npx @chatrealty/sync run");
        console.log(
          `[doctor] ${warnings} warning(s) above (marked !): worth fixing, but your site works today.`,
        );
      } else {
        console.log("[doctor] all green — you're ready: npx @chatrealty/sync run");
      }
    } else {
      // ✓/✗ with no next step is a dead end for the person running this, who is
      // an agent, not an ops engineer. Name which half failed and what to do.
      //
      // Only the half that ACTUALLY failed. Printing both bullets told a session
      // whose database check passed cleanly that "Check 1 (database) failed",
      // which is worse than printing nothing.
      const feedFailures = failures - dbFailures;
      console.log(
        `[doctor] ${failures} check(s) failed. ✓ = working, ✗ = needs fixing, ! = worth fixing but not blocking.`,
      );
      console.log("[doctor] What to do next:");
      // Answer the failure that ACTUALLY happened. "Check 1 failed → your URL is
      // wrong" is true for exactly one of the three ways check 1 can fail, and a
      // judged session was handed it while connected, reading, and serving 39
      // listings — its database was simply full. Re-running `init` there would
      // have provisioned an empty database and discarded a two-session load.
      if (failKinds.has("storage")) {
        console.log("  • Check 1 (database) failed because it is OUT OF ROOM — not because of your URL.");
        printHelp(storageLimitHelp(process.env));
      }
      if (failKinds.has("connection")) {
        console.log(
          "  • Check 1 (database) failed to CONNECT → the problem is CHATREALTY_DB_URL, not your MLS.\n" +
            "    Re-run `npx @chatrealty/sync init --token crt_live_…` to provision the database\n" +
            "    and write the URL into .env.local.",
        );
      }
      if (failKinds.has("seeding") && !failKinds.has("storage")) {
        console.log(
          "  • Check 1 (database) connected fine — what failed is that your listings aren't all\n" +
            "    loaded yet. Do NOT re-run `init`: it provisions a NEW empty database and throws\n" +
            "    away what you have. Run `npx @chatrealty/sync run` (no --once, no --max) and let\n" +
            "    it finish; `npx @chatrealty/sync status` from another terminal shows it moving.",
        );
      }
      if (feedFailures > 0) {
        console.log(
          "  • Check 2 (MLS feed) failed → the problem is your MLS credentials, not the database.\n" +
            "    'missing env' means the vars aren't set (or aren't loaded — check .env.local).\n" +
            "    'feed check failed' means they ARE set but your MLS rejected them: confirm the\n" +
            "    token hasn't expired and RESO_BASE_URL matches your MLS exactly.\n" +
            "    'returned no records' means the credentials work but your feed is empty —\n" +
            "    that is an MLS-side permissions question for your association.",
        );
      }
      // Only when the DATABASE ITSELF is the problem. A seeding failure plus a
      // feed failure is one problem, not two: fix the credentials and the seed
      // finishes. "Fix the database first" would send someone re-provisioning a
      // database that was working the whole time.
      if ((failKinds.has("connection") || failKinds.has("storage")) && feedFailures > 0) {
        console.log("  • Both failed → work top-down: fix the database first, then re-run doctor.");
      } else if (failKinds.has("seeding") && feedFailures > 0) {
        console.log(
          "  • These are ONE problem, not two: the load can't finish while your MLS credentials\n" +
            "    are rejected. Fix check 2, then re-run the sync — the database is fine.",
        );
      }
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

    // A REAL seed runs on the DATABASE checkpoint, not the local state file.
    //
    // `runSync` kept its watermark in ./.sync-state and wrote it only after the
    // whole feed finished. Two things followed, and together they are why a
    // tenant could sync for three sessions and still have zero for-sale
    // inventory: (1) any interruption — a 429, a Ctrl-C — discarded the entire
    // run's progress, and (2) the file is per-DIRECTORY, so the next session,
    // in a fresh project folder, started from the beginning of time again. The
    // feed is walked ModificationTimestamp ASC, so restarting always re-walked
    // the oldest archival closings and never reached current listings.
    //
    // `runSyncSlice` already checkpoints into the tenant's own `sync_state`
    // table after every page. Looping it here is what the build guide has been
    // promising all along ("the checkpoint lives in my database, so local runs
    // and the Vercel cron hand off to each other seamlessly") — now true.
    //
    // Capped/dry runs stay on the old path on purpose: they must not touch the
    // shared checkpoint.
    const useCheckpoint = !opts.dryRun && maxRecords === undefined;

    if (useCheckpoint) {
      console.log(
        `[chatrealty-sync] starting — checkpoint in your database, resumable; ` +
          `overlap=${cfg.overlapHours}h batch=${cfg.batchSize}`,
      );
      try {
        const { runSyncSlice } = await import("./index.js");
        let totalPulled = 0;
        let totalUpserted = 0;
        let slices = 0;
        let last;
        for (;;) {
          // A generous per-slice budget: this is a local run with no function
          // timeout, so slices exist here only as checkpoint boundaries.
          //
          // SAY SOMETHING EVERY FEW PAGES. The only progress line used to be
          // the one printed when a slice ENDED — i.e. every 15 minutes — so a
          // judged session ran `... run > sync.log` and watched the file hold a
          // single "starting" line for 40 minutes, unable to tell a working
          // seed from a hung one. The feed is walked oldest-first, so the
          // "through" date is the number that actually answers the question
          // being asked: have we reached current listings yet?
          last = await runSyncSlice(cfg, {
            budgetMs: 15 * 60_000,
            onPage: (p) => {
              if (p.pages % 5 !== 0) return;
              const through = p.cursorWatermark ? p.cursorWatermark.slice(0, 10) : "…";
              console.log(
                `[chatrealty-sync]   … ${p.passPulled.toLocaleString()} pulled, ` +
                  `${p.passUpserted.toLocaleString()} written — through ${through}`,
              );
            },
          });
          slices += 1;
          totalPulled += last.pulledThisSlice;
          totalUpserted += last.upsertedThisSlice;
          if (last.done) break;
          console.log(
            `[chatrealty-sync]   … ${last.passPulled.toLocaleString()} pulled so far ` +
              `(checkpoint saved, continuing)`,
          );
        }
        const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
          `[chatrealty-sync] done in ${secs}s — mode=${last.mode} ` +
            `pulled=${totalPulled} upserted=${totalUpserted} ` +
            `watermark=${last.watermark ?? "none"}` +
            (slices > 1 ? ` (${slices} checkpointed slices)` : ""),
        );
        if (last.resumed) {
          console.log(
            "[chatrealty-sync]   resumed an unfinished seed from its saved checkpoint — " +
              "nothing was re-walked from the start.",
          );
        }
        console.log(
          "[chatrealty-sync] Now run `npx @chatrealty/sync doctor` — it reports whether you have " +
            "ACTIVE FOR-SALE listings, which is the only thing that puts homes on your site.",
        );
      } catch (err) {
        const e = err as Error;
        console.error(`[chatrealty-sync] sync stopped: ${e.message}`);
        // The raw message is Postgres talking to a DBA ("could not extend file
        // because project size limit (512 MB) has been exceeded"). Left alone it
        // sent a session hunting a connection-string bug for a whole sitting.
        if (isStorageLimitError(e.message)) printHelp(storageLimitHelp(process.env));
        if (e.name === "RateLimitedError") {
          console.error(
            "[chatrealty-sync] Your progress IS saved — the checkpoint advances after every page.\n" +
              "[chatrealty-sync] Re-run `npx @chatrealty/sync run` later (try 15-60 min) and it\n" +
              "[chatrealty-sync] resumes exactly where it stopped. The limit is per API KEY, so it\n" +
              "[chatrealty-sync] can be spent by an earlier run on the same credentials.",
          );
        }
        process.exitCode = 1;
      }
      return;
    }

    // Capped and dry runs take the legacy file-state path on purpose: they must
    // not touch the checkpoint in the database. Printing `state=./.sync-state`
    // here read as "the database checkpoint is broken, it's using a file" and was
    // filed as a bug. Say which mode this is instead of naming an internal path.
    console.log(
      `[chatrealty-sync] starting ${opts.dryRun ? "(dry-run) " : ""}` +
        `${maxRecords ? `capped at ${maxRecords} records — smoke test, ` : ""}` +
        `your database checkpoint is left untouched; ` +
        `overlap=${cfg.overlapHours}h batch=${cfg.batchSize}`,
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
      // The counts alone don't say whether this went well — a judged session
      // read `pulled=500` off a `--once` smoke test as "the data step is done",
      // built the whole site on a 500-row slice of one city, and only found out
      // when the browse didn't match the market. Spell out what happened.
      console.log(
        `[chatrealty-sync]   pulled     ${result.pulled} — records your MLS returned this run` +
          (result.mode === "seed" ? " (first run: everything)" : " (changed since the last run)"),
      );
      console.log(
        `[chatrealty-sync]   upserted   ${result.upserted} — rows written to your database`,
      );
      if (result.skippedKeyless > 0) {
        console.log(
          `[chatrealty-sync]   skipped    ${result.skippedKeyless} — records with no listing key,` +
            ` which cannot be stored. A handful is normal; hundreds means a feed-mapping problem.`,
        );
      }
      if (maxRecords && result.pulled >= maxRecords) {
        console.log(
          `[chatrealty-sync] ⚠ CAPPED AT ${maxRecords}. This was a SMOKE TEST, not a full seed —` +
            ` your database now holds an arbitrary ${maxRecords}-record slice of your feed, which` +
            ` may be mostly one city.\n` +
            `[chatrealty-sync]   Your site will look wrong until you seed for real:` +
            ` run \`npx @chatrealty/sync run\` with no --once and no --max.\n` +
            `[chatrealty-sync]   (A capped run deliberately leaves the checkpoint untouched, so` +
            ` the real seed still starts from where it should.)`,
        );
      } else if (!result.dryRun) {
        console.log(
          `[chatrealty-sync] Healthy looks like: upserted ≈ pulled, skipped near zero, a watermark set.` +
            ` Now open /listings and confirm the homes shown are in the cities you serve.`,
        );
      }
    } catch (err) {
      const e = err as Error;
      console.error(`[chatrealty-sync] sync failed: ${e.message}`);
      if (isStorageLimitError(e.message)) printHelp(storageLimitHelp(process.env));
      if (e.name === "RateLimitedError") {
        console.error(
          "[chatrealty-sync] This is a QUOTA, not a broken setup. Rate limits are per API KEY,\n" +
            "[chatrealty-sync] so a previous run on the same credentials can spend it. Wait\n" +
            "[chatrealty-sync] (15-60 min is typical) and re-run.",
        );
      }
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
