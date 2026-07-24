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
    return NextResponse.json(
      {
        seeding: Boolean(state.cursor),
        progress: state.cursor
          ? `${state.passPulled.toLocaleString()} listings so far — resuming next tick`
          : "caught up",
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
