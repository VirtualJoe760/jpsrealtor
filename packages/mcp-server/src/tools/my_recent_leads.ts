import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const my_recent_leads: ToolDef = {
  name: "my_recent_leads",
  description:
    "Returns the agent's recently-created contacts (new leads), most recent first. Optional filter by source (e.g. 'followupboss', 'website', 'manual') and lookback window (default 14 days, max 180). Same minimal projection as search_my_contacts. Useful for 'what's new this week?' or 'have I followed up with all my Zillow leads yet?'.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        enum: ["manual", "csv_import", "google_contacts", "outlook", "api", "website", "referral", "followupboss"],
      },
      days: { type: "number", description: "Lookback window in days (1-180, default 14)" },
      limit: { type: "number" },
      skip: { type: "number" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const query: Record<string, string | number | undefined> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      query[k] = v as any;
    }
    return await request(config, "/api/skill/contacts/recent-leads", { query });
  },
};
