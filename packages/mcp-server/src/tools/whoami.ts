// packages/mcp-server/src/tools/whoami.ts
//
// Confirms the bearer token is valid and tells Claude who it's helping. First
// tool every Claude conversation should call before doing anything else.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

type WhoamiResponse = {
  agentName: string | null;
  agentEmail: string | null;
  siteName: string | null;
  lpBaseUrl: string;
  tokenName: string;
  tokenLast4: string;
};

export const whoami: ToolDef = {
  name: "whoami",
  description:
    "Returns the name, email, site URL, and token info for the agent whose ChatRealty API token is configured. Call this once at the start of any session so you know whose data you're operating on.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    const res = await request<WhoamiResponse>(config, "/api/skill/me");
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
