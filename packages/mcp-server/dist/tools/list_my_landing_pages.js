"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list_my_landing_pages = void 0;
const http_js_1 = require("../http.js");
exports.list_my_landing_pages = {
    name: "list_my_landing_pages",
    description: "List the agent's landing pages (drafts + published + archived), most-recently-updated first. Optional status filter. Useful before drafting a new one — checks for prior work to reference or to avoid duplicate slugs.",
    inputSchema: {
        type: "object",
        properties: {
            status: {
                type: "string",
                enum: ["draft", "published", "archived"],
                description: "Optional status filter",
            },
            limit: { type: "number", description: "1-50, default 20" },
            skip: { type: "number", description: "Pagination offset, default 0" },
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
        return await (0, http_js_1.request)(config, "/api/skill/landing-pages", { query });
    },
};
