"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_article = void 0;
const http_js_1 = require("../http.js");
exports.get_article = {
    name: "get_article",
    description: "Fetch one of the agent's articles by slugId. Returns the full record so you can reference prior content, suggest edits, or model a new draft on an existing winner.",
    inputSchema: {
        type: "object",
        properties: {
            slugId: { type: "string" },
        },
        required: ["slugId"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { slugId } = input;
        return await (0, http_js_1.request)(config, `/api/skill/articles/${encodeURIComponent(slugId)}`);
    },
};
