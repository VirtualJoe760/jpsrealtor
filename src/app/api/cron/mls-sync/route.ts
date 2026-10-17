// src/app/api/cron/mls-sync/route.ts
//
// Vercel cron, every 5 minutes (vercel.json). Two jobs:
//   1. During the 3 AM Pacific hour, queue the nightly update for every agent
//      whose last seed/update finished (once per day — fixed schedule for all).
//   2. Advance any queued or running seed/update by one time-boxed chunk.
// Most ticks find nothing to do and return in milliseconds.
//
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is
// set — same check as the other cron routes. /api/cron is exempt from the
// session gate in proxy.ts precisely because each route verifies this itself.

import { NextRequest, NextResponse } from "next/server";
import { enqueueNightlyUpdates, processDueSyncs } from "@/lib/mls-seed";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const queued = await enqueueNightlyUpdates();
  const runs = await processDueSyncs(240_000);
  return NextResponse.json(
    { queued, runs: runs.map((r) => ({ user: r.userId.slice(-6), ...r, userId: undefined })) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
