"use strict";
// packages/mcp-server/src/tools/create_listing_cover.ts
//
// Renders an Instagram-ready 4:5 portrait cover slide for an MLS listing
// using one of the named templates. The current default template is
// "simple-luxury" — editorial left panel with hook + city + price +
// address + specs + 1-2 sentence body + agent headshot + listing credit.
//
// Claude should pull the listing details FIRST (via get_listing) and
// write the hook + body itself based on the listing description, then
// pass them in. The route falls back to sensible defaults if Claude
// doesn't provide them.
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_listing_cover = void 0;
const http_js_1 = require("../http.js");
exports.create_listing_cover = {
    name: "create_listing_cover",
    description: "Generate a templated Instagram cover slide (4:5 portrait) for an MLS listing. Default template is \"simple-luxury\" — an editorial design with hook, price, address, specs, body copy, and agent headshot. Pass `hook` and `body` written by you for best results (read the listing description first via get_listing). Accent color is configurable per call so the same layout can run in any brand palette. Returns the Cloudinary URL of the rendered cover.",
    inputSchema: {
        type: "object",
        properties: {
            listingKey: {
                type: "string",
                description: "MLS listingKey to generate the cover for.",
            },
            template: {
                type: "string",
                description: 'Template id. Default "simple-luxury". (More templates will be added — "dark-modern", "magazine", "minimal".)',
            },
            accentColor: {
                type: "string",
                description: 'Hex color (without #) for the accent panel and banner. Default "1C4A5A" (deep teal). e.g. "8B0000" for crimson, "1F1F1F" for charcoal, "C9A66B" for champagne.',
            },
            hook: {
                type: "string",
                description: 'Headline text (e.g. "TOSCANA LUXURY", "DESERT MODERN"). Keep to 2-3 words. If omitted, defaults to "{SUBDIVISION} LUXURY".',
            },
            city: {
                type: "string",
                description: "City subtitle. Defaults to the listing's city, uppercased.",
            },
            body: {
                type: "string",
                description: "1-2 sentence flowing description in magazine-copy tone. Mention what's distinctive about the listing — fairway location, architectural style, premium kitchen, etc. Pulled in italic on the cover. Keep under 260 chars. If omitted, the route uses the first 1-2 sentences of publicRemarks.",
            },
            photoIndex: {
                type: "number",
                description: "Which of the listing's photos to use as the background (0-based). Defaults to 8 (rough heuristic for front exteriors on GPS-sourced listings). Front-exterior auto-detection is a future iteration.",
            },
        },
        required: ["listingKey"],
        additionalProperties: false,
    },
    async handler(input, config) {
        const body = input;
        return await (0, http_js_1.request)(config, "/api/skill/images/cover-slide", {
            method: "POST",
            body,
        });
    },
};
