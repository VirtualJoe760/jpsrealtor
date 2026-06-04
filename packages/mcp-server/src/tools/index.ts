// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.

import type { ToolDef } from "./types.js";
import { whoami } from "./whoami.js";
import { my_agent_profile } from "./my_agent_profile.js";
import { my_stats } from "./my_stats.js";

// Agent meta
const META: ToolDef[] = [whoami, my_agent_profile, my_stats];

// Future domains land here:
//   const MLS: ToolDef[] = [searchListings, getListing, ...];
//   const MARKET: ToolDef[] = [...];
//   const CMS: ToolDef[] = [...];
//   const CRM: ToolDef[] = [...];
//   const CAMPAIGNS: ToolDef[] = [...];

export const ALL_TOOLS: ToolDef[] = [...META];

export function toolByName(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
