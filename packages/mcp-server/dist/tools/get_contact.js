"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_contact = void 0;
const http_js_1 = require("../http.js");
exports.get_contact = {
    name: "get_contact",
    description: "Fetch full detail for one of the agent's contacts: name, all phones, all emails, address, interests (buying/selling, price range, preferred locations), preferences (SMS/email/call opt-in), notes, and note history. PII WARNING: the entire contact record — including notes the agent has written — flows into Claude's context. Use ONLY when the agent has asked to dig into a specific person, and never call get_contact in a loop over search_my_contacts results.",
    inputSchema: {
        type: "object",
        properties: {
            id: { type: "string", description: "Contact id from search_my_contacts or my_recent_leads" },
        },
        required: ["id"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { id } = input;
        return await (0, http_js_1.request)(config, `/api/skill/contacts/${encodeURIComponent(id)}`);
    },
};
