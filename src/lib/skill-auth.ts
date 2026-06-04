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

import type { NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { hashToken } from "@/lib/secrets";

export type SkillAuthSuccess = {
  ok: true;
  user: any; // mongoose user doc — full doc, caller decides what to read
  tokenName: string;
  tokenLast4: string;
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

  return {
    ok: true,
    user,
    tokenName: entry.name,
    tokenLast4: entry.last4,
  };
}
