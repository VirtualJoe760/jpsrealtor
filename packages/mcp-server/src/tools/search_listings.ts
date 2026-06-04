// packages/mcp-server/src/tools/search_listings.ts
//
// Search the active MLS feed. Read-only.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const search_listings: ToolDef = {
  name: "search_listings",
  description:
    "Search the active MLS feed by city, subdivision, property type, beds, baths, and price range. Returns a paginated list of listings with key fields and a slug for the public detail page. Use this to find specific properties or sample what's on the market.",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: 'e.g. "Palm Desert"' },
      subdivision: { type: "string", description: 'e.g. "PGA West"' },
      propertyType: {
        type: "string",
        description: 'Property type, e.g. "Residential" or "Land"',
      },
      status: {
        type: "string",
        description: 'standardStatus value; defaults to "Active"',
      },
      minPrice: { type: "number" },
      maxPrice: { type: "number" },
      minBeds: { type: "number" },
      maxBeds: { type: "number" },
      minBaths: { type: "number" },
      maxBaths: { type: "number" },
      limit: { type: "number", description: "Max results per page (1-50, default 20)" },
      skip: { type: "number", description: "Pagination offset" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | boolean | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/listings/search", { query });
  },
};
