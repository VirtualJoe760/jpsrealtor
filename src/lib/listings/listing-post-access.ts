// src/lib/listings/listing-post-access.ts
//
// Who has already registered, and may therefore be served the gated half of a
// listing post.
//
// Two ways in, checked in this order because the first costs nothing:
//
//   1. the `lp_access` cookie, minted by POST /api/leads/listing-post
//   2. a signed-in visitor who is already a Contact of the post's author
//
// The grant is scoped to the AGENT, not to one post. Someone who registered for
// Joseph's open house on Catalina Way and then opens his next listing post is
// already in his CRM — walling them again asks for information he has and
// teaches them the form is noise. An agent who disagrees sets
// `allowReturning: false`, which narrows the grant to the exact post that
// minted it.
//
// The cookie carries no personal data: an agent id, a contact id and the slug
// that minted it. It is HMAC-signed (same construction as oauth-state.ts) so it
// cannot be forged into access to a different agent's posts, and it is httpOnly
// so page scripts cannot read or mint one.

import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const LP_ACCESS_COOKIE = "lp_access";

/** 90 days. Long enough that a buyer touring over a season registers once. */
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface AccessBody {
  /** Post author's user id — the agent whose CRM holds the contact. */
  a: string;
  /** Contact id, so a later page can tell who this is without a session. */
  c: string;
  /** Slug that minted the grant, for allowReturning:false. */
  s: string;
  iat: number;
}

/**
 * Unlike oauth-state.ts this does NOT fall back to a literal when the env var
 * is missing. A predictable key here would let anyone mint access to every
 * agent's gated content, so a missing secret fails closed: no grant is issued
 * and no cookie verifies.
 */
function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(body: string, key: string): string {
  return crypto.createHmac("sha256", key).update(body).digest("base64url");
}

/** `<base64url(json)>.<hmac>`, or null when no secret is configured. */
export function mintAccessToken(agentId: string, contactId: string, slug: string): string | null {
  const key = secret();
  if (!key) {
    console.error("[listing-post-access] NEXTAUTH_SECRET missing — refusing to mint an access grant");
    return null;
  }
  const body = Buffer.from(
    JSON.stringify({ a: agentId, c: contactId, s: slug, iat: Date.now() } satisfies AccessBody)
  ).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function verifyAccessToken(token: string | null | undefined): AccessBody | null {
  if (!token) return null;
  const key = secret();
  if (!key) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(body, key);

  // Constant-time, and length-guarded: timingSafeEqual throws on a length
  // mismatch rather than returning false.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AccessBody;
    if (!parsed?.a || typeof parsed.iat !== "number") return null;
    if (Date.now() - parsed.iat > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(TTL_MS / 1000),
};

/** Attach a fresh grant to an outgoing response. No-op without a secret. */
export function setAccessCookie(
  res: NextResponse,
  agentId: string,
  contactId: string,
  slug: string
): void {
  const token = mintAccessToken(agentId, contactId, slug);
  if (!token) return;
  res.cookies.set(LP_ACCESS_COOKIE, token, accessCookieOptions);
}

export interface AccessCheck {
  granted: boolean;
  /** Contact id when we know it, for the "welcome back" line and analytics. */
  contactId?: string;
  via?: "cookie" | "contact";
}

/**
 * Does this request already have access to `slug`, authored by `agentId`?
 *
 * `sessionEmail` is the signed-in visitor's email when there is one — pass
 * null to skip the DB lookup entirely. `lookupContact` is injected so this
 * module stays free of a Mongoose import and can be unit-tested; the page
 * passes the real finder.
 */
export async function hasListingPostAccess(opts: {
  req: NextRequest | { cookies: { get(name: string): { value: string } | undefined } };
  agentId: string;
  slug: string;
  allowReturning: boolean;
  sessionEmail?: string | null;
  lookupContact?: (agentId: string, email: string) => Promise<string | null>;
}): Promise<AccessCheck> {
  const { req, agentId, slug, allowReturning, sessionEmail, lookupContact } = opts;

  const raw = req.cookies.get(LP_ACCESS_COOKIE)?.value;
  const payload = verifyAccessToken(raw);
  if (payload && payload.a === agentId) {
    // Scoped grant: only the post that minted it counts.
    if (allowReturning || payload.s === slug) {
      return { granted: true, contactId: payload.c, via: "cookie" };
    }
  }

  // A signed-in visitor who is already this agent's contact never sees the
  // gate, cookie or not — they may have registered on another device.
  if (allowReturning && sessionEmail && lookupContact) {
    try {
      const contactId = await lookupContact(agentId, sessionEmail.toLowerCase());
      if (contactId) return { granted: true, contactId, via: "contact" };
    } catch (err) {
      // A CRM lookup failure must not open the gate, and must not 500 the page.
      console.error("[listing-post-access] contact lookup failed:", err);
    }
  }

  return { granted: false };
}
