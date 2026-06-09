"use strict";
// packages/mcp-server/src/tools/search_my_contacts.ts
//
// Minimal contact search. Returns just enough to identify a person; full
// PII requires the explicit get_contact follow-up call.
//
// PII NOTE: Contact name + primary phone + primary email flow into Claude
// when this tool returns. Anthropic logs prompts and completions per the
// agent's Claude subscription terms. Use only when the agent has asked.
Object.defineProperty(exports, "__esModule", { value: true });
exports.search_my_contacts = void 0;
const http_js_1 = require("../http.js");
exports.search_my_contacts = {
    name: "search_my_contacts",
    description: "Search the agent's own contacts by name, organization, email, or phone substring. Returns minimal display data only (id, name, primary phone, primary email, status, tags). For full notes, history, address, and interests, call get_contact with the id from the result. PII WARNING: contact name + primary contact methods flow into the Claude conversation. Use only when the agent has explicitly asked you to look up a contact.",
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
        const query = {};
        for (const [k, v] of Object.entries(input)) {
            if (v === undefined || v === null)
                continue;
            query[k] = v;
        }
        return await (0, http_js_1.request)(config, "/api/skill/contacts/search", { query });
    },
};
