// packages/mcp-server/src/tools/show_listing_board.ts
//
// Renders a set of MLS listings as an INTERACTIVE BOARD (card grid with photos)
// inside Claude, via the MCP Apps extension. Same filter surface as
// search_listings, but instead of returning text/inline-images it returns a
// `structuredContent` payload that the ui://chatrealty/listing-board.html app
// renders — photos inlined as base64 data: URIs so they always display.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";
import { fetchImageDataUri } from "./_media.js";
import { LISTING_BOARD_URI } from "../ui/listing-board.js";

export const show_listing_board: ToolDef = {
  name: "show_listing_board",
  description:
    "Show a set of active MLS listings as an INTERACTIVE VISUAL BOARD (a card grid with real photos) rendered inline in Claude — the best way to let the user SEE and browse multiple homes. Same filters as search_listings (city, subdivision, propertyType, price, beds, baths, build era, near/radiusMiles). Prefer this over search_listings whenever the user wants to look at / browse listings rather than just count or analyze them. Photos are embedded so they render directly. (Renders on Claude web + desktop; on mobile it falls back to a text summary.)",
  uiResourceUri: LISTING_BOARD_URI,
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: 'e.g. "Palm Desert"' },
      subdivision: { type: "string", description: 'e.g. "Indian Wells Country Club"' },
      propertyType: { type: "string", description: 'Defaults to "Residential" (sales). "Residential Lease" for rentals, "Land", or "all".' },
      minPrice: { type: "number" },
      maxPrice: { type: "number" },
      minBeds: { type: "number" },
      maxBeds: { type: "number" },
      minBaths: { type: "number" },
      hasPool: { type: "boolean" },
      minYearBuilt: { type: "number" },
      maxYearBuilt: { type: "number" },
      near: { type: "string", description: "ZIP, city, neighborhood, address, or 'lat,lng' to sort by distance. For 'near me', ask the user for their area first." },
      radiusMiles: { type: "number" },
      limit: { type: "number", description: "Max listings on the board (1-30, default 12)." },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const { limit, ...filters } = input as Record<string, unknown>;
    const n = typeof limit === "number" ? Math.max(1, Math.min(30, Math.floor(limit))) : 12;

    const query: Record<string, string | number | boolean> = { limit: n };
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) query[k] = v as string | number | boolean;
    }

    const data: any = await request(config, "/api/skill/listings/search", { query });
    const items: any[] = Array.isArray(data?.items) ? data.items : [];

    // Inline each thumbnail as a base64 data: URI (fetched in parallel). data:
    // URIs are the one image source the app sandbox always renders.
    const listings = await Promise.all(
      items.slice(0, n).map(async (it) => ({
        listingKey: it.listingKey,
        address: it.address ?? null,
        city: it.city ?? null,
        price: it.currentPrice ?? it.listPrice ?? null,
        beds: it.beds ?? null,
        baths: it.baths ?? null,
        sqft: it.sqft ?? null,
        yearBuilt: it.yearBuilt ?? null,
        daysOnMarket: it.daysOnMarket ?? null,
        detailUrl: it.detailUrl ?? null,
        lat: it.latitude ?? null,
        lng: it.longitude ?? null,
        thumb: await fetchImageDataUri(it.thumbUrl || it.primaryPhotoUrl),
      }))
    );

    const where =
      (filters.subdivision as string) || (filters.city as string) || (filters.near as string) || "";
    const title =
      `${listings.length} active listing${listings.length === 1 ? "" : "s"}` +
      (where ? ` — ${where}` : "");

    // structuredContent → the board UI. content → the short text the model sees.
    return {
      _structuredContent: { title, listings },
      _mcpText:
        `Rendered an interactive board of ${listings.length} listing${listings.length === 1 ? "" : "s"}` +
        (where ? ` in ${where}` : "") +
        ". " +
        listings
          .map(
            (l) =>
              `${l.address || "?"} — ${l.price ? "$" + Number(l.price).toLocaleString("en-US") : "n/a"}`
          )
          .join("; "),
    };
  },
};
