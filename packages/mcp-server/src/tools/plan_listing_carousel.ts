// packages/mcp-server/src/tools/plan_listing_carousel.ts
//
// The gathering step for a listing carousel. One call returns listing facts,
// the photo list with indices, real subdivision CMA numbers already formatted
// for the stat card, the agent's brand marks, and a slot-by-slot outline of
// what to write for each slide.
//
// It returns MATERIAL, not copy. Claude writes the hook, room captions, text
// slides and CTA in the agent's voice — this makes that copy grounded in real
// figures and keeps it inside the limits each renderer enforces.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const plan_listing_carousel: ToolDef = {
  name: "plan_listing_carousel",
  description:
    "START HERE when building an Instagram carousel for a listing. One call returns everything needed to author the post: listing facts, the photo list with indices, real subdivision closed-sale stats pre-formatted for the CMA slide, the agent's brand color/handle/license, and a slide-by-slide outline of what to write with each renderer's hard limits. Returns material, NOT copy — write the hook, room captions, text slides and CTA yourself in the agent's voice, grounded in what this returns. Then render with create_listing_cover, stage_listing_with_agent + create_carousel_slide, and publish with post_instagram_carousel only after the agent approves the full set.",
  inputSchema: {
    type: "object",
    properties: {
      listingKey: {
        type: "string",
        description: "MLS listingKey to plan a carousel for.",
      },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/content/carousel-plan", {
      method: "POST",
      body: input as Record<string, unknown>,
    });
  },
};
