"use strict";
// packages/mcp-server/src/tools/find_comparables.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.find_comparables = void 0;
const http_js_1 = require("../http.js");
exports.find_comparables = {
    name: "find_comparables",
    description: "Returns recent closed comparable sales for a listing — same subdivision (or city), same property type, ±1 bed/bath, within ±20% of list price, sold in the last 6 months. Includes a median close price aggregate. For CMA narratives or 'similar homes have sold for…' content.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string" },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey } = input;
        return await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}/comparables`);
    },
};
