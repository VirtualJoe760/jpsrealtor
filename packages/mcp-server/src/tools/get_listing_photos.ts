// packages/mcp-server/src/tools/get_listing_photos.ts

import { request } from "../http.js";
import type { ToolDef } from "./types.js";
import { fetchImageBlock, type ImageBlock } from "./_media.js";

export const get_listing_photos: ToolDef = {
  name: "get_listing_photos",
  description:
    "Shows a home's photos. BY DEFAULT returns the first 6 photos as inline RENDERED images that display directly in " +
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
        description:
          "How many photos to return as inline RENDERED images so they display in chat (0-12, default 6). " +
          "Raise to show more, lower to show fewer, or set 0 for URL-only (e.g. picking a landing-page hero).",
      },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { listingKey, limit, embed } = input as {
      listingKey: string;
      limit?: number;
      embed?: number;
    };
    const query: Record<string, string | number> = {};
    if (typeof limit === "number") query.limit = limit;

    const data: any = await request(
      config,
      `/api/skill/listings/${encodeURIComponent(listingKey)}/photos`,
      { query }
    );

    const galleryUrl = `${config.apiBase.replace(/\/+$/, "")}/mls-listings/${encodeURIComponent(
      listingKey
    )}`;
    const enriched = { ...data, galleryUrl };

    // Default to embedding 6 rendered photos so "show me this home" displays
    // images without the caller having to opt in (and even if a stale client
    // schema doesn't send `embed` at all). embed:0 opts out for URL-only use.
    const DEFAULT_EMBED = 6;
    const embedN =
      typeof embed === "number" ? Math.max(0, Math.min(12, Math.floor(embed))) : DEFAULT_EMBED;
    const photos: any[] = Array.isArray(data?.photos) ? data.photos : [];

    // URL-only path (backward compatible): return the JSON data as before.
    if (embedN === 0 || photos.length === 0) {
      return enriched;
    }

    // Display path: fetch the first N photos and return them as rendered image
    // blocks alongside a text block carrying the URLs/metadata + galleryUrl.
    const toEmbed = photos.slice(0, embedN);
    const fetched = await Promise.all(
      toEmbed.map((p) => fetchImageBlock(p?.url || p?.thumbUrl))
    );
    const imageBlocks = fetched.filter((b): b is ImageBlock => b !== null);

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
