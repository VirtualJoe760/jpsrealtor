// GET /api/sync/cron — one time-boxed slice of the MLS sync. No VPS anywhere:
// Vercel calls this hourly (vercel.json), each call resumes from a checkpoint
// stored in your ChatRealty database, works for up to ~11 minutes, and exits
// cleanly. A fresh full-network seed (~85k listings) completes in a few ticks;
// nightly increments finish in one. Kill-safe: upserts are idempotent and the
// cursor advances only after a page is fully written.
//
// Setup: set CHATREALTY_DB_URL + your feed credentials (RESO_BEARER_TOKEN +
// RESO_BASE_URL, or the RESO OAuth set) in this project's Vercel env vars.
// CRON_SECRET (any random string) locks the route; Vercel sends it
// automatically once the env var exists. The scaffolder writes one into
// .env.local for you — copy the SAME value into Vercel when you deploy.
//
// THIS ROUTE IS CLOSED WITHOUT CRON_SECRET. It used to be open when the env
// var was missing, on the reasoning that an unset secret meant "not locked
// yet" — which is exactly backwards, because unset is the DEFAULT. A judged
// session curled ?status=1 with no header on a site that had followed the
// guide end to end and got the whole sync state back: cursor position, error
// text, watermark, timings. Anyone who could guess the path had it. Missing
// config now fails closed and says which variable to set.
//
// Check progress anytime: GET /api/sync/cron?status=1
//
// TESTING IT LOCALLY. Vercel cannot call localhost, so nothing fires this route
// in dev — a judged session set CRON_SECRET and then had no way to confirm the
// route worked at all. Call it yourself, with the same header Vercel sends:
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "http://localhost:3000/api/sync/cron?status=1"     # cheap: read state
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "http://localhost:3000/api/sync/cron"              # real: runs a slice
//
// (PowerShell: curl.exe, not the `curl` alias, or the -H is ignored.)
//
// What you should see:
//   • {"skipped":"sync not configured"} → CHATREALTY_DB_URL or the RESO_* vars
//     are missing from .env.local. The route is fine; the config isn't.
//   • {"error":"unauthorized"} → the header doesn't match CRON_SECRET.
//   • {"error":"cron_secret_not_configured"} → CRON_SECRET is missing entirely.
//     Generate one (`openssl rand -hex 32`), put it in .env.local AND in your
//     Vercel env vars, and restart the dev server.
//   • {"seeding":true,"progress":…} → working. That is the whole confirmation.
//   • {"stalled":true,"lastError":…} → a pass IS checkpointed but the last tick
//     died, and the next one will die the same way. `progress` says what on.
// Run the status call before and after the real one: `progress` should move.
//
// WHEN A SLICE FAILS, this route answers in the same words the CLI uses — the
// translation is imported from @chatrealty/sync, not re-written here. It used
// to return `e.message` verbatim, so a full database surfaced as
// {"error":"could not extend file because project size limit (512 MB) has been
// exceeded"} to an agent whose only other tool said "YOUR DATABASE IS FULL" in
// plain English. Same condition, two vocabularies, one of them unusable.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 800; // Vercel clamps to your plan's ceiling

const NO_STORE = { "Cache-Control": "no-store" };

function configured(): boolean {
  return Boolean(
    process.env.CHATREALTY_DB_URL &&
      (process.env.RESO_BEARER_TOKEN || process.env.RESO_TOKEN_URL) &&
      process.env.RESO_BASE_URL
  );
}

export async function GET(req: NextRequest) {
  // Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when the
  // env var is set. Status checks are allowed with the same secret.
  //
  // Fail CLOSED when it isn't set (see the header comment). 503 rather than
  // 401 because the caller did nothing wrong — the deployment is misconfigured
  // — and because the body has to name the fix: a bare 401 sent an agent
  // hunting for a secret nobody had generated.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: "cron_secret_not_configured",
        whatToDo:
          "Set CRON_SECRET to any random string (openssl rand -hex 32) in .env.local and in " +
          "your Vercel env vars, then restart. Until it is set this route stays closed — it " +
          "exposes sync state and triggers a real MLS pull.",
      },
      { status: 503, headers: NO_STORE }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (!configured()) {
    // Test-data / not-yet-connected sites: succeed quietly so cron dashboards
    // stay green until the feed is configured.
    return NextResponse.json({ skipped: "sync not configured" }, { headers: NO_STORE });
  }

  const { runSyncSlice, readSyncStatus, configFromEnv, explainSyncError, isStalled } = await import(
    "@chatrealty/sync"
  );

  if (req.nextUrl.searchParams.get("status")) {
    const state = await readSyncStatus(process.env.CHATREALTY_DB_URL as string);
    // "caught up" was reported for THREE different states: seed finished, seed
    // never started, and seed died before committing a watermark. A judged
    // session read `{"seeding":false,"progress":"caught up"}` off a database
    // that had never completed a single pass and concluded the data was in
    // place. Only a committed watermark means caught up.
    //
    // A SAVED CURSOR IS NOT A HEARTBEAT. The next judged session hit the other
    // half of the same problem: `{"seeding":true,"progress":"26,400 listings
    // so far — resuming next tick"}` on a database that was FULL. The cursor
    // was real, the count was real, and the next tick had no chance of moving
    // it — every one of them died on the same storage error. The slice records
    // why it stopped (sync_state.last_error, cleared by the next page that
    // lands), so "resuming" is claimed only when nothing blocks it.
    //
    // AND `last_error` IS NOT ENOUGH EITHER. It is written from the catch
    // block, so on a full database that write dies with everything else — and
    // a database seeded before 0.6.3 has no such column at all. Both land in
    // the same shape the NEXT judged session reported: cursor set, lastError
    // null, "resuming next tick" on a permanently stuck tenant. `isStalled`
    // falls back to how long the checkpoint itself has sat unchanged, which
    // needs nothing to succeed at failure time. Never re-derive staleness from
    // lastError here; the two sides of the loop must agree.
    const stopped = state.lastError ? explainSyncError?.(state.lastError, process.env) : null;
    const stalled = isStalled?.(state) === true;
    // Every string below is read by a licensed real-estate agent, not an
    // engineer. "watermark", "cursor" and "next tick" mean nothing to them —
    // a judged session flagged all three. The machine-readable fields keep
    // their names; `progress` and `state` say what is happening in English.
    const progress = state.cursor
      ? stalled
        ? `${state.passPulled.toLocaleString()} listings loaded, then it STOPPED — it will not ` +
          `get further on its own. ` +
          (stopped?.error ?? state.lastError
            ? `Cause: ${stopped?.error ?? state.lastError}`
            : `No cause was recorded, which usually means the database is full. ` +
              `Run \`npx @chatrealty/sync doctor\` — it reports how full it is.`)
        : `${state.passPulled.toLocaleString()} listings loaded so far — still going; the next ` +
          `hourly run picks up where this one left off`
      : state.watermark
        ? "up to date — the first full load finished and nightly updates are keeping it current"
        : "not started — no listings have been loaded yet; the next hourly run begins the first load";
    return NextResponse.json(
      {
        seeding: Boolean(state.cursor) && !stalled,
        // Distinct from `seeding`: a pass IS checkpointed, it just isn't
        // advancing. Without this a caller sees seeding:false and reads it as
        // "nothing in flight".
        stalled,
        started: Boolean(state.cursor || state.watermark),
        progress,
        // Plain-English aliases for the two fields agents misread. The
        // original names stay for anything already parsing them.
        firstLoadComplete: Boolean(state.watermark),
        lastSyncCompleted: state.watermark,
        lastProgressAt: state.updatedAt ?? null,
        watermark: state.watermark,
        lastRunAt: state.lastRunAt,
        lastError: state.lastError,
        lastErrorAt: state.lastErrorAt,
        ...(stopped ? { reason: stopped.code, whatToDo: stopped.whatToDo } : {}),
        ...(stalled && !stopped
          ? {
              reason: "stopped_without_recorded_cause",
              whatToDo: [
                "Run `npx @chatrealty/sync doctor` — a full database is the usual cause, and it reports that.",
                "Then `npx @chatrealty/sync run` to see the failure in full.",
                "Do not wait for the next hourly run; it fails the same way.",
              ],
            }
          : {}),
      },
      { headers: NO_STORE }
    );
  }

  try {
    const cfg = configFromEnv(process.env);
    // Leave headroom under maxDuration for connection teardown + response.
    const budget = Number(process.env.SYNC_SLICE_BUDGET_MS) || 700_000;
    const result = await runSyncSlice(cfg, { budgetMs: budget });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "sync failed";
    const explained = explainSyncError?.(raw, process.env);
    if (explained) {
      // A full database is not a server fault and shouldn't read as one. 200 +
      // an explicit `ok:false` keeps cron dashboards from paging on a condition
      // the agent has to resolve, while still saying plainly that it stopped.
      return NextResponse.json(
        {
          ok: false,
          reason: explained.code,
          error: explained.error,
          whatToDo: explained.whatToDo,
          detail: explained.detail,
        },
        { status: explained.code === "database_full" ? 200 : 503, headers: NO_STORE }
      );
    }
    return NextResponse.json({ ok: false, error: raw }, { status: 500, headers: NO_STORE });
  }
}
