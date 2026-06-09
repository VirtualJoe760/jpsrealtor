"use strict";
// packages/mcp-server/src/tools/stage_listing_with_agent.ts
//
// Calls Gemini 2.5 Flash Image ("Nano Banana") to insert the agent into
// a listing's photos. Returns Cloudinary URLs of the staged images ready
// to feed into post_instagram_carousel or any other surface.
//
// Costs ~$0.04/image at current Gemini pricing. Takes ~30s for 10 images
// in parallel. Returns a structured response so the agent can review
// before posting.
Object.defineProperty(exports, "__esModule", { value: true });
exports.stage_listing_with_agent = void 0;
const http_js_1 = require("../http.js");
exports.stage_listing_with_agent = {
    name: "stage_listing_with_agent",
    description: "Use Gemini 2.5 Flash Image (Nano Banana) to generate marketing images that place the agent (from their headshot) naturally INTO each listing photo — like they're showing the home. Each image is subtly color-graded so it looks distinct from the original MLS photo. Returns Cloudinary URLs at 4:5 portrait (Instagram-optimal) for review before posting. Takes ~30 seconds for 10 photos. After this call, review the returned URLs with the agent before passing them to post_instagram_carousel.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: {
                type: "string",
                description: "MLS listingKey to pull source photos from.",
            },
            count: {
                type: "number",
                description: "How many photos to generate (1-10, default 5). Each costs ~$0.04.",
            },
            prompt: {
                type: "string",
                description: "Optional override of the default composition prompt. Use only if the agent asks for a specific feel (e.g., 'sunset golden hour vibe' / 'modern minimalist style'). Default works well for most listings.",
            },
            headshotUrl: {
                type: "string",
                description: "Optional override of the agent's saved headshot URL (e.g., to use a more casual photo).",
            },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { listingKey, count, prompt, headshotUrl } = input;
        return await (0, http_js_1.request)(config, "/api/skill/images/agent-staged-listing", {
            method: "POST",
            body: { listingKey, count, prompt, headshotUrl },
        });
    },
};
