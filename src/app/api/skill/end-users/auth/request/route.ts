// POST /api/skill/end-users/auth/request — an agent's site asks ChatRealty to
// email a magic sign-in link to one of its visitors. Tenant-scoped via the
// site's bearer token (withSkill injects that tenant's adapter). The end-user
// account + magic-link token live in the tenant DB; the Contact is mirrored
// into the tenant CRM (the lead loop). No account enumeration — always 200.

import { NextResponse } from "next/server";
import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { onSignup } from "@/lib/crm/end-user";
import {
  ensureEndUserAuthSchema,
  newMagicToken,
  MAGIC_LINK_TTL_SQL,
  sendMagicLinkEmail,
} from "@/lib/crm/end-user-auth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// The email link must point back to the agent's OWN site. Accept https, or http
// only for localhost (dev). Reject anything else so we never email an
// attacker-chosen destination.
function validOrigin(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const u = new URL(raw);
    const localhost = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "https:" || (u.protocol === "http:" && localhost)) {
      return u.origin;
    }
    return null;
  } catch {
    return null;
  }
}

async function handler(ctx: SkillContext): Promise<NextResponse> {
  // No tenant → accounts can't be persisted here. Tell the site so it degrades
  // to guest (its client treats 501 as "unavailable").
  if (!ctx.auth.tenantId) {
    return NextResponse.json({ available: false }, { status: 501, headers: NO_STORE });
  }

  const body = await ctx.req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const origin = validOrigin(body?.origin);
  if (!email || !email.includes("@") || !origin) {
    return NextResponse.json({ error: "Invalid email or origin." }, { status: 400, headers: NO_STORE });
  }
  const siteName = typeof body?.siteName === "string" && body.siteName.trim()
    ? body.siteName.trim()
    : new URL(origin).hostname;

  try {
    await ensureEndUserAuthSchema(ctx.adapter);
    // Registers/links the end-user AND mirrors a deduped Contact (non-blocking).
    const { endUserId } = await onSignup(ctx.adapter, {
      email,
      source: "website",
      tags: ["Website Signin"],
    });

    const { token, hash } = newMagicToken();
    await ctx.adapter.query(
      `INSERT INTO end_user_magic_link (token_hash, end_user_id, email, expires_at)
         VALUES ($1, $2, $3, ${MAGIC_LINK_TTL_SQL})`,
      [hash, endUserId, email]
    );

    await sendMagicLinkEmail({
      to: email,
      url: `${origin}/account/verify?token=${encodeURIComponent(token)}`,
      siteName,
    });

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch {
    // Don't leak whether the failure was email vs DB; the site shows a generic
    // "try again". A missing RESEND key surfaces here in dev.
    return NextResponse.json({ ok: false }, { status: 502, headers: NO_STORE });
  }
}

export const POST = withSkill(handler);
