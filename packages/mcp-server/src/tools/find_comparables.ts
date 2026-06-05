// packages/mcp-server/src/tools/find_comparables.ts

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const find_comparables: ToolDef = {
  name: "find_comparables",
  description:
    "Returns recent closed comparable sales for a listing — same subdivision (or city), same property type, ±1 bed/bath, within ±20% of list price, sold in the last 6 months. Includes a median close price aggregate. For CMA narratives or 'similar homes have sold for…' content.",
  inputSchema: {
    type: "object",
    properties: {
      listingKey: { type: "string" },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { listingKey } = input as { listingKey: string };
    return await request(
      config,
      `/api/skill/listings/${encodeURIComponent(listingKey)}/comparables`
    );
  },
};
