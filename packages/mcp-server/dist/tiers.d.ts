import type { ToolDef } from "./tools/types.js";
export type Tier = "agent" | "research:read";
export declare const TIERS: readonly Tier[];
export declare const DEFAULT_TIER: Tier;
/**
 * Market-research tools exposed to a CLIENT `research:read` token. This is an
 * explicit ALLOW-LIST — the ONLY tools a research client ever sees. It contains
 * no PII surface (contacts/leads/profile) and no write/content-production tools.
 *
 * Keep this in sync with docs/mcp/scopes-and-safety.md and the `client_research`
 * preset in src/lib/skill-scopes.ts. A name here that is not in ALL_TOOLS is a
 * config bug caught by the tier tests.
 */
export declare const RESEARCH_TOOL_NAMES: readonly string[];
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
export declare const MARKETING_TOOL_NAMES: readonly string[];
/** A tool is a campaigns/marketing tool if it is named in the deny set or its
 *  name signals a campaign/ad action (backstop for tools added later). */
export declare function isMarketingTool(name: string): boolean;
/**
 * Decide whether a tool is allowed for a tier.
 *  - research:read → only the explicit allow-list.
 *  - agent         → everything EXCEPT campaigns/marketing tools.
 */
export declare function isToolAllowedForTier(toolName: string, tier: Tier): boolean;
/** The filtered tool list a given tier may see in `tools/list`. */
export declare function toolsForTier(tools: readonly ToolDef[], tier: Tier): ToolDef[];
/**
 * Resolve the active tier for a stdio process from env. The hosted bridge
 * derives the tier from OAuth-resolved scopes instead (a token carrying
 * `research:read` and no agent scopes → research tier) and passes it in
 * explicitly; this helper is the stdio fallback.
 *
 * CHATREALTY_TIER=research (or research:read / client) selects the client tier;
 * anything else (including unset) selects the agent tier.
 */
export declare function resolveTierFromEnv(env?: NodeJS.ProcessEnv): Tier;
/**
 * Derive a tier from a set of token scopes (hosted bridge path). A token whose
 * scopes include `research:read` but NONE of the agent-only scopes is a client
 * research token; anything else is treated as an agent token.
 */
export declare function tierFromScopes(scopes: readonly string[]): Tier;
