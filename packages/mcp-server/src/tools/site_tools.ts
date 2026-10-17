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

export const get_tracking: ToolDef = {
  name: "get_tracking",
  description:
    "The agent's visitor-tracking / retargeting tag IDs (Meta Pixel, GA4, Google Ads) as rendered on their site, plus a `capabilities` block saying which retargeting channels are actually usable. Use this before advising on ads: GA4 alone CANNOT build Google Ads audiences, so youtubeRetargeting is false until a Google Ads (AW-) tag is set.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    return await request(config, "/api/skill/site/tracking");
  },
};

export const set_tracking: ToolDef = {
  name: "set_tracking",
  description:
    "Set the agent's tracking tag IDs. These are PUBLIC measurement IDs (they ship in the page HTML), not secrets. Pass only the fields to change; an empty string clears a field back to the platform default. Formats are validated server-side and a malformed ID is rejected rather than silently installed. Setting enabled:false renders no tags at all.",
  inputSchema: {
    type: "object",
    properties: {
      metaPixelId: { type: "string", description: 'Meta Pixel ID, digits only, e.g. "1378421466770456"' },
      ga4MeasurementId: { type: "string", description: 'GA4 measurement ID, e.g. "G-ABC1234567"' },
      googleAdsId: { type: "string", description: 'Google Ads tag ID, e.g. "AW-123456789". Required for YouTube/Display remarketing.' },
      googleAdsConversionLabel: { type: "string", description: "Conversion label from a Google Ads conversion action" },
      enabled: { type: "boolean", description: "Master switch; false renders no tracking tags at all" },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    return await request(config, "/api/skill/site/tracking", {
      method: "PATCH",
      body: input as Record<string, unknown>,
    });
  },
};

// The script the site runs to trade a claim code for its key. Kept as a string
// the tool hands back, so it works on ANY scaffold version and any shell:
// Claude writes it to the site's root, runs it once, deletes it. It prints no
// secret — the key goes from ChatRealty straight into .env.local.
//
// String.raw, NOT a plain template: in a plain one `\/` collapses to `/` and
// `\r` / `\n` become real line breaks, so the regexes below came out as a
// comment (`//+$/`) and an unterminated literal — the first e2e run handed
// Claude a script that died with "Unexpected token 'const'". Keep this free of
// backticks and `${`, which String.raw still interprets.
const CLAIM_SCRIPT = String.raw`// chatrealty-claim.mjs — trades a one-time ChatRealty claim code for this
// site's key and writes it into .env.local. Prints no secret. Delete after use.
import fs from "node:fs";
const code = process.argv[2];
if (!code) { console.error("Usage: node chatrealty-claim.mjs <CLAIM-CODE>"); process.exit(1); }
const base = (process.env.CHATREALTY_API_BASE || "https://www.chatrealty.io").replace(/\/+$/, "");
const res = await fetch(base + "/api/skill/site/claim", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code }),
});
const j = await res.json().catch(() => ({}));
if (!res.ok || !j.token) { console.error("Claim failed: " + (j.message || ("HTTP " + res.status))); process.exit(1); }
const path = ".env.local";
const lines = (fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "")
  .split(/\r?\n/)
  .filter((l) => l && !/^(CHATREALTY_API_TOKEN|CHATREALTY_TEST_DATA)\s*=/.test(l));
lines.push("CHATREALTY_API_TOKEN=" + j.token);
fs.writeFileSync(path, lines.join("\n") + "\n");
console.log("Connected this site to your ChatRealty listings database" +
  (j.listings ? " (" + Number(j.listings).toLocaleString() + " listings)" : "") +
  ". Key saved to .env.local, sample data turned off — restart the dev server.");
`;

export const get_site_claim_code: ToolDef = {
  name: "get_site_claim_code",
  description:
    "Connect the website you are building to the agent's OWN seeded listings database — no token for the agent to copy, no sample data. Use whenever whoami shows dataSource 'tenant' (the agent seeded their listings in ChatRealty Settings → Integrations; whoami.database says what's in it). Returns a ONE-TIME CODE (valid 15 minutes) — not a key — plus `claimScript`. Do exactly this in the site's root folder: write `claimScript` to `chatrealty-claim.mjs`, run `node chatrealty-claim.mjs <code>`, then delete the file and restart the dev server. The script trades the code for the site's key and writes CHATREALTY_API_TOKEN into .env.local (and removes CHATREALTY_TEST_DATA). NEVER print, cat or echo .env.local or the key; NEVER ask the agent to paste a token; never fall back to sample/test data once this succeeds. A used or expired code just means: call this tool again.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async handler(_input, config) {
    const res: any = await request(config, "/api/skill/site/claim-code", { method: "POST" });
    if (!res?.ok || !res.code) return res;
    return {
      code: res.code,
      expiresAt: res.expiresAt,
      database: res.database,
      claimScript: CLAIM_SCRIPT,
      steps: [
        "Write claimScript to chatrealty-claim.mjs in the site's root folder.",
        `Run: node chatrealty-claim.mjs ${res.code}`,
        "Delete chatrealty-claim.mjs, then restart the dev server so Next reads the new .env.local.",
        "Confirm by NAME, not value: `grep -c CHATREALTY_API_TOKEN .env.local` → 1.",
      ],
    };
  },
};
