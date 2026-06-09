"use strict";
// packages/mcp-server/src/tools/search_closed_listings.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.search_closed_listings = void 0;
const http_js_1 = require("../http.js");
exports.search_closed_listings = {
    name: "search_closed_listings",
    description: "Search closed/sold listings — same filter surface as search_listings, plus a lookbackMonths window (default 12, max 60). For historical comparisons and 'X homes in this area sold for $Y last year'-style content. Defaults to sales only (Residential) since CMA work is sale-focused; pass propertyType: \"Residential Lease\" for closed/expired rental comps.",
    inputSchema: {
        type: "object",
        properties: {
            city: { type: "string" },
            subdivision: { type: "string" },
            propertyType: {
                type: "string",
                description: 'Defaults to "Residential" (sales). Accepts: "Residential" / "Sale" | "Residential Lease" / "Rental" | "Multi-family" | "Land" | "all" to mix. Raw codes A/B/C/D also accepted.',
            },
            minPrice: { type: "number" },
            maxPrice: { type: "number" },
            minBeds: { type: "number" },
            maxBeds: { type: "number" },
            lookbackMonths: {
                type: "number",
                description: "How many months back to search (1-60, default 12)",
            },
            limit: { type: "number" },
            skip: { type: "number" },
        },
        additionalProperties: false,
    },
    async handler(input, config) {
        const query = {};
        for (const [k, v] of Object.entries(input)) {
            if (v === undefined || v === null)
                continue;
            query[k] = v;
        }
        return await (0, http_js_1.request)(config, "/api/skill/listings/closed/search", { query });
    },
};
