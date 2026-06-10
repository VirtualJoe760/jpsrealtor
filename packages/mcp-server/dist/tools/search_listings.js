"use strict";
// packages/mcp-server/src/tools/search_listings.ts
//
// Search the active MLS feed. Read-only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.search_listings = void 0;
const http_js_1 = require("../http.js");
const _media_js_1 = require("./_media.js");
exports.search_listings = {
    name: "search_listings",
    description: "Search the active MLS feed by city, subdivision, property type, beds, baths, price range, and build era. Returns a paginated list of listings with key fields and a slug for the public detail page. By default returns sales only (Residential) — pass propertyType: \"Residential Lease\" for rentals, \"Land\" for land, or \"all\" to mix everything. For rentals, listPrice is the monthly rent (typically $1,500-$15,000) not the sale price. Filter by build era with minYearBuilt/maxYearBuilt (e.g. mid-century modern ≈ 1945-1969) — prefer this over fetching everything and sifting by year yourself. Find homes near a place with `near` (a ZIP, city, neighborhood, street address, or \"lat,lng\") plus optional `radiusMiles`; results come back sorted nearest-first with a distanceMiles field. IMPORTANT: for \"homes near me\" / \"closest to me\", the server CANNOT see the user's device location — ask them for their ZIP, neighborhood, or address first, then pass it as `near`. Never guess their location. By default the first 5 results come back with their primary photo RENDERED inline so you SEE the homes — tune with embedPhotos (0 = fast text-only list, up to 12); photos are fetched in parallel so it stays fast.",
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
            near: { type: "string", description: "Center the search on a place and sort by distance: a ZIP, city, neighborhood, street address, or 'lat,lng'. For 'near me', ASK the user for their ZIP/area first — the server can't see their device location." },
            radiusMiles: { type: "number", description: "Radius in miles around `near` (default 10, max 50). Only applies when `near` is set." },
            hasPool: {
                type: "boolean",
                description: 'Filter on pool. true = listing has a pool (poolFeatures populated, not "None"). false = no pool. Omit to include both.',
            },
            maxDaysOnMarket: {
                type: "number",
                description: 'Only listings that came on the market within the last N days. e.g. 2 = "just listed", 7 = "new this week", 30 = "within the last month". Useful for "what just hit the market" queries.',
            },
            minDaysOnMarket: {
                type: "number",
                description: "Only listings that have been on the market at least N days (i.e. a longer time on market). Report days-on-market as a neutral fact — a long time on market has many legitimate explanations; do not label listings stale, overpriced, or distressed.",
            },
            limit: { type: "number", description: "Max results per page (1-50, default 20)" },
            skip: { type: "number", description: "Pagination offset" },
            embedPhotos: {
                type: "number",
                description: "How many of the top results to show with an inline RENDERED primary photo so the homes display in chat (0-12, default 5). Fetched in parallel (one hero shot each), so it stays fast. Set 0 for a text-only list (e.g. counting/analysis).",
            },
        },
        additionalProperties: false,
    },
    async handler(input, config) {
        // embedPhotos is a tool-only concern; everything else is a route filter.
        const { embedPhotos, ...rest } = input;
        const query = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v === undefined || v === null)
                continue;
            query[k] = v;
        }
        const data = await (0, http_js_1.request)(config, "/api/skill/listings/search", { query });
        const n = typeof embedPhotos === "number" ? Math.max(0, Math.min(12, Math.floor(embedPhotos))) : 5;
        const items = Array.isArray(data?.items) ? data.items : [];
        if (n === 0 || items.length === 0)
            return data;
        // Render the primary photo for the first N results so the homes display
        // inline. Hero shot only, fetched in parallel — adds ~one image's latency,
        // not N. URL-only path is unchanged for analysis/counting searches.
        // Resize via our own Next image optimizer → ~20-50KB webp instead of the
        // ~700KB original (the stored Uri640/thumb variants aren't populated).
        // q=75 is the only quality Next allows by default; falls back to the raw
        // image if the optimizer can't handle that source domain.
        const base = config.apiBase.replace(/\/+$/, "");
        const optimize = (raw) => `${base}/_next/image?url=${encodeURIComponent(raw)}&w=640&q=75`;
        const heroes = items.slice(0, n).filter((it) => it?.primaryThumbUrl || it?.primaryPhotoUrl);
        const blocks = (await Promise.all(heroes.map(async (it) => {
            const raw = it.primaryThumbUrl || it.primaryPhotoUrl;
            return (await (0, _media_js_1.fetchImageBlock)(optimize(raw))) || (await (0, _media_js_1.fetchImageBlock)(raw));
        }))).filter((b) => b !== null);
        if (blocks.length === 0)
            return data;
        return {
            _mcpContent: [
                {
                    type: "text",
                    text: JSON.stringify({ ...data, photosShownFor: heroes.slice(0, blocks.length).map((it) => it.address) }, null, 2),
                },
                ...blocks,
            ],
        };
    },
};
