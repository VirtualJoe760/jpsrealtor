"use strict";
// packages/mcp-server/src/build-guide/prompts.ts
//
// The curated "build your real-estate site with Claude" clipboard prompts.
//
// This is the SINGLE source of truth for the build-guide prompt library. Three
// consumers read it WITHOUT forking the text, so they can never drift:
//
//   1. This MCP server's `guide://chatrealty/*` resources (Claude reads them
//      in-loop — see ./resource.ts).
//   2. The hosted MCP bridge (same resources over the HTTP transport).
//   3. The public developer-docs site's <ClaudePrompt> component (humans copy
//      them) — build_plan §7 / Agent 34 imports this same array.
//
// Each prompt is a self-contained instruction an agent pastes into a fresh
// Claude session that has the ChatRealty MCP connected. They are ordered as a
// guided build: connect the MLS feed → seed the DB → scaffold a listings page →
// add the map → wire favorites + lead capture → build neighborhoods.
//
// KEEP THE BODIES PLAIN MARKDOWN. They are also served as a single markdown
// resource; avoid triple-backtick fences inside a body (use indented code or
// inline code) so the concatenated resource stays well-formed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_GUIDE_PROMPTS = void 0;
exports.getBuildGuidePrompt = getBuildGuidePrompt;
exports.buildGuidePromptIds = buildGuidePromptIds;
exports.BUILD_GUIDE_PROMPTS = [
    {
        id: "connect-mls-feed",
        title: "Connect your MLS feed",
        summary: "Wire up your RESO Web API (or Spark) credentials and verify the feed.",
        order: 1,
        body: [
            "I want to connect my MLS feed to my ChatRealty tenant.",
            "",
            "1. Ask me for my MLS dialect (RESO Web API is the default; Spark is the compat path), my feed base URL, and where my credentials live (they must come from environment variables, never pasted in chat or written to a config file).",
            "2. Walk me through the `@chatrealty/sync` `init` command to write a config file plus an `.env` template, then the `doctor` command to validate the config, the credentials, the database connection, and the feed `$metadata`.",
            "3. Confirm the feed returns `value[]` rows and that `ModificationTimestamp` is present so incremental sync has a watermark.",
            "",
            "Do not run a full seed yet — that is the next step. Stop after `doctor` reports green.",
        ].join("\n"),
    },
    {
        id: "seed-your-db",
        title: "Seed your database",
        summary: "Run the first full import, mapping RESO fields into your per-tenant Postgres.",
        order: 2,
        body: [
            "My MLS feed is connected and `doctor` is green. Seed my ChatRealty database.",
            "",
            "1. Run the `@chatrealty/sync` `seed` command to pull the full active inventory and upsert it into my tenant's Postgres.",
            "2. Map every field through the RESO Data Dictionary (fetch the live `guide://chatrealty/data-dictionary.json` resource so we use my tenant's actual columns). Fields without a dictionary mapping fall into the `extras` JSONB column — confirm that happened rather than silently dropping them.",
            "3. After seeding, verify the listing attribution fields are populated on every row: `listAgentName` and `listOfficeName` at minimum. A listing without attribution is an IDX-compliance bug — flag any rows missing it.",
            "4. Print a summary: total rows imported, count by property type (A=sale, B=rental, C=multifamily, D=land), and the high-water `ModificationTimestamp` saved for the next incremental sync.",
            "",
            "Never use `--purge`. This is additive only.",
        ].join("\n"),
    },
    {
        id: "scaffold-listings-page",
        title: "Scaffold a listings page",
        summary: "Build a Next.js search + results page backed by the OData /api/skill/listings endpoint.",
        order: 3,
        body: [
            "Build a listings search page for my real-estate site (Next.js App Router).",
            "",
            "1. Create a server route that queries the ChatRealty OData endpoint `/api/skill/listings` with `$filter`, `$orderby`, `$top`, and `$skip`. Use the flat AND-only filter grammar (for example: `City eq 'Palm Desert' and ListPrice ge 500000`). Page with `@odata.nextLink`.",
            "2. Render a responsive grid of listing cards: photo (`thumbUrl`), price, beds / baths / sqft, city, and a 'View listing' link to `detailUrl`.",
            "3. EVERY card and detail view MUST display the listing attribution — `listAgentName` and `listOfficeName` (\"Listed by {office} — {agent}\"). This is a hard IDX display rule, not optional.",
            "4. Add a simple filter UI (city, price range, beds, baths) that maps to OData `$filter` params. Validate inputs and show the standard error envelope's `error.message` when a filter is rejected.",
            "",
            "Use my tenant token's `listings:read` scope. Do not invent fields — confirm names against the data dictionary resource.",
        ].join("\n"),
    },
    {
        id: "add-the-map",
        title: "Add the map",
        summary: "Plot listings on an interactive map with viewport querying and clustering.",
        order: 4,
        body: [
            "Add an interactive map view to my listings page.",
            "",
            "1. Plot every listing as a marker at its latitude / longitude. Clicking a marker opens a popup with the home's `thumbUrl` photo, price, address, a 'View listing' link, AND the listing attribution (agent + office).",
            "2. Query listings by the current viewport bounding box so the map only loads what's visible. At low zoom, request clustered results (count + average price + centroid per cluster) instead of individual pins.",
            "3. Keep it lightweight — Leaflet with OpenStreetMap tiles from a CDN is a fine choice. Reference image / link URLs directly; never paste base64 image data into the markup.",
            "4. Link the map and the grid: panning the map updates the results list and vice-versa.",
            "",
            "Reuse the same `/api/skill/listings` data source as the grid so the two views never disagree.",
        ].join("\n"),
    },
    {
        id: "wire-favorites-and-lead-capture",
        title: "Wire favorites + lead capture",
        summary: "Let visitors save listings and submit an inquiry that lands as a research saved-search signal.",
        order: 5,
        body: [
            "Add favorites and lead capture to my site.",
            "",
            "1. Let a visitor 'favorite' a listing (store the `listingKey` in their browser/session for anonymous users, or against their account if they sign in).",
            "2. Add an inquiry form on the listing detail page (name, email, optional message). On submit, POST it to the research saved-search / lead-signal endpoint so it is recorded against my tenant.",
            "3. This write path uses the `research:read` scope and the `research` rate tier, is hard-bound to my tenant token, and returns NO PII back to the page — it only confirms the signal was recorded. Surface a friendly 'Thanks, we'll be in touch' on success.",
            "4. Rate-limit the form and add basic spam defense (a honeypot field is enough to start).",
            "",
            "Do not expose any contact / CRM data to the public page — lead capture is write-only from the visitor's side.",
        ].join("\n"),
    },
    {
        id: "build-neighborhoods",
        title: "Build neighborhoods",
        summary: "Generate neighborhood / subdivision pages from market stats and CMA data.",
        order: 6,
        body: [
            "Build neighborhood pages for my site.",
            "",
            "1. For each city / region / subdivision I cover, pull market stats from `/api/skill/market` (median price, days-on-market, active count, price-per-sqft) and, where available, the precomputed subdivision CMA.",
            "2. Generate a page per neighborhood: a short factual overview, the key stats as a table, and a grid of current active listings in that area (with attribution on every card).",
            "3. Keep the copy NEUTRAL and factual — report metrics as plain facts. Never call a market or listing 'hot', 'stale', 'overpriced', or 'distressed'; do not editorialize about another agent's listing.",
            "4. Cross-link neighborhoods to each other and to the main listings search for SEO. Add the stats as structured data where it helps.",
            "",
            "Skip the subdivision tier cleanly for any area where my tenant has no subdivision data — fall back to city / region stats rather than erroring.",
        ].join("\n"),
    },
];
/** Look up a prompt by its stable id. Returns undefined on miss. */
function getBuildGuidePrompt(id) {
    return exports.BUILD_GUIDE_PROMPTS.find((p) => p.id === id);
}
/** All prompt ids, in build order. */
function buildGuidePromptIds() {
    return [...exports.BUILD_GUIDE_PROMPTS]
        .sort((a, b) => a.order - b.order)
        .map((p) => p.id);
}
