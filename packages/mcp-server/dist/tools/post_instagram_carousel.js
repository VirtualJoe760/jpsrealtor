"use strict";
// packages/mcp-server/src/tools/post_instagram_carousel.ts
//
// REAL-WORLD POST — publishes a 2–10 image carousel to the agent's Instagram
// Business Account. Requires the `social:post` scope on the token AND the
// agent's Meta connection must include the instagram_basic +
// instagram_content_publish scopes (added in OAuth flow; agent reauths once).
//
// IMPORTANT: this is a publish action, not a draft. The post is live the
// moment this returns. Always confirm with the agent first.
Object.defineProperty(exports, "__esModule", { value: true });
exports.post_instagram_carousel = void 0;
const http_js_1 = require("../http.js");
exports.post_instagram_carousel = {
    name: "post_instagram_carousel",
    description: "Publish a 2–10 image carousel to the agent's Instagram Business Account. PUBLISHES IMMEDIATELY — no draft step. Always confirm caption + image set with the agent before calling. Image URLs must be publicly-fetchable HTTPS JPEG/PNG (Cloudinary, Spark CDN, etc.) — local file paths or data URIs are rejected by Instagram. Caption ≤ 2200 chars. Requires the social:post token scope. Returns the post id + permalink on success.",
    inputSchema: {
        type: "object",
        properties: {
            imageUrls: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 10,
                description: "2–10 publicly-fetchable HTTPS image URLs (JPEG or PNG). Pull these from get_listing_photos, my_agent_profile, or any other ChatRealty tool that surfaces URLs.",
            },
            caption: {
                type: "string",
                description: "Post caption. Hashtags allowed (Instagram counts them toward the 2200 limit). Line breaks are preserved.",
            },
        },
        required: ["imageUrls", "caption"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { imageUrls, caption } = input;
        return await (0, http_js_1.request)(config, "/api/skill/instagram/carousel", {
            method: "POST",
            body: { imageUrls, caption },
        });
    },
};
