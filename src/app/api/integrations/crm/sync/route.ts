// src/app/api/integrations/crm/sync/route.ts
//
// POST → "Sync now" on the HighLevel card. Runs one chunk of the agent's
// contact feed after the response is sent; the card polls GET
// /api/integrations/crm for progress. { full: true } restarts the backfill
// from the first contact (e.g. after the agent cleaned up HighLevel).

import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queueFullHighLevelSync, runHighLevelSync } from "@/lib/highlevel-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  let full = false;
  try {
    full = (await req.json())?.full === true;
  } catch {
    /* no body */
  }
  if (full) await queueFullHighLevelSync(userId);
  after(() => runHighLevelSync(userId, 240_000));
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
