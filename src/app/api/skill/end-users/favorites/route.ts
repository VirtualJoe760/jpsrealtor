// GET/PUT /api/skill/end-users/favorites — the signed-in end-user's saved
// listing keys, stored in the tenant DB. Per-user data → no-store. GET returns
// the keys; PUT replaces the whole set (the client owns the canonical list).

import { NextResponse } from "next/server";
import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { ensureEndUserAuthSchema, verifySession } from "@/lib/crm/end-user-auth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

function endUser(ctx: SkillContext) {
  if (!ctx.auth.tenantId) return { err: NextResponse.json({ available: false }, { status: 501, headers: NO_STORE }) };
  const eu = verifySession(ctx.req.headers.get("x-end-user-session"), ctx.auth.tenantId);
  if (!eu) return { err: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE }) };
  return { eu };
}

async function get(ctx: SkillContext): Promise<NextResponse> {
  const { eu, err } = endUser(ctx);
  if (err) return err;
  await ensureEndUserAuthSchema(ctx.adapter);
  const rows = await ctx.adapter.query<{ listing_key: string }>(
    `SELECT listing_key FROM end_user_favorite WHERE end_user_id = $1 ORDER BY saved_at DESC`,
    [eu!.endUserId]
  );
  return NextResponse.json({ keys: rows.map((r) => r.listing_key) }, { headers: NO_STORE });
}

async function put(ctx: SkillContext): Promise<NextResponse> {
  const { eu, err } = endUser(ctx);
  if (err) return err;
  const body = await ctx.req.json().catch(() => ({}));
  const keys: string[] = Array.isArray(body?.keys)
    ? Array.from(new Set(body.keys.filter((k: unknown) => typeof k === "string" && k))).slice(0, 1000) as string[]
    : [];

  await ensureEndUserAuthSchema(ctx.adapter);
  if (keys.length === 0) {
    await ctx.adapter.query(`DELETE FROM end_user_favorite WHERE end_user_id = $1`, [eu!.endUserId]);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }
  // Add any new keys, then drop any that are no longer in the client's set.
  await ctx.adapter.query(
    `INSERT INTO end_user_favorite (end_user_id, listing_key)
       SELECT $1, unnest($2::text[])
     ON CONFLICT (end_user_id, listing_key) DO NOTHING`,
    [eu!.endUserId, keys]
  );
  await ctx.adapter.query(
    `DELETE FROM end_user_favorite
       WHERE end_user_id = $1 AND NOT (listing_key = ANY($2::text[]))`,
    [eu!.endUserId, keys]
  );
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export const GET = withSkill(get);
export const PUT = withSkill(put);
