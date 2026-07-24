// POST /api/skill/end-users/auth/verify — consume a magic-link token and mint a
// session JWT bound to { tenantId, endUserId }. Single-use: the token is marked
// consumed atomically so a link can't be replayed.

import { NextResponse } from "next/server";
import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { ensureEndUserAuthSchema, hashToken, issueSession } from "@/lib/crm/end-user-auth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

type LinkRow = { end_user_id: string; email: string | null };

async function handler(ctx: SkillContext): Promise<NextResponse> {
  if (!ctx.auth.tenantId) {
    return NextResponse.json({ available: false }, { status: 501, headers: NO_STORE });
  }
  const body = await ctx.req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400, headers: NO_STORE });
  }

  await ensureEndUserAuthSchema(ctx.adapter);

  // Atomic consume: only unexpired, unconsumed tokens flip to consumed and
  // return their row. A second click on the same link matches nothing.
  const rows = await ctx.adapter.query<LinkRow>(
    `UPDATE end_user_magic_link
        SET consumed_at = now()
      WHERE token_hash = $1
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING end_user_id, email`,
    [hashToken(token)]
  );
  if (rows.length === 0) {
    return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
  }

  const session = issueSession({
    tenantId: ctx.auth.tenantId,
    endUserId: rows[0].end_user_id,
    email: rows[0].email ?? null,
  });
  return NextResponse.json({ ok: true, sessionToken: session }, { headers: NO_STORE });
}

export const POST = withSkill(handler);
