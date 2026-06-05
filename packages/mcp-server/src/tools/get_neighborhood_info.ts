import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_neighborhood_info: ToolDef = {
  name: "get_neighborhood_info",
  description:
    "Returns a city market snapshot: active listing count, price range, average + median list price, property-type breakdown (sales/rentals/multi-family), number of subdivisions, and the MLS sources covering this city. Useful as a quick aggregate when writing a city-focused landing page or article. NOTE: this does NOT return population, schools, parks, dining, points-of-interest, or demographics — those don't live in the City model. For per-subdivision price stats, use get_subdivision_cma.",
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
