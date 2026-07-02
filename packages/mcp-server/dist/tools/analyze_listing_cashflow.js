"use strict";
// packages/mcp-server/src/tools/analyze_listing_cashflow.ts
//
// Full per-listing rental cash-flow breakdown by listingKey.
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze_listing_cashflow = void 0;
const http_js_1 = require("../http.js");
exports.analyze_listing_cashflow = {
    name: "analyze_listing_cashflow",
    description: "Full rental cash-flow breakdown for ONE listing by listingKey: estimated rent + its confidence, cap rate, NOI, gross yield, monthly cash flow for 20% AND 25% down, plus the debt-free fixedCosts (so you can re-derive any down-payment % or interest rate yourself). Use after the user focuses on a specific listing or asks 'will this cash-flow'. LEAD with the assumptions from the result. If cashflowStats is null, say cash-flow analysis is unavailable for this listing — do NOT invent a rent. Remember the going rate is long-term annual; seasonal/furnished is a different (usually higher) model.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string", description: "The unique listingKey from search_listings / the board." },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey } = input;
        return await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}/cashflow`);
    },
};
