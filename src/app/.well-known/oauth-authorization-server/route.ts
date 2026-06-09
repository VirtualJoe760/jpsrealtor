// src/app/.well-known/oauth-authorization-server/route.ts
//
// RFC 8414 Authorization Server Metadata. We are our own minimal auth server
// (issuer == origin). Advertises the DCR / authorize / token endpoints and the
// PKCE + public-client constraints Claude's connector flow relies on.

import {
  getIssuer,
  getOrigin,
  OAUTH_AUTHORIZE_PATH,
  OAUTH_TOKEN_PATH,
  OAUTH_REGISTER_PATH,
  MCP_OAUTH_SCOPES,
} from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

export async function GET(req: Request) {
  const issuer = getIssuer(req);
  const origin = getOrigin(req);
  const metadata = {
    issuer,
    authorization_endpoint: `${origin}${OAUTH_AUTHORIZE_PATH}`,
    token_endpoint: `${origin}${OAUTH_TOKEN_PATH}`,
    registration_endpoint: `${origin}${OAUTH_REGISTER_PATH}`,
    scopes_supported: MCP_OAUTH_SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };
  return Response.json(metadata, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
