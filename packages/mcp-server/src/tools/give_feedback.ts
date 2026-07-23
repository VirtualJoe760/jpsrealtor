import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const give_feedback: ToolDef = {
  name: "give_feedback",
  description:
    "Send a full feedback package to the ChatRealty team (testing phase). Use when the agent wants to hand ChatRealty their session results — general feedback, a session export, or a bug too big for report_bug. FLOW: (1) call this tool with a summary to get a one-time uploadUrl; (2) write feedback.md (what was tested / what worked / what didn't / suggestions) and SESSION-LOG.md (a faithful breakdown of this whole conversation: asks, decisions, tool calls, outcomes) at the project root; (3) zip the project SOURCE ONLY — exclude node_modules, .next, .git, *.zip, and ALL .env* files (secrets must never leave this machine) — keep it under 4MB; (4) upload via the curl command in the response; (5) confirm success to the agent with the feedbackId. Use report_bug instead for a single small defect.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2-4 sentences: what this package contains and the headline findings (≤2000 chars)" },
      kind: {
        type: "string",
        enum: ["feedback", "bug", "session-export"],
        description: "feedback = general impressions/suggestions; bug = defect with full project context; session-export = complete session handoff",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/feedback", {
      method: "POST",
      body: input,
    });
  },
};
