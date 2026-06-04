import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const list_my_landing_pages: ToolDef = {
  name: "list_my_landing_pages",
  description:
    "List the agent's landing pages (drafts + published + archived), most-recently-updated first. Optional status filter. Useful before drafting a new one — checks for prior work to reference or to avoid duplicate slugs.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["draft", "published", "archived"],
        description: "Optional status filter",
      },
      limit: { type: "number", description: "1-50, default 20" },
      skip: { type: "number", description: "Pagination offset, default 0" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/landing-pages", { query });
  },
};
