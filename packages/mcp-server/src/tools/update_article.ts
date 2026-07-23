import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const update_article: ToolDef = {
  name: "update_article",
  description:
    "Update a DRAFT article, and optionally PUBLISH it. Fields are all optional; only what you pass gets changed. Pass status: 'published' to take a draft live — ONLY when the agent has reviewed the draft and explicitly asked to publish; never publish on your own initiative. Refuses content edits on already-published articles (HTTP 409); those go back to draft in the CMS first.",
  inputSchema: {
    type: "object",
    properties: {
      slugId: { type: "string" },
      status: {
        type: "string",
        enum: ["published"],
        description:
          "Pass 'published' to publish this draft (runs the full CMS publish pipeline + Google Business cross-post). Only with the agent's explicit approval.",
      },
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
