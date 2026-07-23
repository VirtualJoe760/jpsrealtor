// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.

import type { ToolDef } from "./types.js";
import { toolsForTier as toolsForTierImpl, type Tier } from "../tiers.js";
import { whoami } from "./whoami.js";
import { my_agent_profile } from "./my_agent_profile.js";
import { my_stats } from "./my_stats.js";
import { search_listings } from "./search_listings.js";
import { show_listing_board } from "./show_listing_board.js";
import { find_cashflowing_listings } from "./find_cashflowing_listings.js";
import { get_going_rate } from "./get_going_rate.js";
import { analyze_listing_cashflow } from "./analyze_listing_cashflow.js";
import { get_listing } from "./get_listing.js";
import { get_listing_photos } from "./get_listing_photos.js";
import { find_comparables } from "./find_comparables.js";
import { search_closed_listings } from "./search_closed_listings.js";
import { get_market_stats } from "./get_market_stats.js";
import { get_subdivision_cma } from "./get_subdivision_cma.js";
import { get_neighborhood_info } from "./get_neighborhood_info.js";
import { get_mortgage_rates } from "./get_mortgage_rates.js";
import { create_landing_page } from "./create_landing_page.js";
import { list_my_landing_pages } from "./list_my_landing_pages.js";
import { get_landing_page } from "./get_landing_page.js";
import { update_landing_page } from "./update_landing_page.js";
import { create_article } from "./create_article.js";
import { list_my_articles } from "./list_my_articles.js";
import { get_article } from "./get_article.js";
import { update_article } from "./update_article.js";
import { search_my_contacts } from "./search_my_contacts.js";
import { get_contact } from "./get_contact.js";
import { my_recent_leads } from "./my_recent_leads.js";
import { post_instagram_carousel } from "./post_instagram_carousel.js";
import { stage_listing_with_agent } from "./stage_listing_with_agent.js";
import { create_listing_cover } from "./create_listing_cover.js";
import { get_build_guide } from "./get_build_guide.js";
import { report_bug } from "./report_bug.js";

// Agent meta. `get_build_guide` is documentation (no PII, no network) and is
// exposed in BOTH tiers — see tiers.ts RESEARCH_TOOL_NAMES.
const META: ToolDef[] = [whoami, my_agent_profile, my_stats, get_build_guide, report_bug];

// MLS / Listings
const MLS: ToolDef[] = [
  search_listings,
  show_listing_board,
  get_listing,
  get_listing_photos,
  find_comparables,
  search_closed_listings,
];

// Rental investment / cash-flow (reads VPS-precomputed cashflowStats + rent_rates).
const INVESTMENT: ToolDef[] = [
  find_cashflowing_listings,
  get_going_rate,
  analyze_listing_cashflow,
];

// Market data
const MARKET: ToolDef[] = [
  get_market_stats,
  get_subdivision_cma,
  get_neighborhood_info,
  get_mortgage_rates,
];

// CMS — landing pages
const CMS_LP: ToolDef[] = [
  create_landing_page,
  list_my_landing_pages,
  get_landing_page,
  update_landing_page,
];

// CMS — articles (blog posts, market insights, real estate tips)
const CMS_ARTICLES: ToolDef[] = [
  create_article,
  list_my_articles,
  get_article,
  update_article,
];

// CRM — contacts (read only in Phase 2; writes land in Phase 3).
// All require the contacts:read scope, which is NOT in the default UI
// preset — agent must opt into PII exposure when minting a token.
const CRM_READ: ToolDef[] = [
  search_my_contacts,
  get_contact,
  my_recent_leads,
];

// Images — AI generation + templated cover slides. Returns Cloudinary URLs
// for review. Not auto-posted; the agent (or Claude after agent confirmation)
// passes the result into post_instagram_carousel separately.
const IMAGES: ToolDef[] = [stage_listing_with_agent, create_listing_cover];

// Social — real-world publish. Each tool requires its own scope; nothing
// here lands in a default preset. Confirm with the agent before calling.
const SOCIAL: ToolDef[] = [post_instagram_carousel];

// Future domains land here:
//   const CRM_WRITE: ToolDef[] = [...];
//   const CAMPAIGNS: ToolDef[] = [...];

export const ALL_TOOLS: ToolDef[] = [
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

export function toolByName(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

// --- Two-tier exposure (build_plan §6.7) -----------------------------------
// Re-export the tier filter + build-guide resource helpers so the stdio server
// (index.ts) and the hosted bridge (mcp-tool-bridge.ts) import the tier surface
// from one place. The registry above is the input to `toolsForTier`.
export {
  type Tier,
  TIERS,
  DEFAULT_TIER,
  RESEARCH_TOOL_NAMES,
  MARKETING_TOOL_NAMES,
  isMarketingTool,
  isToolAllowedForTier,
  toolsForTier,
  resolveTierFromEnv,
  tierFromScopes,
} from "../tiers.js";

export {
  BUILD_GUIDE_URI,
  BUILD_GUIDE_URI_PREFIX,
  BUILD_GUIDE_MIME,
  listGuideResources,
  isGuideUri,
  readGuideResource,
} from "../build-guide/resource.js";

export { BUILD_GUIDE_PROMPTS, getBuildGuidePrompt } from "../build-guide/prompts.js";

/** The tools a given tier exposes — convenience over `toolsForTier(ALL_TOOLS, tier)`. */
export function toolsForTierFromRegistry(tier: Tier): ToolDef[] {
  return toolsForTierImpl(ALL_TOOLS, tier);
}

// Server-level guidance surfaced to the MCP client (Claude) at initialize.
// Keeps the tone of a PUBLIC real-estate tool neutral and professional — no
// editorializing about other agents' listings.
export const SERVER_INSTRUCTIONS =
  "TESTING PHASE: ChatRealty is currently in active testing. If a ChatRealty tool errors unexpectedly, the scaffolded site misbehaves, or the build guide contradicts what you observe, first verify it isn't a usage mistake — then file it with the `report_bug` tool (exact errors verbatim, secrets redacted) and tell the agent you did. Bug reports in this phase directly drive fixes, often same-day. " +
  "ChatRealty's tools return factual, public-record MLS data for licensed real-estate use. " +
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
