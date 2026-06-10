"use strict";
// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_INSTRUCTIONS = exports.ALL_TOOLS = void 0;
exports.toolByName = toolByName;
const whoami_js_1 = require("./whoami.js");
const my_agent_profile_js_1 = require("./my_agent_profile.js");
const my_stats_js_1 = require("./my_stats.js");
const search_listings_js_1 = require("./search_listings.js");
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
// Agent meta
const META = [whoami_js_1.whoami, my_agent_profile_js_1.my_agent_profile, my_stats_js_1.my_stats];
// MLS / Listings
const MLS = [
    search_listings_js_1.search_listings,
    get_listing_js_1.get_listing,
    get_listing_photos_js_1.get_listing_photos,
    find_comparables_js_1.find_comparables,
    search_closed_listings_js_1.search_closed_listings,
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
    "For a single listing, a clean detail card (photo + facts + a map pin + View-listing link) is enough. Prefer this visual board over a plain markdown table.";
