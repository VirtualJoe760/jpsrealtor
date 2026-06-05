import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_subdivision_cma: ToolDef = {
  name: "get_subdivision_cma",
  description:
    "Returns the nightly-built CMA stats for one subdivision: medians, distributions, price-per-sqft, active vs. closed counts. The data is sourced from the platform's pre-built subdivision-CMA model (1,400+ subdivisions), so this is the fast path to 'how is X subdivision doing?'.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: 'Subdivision slug, e.g. "pga-west"' },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { slug } = input as { slug: string };
    return await request(config, `/api/skill/market/subdivisions/${encodeURIComponent(slug)}`);
  },
};
