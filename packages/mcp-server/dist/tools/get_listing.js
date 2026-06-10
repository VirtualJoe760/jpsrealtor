"use strict";
// packages/mcp-server/src/tools/get_listing.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_listing = void 0;
const http_js_1 = require("../http.js");
const _media_js_1 = require("./_media.js");
exports.get_listing = {
    name: "get_listing",
    description: "Fetch a full DETAIL SHEET for one MLS listing by listingKey: address, price (with original + current), " +
        "beds/baths/sqft, lot size, year built, levels, HOA, pool/spa, view, parking, heating/cooling, public remarks, " +
        "list agent/office, days on market, and a clickable detailUrl to the full public listing page. By default also " +
        "returns an inline hero photo so the sheet shows the home. Use AFTER search_listings when the user wants to dig " +
        "into a specific property — present it as a clean, readable detail sheet with the photo and a 'View full listing' link.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string", description: "The unique listingKey from search_listings" },
            embedPhoto: {
                type: "boolean",
                description: "Include an inline RENDERED hero photo (default true). Set false for data-only.",
            },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey, embedPhoto } = input;
        const data = await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}`);
        if (embedPhoto === false || !data?.primaryPhotoUrl)
            return data;
        // Resize the hero through our own image optimizer (small webp); fall back
        // to the raw image if the source domain isn't optimizable.
        const base = config.apiBase.replace(/\/+$/, "");
        const thumb = `${base}/_next/image?url=${encodeURIComponent(data.primaryPhotoUrl)}&w=640&q=75`;
        const hero = (await (0, _media_js_1.fetchImageBlock)(thumb)) || (await (0, _media_js_1.fetchImageBlock)(data.primaryPhotoUrl));
        if (!hero)
            return data;
        return {
            _mcpContent: [
                { type: "text", text: JSON.stringify(data, null, 2) },
                hero,
            ],
        };
    },
};
