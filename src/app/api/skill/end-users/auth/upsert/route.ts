// POST /api/skill/end-users/auth/upsert — social-login identity exchange.
//
// An agent's site verifies a visitor's identity with its OWN OAuth apps
// (Google/Facebook via NextAuth on the site). Its SERVER then posts the
// verified identity here with the site's crt bearer token, and gets back an
// end-user session JWT — the same session the magic-link verify issues — so
// favorites sync and the CRM lead loop work identically for every sign-in
// method.
//
// TRUST MODEL: this endpoint is only callable with the tenant's own site
// token (server-side), and it can only mint sessions for THAT tenant — the
// same server-to-server trust as contacts/from-signup. A stolen crt token
// already implies full tenant access; this adds no new surface. Requires an
// email (the dedupe key); never returns other contacts' data.

import { NextResponse } from "next/server";
import { mirrorContactToOwner } from "@/lib/crm/mirror-to-owner";
import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { onSignup } from "@/lib/crm/end-user";
import { ensureEndUserAuthSchema, issueSession } from "@/lib/crm/end-user-auth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function handler(ctx: SkillContext): Promise<NextResponse> {
  if (!ctx.auth.tenantId) {
    return NextResponse.json({ available: false }, { status: 501, headers: NO_STORE });
  }

  const body = await ctx.req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : undefined;
  const provider = typeof body?.provider === "string" ? body.provider.slice(0, 32) : "oauth";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400, headers: NO_STORE });
  }

  try {
    // End-user accounts live in the tenant's Postgres. A token with no Neon
    // tenant resolves to the legacy Mongo adapter, where the account tables
    // don't exist — say so plainly instead of 500ing on raw SQL or minting a
    // session with a null id.
    if ((ctx.adapter as { dialect?: string }).dialect === "mongo") {
      return NextResponse.json(
        { error: "accounts_unavailable", message: "Visitor accounts require a connected tenant database." },
        { status: 503, headers: NO_STORE }
      );
    }
    await ensureEndUserAuthSchema(ctx.adapter);
    // Create/link the end-user + mirror a deduped Contact (non-blocking CRM).
    const { endUserId } = await onSignup(ctx.adapter, {
      email,
      name,
      source: "website",
      tags: [`Sign in: ${provider}`],
    });

    // BRIDGE: mirror into the OWNING AGENT's Mongo CRM + activity feed.
    await mirrorContactToOwner({
      agentId: ctx.auth.user._id as any,
      email,
      name,
      endUserId,
      source: `oauth:${provider}`,
      tags: ["Website Signup", `Sign in: ${provider}`],
      activityType: "signup",
    });

    const sessionToken = issueSession({
      tenantId: ctx.auth.tenantId,
      endUserId,
      email,
    });
    return NextResponse.json({ ok: true, sessionToken }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502, headers: NO_STORE });
  }
}

export const POST = withSkill(handler);
