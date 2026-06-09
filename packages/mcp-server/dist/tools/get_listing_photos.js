"use strict";
// packages/mcp-server/src/tools/get_listing_photos.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_listing_photos = void 0;
const http_js_1 = require("../http.js");
// Fetch one image and return it as an MCP image content block (base64).
// Returns null on any failure so a single bad photo never fails the whole call.
async function fetchImageBlock(url) {
    if (!url)
        return null;
    try {
        const res = await fetch(url);
        if (!res.ok)
            return null;
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        if (!mimeType.startsWith("image/"))
            return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0 || buf.length > 5_000_000)
            return null; // skip empty / oversized
        return { type: "image", data: buf.toString("base64"), mimeType };
    }
    catch {
        return null;
    }
}
exports.get_listing_photos = {
    name: "get_listing_photos",
    description: "Returns ordered photo URLs for an MLS listing, plus a galleryUrl link to the full public gallery. " +
        "IMPORTANT: plain photo URLs do NOT render in most chat clients (Claude shows a broken-image icon). " +
        "To actually SHOW the home's photos to a person, set `embed` to the number of photos to display (e.g. embed: 8) — " +
        "those come back as inline RENDERED images. Leave embed unset/0 only when you just need URLs programmatically " +
        "(e.g. picking a hero image for create_landing_page). `limit` controls how many URLs are listed (default 12, max 60); " +
        "totalAvailable + truncated tell you whether the listing has more.",
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
                description: "Number of photos to return as inline RENDERED images so they display in chat (0-12, default 0). " +
                    "Set this (e.g. 8) whenever a person wants to SEE the home. Leave 0 for URL-only programmatic use.",
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
        const embedN = typeof embed === "number" ? Math.max(0, Math.min(12, Math.floor(embed))) : 0;
        const photos = Array.isArray(data?.photos) ? data.photos : [];
        // URL-only path (backward compatible): return the JSON data as before.
        if (embedN === 0 || photos.length === 0) {
            return enriched;
        }
        // Display path: fetch the first N photos and return them as rendered image
        // blocks alongside a text block carrying the URLs/metadata + galleryUrl.
        const toEmbed = photos.slice(0, embedN);
        const fetched = await Promise.all(toEmbed.map((p) => fetchImageBlock(p?.url || p?.thumbUrl)));
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
