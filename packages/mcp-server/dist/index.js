#!/usr/bin/env node
"use strict";
//
// packages/mcp-server/src/index.ts
//
// Stdio Model Context Protocol server for ChatRealty.
//
// How it runs:
//   - Claude Code:   `claude mcp add chatrealty -- npx @chatrealty/mcp-server`
//   - Claude Desktop: JSON snippet pointing at the binary, with CHATREALTY_API_TOKEN
//                     set in the connector's env block. See README.md.
//
// What it does:
//   1. Loads CHATREALTY_API_TOKEN + CHATREALTY_API_BASE from env (config.ts).
//   2. Registers every tool from src/tools/index.ts with the MCP SDK.
//   3. On each tool call: validates input via JSON Schema, runs the handler,
//      wraps the result as a text content block, surfaces errors structurally.
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const config_js_1 = require("./config.js");
const index_js_2 = require("./tools/index.js");
const listing_board_js_1 = require("./ui/listing-board.js");
const http_js_1 = require("./http.js");
const PKG_NAME = "@chatrealty/mcp-server";
const PKG_VERSION = "0.8.0";
async function main() {
    let config;
    try {
        config = (0, config_js_1.loadConfig)();
    }
    catch (err) {
        // Print to stderr so it shows in Claude Desktop's connector debug pane.
        process.stderr.write(`[${PKG_NAME}] ${err?.message || err}\n`);
        process.exit(1);
    }
    const server = new index_js_1.Server({
        name: PKG_NAME,
        version: PKG_VERSION,
    }, {
        capabilities: {
            tools: {},
            resources: {},
        },
        instructions: index_js_2.SERVER_INSTRUCTIONS,
    });
    // tools/list — advertise the MCP App UI resource for tools that have one.
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        return {
            tools: index_js_2.ALL_TOOLS.map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
                ...(t.uiResourceUri
                    ? { _meta: { ui: { resourceUri: t.uiResourceUri }, "ui/resourceUri": t.uiResourceUri } }
                    : {}),
            })),
        };
    });
    // resources/list + resources/read — serve the MCP App UI (listing board).
    server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => ({
        resources: [
            { uri: listing_board_js_1.LISTING_BOARD_URI, name: "ChatRealty Listing Board", mimeType: listing_board_js_1.LISTING_BOARD_MIME },
        ],
    }));
    server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (req) => {
        if (req.params.uri !== listing_board_js_1.LISTING_BOARD_URI) {
            throw new Error(`Unknown resource: ${req.params.uri}`);
        }
        return {
            contents: [{ uri: listing_board_js_1.LISTING_BOARD_URI, mimeType: listing_board_js_1.LISTING_BOARD_MIME, text: listing_board_js_1.LISTING_BOARD_HTML }],
        };
    });
    // tools/call
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (req) => {
        const { name, arguments: args } = req.params;
        const tool = (0, index_js_2.toolByName)(name);
        if (!tool) {
            return errorResult("not_found", `Unknown tool: ${name}`);
        }
        try {
            const result = await tool.handler((args || {}), config);
            // Tools may return raw MCP content blocks (e.g. rendered images) via
            // `_mcpContent`; otherwise the JSON value is wrapped as a text block.
            if (result && typeof result === "object" && Array.isArray(result._mcpContent)) {
                return { content: result._mcpContent };
            }
            // MCP App tools return `_structuredContent` (rendered by the UI resource)
            // plus a short `_mcpText` summary for the model.
            if (result && typeof result === "object" && "_structuredContent" in result) {
                return {
                    content: [{ type: "text", text: String(result._mcpText || "") }],
                    structuredContent: result._structuredContent,
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            if (err instanceof http_js_1.HttpError) {
                return errorResult(err.code, err.message, {
                    status: err.status,
                    body: err.body,
                });
            }
            return errorResult("internal", err?.message || String(err));
        }
    });
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // The process now lives until stdin closes (Claude disconnects) or an
    // unhandled error. No need to log "started" — that'd pollute the stdio
    // channel; the MCP handshake is the only "ready" signal Claude needs.
}
function errorResult(code, message, details) {
    return {
        isError: true,
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    error: code,
                    message,
                    ...(details !== undefined ? { details } : {}),
                }, null, 2),
            },
        ],
    };
}
main().catch((err) => {
    process.stderr.write(`[${PKG_NAME}] Fatal: ${err?.stack || err}\n`);
    process.exit(1);
});
