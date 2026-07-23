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
  crtScopes?: string[];
};

// ---------------------------------------------------------------------------
// Tool → required scope (single source of truth for the hosted surface).
// A token only SEES a tool if it holds that tool's scope. This mirrors the
// per-route requireScope checks in /api/skill/* (src/lib/skill-scopes.ts) — the
// route is still the authoritative gate; this filters the advertised surface so
// a free/limited token never sees campaigns, contacts, landing pages, or social
// posting. Tools absent from the map need no scope (identity/docs/testing/UI).
// ---------------------------------------------------------------------------
const TOOL_SCOPE: Record<string, string> = {
  // Listings / MLS
  search_listings: "listings:read",
  get_listing: "listings:read",
  get_listing_photos: "listings:read",
  find_comparables: "listings:read",
  search_closed_listings: "listings:read",
  analyze_listing_cashflow: "listings:read",
  find_cashflowing_listings: "listings:read",
  get_going_rate: "listings:read",
  // Market data
  get_market_stats: "market:read",
  get_neighborhood_info: "market:read",
  get_subdivision_cma: "market:read",
  get_mortgage_rates: "market:read",
  // CRM (client PII)
  get_contact: "contacts:read",
  search_my_contacts: "contacts:read",
  my_recent_leads: "contacts:read",
  // CMS — articles
  list_my_articles: "articles:read",
  get_article: "articles:read",
  create_article: "articles:write",
  update_article: "articles:write",
  // CMS — landing pages
  list_my_landing_pages: "landing_pages:read",
  get_landing_page: "landing_pages:read",
  create_landing_page: "landing_pages:write",
  update_landing_page: "landing_pages:write",
  create_listing_cover: "landing_pages:write",
  stage_listing_with_agent: "landing_pages:write",
  // Real-money / real-world publish
  post_instagram_carousel: "social:post",
};

// Legacy tokens (minted before scopes) carry an empty array — grant the safe
// read-ish default so existing installs don't lose their tools.
const LEGACY_SCOPES = [
  "landing_pages:read",
  "landing_pages:write",
  "listings:read",
  "market:read",
  "analytics:read",
];

function grantedScopes(extra: any): Set<string> {
  const ax: AuthExtra = (extra?.authInfo?.extra as AuthExtra) || {};
  const scopes = ax.crtScopes && ax.crtScopes.length ? ax.crtScopes : LEGACY_SCOPES;
  return new Set(scopes);
}

/** True if the caller's scopes permit this tool (no-scope tools always pass). */
function toolAllowed(name: string, granted: Set<string>): boolean {
  const needed = TOOL_SCOPE[name];
  return !needed || granted.has(needed);
}

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
  server.setRequestHandler(ListToolsRequestSchema, async (_req: any, extra: any) => {
    const granted = grantedScopes(extra);
    return {
      tools: ALL_TOOLS.filter((t: any) => toolAllowed(t.name, granted)).map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(t.uiResourceUri
          ? { _meta: { ui: { resourceUri: t.uiResourceUri }, "ui/resourceUri": t.uiResourceUri } }
          : {}),
      })),
    };
  });

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

    // Enforce scope on the CALL too (not just the list) — a client that calls a
    // tool it was never shown is refused here, not just downstream at the route.
    if (!toolAllowed(name, grantedScopes(extra))) {
      return errorResult(
        "insufficient_scope",
        `This ChatRealty plan doesn't include "${name}". Upgrade or mint a token with the '${TOOL_SCOPE[name]}' scope to use it.`
      );
    }

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
      // Compact JSON (no pretty-print) — the indentation in `null, 2` is pure
      // token cost the model doesn't need. ~35% fewer tokens on large results.
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
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
