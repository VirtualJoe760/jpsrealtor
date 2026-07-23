// src/lib/skill-scopes.ts
//
// Single source of truth for the per-token scope catalog + UI presets.
// Designed in docs/mcp/scopes-and-safety.md.
//
// Any tool / route that wants a new scope must add it here first. Skip a
// scope addition and the auth helper will reject it as "unknown_scope" when
// the token is minted.

export const SCOPES = [
  // CMS - Landing pages
  "landing_pages:read",
  "landing_pages:write",

  // CMS - Articles
  "articles:read",
  "articles:write",

  // MLS / Listings (read-only — listings are upstream)
  "listings:read",

  // Market data
  "market:read",

  // CRM - Contacts (PII)
  "contacts:read",
  "contacts:write",

  // Campaigns - draft / configure
  "campaigns:read",
  "campaigns:write",

  // Campaigns - send (real money). Never in a preset.
  "campaigns:send",

  // Analytics (agent's own data)
  "analytics:read",

  // Social posting (real-world publish — Instagram carousels for now).
  // Never in a default preset; users have to opt in when minting a token.
  "social:post",

  // Research (client-research read surface — saved-search / lead-signal loop).
  // Read-only; gated to the `research` tier (Agent 11 / build_plan §6.6, §5).
  // NOT included in any agent preset — only the dedicated `client_research`
  // preset below grants it.
  "research:read",
] as const;

export type Scope = (typeof SCOPES)[number];

export function isScope(s: string): s is Scope {
  return (SCOPES as readonly string[]).includes(s);
}

export function normalizeScopes(input: unknown): Scope[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<Scope>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    if (isScope(v)) seen.add(v);
  }
  return Array.from(seen);
}

// ---------------------------------------------------------------------------
// Presets — shown in the Integrations tab when minting a token. The agent
// picks one (or "Custom") so they don't have to think about 12 checkboxes.
// ---------------------------------------------------------------------------

export type PresetId =
  | "website"
  | "content_drafting"
  | "lead_aware"
  | "full_workspace"
  | "client_research"
  | "custom";

export const PRESETS: Record<Exclude<PresetId, "custom">, { label: string; description: string; scopes: Scope[] }> = {
  // The free-tier preset — and the default for powering a scaffolded
  // create-chatrealty-site build. Listings + market data reads; lead capture
  // (contacts/from-signup) intentionally needs no scope, so the site's client
  // auth/lead loop works with this token as-is.
  website: {
    label: "Website & listings",
    description:
      "Power your website: listings search, market data, and lead capture into your ChatRealty CRM.",
    scopes: ["listings:read", "market:read"],
  },
  content_drafting: {
    label: "Content drafting",
    description: "Draft landing pages and articles, look up market data and listings.",
    scopes: [
      "landing_pages:read",
      "landing_pages:write",
      "articles:read",
      "articles:write",
      "listings:read",
      "market:read",
      "analytics:read",
    ],
  },
  lead_aware: {
    label: "Lead-aware drafting",
    description:
      "Content drafting + Claude can reference your actual leads when drafting. Contact PII flows to Claude.",
    scopes: [
      "landing_pages:read",
      "landing_pages:write",
      "articles:read",
      "articles:write",
      "listings:read",
      "market:read",
      "analytics:read",
      "contacts:read",
    ],
  },
  full_workspace: {
    label: "Full workspace",
    description:
      "Power-user set — also lets Claude draft campaigns and manage contact notes. Does NOT include campaign send.",
    scopes: [
      "landing_pages:read",
      "landing_pages:write",
      "articles:read",
      "articles:write",
      "listings:read",
      "market:read",
      "analytics:read",
      "contacts:read",
      "contacts:write",
      "campaigns:read",
      "campaigns:write",
    ],
  },
  // Dedicated client-research token: the read surface plus the single
  // research saved-search write path (build_plan §5 Agent 11 / §6.6). It is a
  // STANDALONE preset — deliberately NOT folded into the agent presets above,
  // so granting research never silently widens an existing agent token.
  client_research: {
    label: "Client research",
    description:
      "Read-only research surface — listings, market data, and saved-search signals for client research. No CRM, CMS, campaigns, or social posting.",
    scopes: [
      "research:read",
      "listings:read",
      "market:read",
    ],
  },
};

// ---------------------------------------------------------------------------
// Tier gating (ship-strategy free/paid ladder, docs/chatrealty-api/ship-strategy.md §5)
// ---------------------------------------------------------------------------
//
// Free plan = the complete website + the lead loop, nothing more: the token
// surface an agent needs to run a scaffolded site. Everything else (CMS
// drafting, CRM reads/writes, campaigns, social) is paid. Enforced SERVER-SIDE
// at mint time in /api/integrations/api-tokens — the UI merely renders what
// the API returns. Note: tokens minted BEFORE a downgrade keep their scopes
// until revoked (documented gap; revisit if downgrades become common).

export const FREE_TIER_SCOPES: Scope[] = ["listings:read", "market:read"];

export const FREE_TIER_PRESET_IDS: Array<Exclude<PresetId, "custom">> = ["website"];

/** The preset + scope catalog a given plan may see/mint. */
export function catalogForTier(isFree: boolean): {
  presets: Partial<typeof PRESETS>;
  scopes: Scope[];
} {
  if (!isFree) return { presets: PRESETS, scopes: [...SCOPES] };
  const presets: Partial<typeof PRESETS> = {};
  for (const id of FREE_TIER_PRESET_IDS) presets[id] = PRESETS[id];
  return { presets, scopes: [...FREE_TIER_SCOPES] };
}

// What legacy tokens (minted before scopes existed) get on first use.
// Read-only flavor of content_drafting so existing skill installs don't
// silently break, but writes need a fresh token with explicit scopes.
export const LEGACY_DEFAULT_SCOPES: Scope[] = [
  "landing_pages:read",
  "landing_pages:write", // existing skill installer creates LPs; keep parity
  "listings:read",
  "market:read",
  "analytics:read",
];
