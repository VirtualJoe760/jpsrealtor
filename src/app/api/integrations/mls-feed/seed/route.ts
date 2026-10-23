// src/app/api/integrations/mls-feed/seed/route.ts
//
// POST → start seeding the agent's database from their stored MLS key and
// saved selection. The server re-checks the size against the plan (the card's
// disabled button is not the enforcement) and refuses with the tier that would
// fit. On success it answers at once and runs the first chunk after the
// response; /api/cron/mls-sync carries on from there every few minutes.

import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runSyncChunk, startSeed } from "@/lib/mls-seed";

export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const userId = session.user.id;
  const result = await startSeed(userId);
  if ("reason" in result) {
    const status = result.reason === "too_big" ? 403 : result.reason === "busy" ? 409 : 400;
    return NextResponse.json(result, { status, headers: NO_STORE });
  }
  // First chunk right away — the agent shouldn't wait up to five minutes for
  // the cron to notice. Budget leaves headroom under maxDuration.
  after(async () => {
    await runSyncChunk(userId, 240_000).catch(() => {});
  });
  return NextResponse.json({ ok: true, expectedRows: result.expectedRows }, { headers: NO_STORE });
}
