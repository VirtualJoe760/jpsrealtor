import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const update_article: ToolDef = {
  name: "update_article",
  description:
    "Update a DRAFT article. Fields are all optional; only what you pass gets changed. Refuses to touch published articles (HTTP 409) — publishing triggers the MDX + git push pipeline, so silent edits would desync. Take published articles back to draft in the CMS first.",
  inputSchema: {
    type: "object",
    properties: {
      slugId: { type: "string" },
      title: { type: "string" },
      excerpt: { type: "string" },
      content: { type: "string" },
      category: {
        type: "string",
        enum: ["articles", "market-insights", "real-estate-tips"],
      },
      tags: { type: "array", items: { type: "string" } },
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
    required: ["slugId"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { slugId, ...body } = input as { slugId: string } & Record<string, unknown>;
    return await request(config, `/api/skill/articles/${encodeURIComponent(slugId)}`, {
      method: "PATCH",
      body,
    });
  },
};
