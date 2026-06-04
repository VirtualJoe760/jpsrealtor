// packages/mcp-server/src/tools/my_agent_profile.ts
//
// Returns rich agent-profile fields useful for tailoring drafted content:
// bio, headline, service areas, specializations, social links, brand colors.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const my_agent_profile: ToolDef = {
  name: "my_agent_profile",
  description:
    "Returns the authenticated agent's profile fields — bio, headline, service areas, specializations, headshot URL, social links, brand colors. Use this BEFORE drafting any landing page or article so the content is specific to who the agent is and where they work.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/me/profile");
  },
};
