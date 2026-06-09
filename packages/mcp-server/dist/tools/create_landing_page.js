"use strict";
// packages/mcp-server/src/tools/create_landing_page.ts
//
// Create a landing-page draft on the agent's ChatRealty site. Draft-only by
// design — the agent reviews and publishes from the CMS.
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_landing_page = void 0;
const http_js_1 = require("../http.js");
exports.create_landing_page = {
    name: "create_landing_page",
    description: "Create a landing-page DRAFT on the agent's ChatRealty site. Draft-only — the agent will review and publish from the CMS. Use this when the user says 'create a landing page', 'build a landing page on chatrealty', 'draft a page for [community/listing/event]', or similar. Pull agent context from my_agent_profile and listing/market context as needed before drafting. Returns the editUrl + previewUrl for follow-up.",
    inputSchema: {
        type: "object",
        properties: {
            title: { type: "string", description: "10-200 chars" },
            excerpt: { type: "string", description: "≤ 300 chars; auto-derived if omitted" },
            content: {
                type: "string",
                description: "MDX body, ≥ 500 chars. Punchy real-estate LP style: strong headline, 1-3 short paragraphs, scannable bullets, clear CTA.",
            },
            featuredImage: {
                type: "object",
                properties: {
                    url: { type: "string", description: "Cloudinary URL or other publicly accessible image URL. Leave empty if the agent hasn't picked one." },
                    alt: { type: "string" },
                    publicId: { type: "string" },
                },
                additionalProperties: false,
            },
            seo: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    keywords: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
            },
            landingPage: {
                type: "object",
                properties: {
                    standalone: { type: "boolean" },
                    heroType: { type: "string", enum: ["photo", "video"] },
                    youtubeUrl: { type: "string" },
                    videoAutoplay: { type: "boolean" },
                    themeOverride: { type: "string", enum: ["", "lightgradient", "blackspace"] },
                    formEnabled: { type: "boolean" },
                    formHeading: { type: "string" },
                    formButtonText: { type: "string" },
                    formRecipients: { type: "string" },
                    formDisclaimer: { type: "string" },
                    formFields: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                label: { type: "string" },
                                type: { type: "string", enum: ["text", "email", "tel", "textarea", "select"] },
                                required: { type: "boolean" },
                                options: { type: "array", items: { type: "string" } },
                            },
                            required: ["id", "label", "type", "required"],
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
        },
        required: ["title", "content"],
        additionalProperties: false,
    },
    async handler(input, config) {
        return await (0, http_js_1.request)(config, "/api/skill/landing-pages", {
            method: "POST",
            body: input,
        });
    },
};
