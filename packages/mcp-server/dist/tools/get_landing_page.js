"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_landing_page = void 0;
const http_js_1 = require("../http.js");
exports.get_landing_page = {
    name: "get_landing_page",
    description: "Fetch one of the agent's landing pages by slugId. Returns the full record so you can reference prior content, suggest edits, or model a new draft on an existing winner.",
    inputSchema: {
        type: "object",
        properties: {
            slugId: { type: "string", description: "Slug from create_landing_page or list_my_landing_pages" },
        },
        required: ["slugId"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const { slugId } = input;
        return await (0, http_js_1.request)(config, `/api/skill/landing-pages/${encodeURIComponent(slugId)}`);
    },
};
