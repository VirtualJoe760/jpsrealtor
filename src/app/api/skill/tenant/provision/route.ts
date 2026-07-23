// src/app/api/skill/tenant/provision/route.ts
//
// POST → self-serve ChatRealty-database provisioning (ship-strategy Phase P).
// Any valid crt_live token; idempotent per agent; returns the database
// connection URLs (the bearer token is the trust anchor — see provision.ts).
// Called by `npx @chatrealty/sync init`, which writes CHATREALTY_DB_URL into
// the customer's .env.local so the string never has to pass through a chat.
//
// Admin (dogfood) accounts refuse: the owner's accounts serve the internal
// dataset and must not be rebound to a tenant DB by accident.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import { hashToken } from "@/lib/secrets";
import { provisionTenant } from "@/lib/tenant/provision";

const NO_STORE = { "Cache-Control": "no-store" };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Neon create + migration comfortably fits

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  if (auth.dataSource === "dogfood") {
    return NextResponse.json(
      {
        error: "owner_account",
        message:
          "This is a ChatRealty-internal owner account — it serves the internal dataset and doesn't get a tenant database.",
      },
      { status: 403, headers: NO_STORE }
    );
  }

  // Recompute the caller's token hash for the tenant binding.
  const header = req.headers.get("authorization") || "";
  const raw = header.match(/^Bearer\s+(crt_live_[A-Za-z0-9_-]+)$/)?.[1];
  if (!raw) {
    return NextResponse.json({ error: "missing_token" }, { status: 401, headers: NO_STORE });
  }

  await dbConnect();
  try {
    const user = auth.user;
    const result = await provisionTenant({
      ownerUserId: String(user._id),
      slugSeed:
        (user.agentProfile as any)?.subdomain || user.name || user.email || String(user._id),
      displayName: user.name || undefined,
      tokenHash: hashToken(raw),
      tokenLast4: auth.tokenLast4,
      tokenName: auth.tokenName,
    });

    return NextResponse.json(
      {
        created: result.created,
        tenantId: result.tenantId,
        // Customer-facing names only — this is their ChatRealty database.
        dbUrl: result.dbUrl,
        directDbUrl: result.directDbUrl,
        message: result.created
          ? "Your ChatRealty database is live. Store the connection URL in your sync environment (CHATREALTY_DB_URL) — `npx @chatrealty/sync init` does this for you — then seed it from your MLS feed."
          : "Your ChatRealty database already exists — this token is now bound to it. Connection URLs returned again for your sync environment.",
      },
      { status: result.created ? 201 : 200, headers: NO_STORE }
    );
  } catch (err: any) {
    console.error("[provision] failed:", err?.message);
    return NextResponse.json(
      {
        error: err?.code || "provision_failed",
        message:
          "Provisioning didn't complete. Nothing was left half-created — it's safe to retry in a minute.",
      },
      { status: 502, headers: NO_STORE }
    );
  }
}
