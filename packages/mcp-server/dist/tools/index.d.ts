import type { ToolDef } from "./types.js";
import { type Tier } from "../tiers.js";
export declare const ALL_TOOLS: ToolDef[];
export declare function toolByName(name: string): ToolDef | undefined;
export { type Tier, TIERS, DEFAULT_TIER, RESEARCH_TOOL_NAMES, MARKETING_TOOL_NAMES, isMarketingTool, isToolAllowedForTier, toolsForTier, resolveTierFromEnv, tierFromScopes, } from "../tiers.js";
export { BUILD_GUIDE_URI, BUILD_GUIDE_URI_PREFIX, BUILD_GUIDE_MIME, listGuideResources, isGuideUri, readGuideResource, } from "../build-guide/resource.js";
export { BUILD_GUIDE_PROMPTS, getBuildGuidePrompt } from "../build-guide/prompts.js";
/** The tools a given tier exposes — convenience over `toolsForTier(ALL_TOOLS, tier)`. */
export declare function toolsForTierFromRegistry(tier: Tier): ToolDef[];
export declare const SERVER_INSTRUCTIONS: string;
