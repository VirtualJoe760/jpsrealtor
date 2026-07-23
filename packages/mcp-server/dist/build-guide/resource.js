"use strict";
// packages/mcp-server/src/build-guide/resource.ts
//
// Serves the build-guide prompt library (./prompts.ts) to Claude as MCP
// resources under the `guide://chatrealty/*` URI namespace, and exposes a
// `get_build_guide` tool so a client that does not browse resources can still
// pull a prompt by id in-loop.
//
// URIs (build_plan §3.4 — `guide://chatrealty/*`):
//   guide://chatrealty/build-guide            → the whole library as one markdown doc
//   guide://chatrealty/build-guide/<prompt-id> → a single prompt as markdown
//
// This module is registry-only data + pure renderers (no network, no SDK
// imports) so both the stdio server and the hosted bridge can mount it the same
// way, and so it is trivially unit-testable.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_GUIDE_MIME = exports.BUILD_GUIDE_URI_PREFIX = exports.BUILD_GUIDE_URI = void 0;
exports.listGuideResources = listGuideResources;
exports.isGuideUri = isGuideUri;
exports.readGuideResource = readGuideResource;
const prompts_js_1 = require("./prompts.js");
exports.BUILD_GUIDE_URI = "guide://chatrealty/build-guide";
exports.BUILD_GUIDE_URI_PREFIX = "guide://chatrealty/build-guide/";
exports.BUILD_GUIDE_MIME = "text/markdown";
/** The list of guide resources advertised in `resources/list`. */
function listGuideResources() {
    const index = {
        uri: exports.BUILD_GUIDE_URI,
        name: "ChatRealty Build Guide",
        description: "Curated, copy-paste prompts for building a real-estate site on ChatRealty with Claude: check your data source, scaffold the site (create-chatrealty-site), customize listings & search, tune the map, wire favorites + lead capture, build neighborhoods.",
        mimeType: exports.BUILD_GUIDE_MIME,
    };
    const perPrompt = prompts_js_1.BUILD_GUIDE_PROMPTS.map((p) => ({
        uri: exports.BUILD_GUIDE_URI_PREFIX + p.id,
        name: `Build Guide — ${p.title}`,
        description: p.summary,
        mimeType: exports.BUILD_GUIDE_MIME,
    }));
    return [index, ...perPrompt];
}
/** True if a URI belongs to the build-guide namespace this module serves. */
function isGuideUri(uri) {
    return uri === exports.BUILD_GUIDE_URI || uri.startsWith(exports.BUILD_GUIDE_URI_PREFIX);
}
function renderPromptMarkdown(p) {
    return [
        `## ${p.order}. ${p.title}`,
        "",
        `> ${p.summary}`,
        "",
        p.body,
    ].join("\n");
}
function renderIndexMarkdown() {
    const ordered = [...prompts_js_1.BUILD_GUIDE_PROMPTS].sort((a, b) => a.order - b.order);
    const toc = ordered
        .map((p) => `- ${p.order}. **${p.title}** — ${p.summary}`)
        .join("\n");
    const sections = ordered.map(renderPromptMarkdown).join("\n\n---\n\n");
    return [
        "# ChatRealty Build Guide",
        "",
        "Paste these prompts, in order, into a Claude session that has the ChatRealty MCP connected. Each one is self-contained.",
        "",
        "## Steps",
        "",
        toc,
        "",
        "---",
        "",
        sections,
    ].join("\n");
}
/**
 * Resolve a `guide://chatrealty/build-guide[/<id>]` URI to its markdown body.
 * Returns null for any URI outside this namespace OR an unknown prompt id, so
 * the caller can map it to a proper "unknown resource" error.
 */
function readGuideResource(uri) {
    if (uri === exports.BUILD_GUIDE_URI) {
        return { uri, mimeType: exports.BUILD_GUIDE_MIME, text: renderIndexMarkdown() };
    }
    if (uri.startsWith(exports.BUILD_GUIDE_URI_PREFIX)) {
        const id = uri.slice(exports.BUILD_GUIDE_URI_PREFIX.length);
        const prompt = (0, prompts_js_1.getBuildGuidePrompt)(id);
        if (!prompt)
            return null;
        return { uri, mimeType: exports.BUILD_GUIDE_MIME, text: renderPromptMarkdown(prompt) };
    }
    return null;
}
