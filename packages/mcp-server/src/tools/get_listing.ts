// packages/mcp-server/src/tools/get_listing.ts

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_listing: ToolDef = {
  name: "get_listing",
  description:
    "Fetch full detail for one MLS listing by listingKey. Includes address, price, beds/baths/sqft, year built, HOA, public remarks, features, photo count. Use this AFTER search_listings to dig into a specific property the agent or visitor is interested in.",
  inputSchema: {
    type: "object",
    properties: {
      listingKey: { type: "string", description: "The unique listingKey from search_listings" },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { listingKey } = input as { listingKey: string };
    return await request(config, `/api/skill/listings/${encodeURIComponent(listingKey)}`);
  },
};
