// src/app/api/integrations/mls-feed/estimate/route.ts
//
// POST → exact counts and a size verdict for a selection, against the agent's
// storage allowance. Body (all optional — missing parts fall back to what's
// saved): { propertyTypes, closedLookback }. Never writes listings; caches the
// result on the record so the card loads instantly next time.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeScope } from "@/lib/mls-scope";
import { estimateScope, savedScope } from "@/lib/mls-seed";

// ~13 exact $count requests to the agent's MLS, a few at a time.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const body = (await req.json().catch(() => ({}))) || {};
  const current = await savedScope(session.user.id);
  const scope = normalizeScope(
    {
      propertyTypes: body.propertyTypes ?? current.propertyTypes,
      closedLookback: body.closedLookback ?? current.closedLookback,
    },
    current.networks
  );
  if ("error" in scope) {
    return NextResponse.json({ ok: false, message: scope.error }, { status: 400, headers: NO_STORE });
  }
  const est = await estimateScope(session.user.id, scope);
  return NextResponse.json(est, { headers: NO_STORE });
}
