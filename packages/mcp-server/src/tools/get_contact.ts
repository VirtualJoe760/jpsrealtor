import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const get_contact: ToolDef = {
  name: "get_contact",
  description:
    "Fetch full detail for one of the agent's contacts: name, all phones, all emails, address, interests (buying/selling, price range, preferred locations), preferences (SMS/email/call opt-in), notes, and note history. PII WARNING: the entire contact record — including notes the agent has written — flows into Claude's context. Use ONLY when the agent has asked to dig into a specific person, and never call get_contact in a loop over search_my_contacts results.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Contact id from search_my_contacts or my_recent_leads" },
    },
    required: ["id"],
    additionalProperties: false,
  },
  async handler(input, config) {
    const { id } = input as { id: string };
    return await request(config, `/api/skill/contacts/${encodeURIComponent(id)}`);
  },
};
