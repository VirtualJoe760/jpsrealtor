"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list_my_articles = void 0;
const http_js_1 = require("../http.js");
exports.list_my_articles = {
    name: "list_my_articles",
    description: "List the agent's articles (blog posts, market insights, real estate tips), most-recently-updated first. Optional filter by status and/or category. Use BEFORE drafting to check for prior work to reference or avoid duplicating topics.",
    inputSchema: {
        type: "object",
        properties: {
            status: {
                type: "string",
                enum: ["draft", "published", "archived"],
            },
            category: {
                type: "string",
                enum: ["articles", "market-insights", "real-estate-tips"],
            },
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
        return await (0, http_js_1.request)(config, "/api/skill/articles", { query });
    },
};
