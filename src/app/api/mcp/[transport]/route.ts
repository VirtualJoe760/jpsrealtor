// src/app/api/mcp/[transport]/route.ts
//
// Hosted MCP server — Streamable HTTP transport. URL agents paste into Claude
// (mobile / desktop / web) as a custom connector:
//
//     https://www.chatrealty.io/api/mcp/mcp
//
// Exposes the same 26 ChatRealty tools as the stdio server (lib/mcp-tool-bridge).
//
// Why we drive the SDK transport directly (instead of mcp-handler's
// createMcpHandler): the WebStandard transport defaults to enableJsonResponse=
// false, i.e. it answers as an SSE stream that stays open. mcp-handler only
// returns its Response after that stream drains — so in a stateless / no-Redis
// setup every authenticated request HUNG forever (no headers, no body), and
// Claude reported "authorization failed" right after OAuth. We run the transport
// stateless with enableJsonResponse=true: each POST is a single application/json
// reply that closes immediately. We still wrap with withMcpAuth so the 401 +
// WWW-Authenticate (resource_metadata) discovery handshake is unchanged.

import { withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import dbConnect from "@/lib/mongoose";
import { McpOAuthToken } from "@/models/McpOAuth";
import { decryptSecret } from "@/lib/secrets";
import { sha256, getOrigin, MCP_OAUTH_SCOPES } from "@/lib/mcp-oauth";
import { registerChatRealtyTools } from "@/lib/mcp-tool-bridge";
import { SERVER_INSTRUCTIONS } from "@chatrealty/mcp-server/dist/tools/index.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PKG = { name: "@chatrealty/mcp-server", version: "0.17.0" };

async function verifyToken(
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  await dbConnect();
  const record = await McpOAuthToken.findOne({ accessTokenHash: sha256(bearerToken) });
  if (!record || record.revokedAt) return undefined;
  if (record.accessTokenExpiresAt.getTime() < Date.now()) return undefined;

  let crtToken: string;
  try {
    crtToken = decryptSecret(record.crtTokenEnc);
  } catch {
    return undefined; // corrupt/rotated key — force re-auth
  }

  record.lastUsedAt = new Date();
  record.save().catch(() => {});

  return {
    token: bearerToken,
    clientId: record.clientId,
    scopes: MCP_OAUTH_SCOPES,
    expiresAt: Math.floor(record.accessTokenExpiresAt.getTime() / 1000),
    extra: {
      crtToken,
      apiBase: getOrigin(req),
      userId: String(record.userId),
      // The crt token's granted scopes — the bridge filters the tool surface
      // by these so a token only ever SEES the tools its plan/scopes allow
      // (defense-in-depth over the per-route requireScope checks).
      crtScopes: Array.isArray(record.scopes) ? record.scopes : [],
    },
  };
}

// Fresh Server + transport per request (stateless). JSON-response mode so the
// reply closes immediately — no hanging SSE stream, no session store, no Redis.
async function mcpHandler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    // Stateless server: no GET notification stream / DELETE session teardown.
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Method Not Allowed — this MCP server is stateless; use POST." },
      }),
      { status: 405, headers: { "Content-Type": "application/json", Allow: "POST", "Cache-Control": "no-store" } }
    );
  }

  const authInfo = (req as unknown as { auth?: AuthInfo }).auth;

  const server = new Server(PKG, { capabilities: { tools: {}, resources: {} }, instructions: SERVER_INSTRUCTIONS });
  registerChatRealtyTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // single JSON reply, closes immediately
  });

  await server.connect(transport);
  return transport.handleRequest(req, { authInfo });
}

const handler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST, handler as DELETE };
