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
// automatically once the env var exists.
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
//   • {"error":"unauthorized"} → the header doesn't match CRON_SECRET. Note that
//     with CRON_SECRET UNSET the route is open — set it before deploying.
//   • {"seeding":…,"progress":…} → working. That is the whole confirmation.
// Run the status call before and after the real one: `progress` should move.

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
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (!configured()) {
    // Test-data / not-yet-connected sites: succeed quietly so cron dashboards
    // stay green until the feed is configured.
    return NextResponse.json({ skipped: "sync not configured" }, { headers: NO_STORE });
  }

  const { runSyncSlice, readSyncStatus, configFromEnv } = await import("@chatrealty/sync");

  if (req.nextUrl.searchParams.get("status")) {
    const state = await readSyncStatus(process.env.CHATREALTY_DB_URL as string);
    // "caught up" was reported for THREE different states: seed finished, seed
    // never started, and seed died before committing a watermark. A judged
    // session read `{"seeding":false,"progress":"caught up"}` off a database
    // that had never completed a single pass and concluded the data was in
    // place. Only a committed watermark means caught up.
    const progress = state.cursor
      ? `${state.passPulled.toLocaleString()} listings so far — resuming next tick`
      : state.watermark
        ? "caught up"
        : "not started — no sync pass has completed yet; the next cron tick begins the seed";
    return NextResponse.json(
      {
        seeding: Boolean(state.cursor),
        started: Boolean(state.cursor || state.watermark),
        progress,
        watermark: state.watermark,
        lastRunAt: state.lastRunAt,
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sync failed" },
      { status: 500, headers: NO_STORE }
    );
  }
}
