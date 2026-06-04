import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_neighborhood_info: ToolDef = {
  name: "get_neighborhood_info",
  description:
    "Returns city / neighborhood overview: population, demographics, schools, parks, dining, shopping, points of interest, and editorial narrative. Use this to inject local color into landing pages and articles.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: 'City slug, e.g. "palm-desert"' },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { slug } = input as { slug: string };
    return await request(config, `/api/skill/market/neighborhoods/${encodeURIComponent(slug)}`);
  },
};
