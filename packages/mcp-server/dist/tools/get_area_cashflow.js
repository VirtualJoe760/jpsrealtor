"use strict";
// packages/mcp-server/src/tools/get_area_cashflow.ts
//
// Whole-area rental cash-flow answer — one read of the VPS-precomputed
// cashflowProfile on a subdivision or city. The description carries the
// reading rules because the block's caveats only help if the model repeats
// them instead of recomputing.
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_area_cashflow = void 0;
const http_js_1 = require("../http.js");
exports.get_area_cashflow = {
    name: "get_area_cashflow",
    description: "Precomputed rental cash-flow analysis for a whole AREA — a subdivision/community (e.g. Palm Desert Country Club) or a city. One call returns the full cashflowProfile: a verdict for each of four strategies (long-term annual lease; seasonal at ASKING rates; seasonal at ACHIEVED rates from closed leases; short-term nightly, which is always 'unclear' because no MLS source carries nightly rates), the break-even down payment for the median listing (breakEvenDownPct) and the best listing (minBreakEvenDownPct), cash flow / cash-on-cash / DSCR at 20% down, per-bedroom economics, rent provenance with sample sizes, inventory mix, the top cash-flowing listings per strategy, and plain-language caveats. " +
        "Use for 'what could cash-flow in X?', 'is X a good rental area?', 'seasonal vs long-term in X'. " +
        "This is ALREADY COMPUTED — do not calculate cash flow, rents or break-evens yourself, and do not pull lease comps to rebuild it. " +
        "Reading rules: give a per-strategy determination, never one blanket 'doesn't cash-flow'; lead with the strategies that work, and when none do, say how far off they are using the break-evens (say whether you mean the median or the best listing); quote verdict.reason and verdict.notes verbatim — they carry the provenance; when a rent's source is the ZIP rather than the community, say so; honor inventory.activeCount (every median is over that many listings); never present a peak seasonal rate as monthly income; negative cash flow at 20% down is normal in resort/golf areas, not an error; mention lastUpdated if asked how current it is. " +
        "Identify the area by slug, or by name — add city for a subdivision, since names repeat across cities. A bare name or slug that is both a city and a community resolves to the CITY, with the community listed in alsoMatches; if the user meant the community, call again with that slug and scope 'subdivision'. When you reuse a slug from candidates, alsoMatches, parentCity or childSubdivisions, pass its scope too. If found is false, pick a slug from candidates and call again. If available is false there is no estimate for that area — say so (never substitute zeros) and offer parentCity or childSubdivisions. For individual listings, use find_cashflowing_listings / analyze_listing_cashflow; listingKeys in the block chain into analyze_listing_cashflow.",
    inputSchema: {
        type: "object",
        properties: {
            slug: {
                type: "string",
                description: 'Subdivision or city slug, e.g. "palm-desert-country-club" or "palm-desert". Preferred when you have it.',
            },
            name: {
                type: "string",
                description: 'Area name as the user said it, e.g. "Palm Desert Country Club" or "Palm Desert". Resolved exactly — near-misses come back as candidates.',
            },
            city: {
                type: "string",
                description: 'City the subdivision is in, e.g. "Palm Desert". Needed when a subdivision name repeats across cities.',
            },
            scope: {
                type: "string",
                enum: ["subdivision", "city"],
                description: "Force the lookup to subdivisions or cities. Omit to let the server resolve it.",
            },
        },
        additionalProperties: false,
    },
    async handler(input, config) {
        const q = {};
        for (const [k, v] of Object.entries(input)) {
            if (typeof v === "string" && v.trim())
                q[k] = v.trim();
        }
        return await (0, http_js_1.request)(config, "/api/skill/rentals/area-cashflow", { query: q });
    },
};
