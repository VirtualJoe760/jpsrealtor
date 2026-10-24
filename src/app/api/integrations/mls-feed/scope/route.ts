// src/app/api/integrations/mls-feed/scope/route.ts
//
// PUT → save which property types and how much closed history the agent's
// database should hold: { propertyTypes: string[], closedLookback }.
// Associations are saved separately (mls-feed/networks). See src/lib/mls-scope.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeScope } from "@/lib/mls-scope";
import { saveScope, savedScope } from "@/lib/mls-seed";

const NO_STORE = { "Cache-Control": "no-store" };

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const body = await req.json().catch(() => null);
  const current = await savedScope(session.user.id);
  const scope = normalizeScope(body, current.networks);
  if ("error" in scope) {
    return NextResponse.json({ ok: false, message: scope.error }, { status: 400, headers: NO_STORE });
  }
  await saveScope(session.user.id, scope);
  return NextResponse.json({ ok: true, scope }, { headers: NO_STORE });
}
