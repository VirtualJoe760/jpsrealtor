"use strict";
// packages/mcp-server/src/__tests__/tiers-and-guide.test.ts
//
// Tier filtering + build-guide prompt library + guide resource tests.
// node:test only (no vitest/jest), no DB, no network. Run with:
//   npx tsx --test packages/mcp-server/src/__tests__/tiers-and-guide.test.ts
//
// Covers build_plan §6.7 acceptance:
//   (a) research tier exposes ONLY the allow-listed tools
//   (b) client (research) tier excludes every PII/write tool
//   (c) agent tier excludes campaigns/marketing tools
//   (d) the prompt library is non-empty; each prompt has id + title + body
//   (e) the guide resource resolves a prompt by id
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("../tools/index.js");
const tiers_js_1 = require("../tiers.js");
const prompts_js_1 = require("../build-guide/prompts.js");
const resource_js_1 = require("../build-guide/resource.js");
const names = (tools) => tools.map((t) => t.name).sort();
// PII / write / content-production tools that a client research token must NEVER see.
const FORBIDDEN_FOR_RESEARCH = [
    // PII / agent identity
    "whoami",
    "my_agent_profile",
    "my_stats",
    "search_my_contacts",
    "get_contact",
    "my_recent_leads",
    // Writes — CMS
    "create_landing_page",
    "update_landing_page",
    "create_article",
    "update_article",
    // Marketing / social writes
    "stage_listing_with_agent",
    "create_listing_cover",
    "post_instagram_carousel",
];
// ---------------------------------------------------------------------------
// (a) research tier exposes ONLY the allow-listed tools
// ---------------------------------------------------------------------------
(0, node_test_1.test)("(a) research tier exposes exactly the allow-list (and nothing else)", () => {
    const research = (0, tiers_js_1.toolsForTier)(index_js_1.ALL_TOOLS, "research:read");
    const got = names(research);
    // Every allow-listed name must actually exist in the registry (no typos).
    for (const n of tiers_js_1.RESEARCH_TOOL_NAMES) {
        strict_1.default.ok(index_js_1.ALL_TOOLS.some((t) => t.name === n), `RESEARCH_TOOL_NAMES references "${n}" which is not in ALL_TOOLS`);
    }
    const expected = [...tiers_js_1.RESEARCH_TOOL_NAMES].sort();
    strict_1.default.deepEqual(got, expected, "research tier must equal the allow-list exactly");
    // And the predicate agrees with the filtered list.
    for (const t of index_js_1.ALL_TOOLS) {
        strict_1.default.equal((0, tiers_js_1.isToolAllowedForTier)(t.name, "research:read"), tiers_js_1.RESEARCH_TOOL_NAMES.includes(t.name), `predicate/list disagree for ${t.name}`);
    }
});
// ---------------------------------------------------------------------------
// (b) client (research) tier excludes every PII/write tool
// ---------------------------------------------------------------------------
(0, node_test_1.test)("(b) research tier excludes every PII / write / content-production tool", () => {
    const allowed = new Set((0, tiers_js_1.toolsForTier)(index_js_1.ALL_TOOLS, "research:read").map((t) => t.name));
    for (const forbidden of FORBIDDEN_FOR_RESEARCH) {
        strict_1.default.ok(!allowed.has(forbidden), `research tier must NOT expose PII/write tool "${forbidden}"`);
    }
    // The only write-ish surface in the research allow-list is none — every
    // research tool name is a read/get/search/show/find or the build guide.
    for (const n of tiers_js_1.RESEARCH_TOOL_NAMES) {
        strict_1.default.ok(/^(search|get|find|show|analyze)_|_build_guide$/.test(n), `research tool "${n}" does not look read-only`);
    }
});
// ---------------------------------------------------------------------------
// (c) agent tier excludes campaigns/marketing tools
// ---------------------------------------------------------------------------
(0, node_test_1.test)("(c) agent tier excludes campaigns/marketing tools but keeps the rest", () => {
    const agent = (0, tiers_js_1.toolsForTier)(index_js_1.ALL_TOOLS, "agent");
    const agentNames = new Set(agent.map((t) => t.name));
    // No marketing tool survives in the agent tier.
    for (const t of index_js_1.ALL_TOOLS) {
        if ((0, tiers_js_1.isMarketingTool)(t.name)) {
            strict_1.default.ok(!agentNames.has(t.name), `agent tier must exclude marketing tool "${t.name}"`);
        }
    }
    // Specifically the three marketing tools shipping in this package today.
    for (const m of ["stage_listing_with_agent", "create_listing_cover", "post_instagram_carousel"]) {
        strict_1.default.ok(!agentNames.has(m), `agent tier must exclude "${m}"`);
    }
    // The campaign-name backstop catches hypothetical future campaign tools.
    strict_1.default.equal((0, tiers_js_1.isToolAllowedForTier)("launch_ad_campaign", "agent"), false);
    strict_1.default.equal((0, tiers_js_1.isToolAllowedForTier)("send_campaign", "agent"), false);
    // But the agent tier still keeps every non-marketing tool (read + draft).
    const nonMarketing = index_js_1.ALL_TOOLS.filter((t) => !(0, tiers_js_1.isMarketingTool)(t.name));
    strict_1.default.deepEqual(names(agent), names(nonMarketing));
    strict_1.default.ok(agentNames.has("create_landing_page"), "agent keeps CMS drafting");
    strict_1.default.ok(agentNames.has("get_contact"), "agent keeps contacts (PII is the agent's own)");
    strict_1.default.ok(agentNames.has("search_listings"), "agent keeps listings");
    // Agent tier is strictly larger than the research tier.
    strict_1.default.ok(agent.length > (0, tiers_js_1.toolsForTier)(index_js_1.ALL_TOOLS, "research:read").length);
});
(0, node_test_1.test)("tier resolution: env + scopes", () => {
    strict_1.default.equal((0, tiers_js_1.resolveTierFromEnv)({}), "agent");
    strict_1.default.equal((0, tiers_js_1.resolveTierFromEnv)({ CHATREALTY_TIER: "research" }), "research:read");
    strict_1.default.equal((0, tiers_js_1.resolveTierFromEnv)({ CHATREALTY_TIER: "client" }), "research:read");
    strict_1.default.equal((0, tiers_js_1.resolveTierFromEnv)({ CHATREALTY_TIER: "agent" }), "agent");
    strict_1.default.equal((0, tiers_js_1.tierFromScopes)(["research:read"]), "research:read");
    strict_1.default.equal((0, tiers_js_1.tierFromScopes)(["research:read", "listings:read", "market:read"]), "research:read");
    // An agent-only scope alongside research:read → agent tier.
    strict_1.default.equal((0, tiers_js_1.tierFromScopes)(["research:read", "contacts:read"]), "agent");
    strict_1.default.equal((0, tiers_js_1.tierFromScopes)(["listings:read"]), "agent");
    strict_1.default.equal((0, tiers_js_1.tierFromScopes)([]), "agent");
});
// ---------------------------------------------------------------------------
// (d) prompt library is non-empty; each prompt has id + title + body
// ---------------------------------------------------------------------------
(0, node_test_1.test)("(d) build-guide prompt library is non-empty and well-formed", () => {
    strict_1.default.ok(prompts_js_1.BUILD_GUIDE_PROMPTS.length > 0, "prompt library must be non-empty");
    const seenIds = new Set();
    const seenOrders = new Set();
    for (const p of prompts_js_1.BUILD_GUIDE_PROMPTS) {
        strict_1.default.ok(typeof p.id === "string" && p.id.length > 0, "prompt needs an id");
        strict_1.default.ok(/^[a-z0-9-]+$/.test(p.id), `prompt id "${p.id}" must be kebab-case`);
        strict_1.default.ok(typeof p.title === "string" && p.title.length > 0, `prompt ${p.id} needs a title`);
        strict_1.default.ok(typeof p.body === "string" && p.body.trim().length > 0, `prompt ${p.id} needs a body`);
        strict_1.default.ok(typeof p.summary === "string" && p.summary.length > 0, `prompt ${p.id} needs a summary`);
        strict_1.default.ok(Number.isInteger(p.order) && p.order > 0, `prompt ${p.id} needs a positive order`);
        strict_1.default.ok(!seenIds.has(p.id), `duplicate prompt id "${p.id}"`);
        seenIds.add(p.id);
        strict_1.default.ok(!seenOrders.has(p.order), `duplicate prompt order ${p.order}`);
        seenOrders.add(p.order);
    }
    // The six expected build steps are present (v1 hosted-data narrative —
    // ship-strategy: scaffolder-first, NO feed/seed steps).
    for (const id of [
        "check-your-data-source",
        "scaffold-your-site",
        "customize-listings-and-search",
        "add-the-map",
        "wire-favorites-and-lead-capture",
        "build-neighborhoods",
    ]) {
        strict_1.default.ok(seenIds.has(id), `expected build step "${id}" missing`);
    }
    // Phase P shipped (2026-07-23): @chatrealty/sync is published and the
    // data-setup step MUST be self-serve — the guide directs users to
    // `sync init` and never to "contact/ask ChatRealty" (ship-strategy naming
    // rule 2: a flow ending there is a missing API).
    const dataStep = prompts_js_1.BUILD_GUIDE_PROMPTS.find((p) => p.id === "check-your-data-source");
    strict_1.default.ok(dataStep.body.includes("@chatrealty/sync init"), "data step must include the self-serve init command");
    for (const p of prompts_js_1.BUILD_GUIDE_PROMPTS) {
        strict_1.default.ok(!/contact ChatRealty|ask ChatRealty/i.test(p.body), `prompt ${p.id} must not contain an ask-ChatRealty step`);
    }
});
// ---------------------------------------------------------------------------
// (e) the guide resource resolves a prompt by id
// ---------------------------------------------------------------------------
(0, node_test_1.test)("(e) guide resource resolves a prompt by id", () => {
    const id = "scaffold-your-site";
    const prompt = (0, prompts_js_1.getBuildGuidePrompt)(id);
    strict_1.default.ok(prompt, "fixture prompt must exist");
    const doc = (0, resource_js_1.readGuideResource)(resource_js_1.BUILD_GUIDE_URI_PREFIX + id);
    strict_1.default.ok(doc, "guide resource must resolve a known prompt id");
    strict_1.default.equal(doc.uri, resource_js_1.BUILD_GUIDE_URI_PREFIX + id);
    strict_1.default.equal(doc.mimeType, "text/markdown");
    strict_1.default.ok(doc.text.includes(prompt.title), "rendered doc must contain the prompt title");
    strict_1.default.ok(doc.text.includes(prompt.body.split("\n")[0]), "rendered doc must contain the body");
    // The index resource resolves and lists every prompt.
    const index = (0, resource_js_1.readGuideResource)(resource_js_1.BUILD_GUIDE_URI);
    strict_1.default.ok(index, "index resource must resolve");
    for (const p of prompts_js_1.BUILD_GUIDE_PROMPTS) {
        strict_1.default.ok(index.text.includes(p.title), `index must mention "${p.title}"`);
    }
    // Unknown id and out-of-namespace URIs return null (→ caller maps to error).
    strict_1.default.equal((0, resource_js_1.readGuideResource)(resource_js_1.BUILD_GUIDE_URI_PREFIX + "does-not-exist"), null);
    strict_1.default.equal((0, resource_js_1.readGuideResource)("guide://chatrealty/other"), null);
    strict_1.default.equal((0, resource_js_1.readGuideResource)("ui://chatrealty/listing-board.html"), null);
    // resources/list advertises the index + one per prompt; all are guide URIs.
    const listed = (0, resource_js_1.listGuideResources)();
    strict_1.default.equal(listed.length, prompts_js_1.BUILD_GUIDE_PROMPTS.length + 1);
    for (const r of listed)
        strict_1.default.ok((0, resource_js_1.isGuideUri)(r.uri), `${r.uri} should be a guide URI`);
});
