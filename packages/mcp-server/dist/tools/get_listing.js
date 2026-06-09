"use strict";
// packages/mcp-server/src/tools/get_listing.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_listing = void 0;
const http_js_1 = require("../http.js");
exports.get_listing = {
    name: "get_listing",
    description: "Fetch full detail for one MLS listing by listingKey. Includes address, price, beds/baths/sqft, year built, HOA, public remarks, features, photo count. Use this AFTER search_listings to dig into a specific property the agent or visitor is interested in.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string", description: "The unique listingKey from search_listings" },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey } = input;
        return await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}`);
    },
};
