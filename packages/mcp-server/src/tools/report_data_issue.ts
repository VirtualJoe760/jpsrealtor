import { request } from "../http.js";
import type { ToolDef } from "./types.js";

// The feedback loop's reactive ingress (docs/testing/tickets.md in the
// platform repo). Where report_bug files a human-readable defect, this files a
// STRUCTURED data-pipeline failure that clusters by fingerprint on the server
// — so one association-wide breakage arriving from many machines becomes one
// work item with a population count, and the judge triages it ahead of
// scheduled test work.
export const report_data_issue: ToolDef = {
  name: "report_data_issue",
  description:
    "File a structured data-pipeline failure with ChatRealty at the moment you hit it. Use this when the DATA side of a build fails and you cannot resolve it by re-reading the build guide: an MLS/RESO feed that won't authenticate, a sync/seed step that errors, fields the normaliser rejects or silently drops, listing values that render wrong, or a build-guide instruction the data layer contradicts. " +
    "You are the process that was executing the instructions when they failed — report from that position: the exact step, the verbatim error, and how far the pipeline got. " +
    "STRICT REDACTION RULES: send field NAMES and payload SHAPES only, never values; env var NAMES only, never contents; no credentials, no tokens, no customer records, no addresses. The server rejects envVarNames containing '='. " +
    "Identical failures from different machines cluster into one fingerprint server-side — filing a duplicate is harmless and raises the failure's priority, so when in doubt, file.",
  inputSchema: {
    type: "object",
    properties: {
      association: {
        type: "string",
        description:
          "The MLS association or feed this concerns, e.g. 'GPS MLS' or the feed vendor name. If unknown, the RESO base URL's host.",
      },
      failingStep: {
        type: "string",
        description:
          "The step being executed when it failed, e.g. 'chatrealty-sync init', 'reso-fetch', 'normalise', 'seed', 'site render', 'build-guide step 4'.",
      },
      errorText: {
        type: "string",
        description:
          "The error, VERBATIM — exact text, untruncated where possible (≤20k chars). Redact any secret that appears in it before sending.",
      },
      howFar: {
        type: "string",
        enum: ["auth", "fetch", "normalise", "persist", "serve", "build-guide", "other"],
        description:
          "How far the pipeline got: auth = credentials rejected; fetch = feed reached but pull failed; normalise = data arrived but wouldn't map; persist = mapped but wouldn't write; serve = written but renders wrong; build-guide = the instructions themselves were wrong.",
      },
      errorClass: {
        type: "string",
        description:
          "Optional one-line label for the failure mode (e.g. 'SubdivisionName absent from Property resource'). Derived from errorText if omitted.",
      },
      payloadShape: {
        type: "object",
        description:
          "Optional: the SHAPE of the payload involved — field names mapped to their types (e.g. {\"ListPrice\": \"number\", \"SubdivisionName\": \"missing\"}). Shapes only. Never record values.",
      },
      envVarNames: {
        type: "array",
        items: { type: "string" },
        description: "Env var NAMES that were set for the failing step. Names only — never values.",
      },
      packageVersions: {
        type: "object",
        description:
          "Versions in play, e.g. {\"@chatrealty/mcp-server\": \"0.21.0\", \"create-chatrealty-site\": \"0.13.0\"}. Part of the cluster fingerprint.",
      },
      notes: {
        type: "string",
        description:
          "Optional: what the build guide claimed would happen, and anything it never mentioned that turned out to be required (≤5k chars).",
      },
    },
    required: ["association", "failingStep", "errorText"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/tickets", {
      method: "POST",
      body: input,
    });
  },
};
