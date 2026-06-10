"use strict";
// packages/mcp-server/src/tools/_media.ts
//
// Shared helper for tools that embed RENDERED photos (MCP image content blocks).
// Plain photo URLs don't render in chat clients — Claude shows a broken-image
// icon — so to actually display a photo we fetch it and return base64.
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchImageBlock = fetchImageBlock;
exports.fetchImageDataUri = fetchImageDataUri;
/**
 * Fetch one image URL and return it as an MCP image content block (base64).
 * Returns null on any failure so a single bad photo never fails the whole call.
 */
async function fetchImageBlock(url) {
    if (!url)
        return null;
    try {
        // Prefer webp so Next's image optimizer returns the smaller variant.
        const res = await fetch(url, { headers: { Accept: "image/webp,image/avif,image/*" } });
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
/**
 * Fetch one image URL and return it as a base64 `data:` URI string. Used by the
 * MCP App listing board, where photos must be inlined as data: URIs (the only
 * image source the app/artifact sandbox CSP reliably allows). Null on failure.
 */
async function fetchImageDataUri(url) {
    const block = await fetchImageBlock(url);
    return block ? `data:${block.mimeType};base64,${block.data}` : null;
}
