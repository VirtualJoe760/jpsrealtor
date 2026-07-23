// packages/mcp-server/src/tools/get_build_guide.ts
//
// In-loop accessor for the build-guide prompt library. Resources are the
// primary surface (guide://chatrealty/build-guide), but not every MCP client
// browses resources — this tool lets Claude pull the guide, or a single prompt
// by id, directly during a build session.
//
// Pure local data: it reads the prompt registry, makes no network call, and
// ignores the bearer token. Available in BOTH tiers (agent + research) — the
// build guide is documentation, not data.

import type { ToolDef } from "./types.js";
import { BUILD_GUIDE_PROMPTS, getBuildGuidePrompt } from "../build-guide/prompts.js";

export const get_build_guide: ToolDef = {
  name: "get_build_guide",
  description:
    "Returns the ChatRealty build-guide prompts — copy-paste instructions for building a real-estate site with Claude. ChatRealty is BRING-YOUR-OWN-DATA: the agent's own MLS feed seeds their own tenant database; whoami's dataSource field says whether it's connected ('none' means listing/market tools correctly refuse until the tenant is enabled — never work around that). Steps: check your data source, scaffold the site with create-chatrealty-site (backend first — the scaffold look is a neutral canvas), DESIGN the site (interview the agent on place/market-focus/feel, propose a direction, then fully restyle — this is where the site becomes theirs), customize listings & search, tune the map, wire favorites + lead capture, build neighborhoods, wire the blog. ALWAYS consult this before building an agent a website: the scaffolder is the supported path — never hand-build from scratch and never improvise a data import. Call with no arguments to list every step, or pass an `id` to fetch one prompt's full body.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "Optional prompt id (e.g. 'check-your-data-source', 'scaffold-your-site', 'customize-listings-and-search', 'add-the-map', 'wire-favorites-and-lead-capture', 'build-neighborhoods'). Omit to list all steps.",
      },
    },
    additionalProperties: false,
  },
  async handler(input) {
    const id = typeof input.id === "string" ? input.id.trim() : "";
    if (id) {
      const prompt = getBuildGuidePrompt(id);
      if (!prompt) {
        return {
          error: "not_found",
          message: `No build-guide prompt with id "${id}".`,
          availableIds: BUILD_GUIDE_PROMPTS.map((p) => p.id),
        };
      }
      return {
        id: prompt.id,
        title: prompt.title,
        summary: prompt.summary,
        order: prompt.order,
        body: prompt.body,
      };
    }
    return {
      steps: [...BUILD_GUIDE_PROMPTS]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ id: p.id, title: p.title, summary: p.summary, order: p.order })),
    };
  },
};
