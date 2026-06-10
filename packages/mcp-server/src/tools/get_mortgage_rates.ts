import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_mortgage_rates: ToolDef = {
  name: "get_mortgage_rates",
  description:
    "Returns the current national 30-yr and 15-yr fixed mortgage rates. Cached hourly on the server. Useful for citing current rates in landing-page CTAs and article content. State rates as factual figures — don't assert whether it's a good or bad time to buy, sell, or refinance (that's individualized financial advice).",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/market/mortgage-rates");
  },
};
