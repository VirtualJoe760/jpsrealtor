"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_landing_page = void 0;
const http_js_1 = require("../http.js");
exports.update_landing_page = {
    name: "update_landing_page",
    description: "Update a DRAFT landing page. Fields are all optional — only what you pass gets changed. Refuses to touch published pages (HTTP 409); the agent has to take a published LP back to draft in the CMS first. Same field shape as create_landing_page, no slugId in the body — slugId is the URL param.",
    inputSchema: {
        type: "object",
        properties: {
            slugId: { type: "string" },
            title: { type: "string" },
            excerpt: { type: "string" },
            content: { type: "string" },
            featuredImage: {
                type: "object",
                properties: {
                    url: { type: "string" },
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
        required: ["slugId"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { slugId, ...body } = input;
        return await (0, http_js_1.request)(config, `/api/skill/landing-pages/${encodeURIComponent(slugId)}`, {
            method: "PATCH",
            body,
        });
    },
};
