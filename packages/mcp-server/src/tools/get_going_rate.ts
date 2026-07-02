// packages/mcp-server/src/tools/get_going_rate.ts
//
// Market "going rate" for rentals in an area (pre-computed). Subdivision
// rentStats first, else ZIP rent_rates.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_going_rate: ToolDef = {
  name: "get_going_rate",
  description:
    "Get the market GOING RATE for rentals in an area — median rent, a by-bedroom breakdown, rent-per-sqft, sample size, and a confidence flag — from pre-computed data (closed/rented leases). Pass a postalCode (near-universal coverage, most reliable) and/or a subdivision. Use for 'what does X rent for' / 'rental rates in X'. This is LONG-TERM ANNUAL rent; furnished seasonal rates are tracked separately (call it out if the user asks about seasonal/vacation rentals).",
  inputSchema: {
    type: "object",
    properties: {
      postalCode: { type: "string", description: "ZIP code — the most reliable area key." },
      subdivision: { type: "string", description: 'Subdivision name or slug, e.g. "Indian Wells Country Club".' },
      city: { type: "string" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const q: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v !== undefined && v !== null) q[k] = v as string | number | boolean;
    }
    return await request(config, "/api/skill/rentals/going-rate", { query: q });
  },
};
