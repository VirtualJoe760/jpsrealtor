"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_neighborhood_info = void 0;
const http_js_1 = require("../http.js");
exports.get_neighborhood_info = {
    name: "get_neighborhood_info",
    description: "Returns a city market snapshot: active listing count, price range, average + median list price, property-type breakdown (sales/rentals/multi-family), number of subdivisions, and the MLS sources covering this city. Useful as a quick aggregate when writing a city-focused landing page or article. NOTE: this does NOT return population, schools, parks, dining, points-of-interest, or demographics — those don't live in the City model. For per-subdivision price stats, use get_subdivision_cma.",
    inputSchema: {
        type: "object",
        properties: {
            slug: { type: "string", description: 'City slug, e.g. "palm-desert"' },
        },
        required: ["slug"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { slug } = input;
        return await (0, http_js_1.request)(config, `/api/skill/market/neighborhoods/${encodeURIComponent(slug)}`);
    },
};
