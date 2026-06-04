// packages/mcp-server/src/tools/index.ts
//
// Tool registry. Adding a new tool = import it here and add to ALL_TOOLS.
// Order doesn't matter for behavior, but keep it grouped by domain (see
// docs/mcp/tools.md) for readability.

import type { ToolDef } from "./types.js";
import { whoami } from "./whoami.js";

// Agent meta
const META: ToolDef[] = [whoami];

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
