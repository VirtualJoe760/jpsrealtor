// src/lib/skill-auth.ts
//
// Bearer-token auth for /api/skill/* routes (called by the Claude Code /
// Claude Desktop skill). NOT a NextAuth session — these routes are reachable
// from outside a browser, so they auth via a token the agent provisioned in
// Settings → Integrations.
//
// Contract:
//   Authorization: Bearer crt_live_<32-byte base64url>
//
// We sha256 the incoming token and look for a matching, non-revoked entry on
// any User. On hit, we bump lastUsedAt and return the User document.

import { NextResponse, type NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { hashToken } from "@/lib/secrets";
import { LEGACY_DEFAULT_SCOPES, type Scope } from "@/lib/skill-scopes";

export type SkillAuthSuccess = {
  ok: true;
  user: any; // mongoose user doc — full doc, caller decides what to read
  tokenName: string;
  tokenLast4: string;
  /**
   * Effective scopes for this request. Pulled from the token's stored scopes
   * array; if it's empty (legacy token minted before scopes existed), falls
   * back to LEGACY_DEFAULT_SCOPES so existing skill installs don't break.
   */
  scopes: Scope[];
  /** True if scopes were filled from the legacy fallback rather than the token. */
  isLegacyScopes: boolean;
};

export type SkillAuthFailure = {
  ok: false;
  status: 401 | 403;
  reason: string;
};

export type SkillAuthResult = SkillAuthSuccess | SkillAuthFailure;

export async function authenticateSkillRequest(req: NextRequest): Promise<SkillAuthResult> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(crt_live_[A-Za-z0-9_-]+)$/);
  if (!match) {
    return { ok: false, status: 401, reason: "missing_or_malformed_token" };
  }
  const token = match[1];
  const hash = hashToken(token);

  await dbConnect();
  // Index hint: agentProfile.aiIntegrations.apiTokens.tokenHash. If the
  // collection grows large, add an index on this dotted path.
  const user = await User.findOne({
    "agentProfile.aiIntegrations.apiTokens.tokenHash": hash,
  });
  if (!user) {
    return { ok: false, status: 401, reason: "token_not_found" };
  }
  const entry = (user.agentProfile as any)?.aiIntegrations?.apiTokens?.find(
    (t: any) => t.tokenHash === hash
  );
  if (!entry) {
    return { ok: false, status: 401, reason: "token_not_found" };
  }
  if (entry.revokedAt) {
    return { ok: false, status: 403, reason: "token_revoked" };
  }

  // Touch lastUsedAt — fire and forget, don't block the response on it.
  entry.lastUsedAt = new Date();
  user.markModified("agentProfile.aiIntegrations.apiTokens");
  user.save().catch(() => {
    // Best-effort — don't fail the request on a save error here.
  });

  // Resolve effective scopes. Empty/missing → legacy fallback so tokens
  // minted before scopes shipped keep working in their original capacity.
  const storedScopes: string[] = Array.isArray(entry.scopes) ? entry.scopes : [];
  const isLegacyScopes = storedScopes.length === 0;
  const scopes = (isLegacyScopes ? LEGACY_DEFAULT_SCOPES : (storedScopes as Scope[]));

  return {
    ok: true,
    user,
    tokenName: entry.name,
    tokenLast4: entry.last4,
    scopes,
    isLegacyScopes,
  };
}

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Convenience for route handlers — checks that the auth succeeded AND
 * carries the required scope. Returns a Response to short-circuit on
 * failure, or null when the request is good to proceed.
 *
 *   const auth = await authenticateSkillRequest(req);
 *   const denied = requireScope(auth, "landing_pages:write");
 *   if (denied) return denied;
 *   // auth is narrowed to SkillAuthSuccess here
 */
export function requireScope(
  auth: SkillAuthResult,
  scope: Scope
): NextResponse | null {
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }
  if (!auth.scopes.includes(scope)) {
    return NextResponse.json(
      {
        error: "missing_scope",
        message: `This token does not have the '${scope}' scope. Re-mint with that scope from Settings → Integrations.`,
        required: scope,
        tokenScopes: auth.scopes,
        isLegacyToken: auth.isLegacyScopes,
      },
      { status: 403, headers: NO_STORE }
    );
  }
  return null;
}
