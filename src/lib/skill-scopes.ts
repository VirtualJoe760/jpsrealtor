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

export type PresetId = "content_drafting" | "lead_aware" | "full_workspace" | "custom";

export const PRESETS: Record<Exclude<PresetId, "custom">, { label: string; description: string; scopes: Scope[] }> = {
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
};

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
