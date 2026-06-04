import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_mortgage_rates: ToolDef = {
  name: "get_mortgage_rates",
  description:
    "Returns the current national 30-yr and 15-yr fixed mortgage rates. Cached hourly on the server. Useful for landing-page CTAs and article hooks ('with rates at X%, now is a good time to…').",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/market/mortgage-rates");
  },
};
