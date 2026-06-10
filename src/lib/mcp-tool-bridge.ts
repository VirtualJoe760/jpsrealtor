// src/lib/mcp-tool-bridge.ts
//
// Bridges the 26 tools from @chatrealty/mcp-server onto a hosted MCP server
// (the HTTP/Streamable transport at /api/mcp/[transport]). We reuse the SAME
// tool definitions the stdio server uses — no duplication, no Zod re-spec. Each
// tool is a thin wrapper that calls /api/skill/* with a bearer token; here that
// token comes from the per-request OAuth auth context instead of an env var.
//
// Auth flow: withMcpAuth (in the route) resolves the caller's access token to a
// crt_live token and stashes it on req.auth.extra. The MCP SDK surfaces that as
// `extra.authInfo` on every request handler, so we build the per-call
// ServerConfig from it. Nothing is held in module scope — each call is isolated.

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ALL_TOOLS, toolByName } from "@chatrealty/mcp-server/dist/tools/index.js";
import {
  LISTING_BOARD_URI,
  LISTING_BOARD_MIME,
  LISTING_BOARD_HTML,
} from "@chatrealty/mcp-server/dist/ui/listing-board.js";
import { HttpError } from "@chatrealty/mcp-server/dist/http.js";
import type { ServerConfig } from "@chatrealty/mcp-server/dist/config.js";
import { inProcessSkillFetch } from "@/lib/mcp-inprocess-fetch";

type AuthExtra = {
  crtToken?: string;
  apiBase?: string;
};

function configFromAuth(extra: any): ServerConfig {
  const auth = extra?.authInfo;
  const ax: AuthExtra = (auth?.extra as AuthExtra) || {};
  const apiToken = ax.crtToken;
  const apiBase = (ax.apiBase || "https://jpsrealtor.com").replace(/\/+$/, "");
  if (!apiToken) {
    // Should never happen: withMcpAuth(required:true) rejects unauthenticated
    // calls before they reach a handler. Guard anyway so a misconfig surfaces
    // as a clean error instead of an undefined-token fetch.
    throw new HttpError(401, "unauthorized", "No ChatRealty credential on this session.", null);
  }
  // In-process dispatch for /api/skill/* reads — no loopback to a 2nd function.
  return { apiBase, apiToken, fetchImpl: inProcessSkillFetch };
}

function errorResult(code: string, message: string, details?: unknown) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { error: code, message, ...(details !== undefined ? { details } : {}) },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Register the ChatRealty tool surface on a hosted MCP server instance.
 * Call inside createMcpHandler's initializeServer callback.
 */
export function registerChatRealtyTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((t: any) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      ...(t.uiResourceUri
        ? { _meta: { ui: { resourceUri: t.uiResourceUri }, "ui/resourceUri": t.uiResourceUri } }
        : {}),
    })),
  }));

  // MCP Apps (SEP-1865) UI resource — the interactive listing board.
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: LISTING_BOARD_URI, name: "ChatRealty Listing Board", mimeType: LISTING_BOARD_MIME },
    ],
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (req: any) => {
    if (req.params.uri !== LISTING_BOARD_URI) {
      throw new HttpError(404, "not_found", `Unknown resource: ${req.params.uri}`, null);
    }
    return {
      contents: [{ uri: LISTING_BOARD_URI, mimeType: LISTING_BOARD_MIME, text: LISTING_BOARD_HTML }],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req: any, extra: any) => {
    const { name, arguments: args } = req.params;
    const tool = toolByName(name);
    if (!tool) return errorResult("not_found", `Unknown tool: ${name}`);

    let config: ServerConfig;
    try {
      config = configFromAuth(extra);
    } catch (err: any) {
      return errorResult(err?.code || "unauthorized", err?.message || "Auth error");
    }

    try {
      const result = await tool.handler((args || {}) as Record<string, unknown>, config);
      // A tool may return raw MCP content blocks (e.g. rendered images) via
      // `_mcpContent`; otherwise its JSON value is wrapped as a text block.
      if (result && typeof result === "object" && Array.isArray((result as any)._mcpContent)) {
        return { content: (result as any)._mcpContent };
      }
      // MCP App tools return `_structuredContent` (rendered by the UI resource)
      // plus a short `_mcpText` summary the model reads.
      if (result && typeof result === "object" && "_structuredContent" in (result as any)) {
        return {
          content: [{ type: "text" as const, text: String((result as any)._mcpText || "") }],
          structuredContent: (result as any)._structuredContent,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      if (err instanceof HttpError) {
        return errorResult(err.code, err.message, { status: err.status, body: err.body });
      }
      return errorResult("internal", err?.message || String(err));
    }
  });
}

export const CHATREALTY_TOOL_COUNT = ALL_TOOLS.length;
