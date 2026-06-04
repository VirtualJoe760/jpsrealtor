import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_market_stats: ToolDef = {
  name: "get_market_stats",
  description:
    "Returns a quick market snapshot for a city or subdivision: median list price, active count, median days on market, price range. Computed from the active MLS feed. Provide city, subdivision, or both — at least one is required.",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string" },
      subdivision: { type: "string" },
      propertyType: { type: "string", description: 'e.g. "Residential", "Land"' },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === "string" && v) query[k] = v;
    }
    return await request(config, "/api/skill/market/stats", { query });
  },
};
