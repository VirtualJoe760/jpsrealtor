"use strict";
// packages/mcp-server/src/tools/get_listing_photos.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_listing_photos = void 0;
const http_js_1 = require("../http.js");
exports.get_listing_photos = {
    name: "get_listing_photos",
    description: "Returns ordered photo URLs (largest variant + thumbnail) for an MLS listing. Useful when drafting a landing page about a property — you can suggest a hero image URL the agent can drop into create_landing_page. Defaults to 12 photos (enough to pick a hero plus alternates); set limit to fetch more (max 60). totalAvailable + truncated tell you whether the listing has more.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string" },
            limit: {
                type: "number",
                description: "Max photos to return (1-60, default 12). Most calls just need the first 1-3 for hero selection.",
            },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey, limit } = input;
        const query = {};
        if (typeof limit === "number")
            query.limit = limit;
        return await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}/photos`, { query });
    },
};
