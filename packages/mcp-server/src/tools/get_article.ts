import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_article: ToolDef = {
  name: "get_article",
  description:
    "Fetch one of the agent's articles by slugId. Returns the full record so you can reference prior content, suggest edits, or model a new draft on an existing winner.",
  inputSchema: {
    type: "object",
    properties: {
      slugId: { type: "string" },
    },
    required: ["slugId"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { slugId } = input as { slugId: string };
    return await request(config, `/api/skill/articles/${encodeURIComponent(slugId)}`);
  },
};
