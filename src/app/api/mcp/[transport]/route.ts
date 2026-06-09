// src/app/api/mcp/[transport]/route.ts
//
// Hosted MCP server — Streamable HTTP transport. This is the URL agents paste
// into Claude (mobile / desktop / web) as a custom connector:
//
//     https://jpsrealtor.com/api/mcp/mcp
//
// It exposes the same 26 ChatRealty tools the stdio server does (search the
// MLS, comps, CMA, market stats, draft LPs/articles, etc.), reusing their exact
// definitions via lib/mcp-tool-bridge.ts.
//
// Auth: withMcpAuth gates every request. verifyToken resolves the OAuth access
// token to the agent's encrypted crt_live_ token and stashes it on the auth
// context; the bridge builds a per-call ServerConfig from it and forwards to
// /api/skill/* — which still enforces the token's real scopes + rate limits.
//
// SSE is disabled, so the transport runs statelessly and needs NO Redis/KV.

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import dbConnect from "@/lib/mongoose";
import { McpOAuthToken } from "@/models/McpOAuth";
import { decryptSecret } from "@/lib/secrets";
import {
  sha256,
  getOrigin,
  MCP_BASE_PATH,
  MCP_OAUTH_SCOPES,
} from "@/lib/mcp-oauth";
import { registerChatRealtyTools } from "@/lib/mcp-tool-bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const baseHandler = createMcpHandler(
  (server) => {
    registerChatRealtyTools(server);
  },
  {
    serverInfo: { name: "@chatrealty/mcp-server", version: "0.8.0" },
  },
  {
    basePath: MCP_BASE_PATH, // → streamable endpoint at /api/mcp/mcp
    disableSse: true, // stateless; no Redis required
    maxDuration: 60,
    verboseLogs: false,
  }
);

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
    },
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST, handler as DELETE };
