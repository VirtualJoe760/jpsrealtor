// src/lib/mcp-oauth.ts
//
// Helpers for the MCP remote-connector OAuth shim. See docs/mcp/hosting.md.
//
// The shim is deliberately thin: OAuth exists only because Claude's mobile/web
// "custom connector" UI speaks OAuth 2.1 (DCR + PKCE). The real credential is
// the agent's existing crt_live_ token, pasted once on the /authorize screen.
// Everything here is in service of issuing an opaque access token that maps back
// to that crt_live token (encrypted at rest).

import crypto from "crypto";
import { getPublicOrigin } from "mcp-handler";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { hashToken } from "@/lib/secrets";
import { LEGACY_DEFAULT_SCOPES, type Scope } from "@/lib/skill-scopes";

// ---------------------------------------------------------------------------
// URLs / paths
// ---------------------------------------------------------------------------

// Endpoint paths (relative to origin). The MCP resource itself lives at
// `${MCP_BASE_PATH}/mcp` (streamable HTTP) per the [transport] route segment.
export const MCP_BASE_PATH = "/api/mcp";
export const MCP_RESOURCE_PATH = `${MCP_BASE_PATH}/mcp`;
export const OAUTH_AUTHORIZE_PATH = `${MCP_BASE_PATH}/oauth/authorize`;
export const OAUTH_TOKEN_PATH = `${MCP_BASE_PATH}/oauth/token`;
export const OAUTH_REGISTER_PATH = `${MCP_BASE_PATH}/oauth/register`;

/**
 * Public origin of this deployment, e.g. "https://www.chatrealty.io".
 * Respects proxy headers (Vercel sets X-Forwarded-*) so the metadata always
 * self-advertises whatever host the client connected through. Falls back to an
 * env override, then to the canonical ChatRealty production domain.
 */
export function getOrigin(req: Request): string {
  try {
    const o = getPublicOrigin(req);
    if (o && /^https?:\/\//.test(o)) return o.replace(/\/+$/, "");
  } catch {
    /* fall through */
  }
  const env =
    process.env.MCP_PUBLIC_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/+$/, "");
  return "https://www.chatrealty.io";
}

// We are our own authorization server: issuer == origin.
export function getIssuer(req: Request): string {
  return getOrigin(req);
}

// The protected-resource identifier MCP clients bind tokens to.
export function getResourceUrl(req: Request): string {
  return `${getOrigin(req)}${MCP_RESOURCE_PATH}`;
}

// ---------------------------------------------------------------------------
// Token lifetimes
// ---------------------------------------------------------------------------

export const AUTH_CODE_TTL_SECONDS = 5 * 60; // 5 minutes
export const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
export const REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

// ---------------------------------------------------------------------------
// Scopes advertised in OAuth metadata. These are the OAuth-layer scopes Claude
// sees; the crt_live token's own scopes (skill-scopes.ts) are what actually
// gate each tool at the /api/skill/* layer. We advertise a single coarse scope
// so the connector UI stays simple — fine-grained control lives in the token.
// ---------------------------------------------------------------------------

export const MCP_OAUTH_SCOPES = ["chatrealty"];

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/** Opaque random token, URL-safe. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** sha256 hex — reuse the same primitive skill tokens use. */
export const sha256 = hashToken;

/** RFC 7636 PKCE S256 verification: base64url(sha256(verifier)) === challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  if (computed.length !== challenge.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// crt_live_ token resolution (mirrors lib/skill-auth.ts, but from a raw string
// rather than a NextRequest — the authorize screen receives the token in a form
// field, not an Authorization header).
// ---------------------------------------------------------------------------

export type ResolvedCrtToken = {
  user: any;
  tokenName: string;
  last4: string;
  scopes: Scope[];
};

export async function resolveCrtToken(
  token: string
): Promise<ResolvedCrtToken | null> {
  if (!token || !/^crt_live_[A-Za-z0-9_-]+$/.test(token)) return null;
  await dbConnect();
  const hash = hashToken(token);
  const user = await User.findOne({
    "agentProfile.aiIntegrations.apiTokens.tokenHash": hash,
  });
  if (!user) return null;
  const entry = (user.agentProfile as any)?.aiIntegrations?.apiTokens?.find(
    (t: any) => t.tokenHash === hash
  );
  if (!entry || entry.revokedAt) return null;

  const stored: string[] = Array.isArray(entry.scopes) ? entry.scopes : [];
  const scopes = (stored.length === 0 ? LEGACY_DEFAULT_SCOPES : stored) as Scope[];
  return {
    user,
    tokenName: entry.name,
    last4: entry.last4,
    scopes,
  };
}
