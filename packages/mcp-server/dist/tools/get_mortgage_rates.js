"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_mortgage_rates = void 0;
const http_js_1 = require("../http.js");
exports.get_mortgage_rates = {
    name: "get_mortgage_rates",
    description: "Returns the current national 30-yr and 15-yr fixed mortgage rates. Cached hourly on the server. Useful for citing current rates in landing-page CTAs and article content. State rates as factual figures — don't assert whether it's a good or bad time to buy, sell, or refinance (that's individualized financial advice).",
    inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
    },
    async handler(_input, config) {
        return await (0, http_js_1.request)(config, "/api/skill/market/mortgage-rates");
    },
};
