"use strict";
// packages/mcp-server/src/tools/whoami.ts
//
// Confirms the bearer token is valid and tells Claude who it's helping. First
// tool every Claude conversation should call before doing anything else.
Object.defineProperty(exports, "__esModule", { value: true });
exports.whoami = void 0;
const http_js_1 = require("../http.js");
exports.whoami = {
    name: "whoami",
    description: "Returns the name, email, site URL, and token info for the agent whose ChatRealty API token is configured. Call this once at the start of any session so you know whose data you're operating on.",
    inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
    },
    async handler(_input, config) {
        const res = await (0, http_js_1.request)(config, "/api/skill/me");
        return {
            agentName: res.agentName,
            agentEmail: res.agentEmail,
            siteName: res.siteName,
            lpBaseUrl: res.lpBaseUrl,
            tokenName: res.tokenName,
            tokenLast4: res.tokenLast4,
        };
    },
};
