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

// Future domains land here:
//   const MARKET: ToolDef[] = [...];
//   const CMS: ToolDef[] = [...];
//   const CRM: ToolDef[] = [...];
//   const CAMPAIGNS: ToolDef[] = [...];

export const ALL_TOOLS: ToolDef[] = [...META, ...MLS];

export function toolByName(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
