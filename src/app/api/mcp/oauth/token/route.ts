// src/app/api/mcp/oauth/token/route.ts
//
// OAuth 2.1 token endpoint. Public client (no secret); PKCE-verified.
// Supports grant_type = authorization_code and refresh_token (with rotation).
// The issued access token is opaque and maps server-side to the agent's
// encrypted crt_live_ token + scopes (see McpOAuthToken).

import dbConnect from "@/lib/mongoose";
import { McpOAuthCode, McpOAuthToken } from "@/models/McpOAuth";
import {
  randomToken,
  sha256,
  verifyPkceS256,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  MCP_OAUTH_SCOPES,
} from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

function oauthError(error: string, description?: string, status = 400) {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: CORS }
  );
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const j = await req.json().catch(() => ({}));
    return Object.fromEntries(
      Object.entries(j || {}).map(([k, v]) => [k, String(v ?? "")])
    );
  }
  // application/x-www-form-urlencoded (default per OAuth spec) or multipart.
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : "";
  return out;
}

/** Create a fresh access/refresh pair and persist it; returns the OAuth payload. */
async function issueTokenPair(opts: {
  clientId: string;
  userId: any;
  crtTokenEnc: string;
  crtTokenLast4: string;
  scopes: string[];
  resource?: string;
}) {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  const now = Date.now();
  const accessExp = new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshExp = new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await McpOAuthToken.create({
    accessTokenHash: sha256(accessToken),
    refreshTokenHash: sha256(refreshToken),
    clientId: opts.clientId,
    userId: opts.userId,
    crtTokenEnc: opts.crtTokenEnc,
    crtTokenLast4: opts.crtTokenLast4,
    scopes: opts.scopes,
    resource: opts.resource,
    accessTokenExpiresAt: accessExp,
    expiresAt: refreshExp,
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: MCP_OAUTH_SCOPES.join(" "),
  };
}

export async function POST(req: Request) {
  const params = await readParams(req);
  const grantType = params.grant_type;
  await dbConnect();

  // -------------------------------------------------------------------------
  // authorization_code
  // -------------------------------------------------------------------------
  if (grantType === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier } = params;
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return oauthError("invalid_request", "Missing code, redirect_uri, client_id, or code_verifier.");
    }

    const record = await McpOAuthCode.findOne({ codeHash: sha256(code) });
    if (!record) return oauthError("invalid_grant", "Authorization code not found.");
    if (record.usedAt) {
      // Replay: per RFC, revoke tokens previously issued from this code.
      await McpOAuthToken.updateMany(
        { clientId: record.clientId, userId: record.userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      ).catch(() => {});
      return oauthError("invalid_grant", "Authorization code already used.");
    }
    if (record.expiresAt.getTime() < Date.now()) return oauthError("invalid_grant", "Authorization code expired.");
    if (record.clientId !== client_id) return oauthError("invalid_grant", "client_id mismatch.");
    if (record.redirectUri !== redirect_uri) return oauthError("invalid_grant", "redirect_uri mismatch.");
    if (!verifyPkceS256(code_verifier, record.codeChallenge)) {
      return oauthError("invalid_grant", "PKCE verification failed.");
    }

    record.usedAt = new Date();
    await record.save();

    const payload = await issueTokenPair({
      clientId: record.clientId,
      userId: record.userId,
      crtTokenEnc: record.crtTokenEnc,
      crtTokenLast4: record.crtTokenLast4,
      scopes: record.scopes,
      resource: record.resource,
    });
    return Response.json(payload, { headers: CORS });
  }

  // -------------------------------------------------------------------------
  // refresh_token (rotation)
  // -------------------------------------------------------------------------
  if (grantType === "refresh_token") {
    const { refresh_token, client_id } = params;
    if (!refresh_token) return oauthError("invalid_request", "Missing refresh_token.");

    const record = await McpOAuthToken.findOne({ refreshTokenHash: sha256(refresh_token) });
    if (!record || record.revokedAt) return oauthError("invalid_grant", "Refresh token invalid or revoked.");
    if (record.expiresAt.getTime() < Date.now()) return oauthError("invalid_grant", "Refresh token expired.");
    if (client_id && record.clientId !== client_id) return oauthError("invalid_grant", "client_id mismatch.");

    // Rotate: revoke the old row, issue a brand-new pair carrying the same
    // encrypted crt credential + scopes.
    record.revokedAt = new Date();
    await record.save();

    const payload = await issueTokenPair({
      clientId: record.clientId,
      userId: record.userId,
      crtTokenEnc: record.crtTokenEnc,
      crtTokenLast4: record.crtTokenLast4,
      scopes: record.scopes,
      resource: record.resource,
    });
    return Response.json(payload, { headers: CORS });
  }

  return oauthError("unsupported_grant_type", `Unsupported grant_type: ${grantType || "(none)"}`);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
