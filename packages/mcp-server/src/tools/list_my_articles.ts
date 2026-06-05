import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const list_my_articles: ToolDef = {
  name: "list_my_articles",
  description:
    "List the agent's articles (blog posts, market insights, real estate tips), most-recently-updated first. Optional filter by status and/or category. Use BEFORE drafting to check for prior work to reference or avoid duplicating topics.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["draft", "published", "archived"],
      },
      category: {
        type: "string",
        enum: ["articles", "market-insights", "real-estate-tips"],
      },
      limit: { type: "number", description: "1-50, default 20" },
      skip: { type: "number" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/articles", { query });
  },
};
