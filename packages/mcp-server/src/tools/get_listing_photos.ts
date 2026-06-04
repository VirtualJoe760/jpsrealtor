// packages/mcp-server/src/tools/get_listing_photos.ts

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_listing_photos: ToolDef = {
  name: "get_listing_photos",
  description:
    "Returns ordered photo URLs (largest variant + thumbnail) for an MLS listing. Useful when drafting a landing page about a property — you can suggest a hero image URL the agent can drop into create_landing_page.",
  inputSchema: {
    type: "object",
    properties: {
      listingKey: { type: "string" },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { listingKey } = input as { listingKey: string };
    return await request(config, `/api/skill/listings/${encodeURIComponent(listingKey)}/photos`);
  },
};
