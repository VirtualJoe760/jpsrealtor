// packages/mcp-server/src/tools/create_carousel_slide.ts
//
// Renders one non-cover slide of a listing carousel. Pairs with
// create_listing_cover (slide 1) and stage_listing_with_agent (the composited
// room photos) to assemble a full post.
//
// The reference 10-slide shape these were designed around:
//   1     cover           create_listing_cover
//   2-5   room photos     stage_listing_with_agent, then kind:"banner" on each
//   6     CMA stat card   kind:"cma"   (feed it get_subdivision_cma output)
//   7-9   copy slides     kind:"text"
//   10    closing card    kind:"cta"
//
// Nothing here publishes. Rendering returns Cloudinary URLs for review;
// post_instagram_carousel is a separate, separately-scoped step.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const create_carousel_slide: ToolDef = {
  name: "create_carousel_slide",
  description:
    'Render ONE non-cover slide of an Instagram listing carousel (4:5 portrait). Four kinds: "banner" adds a room label + caption band over a staged photo (pass the imageUrl returned by stage_listing_with_agent — that tool deliberately generates no text, so the band must be added here); "cma" renders a 2x2 subdivision stat card over the listing price (feed it real numbers from get_subdivision_cma or get_market_stats); "text" renders a copy slide closing on an italic line; "cta" renders the closing card — the agent\'s name, DRE license, headshot and brokerage logo are pulled from their profile server-side and cannot be passed in. Write the copy yourself in the agent\'s voice. Returns a Cloudinary URL. Does NOT publish — review with the agent, then use post_instagram_carousel.',
  inputSchema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["banner", "cma", "text", "cta"],
        description: "Which slide type to render.",
      },
      handle: {
        type: "string",
        description:
          "Social handle printed in the footer, e.g. \"@instadella\". Defaults to the agent's Instagram handle from their profile.",
      },

      // --- banner ---
      imageUrl: {
        type: "string",
        description:
          "banner only. The https URL of the staged room photo to band — typically an output URL from stage_listing_with_agent.",
      },
      publicId: {
        type: "string",
        description:
          "banner only. Cloudinary public_id to band, as an alternative to imageUrl (avoids a re-upload).",
      },
      label: {
        type: "string",
        description:
          'banner and cta. For banner: the room label in letter-spaced small caps, e.g. "THE GREAT ROOM", "THE PRIMARY", "THE COURTYARD" (required). For cta: the small header above the headshot, default "WHY WORK WITH ME".',
      },
      caption: {
        type: "string",
        description:
          'banner only. One line of italic copy under the rule, e.g. "Wake to the pool. Step through the slider. Mountain views included."',
      },

      // --- cma ---
      color: {
        type: "string",
        description:
          'cma and cta. Background hex without # — usually the same accent as the cover, e.g. "B86341".',
      },
      scope: {
        type: "string",
        description: 'cma only. What the stats cover, e.g. "THE CITRUS" (subdivision name).',
      },
      period: {
        type: "string",
        description: 'cma only. Qualifier line, e.g. "4BR+ · $1.5M-$3.5M · LAST 12 MONTHS".',
      },
      stats: {
        type: "array",
        description:
          'cma only. EXACTLY 4 entries, rendered as a 2x2 grid in order. e.g. [{value:"6",label:"HOMES SOLD"},{value:"$2.36M",label:"MEDIAN CLOSE"},{value:"$570",label:"PRICE / SQFT"},{value:"$3.06M",label:"TOP CLOSE"}]. Use real figures.',
        items: {
          type: "object",
          properties: {
            value: { type: "string", description: 'The big number, e.g. "$2.36M".' },
            label: { type: "string", description: 'The small caption, e.g. "MEDIAN CLOSE".' },
          },
          required: ["value", "label"],
          additionalProperties: false,
        },
      },
      listingLabel: {
        type: "string",
        description: 'cma only. Label above the subject price, e.g. "THIS LISTING".',
      },
      listingPrice: {
        type: "string",
        description: 'cma only. The subject listing price, formatted, e.g. "$2,599,000".',
      },
      pitch: {
        type: "string",
        description:
          'cma only. One italic line positioning the listing against the stats, e.g. "Above the recent median in The Citrus. Below the top close." Stay factual and neutral.',
      },

      // --- text ---
      paragraphs: {
        type: "array",
        items: { type: "string" },
        description:
          "text and cta. For text: the body paragraphs (keep each under 220 chars — the layout advances by estimated line count and long paragraphs push the closing line off-slide). For cta: EXACTLY 2 paragraphs, rendered at fixed positions.",
      },
      italicLast: {
        type: "string",
        description:
          'text and cta. The closing italic line. For cta this is the ask, e.g. "DM me. Let\'s talk before you tour another house."',
      },
      bg: {
        type: "string",
        description: 'text only. Background hex without #. Default "F1EBE0" (cream).',
      },
    },
    required: ["kind"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/images/carousel-slide", {
      method: "POST",
      body: input as Record<string, unknown>,
    });
  },
};
