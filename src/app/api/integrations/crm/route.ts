// src/app/api/integrations/crm/route.ts
//
// HighLevel connection status for the Settings → Integrations card.
// GET    → sanitized status (never tokens)
// DELETE → forget the tokens (the agent can also uninstall the app in HighLevel)
//
// Path says "crm", not "highlevel": HighLevel refuses redirect URLs containing
// its own name, and the callback sits beside this route. See src/lib/highlevel.ts.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHighLevelStatus, disconnectHighLevel } from "@/lib/highlevel";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json(await getHighLevelStatus(session.user.id), { headers: NO_STORE });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await disconnectHighLevel(session.user.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
