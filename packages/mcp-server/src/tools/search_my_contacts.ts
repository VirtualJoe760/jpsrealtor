// packages/mcp-server/src/tools/search_my_contacts.ts
//
// Minimal contact search. Returns just enough to identify a person; full
// PII requires the explicit get_contact follow-up call.
//
// PII NOTE: Contact name + primary phone + primary email flow into Claude
// when this tool returns. Anthropic logs prompts and completions per the
// agent's Claude subscription terms. Use only when the agent has asked.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const search_my_contacts: ToolDef = {
  name: "search_my_contacts",
  description:
    "Search the agent's own contacts by name, organization, email, or phone substring. Returns minimal display data only (id, name, primary phone, primary email, status, tags). For full notes, history, address, and interests, call get_contact with the id from the result. PII WARNING: contact name + primary contact methods flow into the Claude conversation. Use only when the agent has explicitly asked you to look up a contact.",
  inputSchema: {
    type: "object",
    properties: {
      q: { type: "string", description: 'Free-text query — matches firstName, lastName, organization, email, or phone substring (case-insensitive)' },
      status: {
        type: "string",
        enum: ["uncontacted", "contacted", "qualified", "nurturing", "client", "inactive"],
      },
      tag: { type: "string", description: 'Filter to contacts carrying a specific tag (e.g. "buyer")' },
      limit: { type: "number", description: "1-50, default 20" },
      skip: { type: "number" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/contacts/search", { query });
  },
};
