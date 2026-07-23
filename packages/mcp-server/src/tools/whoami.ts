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
  dataSource?: "tenant" | "dogfood" | "none";
};

export const whoami: ToolDef = {
  name: "whoami",
  description:
    "Returns the name, email, site URL, token info, AND `dataSource` for the agent whose ChatRealty API token is configured. Call this once at the start of any session. `dataSource` is the signal the build guide's step 1 branches on: `tenant` = the agent's own MLS data is connected (safe to probe listings/market), `none` = no data connected yet (do NOT call any listing/market tool — they'll refuse), `dogfood` = a ChatRealty-internal owner account.",
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
      // The build guide's data-source branch depends on this — always surface
      // it (explicit "none" rather than an absent key, per CRBR bug report).
      dataSource: res.dataSource ?? "none",
    };
  },
};
