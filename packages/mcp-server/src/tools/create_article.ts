// packages/mcp-server/src/tools/create_article.ts
//
// Create an article DRAFT. Same shape as create_landing_page minus the
// landingPage.* options. Categories restricted to blog-style ones.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const create_article: ToolDef = {
  name: "create_article",
  description:
    "Create an article DRAFT on the agent's ChatRealty site — blog posts, market insights, or real estate tips. Draft-only; the agent reviews and publishes from the CMS. For LANDING pages (lead magnets, listing-specific pages), use create_landing_page instead. Pull agent + market context with my_agent_profile / get_market_stats before drafting.",
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
    return await request(config, "/api/skill/articles", {
      method: "POST",
      body: input,
    });
  },
};
