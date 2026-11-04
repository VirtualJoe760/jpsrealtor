// src/app/api/cron/highlevel-sync/route.ts
//
// Vercel cron, every 5 minutes (vercel.json). Advances every connected
// agent's ChatRealty → HighLevel contact feed by one time-boxed chunk
// (src/lib/highlevel-sync.ts). An agent who is caught up costs one indexed
// query, so most ticks return quickly.
//
// Auth: same CRON_SECRET bearer check as the other cron routes; /api/cron is
// exempt from the session gate in proxy.ts because each route verifies this.

import { NextRequest, NextResponse } from "next/server";
import { processHighLevelSyncs } from "@/lib/highlevel-sync";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const runs = await processHighLevelSyncs(240_000);
  return NextResponse.json(
    { runs: runs.map((r) => ({ ...r, userId: r.userId.slice(-6) })) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
