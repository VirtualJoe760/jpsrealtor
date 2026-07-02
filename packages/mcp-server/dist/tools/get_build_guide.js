"use strict";
// packages/mcp-server/src/tools/get_build_guide.ts
//
// In-loop accessor for the build-guide prompt library. Resources are the
// primary surface (guide://chatrealty/build-guide), but not every MCP client
// browses resources — this tool lets Claude pull the guide, or a single prompt
// by id, directly during a build session.
//
// Pure local data: it reads the prompt registry, makes no network call, and
// ignores the bearer token. Available in BOTH tiers (agent + research) — the
// build guide is documentation, not data.
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_build_guide = void 0;
const prompts_js_1 = require("../build-guide/prompts.js");
exports.get_build_guide = {
    name: "get_build_guide",
    description: "Returns the ChatRealty build-guide prompts — copy-paste instructions for building a real-estate site with Claude (connect MLS, seed the DB, scaffold listings, add the map, wire favorites + lead capture, build neighborhoods). Call with no arguments to list every step, or pass an `id` to fetch one prompt's full body.",
    inputSchema: {
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "Optional prompt id (e.g. 'connect-mls-feed', 'seed-your-db', 'scaffold-listings-page', 'add-the-map', 'wire-favorites-and-lead-capture', 'build-neighborhoods'). Omit to list all steps.",
            },
        },
        additionalProperties: false,
    },
    async handler(input) {
        const id = typeof input.id === "string" ? input.id.trim() : "";
        if (id) {
            const prompt = (0, prompts_js_1.getBuildGuidePrompt)(id);
            if (!prompt) {
                return {
                    error: "not_found",
                    message: `No build-guide prompt with id "${id}".`,
                    availableIds: prompts_js_1.BUILD_GUIDE_PROMPTS.map((p) => p.id),
                };
            }
            return {
                id: prompt.id,
                title: prompt.title,
                summary: prompt.summary,
                order: prompt.order,
                body: prompt.body,
            };
        }
        return {
            steps: [...prompts_js_1.BUILD_GUIDE_PROMPTS]
                .sort((a, b) => a.order - b.order)
                .map((p) => ({ id: p.id, title: p.title, summary: p.summary, order: p.order })),
        };
    },
};
