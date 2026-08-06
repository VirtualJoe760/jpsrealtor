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
// Load .env.local (preferred) then .env, without overriding real process env.
loadDotenv({ path: ".env.local" });
loadDotenv();
const program = new Command();
program
    .name("chatrealty-sync")
    .description("Sync your MLS RESO Web API feed into your ChatRealty database. " +
    "Full seed on first run, incremental thereafter. Never deletes.")
    .version("0.1.0");
program
    .command("init")
    .description("Provision (or reconnect to) your ChatRealty database and write CHATREALTY_DB_URL into .env.local. Self-serve — no waiting on anyone.")
    .option("--token <crt_live_token>", "Your ChatRealty API token (Settings → Integrations). Falls back to CHATREALTY_API_TOKEN in the env.")
    .option("--api-base <url>", "ChatRealty API base.", "https://www.chatrealty.io")
    .action(async (opts) => {
    const token = opts.token || process.env.CHATREALTY_API_TOKEN || "";
    if (!token) {
        console.error("[init] a token is required: --token crt_live_… (mint one at Settings → Integrations on your ChatRealty site).");
        process.exitCode = 1;
        return;
    }
    const base = opts.apiBase.replace(/\/+$/, "");
    console.log(`[init] provisioning your ChatRealty database via ${base} …`);
    let res;
    try {
        res = await fetch(`${base}/api/skill/tenant/provision`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
    }
    catch (err) {
        console.error(`[init] network error: ${err.message}`);
        process.exitCode = 1;
        return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error(`[init] failed (HTTP ${res.status}): ${body?.message || body?.error || "unknown error"}`);
        process.exitCode = 1;
        return;
    }
    // Merge CHATREALTY_DB_URL into .env.local (create if missing). The URL is
    // a credential: written 0600, printed only masked.
    const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
    const envPath = ".env.local";
    let lines = existsSync(envPath)
        ? readFileSync(envPath, "utf8").split("\n")
        : [];
    lines = lines.filter((l) => !l.startsWith("CHATREALTY_DB_URL="));
    if (lines.length && lines[lines.length - 1].trim() !== "")
        lines.push("");
    lines.push(`CHATREALTY_DB_URL=${body.dbUrl}`);
    if (!lines.some((l) => l.startsWith("RESO_BASE_URL"))) {
        lines.push("", "# Your MLS feed credentials — fill in ONE auth mode:", "# Mode A (Spark access token — simplest):", "# RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData", "# RESO_BEARER_TOKEN=", "# Mode B (RESO Web API OAuth2 client-credentials):", "# RESO_TOKEN_URL=", "# RESO_CLIENT_ID=", "# RESO_CLIENT_SECRET=");
    }
    writeFileSync(envPath, lines.join("\n") + "\n", { mode: 0o600 });
    const masked = String(body.dbUrl || "").replace(/\/\/([^:]+):[^@]+@/, "//$1:****@");
    console.log(`[init] ${body.created ? "database created" : "reconnected to your existing database"} — tenant ${body.tenantId}`);
    console.log(`[init] wrote CHATREALTY_DB_URL to .env.local (${masked})`);
    console.log("[init] next steps:");
    console.log("  1. Add your MLS feed credentials to .env.local (see the RESO_ lines).");
    console.log("  2. Validate everything:        npx @chatrealty/sync doctor");
    console.log("  3. Small local test fetch:     npx @chatrealty/sync run --once --dry-run --max 25");
    console.log("  4. Full seed:                  npx @chatrealty/sync run");
    console.log("  5. Daily sync (VPS, cron):     0 6 * * * cd /path/to/project && npx @chatrealty/sync run >> sync.log 2>&1");
});
program
    .command("networks")
    .description("List the MLS networks/associations your data key can see, with a sampled share of each.")
    .option("--pages <n>", "How many pages to sample (default 5)", "5")
    .option("--field <name>", "Network field to group on (default OriginatingSystemName)")
    .action(async (opts) => {
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
        const { field, networks, sampled } = await client.discoverNetworks(Math.max(1, parseInt(opts.pages || "5", 10) || 5));
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
    }
    catch (err) {
        console.error(`[networks] failed: ${err.message}`);
        process.exitCode = 1;
    }
});
program
    .command("doctor")
    .description("Validate your setup: database reachable + schema present, MLS feed credentials work.")
    .action(async () => {
    let failures = 0;
    const okMark = (m) => console.log(`  ✓ ${m}`);
    const bad = (m) => {
        console.log(`  ✗ ${m}`);
        failures++;
    };
    console.log("[doctor] 1. ChatRealty database");
    const conn = process.env.CHATREALTY_DB_URL || process.env.NEON_POOLED_CONN_URI || "";
    if (!conn) {
        bad("CHATREALTY_DB_URL is not set — run `npx @chatrealty/sync init --token crt_live_…` first.");
    }
    else {
        try {
            const pgMod = await import("pg");
            const client = new pgMod.default.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
            await client.connect();
            const t = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property') AS ok;`);
            if (!t.rows[0]?.ok) {
                await client.end();
                bad("connected, but the property table is missing (re-run init).");
            }
            else {
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
                const a = await client.query(`SELECT property_type, count(*)::int AS n FROM property
              WHERE standard_status = 'Active' GROUP BY 1;`);
                const s = await client
                    .query(`SELECT cursor, pass_mode, pass_upserted, watermark FROM sync_state WHERE id = 1;`)
                    .catch(() => ({ rows: [] }));
                await client.end();
                const total = c.rows[0]?.n ?? 0;
                const st = s.rows[0];
                const seedInFlight = Boolean(st?.cursor);
                // Rows seeded before the bucket normalization still hold RESO labels
                // ("Residential"), so normalize both spellings before counting.
                const { normalizePropertyType } = await import("./map.js");
                let activeForSale = 0;
                let activeOther = 0;
                const otherLabels = [];
                for (const row of a.rows) {
                    if (normalizePropertyType(row.property_type) === "A") {
                        activeForSale += row.n;
                    }
                    else {
                        activeOther += row.n;
                        otherLabels.push(`${row.n} ${row.property_type ?? "(untyped)"}`);
                    }
                }
                okMark(`connected — property table present, ${total} rows`);
                if (activeForSale > 0) {
                    okMark(`${activeForSale} Active FOR-SALE listings — this is what your site's browse shows` +
                        (activeOther > 0 ? ` (plus ${otherLabels.join(", ")}, which the browse excludes)` : ""));
                }
                else if (activeOther > 0) {
                    bad(`0 Active FOR-SALE listings. You do have ${activeOther} Active row(s) —\n` +
                        `    ${otherLabels.join(", ")} — but a site's browse shows homes FOR SALE, so it\n` +
                        "    will be EMPTY. Leases, land and income property are filtered out by design\n" +
                        "    (they're reachable at ?propertyType=B / D / C). This is a SEEDING gap, not\n" +
                        "    an API failure: keep seeding until for-sale inventory arrives.");
                }
                else {
                    bad(`0 Active listings (${total} rows, all non-Active). Your site will show an\n` +
                        "    empty catalog: Active is what a browse displays. Closed records are\n" +
                        "    comps, not inventory. This is a SEEDING gap, not an API failure.");
                }
                if (seedInFlight) {
                    bad(`the seed is INCOMPLETE — pass "${st?.pass_mode ?? "seed"}" is still in flight\n` +
                        `    (${st?.pass_upserted ?? 0} rows written so far, a saved cursor is waiting).\n` +
                        "    The feed is walked oldest-first, so an unfinished seed holds mostly old\n" +
                        "    archival records. Finish it: `npx @chatrealty/sync run` (no --once, no --max),\n" +
                        "    or let the deployed hourly Vercel cron finish it over a few ticks.");
                }
                else if (total > 0 && !st?.watermark) {
                    // Rows present, no cursor, no watermark: a pass wrote data but none
                    // ever completed. Historically this was invisible — the tenant that
                    // triggered this check had 3,600 rows, no checkpoint at all, and
                    // doctor called it "all green" while the seed restarted from 1998
                    // on every run and never reached current inventory.
                    bad(`${total} rows are here but NO checkpoint was ever committed — every run has been\n` +
                        "    restarting the seed from the oldest record in your feed, so it never reaches\n" +
                        "    today's listings. Re-run `npx @chatrealty/sync run` (0.5.0 or newer): it\n" +
                        "    checkpoints into your database after every page and resumes from there.");
                }
            }
        }
        catch (err) {
            bad(`connection failed: ${err.message}`);
        }
    }
    console.log("[doctor] 2. MLS feed credentials");
    const missing = ["RESO_BASE_URL", "RESO_TOKEN_URL", "RESO_CLIENT_ID", "RESO_CLIENT_SECRET"].filter((k) => !process.env[k]);
    const hasBearer = !!process.env.RESO_BEARER_TOKEN;
    if (missing.length > 0 && !hasBearer) {
        bad(`missing env: ${missing.join(", ")} (or RESO_BEARER_TOKEN)`);
    }
    else {
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
            if (got > 0)
                okMark("your MLS credentials work — we fetched one test listing from your feed");
            else
                bad("feed authenticated but returned no records.");
        }
        catch (err) {
            const e = err;
            if (e.name === "RateLimitedError" || /\b429\b/.test(e.message)) {
                // 429 is not a broken setup and should never read like one. The limit
                // is on the API KEY, so an earlier run — even one from a different
                // session on the same credentials — can leave the next one throttled
                // at its first request.
                bad("your MLS is rate-limiting this API key (HTTP 429). Your credentials are FINE —\n" +
                    "    the key's request quota is spent, and quotas are per KEY, so an earlier run on\n" +
                    "    the same credentials can use it up. Wait and re-check (15-60 min is typical;\n" +
                    "    your MLS sets the window). Seeding resumes from its checkpoint — nothing lost.");
            }
            else {
                bad(`feed check failed: ${e.message}`);
            }
        }
    }
    if (failures === 0) {
        console.log("[doctor] all green — you're ready: npx @chatrealty/sync run");
    }
    else {
        // ✓/✗ with no next step is a dead end for the person running this, who is
        // an agent, not an ops engineer. Name which half failed and what to do.
        console.log(`[doctor] ${failures} check(s) failed. ✓ = working, ✗ = needs fixing.`);
        console.log("[doctor] What to do next:");
        console.log("  • Check 1 (database) failed → the problem is CHATREALTY_DB_URL, not your MLS.\n" +
            "    Re-run `npx @chatrealty/sync init --token crt_live_…` to provision the database\n" +
            "    and write the URL into .env.local.");
        console.log("  • Check 2 (MLS feed) failed → the problem is your MLS credentials, not the database.\n" +
            "    'missing env' means the vars aren't set (or aren't loaded — check .env.local).\n" +
            "    'feed check failed' means they ARE set but your MLS rejected them: confirm the\n" +
            "    token hasn't expired and RESO_BASE_URL matches your MLS exactly.\n" +
            "    'returned no records' means the credentials work but your feed is empty —\n" +
            "    that is an MLS-side permissions question for your association.");
        console.log("  • Both failed → work top-down: fix the database first, then re-run doctor.");
        process.exitCode = 1;
    }
});
program
    .command("run", { isDefault: true })
    .description("Run the sync (seed first time, incremental after).")
    .option("--once", "Single bounded pass: cap records and exit (smoke test).")
    .option("--dry-run", "Pull + map but do NOT write to the database.")
    .option("--max <n>", "Cap the number of records pulled.", (v) => parseInt(v, 10))
    .action(async (opts) => {
    const maxRecords = opts.max ?? (opts.once ? 500 : undefined);
    let cfg;
    try {
        cfg = configFromEnv(process.env, { dryRun: !!opts.dryRun, maxRecords });
    }
    catch (err) {
        console.error(`[chatrealty-sync] config error: ${err.message}`);
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
        console.log(`[chatrealty-sync] starting — checkpoint in your database, resumable; ` +
            `overlap=${cfg.overlapHours}h batch=${cfg.batchSize}`);
        try {
            const { runSyncSlice } = await import("./index.js");
            let totalPulled = 0;
            let totalUpserted = 0;
            let slices = 0;
            let last;
            for (;;) {
                // A generous per-slice budget: this is a local run with no function
                // timeout, so slices exist here only as checkpoint boundaries.
                last = await runSyncSlice(cfg, { budgetMs: 15 * 60_000 });
                slices += 1;
                totalPulled += last.pulledThisSlice;
                totalUpserted += last.upsertedThisSlice;
                if (last.done)
                    break;
                console.log(`[chatrealty-sync]   … ${last.passPulled.toLocaleString()} pulled so far ` +
                    `(checkpoint saved, continuing)`);
            }
            const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.log(`[chatrealty-sync] done in ${secs}s — mode=${last.mode} ` +
                `pulled=${totalPulled} upserted=${totalUpserted} ` +
                `watermark=${last.watermark ?? "none"}` +
                (slices > 1 ? ` (${slices} checkpointed slices)` : ""));
            if (last.resumed) {
                console.log("[chatrealty-sync]   resumed an unfinished seed from its saved checkpoint — " +
                    "nothing was re-walked from the start.");
            }
            console.log("[chatrealty-sync] Now run `npx @chatrealty/sync doctor` — it reports whether you have " +
                "ACTIVE FOR-SALE listings, which is the only thing that puts homes on your site.");
        }
        catch (err) {
            const e = err;
            console.error(`[chatrealty-sync] sync stopped: ${e.message}`);
            if (e.name === "RateLimitedError") {
                console.error("[chatrealty-sync] Your progress IS saved — the checkpoint advances after every page.\n" +
                    "[chatrealty-sync] Re-run `npx @chatrealty/sync run` later (try 15-60 min) and it\n" +
                    "[chatrealty-sync] resumes exactly where it stopped. The limit is per API KEY, so it\n" +
                    "[chatrealty-sync] can be spent by an earlier run on the same credentials.");
            }
            process.exitCode = 1;
        }
        return;
    }
    console.log(`[chatrealty-sync] starting ${opts.dryRun ? "(dry-run) " : ""}` +
        `state=${cfg.statePath} overlap=${cfg.overlapHours}h batch=${cfg.batchSize}` +
        (maxRecords ? ` max=${maxRecords}` : ""));
    try {
        const result = await runSync(cfg);
        const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`[chatrealty-sync] done in ${secs}s — mode=${result.mode} ` +
            `pulled=${result.pulled} mapped=${result.mapped} ` +
            `upserted=${result.upserted} skippedKeyless=${result.skippedKeyless} ` +
            `watermark=${result.newWatermark ?? "none"}` +
            (result.dryRun ? " (no writes)" : ""));
        // The counts alone don't say whether this went well — a judged session
        // read `pulled=500` off a `--once` smoke test as "the data step is done",
        // built the whole site on a 500-row slice of one city, and only found out
        // when the browse didn't match the market. Spell out what happened.
        console.log(`[chatrealty-sync]   pulled     ${result.pulled} — records your MLS returned this run` +
            (result.mode === "seed" ? " (first run: everything)" : " (changed since the last run)"));
        console.log(`[chatrealty-sync]   upserted   ${result.upserted} — rows written to your database`);
        if (result.skippedKeyless > 0) {
            console.log(`[chatrealty-sync]   skipped    ${result.skippedKeyless} — records with no listing key,` +
                ` which cannot be stored. A handful is normal; hundreds means a feed-mapping problem.`);
        }
        if (maxRecords && result.pulled >= maxRecords) {
            console.log(`[chatrealty-sync] ⚠ CAPPED AT ${maxRecords}. This was a SMOKE TEST, not a full seed —` +
                ` your database now holds an arbitrary ${maxRecords}-record slice of your feed, which` +
                ` may be mostly one city.\n` +
                `[chatrealty-sync]   Your site will look wrong until you seed for real:` +
                ` run \`npx @chatrealty/sync run\` with no --once and no --max.\n` +
                `[chatrealty-sync]   (A capped run deliberately leaves the checkpoint untouched, so` +
                ` the real seed still starts from where it should.)`);
        }
        else if (!result.dryRun) {
            console.log(`[chatrealty-sync] Healthy looks like: upserted ≈ pulled, skipped near zero, a watermark set.` +
                ` Now open /listings and confirm the homes shown are in the cities you serve.`);
        }
    }
    catch (err) {
        const e = err;
        console.error(`[chatrealty-sync] sync failed: ${e.message}`);
        if (e.name === "RateLimitedError") {
            console.error("[chatrealty-sync] This is a QUOTA, not a broken setup. Rate limits are per API KEY,\n" +
                "[chatrealty-sync] so a previous run on the same credentials can spend it. Wait\n" +
                "[chatrealty-sync] (15-60 min is typical) and re-run.");
        }
        process.exitCode = 1;
    }
});
program.parseAsync(process.argv);
