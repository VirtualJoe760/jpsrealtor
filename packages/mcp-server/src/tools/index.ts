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

// Future domains land here:
//   const CMS: ToolDef[] = [...];
//   const CRM: ToolDef[] = [...];
//   const CAMPAIGNS: ToolDef[] = [...];

export const ALL_TOOLS: ToolDef[] = [...META, ...MLS, ...MARKET];

export function toolByName(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
