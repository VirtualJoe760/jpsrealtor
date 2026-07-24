// GET /api/skill/end-users/me — resolve the signed-in end-user from the session
// header (X-End-User-Session), scoped to the site token's tenant.

import { NextResponse } from "next/server";
import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { verifySession } from "@/lib/crm/end-user-auth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

type MeRow = { email: string | null; name: string | null };

async function handler(ctx: SkillContext): Promise<NextResponse> {
  if (!ctx.auth.tenantId) {
    return NextResponse.json({ available: false }, { status: 501, headers: NO_STORE });
  }
  const eu = verifySession(ctx.req.headers.get("x-end-user-session"), ctx.auth.tenantId);
  if (!eu) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const rows = await ctx.adapter.query<MeRow>(
    `SELECT email::text AS email, name FROM end_user WHERE id = $1`,
    [eu.endUserId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json({ email: rows[0].email, name: rows[0].name }, { headers: NO_STORE });
}

export const GET = withSkill(handler);
