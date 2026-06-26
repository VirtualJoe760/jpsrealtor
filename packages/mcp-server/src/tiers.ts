// packages/mcp-server/src/tiers.ts
//
// Two-tier tool exposure for the ChatRealty MCP server.
//
// A single MCP package, two audiences:
//
//   - "agent"          — the licensed agent operating their own ChatRealty
//                        workspace. Gets the full read + draft surface the
//                        package ships today, MINUS campaigns/marketing tools
//                        (those ship with the separate campaigns product, not
//                        this package).
//   - "research:read"  — a CLIENT-research token. A read-only market-research
//                        surface: search listings, comps, market stats,
//                        neighborhoods, CMA, mortgage rates, cashflow analysis,
//                        and the listing board UI. NO PII (no contacts, leads,
//                        or agent profile), NO writes, NO content production.
//
// The tier is a FILTER over the existing ALL_TOOLS registry — adding a tool to
// the registry does not silently widen a tier. The research tier is an explicit
// allow-list; the agent tier is "everything minus a deny set". Both transports
// (stdio + hosted bridge) must filter `tools/list` AND reject a disallowed
// `tools/call` — defense in depth (build_plan §6.7).

import type { ToolDef } from "./tools/types.js";

export type Tier = "agent" | "research:read";

export const TIERS: readonly Tier[] = ["agent", "research:read"] as const;

export const DEFAULT_TIER: Tier = "agent";

/**
 * Market-research tools exposed to a CLIENT `research:read` token. This is an
 * explicit ALLOW-LIST — the ONLY tools a research client ever sees. It contains
 * no PII surface (contacts/leads/profile) and no write/content-production tools.
 *
 * Keep this in sync with docs/mcp/scopes-and-safety.md and the `client_research`
 * preset in src/lib/skill-scopes.ts. A name here that is not in ALL_TOOLS is a
 * config bug caught by the tier tests.
 */
export const RESEARCH_TOOL_NAMES: readonly string[] = [
  // Listings (read)
  "search_listings",
  "search_closed_listings",
  "get_listing",
  "get_listing_photos",
  "find_comparables",
  // Market data (read)
  "get_market_stats",
  "get_neighborhood_info",
  "get_subdivision_cma",
  "get_mortgage_rates",
  // Investment / cash-flow (read — VPS-precomputed stats)
  "find_cashflowing_listings",
  "get_going_rate",
  "analyze_listing_cashflow",
  // Interactive UI (read-only render of the above)
  "show_listing_board",
  // Build-guide documentation (no PII, no network) — available to every tier.
  "get_build_guide",
] as const;

/**
 * Tools the AGENT tier deliberately does NOT expose, because they belong to the
 * campaigns/marketing product that ships in its own package — not this one.
 *
 * Today this package carries no `campaigns:*` tools; the marketing surface it
 * DOES carry is image generation + social posting. Those are excluded from the
 * agent tier here so the package's exposed surface matches "read + draft, no
 * campaigns/marketing". If campaign tools are ever added to ALL_TOOLS, list
 * their names here too (a substring guard below also catches `campaign`-named
 * tools as a backstop).
 */
export const MARKETING_TOOL_NAMES: readonly string[] = [
  // Images — AI generation / templated cover slides (marketing production)
  "stage_listing_with_agent",
  "create_listing_cover",
  // Social — real-world publish (marketing distribution)
  "post_instagram_carousel",
] as const;

/** A tool is a campaigns/marketing tool if it is named in the deny set or its
 *  name signals a campaign/ad action (backstop for tools added later). */
export function isMarketingTool(name: string): boolean {
  if (MARKETING_TOOL_NAMES.includes(name)) return true;
  return /campaign|launch_ad|ad_campaign/i.test(name);
}

/**
 * Decide whether a tool is allowed for a tier.
 *  - research:read → only the explicit allow-list.
 *  - agent         → everything EXCEPT campaigns/marketing tools.
 */
export function isToolAllowedForTier(toolName: string, tier: Tier): boolean {
  if (tier === "research:read") {
    return RESEARCH_TOOL_NAMES.includes(toolName);
  }
  // agent tier
  return !isMarketingTool(toolName);
}

/** The filtered tool list a given tier may see in `tools/list`. */
export function toolsForTier(tools: readonly ToolDef[], tier: Tier): ToolDef[] {
  return tools.filter((t) => isToolAllowedForTier(t.name, tier));
}

/**
 * Resolve the active tier for a stdio process from env. The hosted bridge
 * derives the tier from OAuth-resolved scopes instead (a token carrying
 * `research:read` and no agent scopes → research tier) and passes it in
 * explicitly; this helper is the stdio fallback.
 *
 * CHATREALTY_TIER=research (or research:read / client) selects the client tier;
 * anything else (including unset) selects the agent tier.
 */
export function resolveTierFromEnv(env: NodeJS.ProcessEnv = process.env): Tier {
  const raw = (env.CHATREALTY_TIER || "").trim().toLowerCase();
  if (raw === "research" || raw === "research:read" || raw === "client") {
    return "research:read";
  }
  return DEFAULT_TIER;
}

/**
 * Derive a tier from a set of token scopes (hosted bridge path). A token whose
 * scopes include `research:read` but NONE of the agent-only scopes is a client
 * research token; anything else is treated as an agent token.
 */
export function tierFromScopes(scopes: readonly string[]): Tier {
  const set = new Set(scopes);
  const agentOnly = [
    "landing_pages:read",
    "landing_pages:write",
    "articles:read",
    "articles:write",
    "contacts:read",
    "contacts:write",
    "campaigns:read",
    "campaigns:write",
    "campaigns:send",
    "analytics:read",
    "social:post",
  ];
  const hasAgentScope = agentOnly.some((s) => set.has(s));
  if (set.has("research:read") && !hasAgentScope) return "research:read";
  return DEFAULT_TIER;
}
