"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_subdivision_cma = void 0;
const http_js_1 = require("../http.js");
exports.get_subdivision_cma = {
    name: "get_subdivision_cma",
    description: "Returns the nightly-built CMA stats for one subdivision: medians, distributions, price-per-sqft, active vs. closed counts. The data is sourced from the platform's pre-built subdivision-CMA model (1,400+ subdivisions), so this is the fast path to 'how is X subdivision doing?'.",
    inputSchema: {
        type: "object",
        properties: {
            slug: { type: "string", description: 'Subdivision slug, e.g. "pga-west"' },
        },
        required: ["slug"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { slug } = input;
        return await (0, http_js_1.request)(config, `/api/skill/market/subdivisions/${encodeURIComponent(slug)}`);
    },
};
