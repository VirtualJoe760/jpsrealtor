"use strict";
// packages/mcp-server/src/tools/search_listings.ts
//
// Search the active MLS feed. Read-only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.search_listings = void 0;
const http_js_1 = require("../http.js");
exports.search_listings = {
    name: "search_listings",
    description: "Search the active MLS feed by city, subdivision, property type, beds, baths, price range, and build era. Returns a paginated list of listings with key fields and a slug for the public detail page. By default returns sales only (Residential) — pass propertyType: \"Residential Lease\" for rentals, \"Land\" for land, or \"all\" to mix everything. For rentals, listPrice is the monthly rent (typically $1,500-$15,000) not the sale price. Filter by build era with minYearBuilt/maxYearBuilt (e.g. mid-century modern ≈ 1945-1969) — prefer this over fetching everything and sifting by year yourself.",
    inputSchema: {
        type: "object",
        properties: {
            city: { type: "string", description: 'e.g. "Palm Desert"' },
            subdivision: { type: "string", description: 'e.g. "PGA West"' },
            propertyType: {
                type: "string",
                description: 'Defaults to "Residential" (sales). Accepts: "Residential" / "Sale" (sales, code A) | "Residential Lease" / "Rental" / "Lease" (rentals, code B) | "Multi-family" / "Income" (code C) | "Land" (code D) | "all" to mix. Raw codes A/B/C/D also accepted.',
            },
            status: {
                type: "string",
                description: 'standardStatus value; defaults to "Active"',
            },
            minPrice: { type: "number" },
            maxPrice: { type: "number" },
            minBeds: { type: "number" },
            maxBeds: { type: "number" },
            minBaths: { type: "number" },
            maxBaths: { type: "number" },
            minYearBuilt: { type: "number", description: "Earliest year built (inclusive). For mid-century-modern era homes use ~1945-1969." },
            maxYearBuilt: { type: "number", description: "Latest year built (inclusive). For 'new construction' use a recent year (e.g. 2020)." },
            hasPool: {
                type: "boolean",
                description: 'Filter on pool. true = listing has a pool (poolFeatures populated, not "None"). false = no pool. Omit to include both.',
            },
            maxDaysOnMarket: {
                type: "number",
                description: 'Only listings that came on the market within the last N days. e.g. 2 = "new this week", 7 = "new this week", 30 = "newer than a month". Useful for "what just hit the market" queries.',
            },
            minDaysOnMarket: {
                type: "number",
                description: 'Only listings that have been on the market at least N days. Useful for "stale" / "lingering" searches that might be ripe for price reductions.',
            },
            limit: { type: "number", description: "Max results per page (1-50, default 20)" },
            skip: { type: "number", description: "Pagination offset" },
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
        return await (0, http_js_1.request)(config, "/api/skill/listings/search", { query });
    },
};
