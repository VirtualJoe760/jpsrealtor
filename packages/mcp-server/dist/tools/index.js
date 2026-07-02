"use strict";
// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_INSTRUCTIONS = exports.getBuildGuidePrompt = exports.BUILD_GUIDE_PROMPTS = exports.readGuideResource = exports.isGuideUri = exports.listGuideResources = exports.BUILD_GUIDE_MIME = exports.BUILD_GUIDE_URI_PREFIX = exports.BUILD_GUIDE_URI = exports.tierFromScopes = exports.resolveTierFromEnv = exports.toolsForTier = exports.isToolAllowedForTier = exports.isMarketingTool = exports.MARKETING_TOOL_NAMES = exports.RESEARCH_TOOL_NAMES = exports.DEFAULT_TIER = exports.TIERS = exports.ALL_TOOLS = void 0;
exports.toolByName = toolByName;
exports.toolsForTierFromRegistry = toolsForTierFromRegistry;
const tiers_js_1 = require("../tiers.js");
const whoami_js_1 = require("./whoami.js");
const my_agent_profile_js_1 = require("./my_agent_profile.js");
const my_stats_js_1 = require("./my_stats.js");
const search_listings_js_1 = require("./search_listings.js");
const show_listing_board_js_1 = require("./show_listing_board.js");
const find_cashflowing_listings_js_1 = require("./find_cashflowing_listings.js");
const get_going_rate_js_1 = require("./get_going_rate.js");
const analyze_listing_cashflow_js_1 = require("./analyze_listing_cashflow.js");
const get_listing_js_1 = require("./get_listing.js");
const get_listing_photos_js_1 = require("./get_listing_photos.js");
const find_comparables_js_1 = require("./find_comparables.js");
const search_closed_listings_js_1 = require("./search_closed_listings.js");
const get_market_stats_js_1 = require("./get_market_stats.js");
const get_subdivision_cma_js_1 = require("./get_subdivision_cma.js");
const get_neighborhood_info_js_1 = require("./get_neighborhood_info.js");
const get_mortgage_rates_js_1 = require("./get_mortgage_rates.js");
const create_landing_page_js_1 = require("./create_landing_page.js");
const list_my_landing_pages_js_1 = require("./list_my_landing_pages.js");
const get_landing_page_js_1 = require("./get_landing_page.js");
const update_landing_page_js_1 = require("./update_landing_page.js");
const create_article_js_1 = require("./create_article.js");
const list_my_articles_js_1 = require("./list_my_articles.js");
const get_article_js_1 = require("./get_article.js");
const update_article_js_1 = require("./update_article.js");
const search_my_contacts_js_1 = require("./search_my_contacts.js");
const get_contact_js_1 = require("./get_contact.js");
const my_recent_leads_js_1 = require("./my_recent_leads.js");
const post_instagram_carousel_js_1 = require("./post_instagram_carousel.js");
const stage_listing_with_agent_js_1 = require("./stage_listing_with_agent.js");
const create_listing_cover_js_1 = require("./create_listing_cover.js");
const get_build_guide_js_1 = require("./get_build_guide.js");
// Agent meta. `get_build_guide` is documentation (no PII, no network) and is
// exposed in BOTH tiers — see tiers.ts RESEARCH_TOOL_NAMES.
const META = [whoami_js_1.whoami, my_agent_profile_js_1.my_agent_profile, my_stats_js_1.my_stats, get_build_guide_js_1.get_build_guide];
// MLS / Listings
const MLS = [
    search_listings_js_1.search_listings,
    show_listing_board_js_1.show_listing_board,
    get_listing_js_1.get_listing,
    get_listing_photos_js_1.get_listing_photos,
    find_comparables_js_1.find_comparables,
    search_closed_listings_js_1.search_closed_listings,
];
// Rental investment / cash-flow (reads VPS-precomputed cashflowStats + rent_rates).
const INVESTMENT = [
    find_cashflowing_listings_js_1.find_cashflowing_listings,
    get_going_rate_js_1.get_going_rate,
    analyze_listing_cashflow_js_1.analyze_listing_cashflow,
];
// Market data
const MARKET = [
    get_market_stats_js_1.get_market_stats,
    get_subdivision_cma_js_1.get_subdivision_cma,
    get_neighborhood_info_js_1.get_neighborhood_info,
    get_mortgage_rates_js_1.get_mortgage_rates,
];
// CMS — landing pages
const CMS_LP = [
    create_landing_page_js_1.create_landing_page,
    list_my_landing_pages_js_1.list_my_landing_pages,
    get_landing_page_js_1.get_landing_page,
    update_landing_page_js_1.update_landing_page,
];
// CMS — articles (blog posts, market insights, real estate tips)
const CMS_ARTICLES = [
    create_article_js_1.create_article,
    list_my_articles_js_1.list_my_articles,
    get_article_js_1.get_article,
    update_article_js_1.update_article,
];
// CRM — contacts (read only in Phase 2; writes land in Phase 3).
// All require the contacts:read scope, which is NOT in the default UI
// preset — agent must opt into PII exposure when minting a token.
const CRM_READ = [
    search_my_contacts_js_1.search_my_contacts,
    get_contact_js_1.get_contact,
    my_recent_leads_js_1.my_recent_leads,
];
// Images — AI generation + templated cover slides. Returns Cloudinary URLs
// for review. Not auto-posted; the agent (or Claude after agent confirmation)
// passes the result into post_instagram_carousel separately.
const IMAGES = [stage_listing_with_agent_js_1.stage_listing_with_agent, create_listing_cover_js_1.create_listing_cover];
// Social — real-world publish. Each tool requires its own scope; nothing
// here lands in a default preset. Confirm with the agent before calling.
const SOCIAL = [post_instagram_carousel_js_1.post_instagram_carousel];
// Future domains land here:
//   const CRM_WRITE: ToolDef[] = [...];
//   const CAMPAIGNS: ToolDef[] = [...];
exports.ALL_TOOLS = [
    ...META,
    ...MLS,
    ...INVESTMENT,
    ...MARKET,
    ...CMS_LP,
    ...CMS_ARTICLES,
    ...CRM_READ,
    ...IMAGES,
    ...SOCIAL,
];
function toolByName(name) {
    return exports.ALL_TOOLS.find((t) => t.name === name);
}
// --- Two-tier exposure (build_plan §6.7) -----------------------------------
// Re-export the tier filter + build-guide resource helpers so the stdio server
// (index.ts) and the hosted bridge (mcp-tool-bridge.ts) import the tier surface
// from one place. The registry above is the input to `toolsForTier`.
var tiers_js_2 = require("../tiers.js");
Object.defineProperty(exports, "TIERS", { enumerable: true, get: function () { return tiers_js_2.TIERS; } });
Object.defineProperty(exports, "DEFAULT_TIER", { enumerable: true, get: function () { return tiers_js_2.DEFAULT_TIER; } });
Object.defineProperty(exports, "RESEARCH_TOOL_NAMES", { enumerable: true, get: function () { return tiers_js_2.RESEARCH_TOOL_NAMES; } });
Object.defineProperty(exports, "MARKETING_TOOL_NAMES", { enumerable: true, get: function () { return tiers_js_2.MARKETING_TOOL_NAMES; } });
Object.defineProperty(exports, "isMarketingTool", { enumerable: true, get: function () { return tiers_js_2.isMarketingTool; } });
Object.defineProperty(exports, "isToolAllowedForTier", { enumerable: true, get: function () { return tiers_js_2.isToolAllowedForTier; } });
Object.defineProperty(exports, "toolsForTier", { enumerable: true, get: function () { return tiers_js_2.toolsForTier; } });
Object.defineProperty(exports, "resolveTierFromEnv", { enumerable: true, get: function () { return tiers_js_2.resolveTierFromEnv; } });
Object.defineProperty(exports, "tierFromScopes", { enumerable: true, get: function () { return tiers_js_2.tierFromScopes; } });
var resource_js_1 = require("../build-guide/resource.js");
Object.defineProperty(exports, "BUILD_GUIDE_URI", { enumerable: true, get: function () { return resource_js_1.BUILD_GUIDE_URI; } });
Object.defineProperty(exports, "BUILD_GUIDE_URI_PREFIX", { enumerable: true, get: function () { return resource_js_1.BUILD_GUIDE_URI_PREFIX; } });
Object.defineProperty(exports, "BUILD_GUIDE_MIME", { enumerable: true, get: function () { return resource_js_1.BUILD_GUIDE_MIME; } });
Object.defineProperty(exports, "listGuideResources", { enumerable: true, get: function () { return resource_js_1.listGuideResources; } });
Object.defineProperty(exports, "isGuideUri", { enumerable: true, get: function () { return resource_js_1.isGuideUri; } });
Object.defineProperty(exports, "readGuideResource", { enumerable: true, get: function () { return resource_js_1.readGuideResource; } });
var prompts_js_1 = require("../build-guide/prompts.js");
Object.defineProperty(exports, "BUILD_GUIDE_PROMPTS", { enumerable: true, get: function () { return prompts_js_1.BUILD_GUIDE_PROMPTS; } });
Object.defineProperty(exports, "getBuildGuidePrompt", { enumerable: true, get: function () { return prompts_js_1.getBuildGuidePrompt; } });
/** The tools a given tier exposes — convenience over `toolsForTier(ALL_TOOLS, tier)`. */
function toolsForTierFromRegistry(tier) {
    return (0, tiers_js_1.toolsForTier)(exports.ALL_TOOLS, tier);
}
// Server-level guidance surfaced to the MCP client (Claude) at initialize.
// Keeps the tone of a PUBLIC real-estate tool neutral and professional — no
// editorializing about other agents' listings.
exports.SERVER_INSTRUCTIONS = "ChatRealty's tools return factual, public-record MLS data for licensed real-estate use. " +
    "Present it neutrally and professionally: report metrics (price, days-on-market, beds/baths, price-per-sqft, etc.) as plain facts. " +
    "Do NOT editorialize about or disparage listings — never call a property 'stale', 'overpriced', 'distressed', or 'desperate', and do not imply a listing agent mispriced a home. " +
    "Days-on-market is a neutral metric: a long time on the market has many legitimate explanations and is not a defect or a data error. " +
    "When asked for analysis, stay balanced and factual and avoid characterizations that could reflect poorly on another agent's listing. " +
    "PRESENTATION: when showing 2 or more listings, build an interactive ARTIFACT — a 'listing board' with two linked views the user can toggle between: " +
    "(1) a responsive GRID of cards, each with the photo (the listing's `thumbUrl`), price, beds/baths/sqft, city, and a 'View listing' link to its `detailUrl`; and " +
    "(2) a MAP that plots every listing as a marker at its latitude/longitude, where clicking a marker opens a popup with that home's `thumbUrl` photo, price, address, and View-listing link (Leaflet + OpenStreetMap tiles from a CDN is a good lightweight choice). " +
    "Reference the image/link URLs directly (thumbUrl, detailUrl) — never paste base64 image data into the artifact. " +
    "For a single listing, a clean detail card (photo + facts + a map pin + View-listing link) is enough. Prefer this visual board over a plain markdown table. " +
    "INVESTMENT / RENTAL CASH-FLOW: when asked whether a property cash-flows as a rental, assess THREE strategies SEPARATELY and give a clear per-strategy determination — (1) SHORT-TERM nightly/weekend (Airbnb-style), (2) SEASONAL furnished (peak season ~Nov–Apr; the dominant income model in Coachella Valley resort/golf communities), (3) LONG-TERM annual lease. For EACH, state cash-flows / does not / or 'unclear' WITH the reason — never collapse the whole answer into a single 'does not cash flow.' Pull rental comps from the MLS (propertyType 'Residential Lease') and recognize the two sub-markets: annual leases (lower monthly rent) vs seasonal furnished (much higher monthly rates, longer days-on-market); for seasonal, quote IN-SEASON vs OFF-SEASON rate ranges. Lead with whichever strategies cash-flow. Target shape: 'Short-term is unclear here (likely HOA/city limits + no private pool); seasonally it cash-flows well — roughly $X/mo in season vs $Y off-season; long-term is negative at 20% down but turns positive with more down.' Then OFFER to re-run a specific scenario (e.g. long-term at a higher down payment). Treat no private pool, HOA minimum-lease terms, and local short-term-rental ordinances as reasons a strategy is 'unclear/restricted' to verify — not blanket deal-breakers.";
