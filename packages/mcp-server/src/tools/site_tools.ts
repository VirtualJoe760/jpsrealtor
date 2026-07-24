// packages/mcp-server/src/tools/site_tools.ts
//
// External-site lifecycle: connect the Claude-built deployment to the agent's
// ChatRealty subdomain, check where it stands, and flip it live.
//
// Flow: deploy the built site (e.g. Vercel) → connect_site(deploymentUrl) →
// the subdomain serves the built site in PREVIEW (only the agent, via the
// dashboard preview link, and admins can see it — everyone else keeps the
// current ChatRealty-rendered page) → set_site_live() makes it public.
// Go-live is compliance-gated server-side: no license number on the profile,
// no launch.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";

export const site_status: ToolDef = {
  name: "site_status",
  description:
    "Where the agent's external (Claude-built) site stands: none | preview | live, the connected deployment URL, the subdomain it serves on, and whether a license number is on file (required to go live).",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/site/status");
  },
};

export const connect_site: ToolDef = {
  name: "connect_site",
  description:
    "Connect the deployed Claude-built site to the agent's {subdomain}.chatrealty.io. Pass the deployment URL (e.g. the Vercel URL). Sets PREVIEW mode: only the agent (via their dashboard's preview link) and ChatRealty admins see the built site on the subdomain; every other visitor keeps the current ChatRealty page until go-live. Requires the site to serve its own static assets (the scaffold's next.config does this automatically on Vercel).",
  inputSchema: {
    type: "object",
    properties: {
      deploymentUrl: {
        type: "string",
        description: "The deployment origin, e.g. https://my-site.vercel.app",
      },
    },
    required: ["deploymentUrl"],
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/site/connect", {
      method: "POST",
      body: { deploymentUrl: (input as any).deploymentUrl },
    });
  },
};

export const set_site_live: ToolDef = {
  name: "set_site_live",
  description:
    "Make the connected external site PUBLIC on the agent's subdomain. COMPLIANCE GATE: fails unless the agent's license number is on their ChatRealty profile (it must also be displayed on the site, including the footer). Confirm with the agent before calling — going live is outward-facing.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/site/go-live", { method: "POST" });
  },
};
