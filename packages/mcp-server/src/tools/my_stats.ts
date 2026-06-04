// packages/mcp-server/src/tools/my_stats.ts
//
// Counts of the agent's articles + landing pages by status. Helps Claude
// answer "what should I work on?" / "do I have any drafts pending?".

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const my_stats: ToolDef = {
  name: "my_stats",
  description:
    "Returns count of the authenticated agent's drafts, published items, and archived items, broken down by category (articles / market-insights / real-estate-tips / landing-page). Useful for answering 'what do I have in flight?' or picking what to work on.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/me/stats");
  },
};
