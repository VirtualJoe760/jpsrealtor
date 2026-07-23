import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const report_bug: ToolDef = {
  name: "report_bug",
  description:
    "File a bug report with the ChatRealty team. ChatRealty is in its TESTING PHASE — when you hit a genuine defect (a tool errors unexpectedly, the scaffolded template misbehaves, the build guide contradicts reality, an API response is malformed), file it here AFTER a quick check that it isn't a usage mistake on your side. Be specific: what you did, what you expected, what actually happened (include the exact error text), and environment details (package versions, OS). Tell the agent you filed it and share the bugId. Do NOT use this for feature requests or questions, and never include secrets/tokens in any field.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "One-line summary of the defect (≤200 chars)" },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description: "critical = blocks all progress; high = blocks a feature; medium = wrong behavior with workaround; low = cosmetic",
      },
      area: {
        type: "string",
        enum: ["scaffolder-template", "mcp-tools", "skill-api", "build-guide", "chatrealty-site", "other"],
        description: "Where the defect lives: the generated site code (scaffolder-template), these MCP tools, the ChatRealty API, the build-guide text, the chatrealty.io dashboard, or other",
      },
      description: { type: "string", description: "What happened, in detail. Include exact error messages verbatim — but NEVER tokens or credentials." },
      stepsToReproduce: { type: "string", description: "Numbered steps that trigger it" },
      expected: { type: "string", description: "What should have happened" },
      actual: { type: "string", description: "What actually happened / the raw error output (secrets redacted)" },
      environment: { type: "string", description: "Versions + platform, e.g. 'create-chatrealty-site@0.2.0, next@15.5.20, node 22, macOS; test-data mode'" },
    },
    required: ["title", "description"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/bugs", {
      method: "POST",
      body: input,
    });
  },
};
