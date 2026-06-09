"use strict";
// packages/mcp-server/src/tools/get_listing_photos.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_listing_photos = void 0;
const http_js_1 = require("../http.js");
const _media_js_1 = require("./_media.js");
exports.get_listing_photos = {
    name: "get_listing_photos",
    description: "Shows a home's photos. BY DEFAULT returns the first 6 photos as inline RENDERED images that display directly in " +
        "chat, plus the photo URLs and a galleryUrl link to the full public gallery. (Plain URLs alone do NOT render in chat " +
        "clients — Claude shows a broken-image icon — which is why this embeds real images by default.) Tune with `embed`: " +
        "raise it (up to 12) to show more, lower it to show fewer, or set embed:0 for URL-only when you just need a hero " +
        "image URL programmatically (e.g. for create_landing_page). `limit` controls how many URLs are listed (default 12, max 60).",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: { type: "string" },
            limit: {
                type: "number",
                description: "Max photo URLs to list (1-60, default 12).",
            },
            embed: {
                type: "number",
                description: "How many photos to return as inline RENDERED images so they display in chat (0-12, default 6). " +
                    "Raise to show more, lower to show fewer, or set 0 for URL-only (e.g. picking a landing-page hero).",
            },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey, limit, embed } = input;
        const query = {};
        if (typeof limit === "number")
            query.limit = limit;
        const data = await (0, http_js_1.request)(config, `/api/skill/listings/${encodeURIComponent(listingKey)}/photos`, { query });
        const galleryUrl = `${config.apiBase.replace(/\/+$/, "")}/mls-listings/${encodeURIComponent(listingKey)}`;
        const enriched = { ...data, galleryUrl };
        // Default to embedding 6 rendered photos so "show me this home" displays
        // images without the caller having to opt in (and even if a stale client
        // schema doesn't send `embed` at all). embed:0 opts out for URL-only use.
        const DEFAULT_EMBED = 6;
        const embedN = typeof embed === "number" ? Math.max(0, Math.min(12, Math.floor(embed))) : DEFAULT_EMBED;
        const photos = Array.isArray(data?.photos) ? data.photos : [];
        // URL-only path (backward compatible): return the JSON data as before.
        if (embedN === 0 || photos.length === 0) {
            return enriched;
        }
        // Display path: fetch the first N photos and return them as rendered image
        // blocks alongside a text block carrying the URLs/metadata + galleryUrl.
        const toEmbed = photos.slice(0, embedN);
        const fetched = await Promise.all(toEmbed.map((p) => (0, _media_js_1.fetchImageBlock)(p?.url || p?.thumbUrl)));
        const imageBlocks = fetched.filter((b) => b !== null);
        const summary = {
            ...enriched,
            embedded: imageBlocks.length,
            ...(imageBlocks.length < toEmbed.length
                ? { note: `${toEmbed.length - imageBlocks.length} image(s) could not be loaded for inline display.` }
                : {}),
        };
        return {
            _mcpContent: [
                { type: "text", text: JSON.stringify(summary, null, 2) },
                ...imageBlocks,
            ],
        };
    },
};
