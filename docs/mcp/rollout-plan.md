---
title: MCP Server Rollout Plan
status: partial
last_verified: 2026-06-02
related: [./README.md, ./tools.md, ./scopes-and-safety.md]
---

# MCP Server Rollout Plan

Phased ship plan. Each phase is a coherent, demoable chunk and includes the
schema migrations, doc updates, and tech-debt deltas it incurs.

## Phase 0 · Already shipped

Commits `35e104db`, `89ddd7d2`, `94e1b490`, `74203965`, `f8ea24bc`, `d7329591`
on branch `feat/landing-page-claude-byok-and-skill`.

- `crt_live_*` token model + sha256 storage + revoke (`User.agentProfile.aiIntegrations.apiTokens[]`)
- Token-auth middleware (`src/lib/skill-auth.ts`)
- Three REST endpoints: `GET /api/skill/me`, `POST /api/skill/landing-pages`,
  `GET /api/skill/landing-pages/[slug]`
- Skill package (`@chatrealty/install-skill`) for Claude Code users
- Integrations tab in agent settings (sidebar + wizard) for minting tokens
- AES-256-GCM encryption helper (`src/lib/secrets.ts`) — used for the
  parallel Anthropic-BYOK feature; reused here for any future symmetric
  secret storage

## Phase 1 · Core MCP server + content + market read

**Goal:** an agent can install the MCP server in Claude Desktop / Code, get
context (`whoami`, agent profile, market data, listings) and create / edit
landing-page drafts.

### What ships

| Item | New code |
|---|---|
| `@chatrealty/mcp-server` npm package | `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\` — stdio MCP server, one file per tool, calls `/api/skill/*` |
| Token scopes | Schema migration on `apiTokens[].scopes` + UI in Integrations tab to pick scopes when minting |
| Default-scope migration | Legacy tokens get a safe read-only set on first call after deploy; banner in UI prompting re-mint |
| Rate limiter | Wire `src/lib/rate-limit.ts` into every `/api/skill/*` route, keyed by token hash |
| Tools: meta | `whoami` (already shipped), `my_agent_profile`, `my_stats` |
| Tools: MLS | `search_listings`, `get_listing`, `get_listing_photos`, `find_comparables`, `search_closed_listings` |
| Tools: market | `get_market_stats`, `get_subdivision_cma`, `get_neighborhood_info`, `get_mortgage_rates` |
| Tools: CMS LP | `create_landing_page` (already shipped), `list_my_landing_pages`, `get_landing_page` (already shipped, expand), `update_landing_page` |
| Install UX | Modal in Integrations tab after token reveal: two install commands (Claude Code `claude mcp add`, Claude Desktop JSON snippet) |
| Hide the BYOK in-CMS Claude toggle | Per user direction — gate behind `?advanced=1` until we revisit |

### Schema migrations Phase 1

- Add `scopes: string[]` to `User.agentProfile.aiIntegrations.apiTokens[]`
- Add `McpToolCallLog` collection with the schema in
  `scopes-and-safety.md`

### Tech-debt entries to add Phase 1

- KV-backed rate limiter (already noted, becomes acute)
- Legacy tokens without scopes need re-issue path
- MCP tool count discoverability ceiling (~20) — plan a multi-server split
  by Phase 3

### Phase 1 open questions

- **Hosted MCP variant in this phase?** Probably not. Ship stdio first;
  hosted is Phase 2 when we have evidence agents will adopt.
- **Tool descriptions.** Naming/wording affects how naturally Claude picks
  tools. Worth a copy review pass before publishing the package.
- **Listings auth scoping.** Agents see all listings via their license, but
  do we want `search_listings` to default-filter to the agent's service
  areas, or platform-wide? Default platform-wide and let Claude filter
  feels right but worth confirming.

## Phase 2 · Articles + CRM read + analytics + hosted MCP

**Goal:** Claude can read leads to tailor content; agents on Claude Desktop
can add ChatRealty as a Connector via URL (no `npx`).

### What ships

| Item | New code |
|---|---|
| Tools: CMS articles | `create_article`, `list_my_articles`, `get_article`, `update_article` |
| Tools: CRM read | `search_my_contacts`, `get_contact`, `my_recent_leads` |
| Tools: analytics read | `my_landing_page_traffic`, `my_campaign_performance`, `my_ad_spend_summary` |
| Hosted MCP endpoint | `mcp.chatrealty.io` — HTTP/SSE transport, same `/api/skill/*` backend; Connector install URL surfaced in Integrations tab |
| `/legal/ai-tools` disclosure page | Plain-English description of what flows to Claude when each scope is granted |
| PII-redaction layer | In `McpToolCallLog` insertion path and in any contact tool response that lands in the audit log |

### Schema migrations Phase 2

- `Article` model: confirm no schema changes needed for skill-based draft
  creation (publishing pipeline stays untouched — drafts only)

### Phase 2 open questions

- **Hosted MCP infra.** Vercel function vs. dedicated container? MCP needs
  long-lived SSE connections; serverless functions are awkward for that.
  Likely a small Node container on Fly.io / Render / Cloud Run.
- **Anthropic Connector directory submission.** If we want one-click "Add
  Connector → Search 'ChatRealty'" in Claude Desktop, we have to submit to
  Anthropic. Timeline + requirements unknown today.

## Phase 3 · CRM write + campaign drafts

**Goal:** Claude can manage contact notes and draft campaigns.

### What ships

| Item | New code |
|---|---|
| Tools: CRM write | `add_contact_note`, `create_contact`, `add_contact_label` |
| Tools: campaigns draft | `list_my_campaigns`, `get_campaign`, `create_postcard_campaign`, `create_voicemail_campaign`, `create_email_campaign`, `estimate_campaign_cost`, `update_campaign`, `archive_campaign` |
| Server split | If tool count > 20 in any single server, split into `chatrealty-cms`, `chatrealty-crm`, `chatrealty-campaigns` MCP servers |
| Two-call confirmation infra | Not yet used — but the route helper for `confirmationToken` lands here so it's ready for Phase 4 |

### Schema migrations Phase 3

- `Contact.notes[].source` enum value `mcp:<tool>` (already supported via
  free-text source field; just convention)
- `Campaign.createdVia: "ui" | "mcp"` — for analytics on Claude-built campaigns

### Phase 3 open questions

- **Dedupe rules for `create_contact`.** Per `docs/crm/`, the CRM service
  layer already handles dedupe by phone/email. Confirm the path is the
  same whether the contact comes from UI or MCP.
- **Audit visibility in the agent CRM.** Should the CRM show "Created by
  Claude (token: MacBook)" as a chip on contacts/campaigns? Probably yes —
  builds agent trust.

## Phase 4 · Campaign send

**Goal:** With explicit scope and a daily spend cap, Claude can launch
campaigns end-to-end.

### What ships

| Item | New code |
|---|---|
| `campaigns:send` scope plumbing in token mint UI | Big warning, separate from the preset choices |
| `spendCapPerDay` field on token + cap-check on `send_campaign` | |
| Two-call confirmation flow | Returns 409 with `confirmationToken`; second call within 5 min executes |
| Tools: send | `send_campaign`, `launch_ad_campaign` |
| Spend tracking | `CampaignExecution.mcpToken` field; daily roll-up |
| `/legal/ai-tools` update | Discuss the send model + cap + revoke flow |

### Schema migrations Phase 4

- `apiTokens[].spendCapPerDay: number` + `spendCapResetTz: string`
- `CampaignExecution.mcpTokenLast4` + `mcpToolCallLogId` for traceability

### Phase 4 open questions

- **Refund / dispute path.** If Claude launches a wrong campaign within
  cap, who eats the cost? Need a CRM UI to mark a Claude-launched campaign
  as "unintended" and a process for what that means for the agent's bill.
- **Cap raise UX.** Agents will hit caps. How easy do we make raising the
  cap from the CRM? Too easy = caps are meaningless; too hard = friction
  the agent works around.

## Telemetry to inform later phases

Before committing to Phase 3/4 builds, watch from Phase 1/2:

| Metric | Source | Decision it informs |
|---|---|---|
| Active MCP tokens (last 30d) | `McpUsageDaily` agg | Is anyone actually using this? |
| Tool calls per active token per week | same | Sticky use vs. one-time curiosity |
| Top 5 tools by call count | same | Which Phase 3+ tools to prioritize |
| % of calls that result in agent-published output (LP, article) | join with Article.publishedAt | Quality signal — is Claude shipping or just drafting? |
| Avg time between draft create and human publish | same | Are drafts good enough to ship, or always rewritten? |

If after a quarter the answers are "<10 active tokens, calls dropping
weekly, drafts mostly thrown away" — Phase 3+ doesn't get built. We'd
either pivot to ChatRealty-proxied Claude (Option B from the earlier
conversation), or invest in agent education.

## Non-goals across all phases

- Multi-agent / team tokens (one token = one agent).
- Direct manipulation of MLS data (we don't own that source).
- A Claude-facing UI inside ChatRealty (the in-CMS BYOK chat is on the
  shelf; if we revive it, it'll be the credit-debited proxy path, not
  BYOK).
- A general-purpose query / aggregate tool over Mongo. Every tool maps
  to a vetted route by design.
