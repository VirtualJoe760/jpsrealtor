// packages/mcp-server/src/tools/stage_listing_with_agent.ts
//
// Calls Gemini 2.5 Flash Image ("Nano Banana") to insert the agent into
// a listing's photos. Returns Cloudinary URLs of the staged images ready
// to feed into post_instagram_carousel or any other surface.
//
// Costs ~$0.04/image at current Gemini pricing. Takes ~30s for 10 images
// in parallel. Returns a structured response so the agent can review
// before posting.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const stage_listing_with_agent: ToolDef = {
  name: "stage_listing_with_agent",
  description:
    "Use Gemini 2.5 Flash Image (Nano Banana) to generate marketing images that place the agent (from their headshot) naturally INTO each listing photo — like they're showing the home. Each image is subtly color-graded so it looks distinct from the original MLS photo. Returns Cloudinary URLs at 4:5 portrait (Instagram-optimal) for review before posting. Takes ~30 seconds for 10 photos. ALWAYS pass `photoIndexes` and choose INTERIOR ROOM photos — the compositing only works when the scene gives the model a floor plane and human-scale reference. Aerial and distant-exterior shots come back with a giant agent floating over the property, and MLS feeds routinely lead with drone shots, so the default first-N selection often produces unusable images. Get the photo list from plan_listing_carousel or get_listing_photos first. After this call, review every returned URL with the agent before passing them to post_instagram_carousel.",
  inputSchema: {
    type: "object",
    properties: {
      listingKey: {
        type: "string",
        description: "MLS listingKey to pull source photos from.",
      },
      photoIndexes: {
        type: "array",
        items: { type: "number" },
        description:
          "Which listing photos to stage, by 0-based index, in the order you want them in the carousel (max 10). STRONGLY PREFERRED over `count`. Pick interior rooms — great room, kitchen, primary bedroom, entry, a covered patio. Avoid aerials, distant exteriors, and detail/close-up shots: there is no floor plane for the model to stand the agent on. If omitted, the first `count` photos are used, which is usually wrong.",
      },
      count: {
        type: "number",
        description:
          "How many photos to generate (1-10, default 5) when `photoIndexes` is not given. Each costs ~$0.04. Prefer `photoIndexes`.",
      },
      prompt: {
        type: "string",
        description:
          "Optional override of the default composition prompt. Use only if the agent asks for a specific feel (e.g., 'sunset golden hour vibe' / 'modern minimalist style'). Default works well for most listings.",
      },
      headshotUrl: {
        type: "string",
        description:
          "Optional override of the agent's saved headshot URL (e.g., to use a more casual photo).",
      },
    },
    required: ["listingKey"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { listingKey, count, prompt, headshotUrl } = input as {
      listingKey: string;
      count?: number;
      prompt?: string;
      headshotUrl?: string;
    };
    return await request(config, "/api/skill/images/agent-staged-listing", {
      method: "POST",
      body: { listingKey, count, prompt, headshotUrl },
    });
  },
};
