// src/app/api/mcp/oauth/register/route.ts
//
// RFC 7591 Dynamic Client Registration. Claude's connector registers itself
// here before starting the auth-code flow. We only support public PKCE clients
// (token_endpoint_auth_method = "none"); there is no client secret to leak.

import dbConnect from "@/lib/mongoose";
import { McpOAuthClient } from "@/models/McpOAuth";
import { randomToken } from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

function isValidRedirectUri(u: unknown): u is string {
  if (typeof u !== "string" || u.length > 2048) return false;
  try {
    const url = new URL(u);
    // https anywhere; http only for localhost dev; allow app custom schemes.
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname)) return true;
    // Native app callback schemes (e.g. "claude://", "cursor://").
    if (/^[a-z][a-z0-9+.-]*:$/.test(url.protocol) && url.protocol !== "javascript:") return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body: any = await req.json().catch(() => ({}));
  const redirectUris: string[] = Array.isArray(body?.redirect_uris)
    ? body.redirect_uris.filter(isValidRedirectUri)
    : [];

  if (redirectUris.length === 0) {
    return Response.json(
      {
        error: "invalid_redirect_uri",
        error_description: "At least one valid https (or localhost) redirect_uri is required.",
      },
      { status: 400, headers: CORS }
    );
  }

  const clientId = `mcp_${randomToken(18)}`;
  await dbConnect();
  await McpOAuthClient.create({
    clientId,
    clientName: typeof body?.client_name === "string" ? body.client_name.slice(0, 200) : undefined,
    redirectUris,
    tokenEndpointAuthMethod: "none",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    scope: typeof body?.scope === "string" ? body.scope : undefined,
  });

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: typeof body?.client_name === "string" ? body.client_name : undefined,
    },
    { status: 201, headers: CORS }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
