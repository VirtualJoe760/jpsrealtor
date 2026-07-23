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

import { test } from "node:test";
import assert from "node:assert/strict";

import { ALL_TOOLS } from "../tools/index.js";
import {
  toolsForTier,
  isToolAllowedForTier,
  RESEARCH_TOOL_NAMES,
  isMarketingTool,
  resolveTierFromEnv,
  tierFromScopes,
} from "../tiers.js";
import {
  BUILD_GUIDE_PROMPTS,
  getBuildGuidePrompt,
} from "../build-guide/prompts.js";
import {
  readGuideResource,
  listGuideResources,
  isGuideUri,
  BUILD_GUIDE_URI,
  BUILD_GUIDE_URI_PREFIX,
} from "../build-guide/resource.js";

const names = (tools: { name: string }[]) => tools.map((t) => t.name).sort();

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
test("(a) research tier exposes exactly the allow-list (and nothing else)", () => {
  const research = toolsForTier(ALL_TOOLS, "research:read");
  const got = names(research);

  // Every allow-listed name must actually exist in the registry (no typos).
  for (const n of RESEARCH_TOOL_NAMES) {
    assert.ok(
      ALL_TOOLS.some((t) => t.name === n),
      `RESEARCH_TOOL_NAMES references "${n}" which is not in ALL_TOOLS`
    );
  }

  const expected = [...RESEARCH_TOOL_NAMES].sort();
  assert.deepEqual(got, expected, "research tier must equal the allow-list exactly");

  // And the predicate agrees with the filtered list.
  for (const t of ALL_TOOLS) {
    assert.equal(
      isToolAllowedForTier(t.name, "research:read"),
      RESEARCH_TOOL_NAMES.includes(t.name),
      `predicate/list disagree for ${t.name}`
    );
  }
});

// ---------------------------------------------------------------------------
// (b) client (research) tier excludes every PII/write tool
// ---------------------------------------------------------------------------
test("(b) research tier excludes every PII / write / content-production tool", () => {
  const allowed = new Set(toolsForTier(ALL_TOOLS, "research:read").map((t) => t.name));
  for (const forbidden of FORBIDDEN_FOR_RESEARCH) {
    assert.ok(
      !allowed.has(forbidden),
      `research tier must NOT expose PII/write tool "${forbidden}"`
    );
  }
  // The only write-ish surface in the research allow-list is none — every
  // research tool name is a read/get/search/show/find or the build guide.
  for (const n of RESEARCH_TOOL_NAMES) {
    assert.ok(
      /^(search|get|find|show|analyze)_|_build_guide$/.test(n),
      `research tool "${n}" does not look read-only`
    );
  }
});

// ---------------------------------------------------------------------------
// (c) agent tier excludes campaigns/marketing tools
// ---------------------------------------------------------------------------
test("(c) agent tier excludes campaigns/marketing tools but keeps the rest", () => {
  const agent = toolsForTier(ALL_TOOLS, "agent");
  const agentNames = new Set(agent.map((t) => t.name));

  // No marketing tool survives in the agent tier.
  for (const t of ALL_TOOLS) {
    if (isMarketingTool(t.name)) {
      assert.ok(!agentNames.has(t.name), `agent tier must exclude marketing tool "${t.name}"`);
    }
  }

  // Specifically the three marketing tools shipping in this package today.
  for (const m of ["stage_listing_with_agent", "create_listing_cover", "post_instagram_carousel"]) {
    assert.ok(!agentNames.has(m), `agent tier must exclude "${m}"`);
  }

  // The campaign-name backstop catches hypothetical future campaign tools.
  assert.equal(isToolAllowedForTier("launch_ad_campaign", "agent"), false);
  assert.equal(isToolAllowedForTier("send_campaign", "agent"), false);

  // But the agent tier still keeps every non-marketing tool (read + draft).
  const nonMarketing = ALL_TOOLS.filter((t) => !isMarketingTool(t.name));
  assert.deepEqual(names(agent), names(nonMarketing));
  assert.ok(agentNames.has("create_landing_page"), "agent keeps CMS drafting");
  assert.ok(agentNames.has("get_contact"), "agent keeps contacts (PII is the agent's own)");
  assert.ok(agentNames.has("search_listings"), "agent keeps listings");

  // Agent tier is strictly larger than the research tier.
  assert.ok(agent.length > toolsForTier(ALL_TOOLS, "research:read").length);
});

test("tier resolution: env + scopes", () => {
  assert.equal(resolveTierFromEnv({} as NodeJS.ProcessEnv), "agent");
  assert.equal(resolveTierFromEnv({ CHATREALTY_TIER: "research" } as any), "research:read");
  assert.equal(resolveTierFromEnv({ CHATREALTY_TIER: "client" } as any), "research:read");
  assert.equal(resolveTierFromEnv({ CHATREALTY_TIER: "agent" } as any), "agent");

  assert.equal(tierFromScopes(["research:read"]), "research:read");
  assert.equal(tierFromScopes(["research:read", "listings:read", "market:read"]), "research:read");
  // An agent-only scope alongside research:read → agent tier.
  assert.equal(tierFromScopes(["research:read", "contacts:read"]), "agent");
  assert.equal(tierFromScopes(["listings:read"]), "agent");
  assert.equal(tierFromScopes([]), "agent");
});

// ---------------------------------------------------------------------------
// (d) prompt library is non-empty; each prompt has id + title + body
// ---------------------------------------------------------------------------
test("(d) build-guide prompt library is non-empty and well-formed", () => {
  assert.ok(BUILD_GUIDE_PROMPTS.length > 0, "prompt library must be non-empty");

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  for (const p of BUILD_GUIDE_PROMPTS) {
    assert.ok(typeof p.id === "string" && p.id.length > 0, "prompt needs an id");
    assert.ok(/^[a-z0-9-]+$/.test(p.id), `prompt id "${p.id}" must be kebab-case`);
    assert.ok(typeof p.title === "string" && p.title.length > 0, `prompt ${p.id} needs a title`);
    assert.ok(typeof p.body === "string" && p.body.trim().length > 0, `prompt ${p.id} needs a body`);
    assert.ok(typeof p.summary === "string" && p.summary.length > 0, `prompt ${p.id} needs a summary`);
    assert.ok(Number.isInteger(p.order) && p.order > 0, `prompt ${p.id} needs a positive order`);

    assert.ok(!seenIds.has(p.id), `duplicate prompt id "${p.id}"`);
    seenIds.add(p.id);
    assert.ok(!seenOrders.has(p.order), `duplicate prompt order ${p.order}`);
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
    assert.ok(seenIds.has(id), `expected build step "${id}" missing`);
  }

  // The v1 guide must never send anyone to the unpublished sync package or
  // claim a feed/seed step exists.
  for (const p of BUILD_GUIDE_PROMPTS) {
    assert.ok(
      !p.body.includes("@chatrealty/sync") || p.body.includes("do NOT install `@chatrealty/sync`"),
      `prompt ${p.id} must not direct users to @chatrealty/sync`
    );
  }
});

// ---------------------------------------------------------------------------
// (e) the guide resource resolves a prompt by id
// ---------------------------------------------------------------------------
test("(e) guide resource resolves a prompt by id", () => {
  const id = "scaffold-your-site";
  const prompt = getBuildGuidePrompt(id);
  assert.ok(prompt, "fixture prompt must exist");

  const doc = readGuideResource(BUILD_GUIDE_URI_PREFIX + id);
  assert.ok(doc, "guide resource must resolve a known prompt id");
  assert.equal(doc!.uri, BUILD_GUIDE_URI_PREFIX + id);
  assert.equal(doc!.mimeType, "text/markdown");
  assert.ok(doc!.text.includes(prompt!.title), "rendered doc must contain the prompt title");
  assert.ok(doc!.text.includes(prompt!.body.split("\n")[0]), "rendered doc must contain the body");

  // The index resource resolves and lists every prompt.
  const index = readGuideResource(BUILD_GUIDE_URI);
  assert.ok(index, "index resource must resolve");
  for (const p of BUILD_GUIDE_PROMPTS) {
    assert.ok(index!.text.includes(p.title), `index must mention "${p.title}"`);
  }

  // Unknown id and out-of-namespace URIs return null (→ caller maps to error).
  assert.equal(readGuideResource(BUILD_GUIDE_URI_PREFIX + "does-not-exist"), null);
  assert.equal(readGuideResource("guide://chatrealty/other"), null);
  assert.equal(readGuideResource("ui://chatrealty/listing-board.html"), null);

  // resources/list advertises the index + one per prompt; all are guide URIs.
  const listed = listGuideResources();
  assert.equal(listed.length, BUILD_GUIDE_PROMPTS.length + 1);
  for (const r of listed) assert.ok(isGuideUri(r.uri), `${r.uri} should be a guide URI`);
});
