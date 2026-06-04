// packages/mcp-server/src/tools/search_closed_listings.ts

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const search_closed_listings: ToolDef = {
  name: "search_closed_listings",
  description:
    "Search closed/sold listings — same filter surface as search_listings, plus a lookbackMonths window (default 12, max 60). For historical comparisons and 'X homes in this area sold for $Y last year'-style content.",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string" },
      subdivision: { type: "string" },
      propertyType: { type: "string" },
      minPrice: { type: "number" },
      maxPrice: { type: "number" },
      minBeds: { type: "number" },
      maxBeds: { type: "number" },
      lookbackMonths: {
        type: "number",
        description: "How many months back to search (1-60, default 12)",
      },
      limit: { type: "number" },
      skip: { type: "number" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | boolean | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/listings/closed/search", { query });
  },
};
