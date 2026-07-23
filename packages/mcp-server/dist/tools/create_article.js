"use strict";
// packages/mcp-server/src/tools/create_article.ts
//
// Create an article DRAFT. Same shape as create_landing_page minus the
// landingPage.* options. Categories restricted to blog-style ones.
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_article = void 0;
const http_js_1 = require("../http.js");
exports.create_article = {
    name: "create_article",
    description: "Create an article DRAFT for the agent's ChatRealty CMS — blog posts, market insights, or real estate tips. Published posts serve on the agent's own website AND their tenant site. Always created as a draft; once the agent reviews and approves it in chat, publish it with update_article { status: 'published' } — no CMS login needed. For LANDING pages (lead magnets, listing-specific pages), use create_landing_page instead. Pull agent + market context with my_agent_profile / get_market_stats before drafting.",
    inputSchema: {
        type: "object",
        properties: {
            title: { type: "string", description: "10-200 chars" },
            excerpt: { type: "string", description: "≤ 300 chars; auto-derived if omitted" },
            content: { type: "string", description: "MDX body, ≥ 500 chars. 800-1500 words is a typical blog post length." },
            category: {
                type: "string",
                enum: ["articles", "market-insights", "real-estate-tips"],
                description: 'Default "articles". Use market-insights for Coachella Valley specific market data; real-estate-tips for practical buying/selling advice.',
            },
            tags: {
                type: "array",
                items: { type: "string" },
                description: "Optional tags (also used as keywords if seo.keywords is empty)",
            },
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
        },
        required: ["title", "content"],
        additionalProperties: false,
    },
    async handler(input, config) {
        return await (0, http_js_1.request)(config, "/api/skill/articles", {
            method: "POST",
            body: input,
        });
    },
};
