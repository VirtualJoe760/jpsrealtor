// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.

import type { ToolDef } from "./types.js";
import { whoami } from "./whoami.js";
import { my_agent_profile } from "./my_agent_profile.js";
import { my_stats } from "./my_stats.js";
import { search_listings } from "./search_listings.js";
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

// Agent meta
const META: ToolDef[] = [whoami, my_agent_profile, my_stats];

// MLS / Listings
const MLS: ToolDef[] = [
  search_listings,
  get_listing,
  get_listing_photos,
  find_comparables,
  search_closed_listings,
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
