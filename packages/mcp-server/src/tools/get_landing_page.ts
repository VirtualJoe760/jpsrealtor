import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_landing_page: ToolDef = {
  name: "get_landing_page",
  description:
    "Fetch one of the agent's landing pages by slugId. Returns the full record so you can reference prior content, suggest edits, or model a new draft on an existing winner.",
  inputSchema: {
    type: "object",
    properties: {
      slugId: { type: "string", description: "Slug from create_landing_page or list_my_landing_pages" },
    },
    required: ["slugId"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { slugId } = input as { slugId: string };
    return await request(config, `/api/skill/landing-pages/${encodeURIComponent(slugId)}`);
  },
};
