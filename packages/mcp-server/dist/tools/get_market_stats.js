"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_market_stats = void 0;
const http_js_1 = require("../http.js");
exports.get_market_stats = {
    name: "get_market_stats",
    description: "Returns a quick market snapshot for a city or subdivision: median list price, active count, median days on market, price range. Computed from the active MLS feed. Provide city, subdivision, or both — at least one is required. Defaults to Residential sales — median list price is meaningless if you mix $2k/mo rentals with $1M sales. Pass propertyType: \"Residential Lease\" for a rental-market snapshot.",
    inputSchema: {
        type: "object",
        properties: {
            city: { type: "string" },
            subdivision: { type: "string" },
            propertyType: {
                type: "string",
                description: 'Defaults to "Residential" (sales). Accepts: "Residential" / "Sale" | "Residential Lease" / "Rental" | "Multi-family" | "Land" | "all". Raw codes A/B/C/D also accepted.',
            },
        },
        additionalProperties: false,
    },
    async handler(input, config) {
        const query = {};
        for (const [k, v] of Object.entries(input)) {
            if (typeof v === "string" && v)
                query[k] = v;
        }
        return await (0, http_js_1.request)(config, "/api/skill/market/stats", { query });
    },
};
