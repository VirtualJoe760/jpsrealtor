---
title: MCP Scopes, Rate Limits, and Safety
status: current
last_verified: 2026-10-17
related: [./README.md, ./tools.md, ./site-building.md, ./rollout-plan.md, ../integrations/README.md, ../content-templates/README.md]
---

# MCP Scopes, Rate Limits, and Safety

> **TL;DR.** Live: a 15-scope catalog and 5 presets (+ Custom) in
> `src/lib/skill-scopes.ts`, free-tier mint gating, per-route `requireScope`
> in `src/lib/skill-auth.ts`, hosted tool filtering by `TOOL_SCOPE`
> (`src/lib/mcp-tool-bridge.ts`), and per-token in-memory rate limits.
> Design-only (no code): the `McpToolCallLog` audit collection, the daily
> spend cap, and the two-call confirmation for `campaigns:send` — they land
> with campaign tools, none of which exist yet. **Known gap:** no preset meant
> for Claude work carries `site:manage`, so the site go-live tools are
> unavailable to most Claude keys (see Presets).

## GOTCHA: connectors freeze scopes AND tool schemas at connect time

Cost us three failed cycles on 2026-07-26. Read this before iterating on tools.

A connected MCP client caches **both** the granted scopes and the full
`tools/list` schema from the moment it connects. Nothing you ship reaches it
until the agent reconnects:

| You ship | Connected client sees | Looks like |
|---|---|---|
| A new tool | nothing | "the deploy didn't land" |
| A new **parameter** on an existing tool | parameter **silently stripped** | "the route is ignoring my argument" |
| A new scope on the token | old scope set | "the endpoint is broken" |

The parameter case is the nastiest: the cached schema carries
`additionalProperties: false`, so the client drops the unknown field **before
the request is sent**. The route never sees it, returns a perfectly valid
response computed from the remaining args, and every signal points at a
backend bug. Adding `photoIndexes` to `stage_listing_with_agent` failed this
way — repeatedly, while the deploy was fine the whole time.

**Rules:**

- **Never iterate on tool surface through a live connector.** Test routes
  directly (`curl` with a `crt_live_` token) or via the stdio server, where a
  restart re-reads the schema.
- **Verify the surface before blaming the backend.** If an argument seems
  ignored, re-read the tool's schema as the client sees it. If the parameter
  isn't there, it never left the client.
- **Reconnecting is a user action with a decision in it** — the authorize page
  validates a *pasted* token, and its scopes become the grant. Minting a
  correctly-scoped token does nothing until that specific token is the one
  pasted. Say which token, by name and last-4.
- If you find yourself asking for a reconnect a second time, stop: the loop is
  the problem. For first-party work, use the local script path
  (see [content-templates/](../content-templates/)).

## Token scope model

Tokens are minted with a set of **scopes** the agent picks at creation time
in Settings → Integrations (`/api/integrations/api-tokens`). A route call
requires the scope it declares; a missing one returns
`403 { error: "missing_scope", required, tokenScopes, isLegacyToken }`. A
data scope (`listings:read`, `market:read`, …) on a token with no data source
returns `403 no_data_source` first. On the hosted connector the bridge also
hides tools whose `TOOL_SCOPE` entry the token lacks.

Scopes live on `User.agentProfile.aiIntegrations.apiTokens[].scopes`. A key
resolves to the agent's own database through the tenant's `tokenHashes`
(plus a `tenant_tokens` record); `authenticateSkillRequest` binds a
non-admin's key to the tenant they own on first use.

**Legacy tokens** (an empty `scopes` array) resolve to
`LEGACY_DEFAULT_SCOPES`: `site:manage`, `landing_pages:read`,
`landing_pages:write`, `listings:read`, `market:read`, `analytics:read`. (The
hosted bridge keeps its own fallback list without `site:manage`, but OAuth
records store the already-resolved scopes, so it rarely applies.)

### Scope catalog (15)

| Scope | Shipped tools it unlocks (hosted `TOOL_SCOPE`) | Risk |
|---|---|---|
| `landing_pages:read` | `list_my_landing_pages`, `get_landing_page` | none |
| `landing_pages:write` | `create_landing_page`, `update_landing_page` (drafts), and the image tools `stage_listing_with_agent`, `create_listing_cover`, `create_carousel_slide` | low |
| `articles:read` | `list_my_articles`, `get_article` | none |
| `articles:write` | `create_article`, `update_article` — **can publish a draft** with `status:"published"` | medium — outward-facing |
| `listings:read` | Listing search/detail/photos/comps/closed, the four cash-flow tools, `plan_listing_carousel`, `get_site_claim_code` | none — MLS data for licensed use |
| `market:read` | Market stats, neighborhoods, mortgage rates, subdivision CMA | none |
| `contacts:read` | `search_my_contacts`, `get_contact`, `my_recent_leads` | **medium** — PII flows to Claude |
| `contacts:write` | none yet (CRM write tools are designed only) | low |
| `campaigns:read` / `campaigns:write` | none yet | low |
| `campaigns:send` | none yet — **never in a preset** | **high** — real money |
| `analytics:read` | none yet (analytics tools designed only) | none |
| `social:post` | `post_instagram_carousel` — publishes immediately; in no preset | **high** — public post |
| `site:manage` | `site_status`, `connect_site`, `set_site_live` (and the `get_tracking` / `set_tracking` routes) | medium — `set_site_live` makes a site public (license-gated) |
| `research:read` | Client-research surface; only the `client_research` preset grants it | none |

### Presets in the Integrations UI

| Preset (`PRESETS` id) | Scopes | Use case |
|---|---|---|
| **Website: CHAP, listings & blog** (`website`; default; the ONLY preset on the Free plan) | `listings:read`, `market:read`, `articles:read`, `articles:write`, `site:manage` | Power a scaffolded site (CHAP, listings, blog) and connect/launch it. Lead capture (`contacts/from-signup`) needs no scope. |
| **Content drafting** (`content_drafting`) | `landing_pages:*`, `articles:*`, `listings:read`, `market:read`, `analytics:read` | Write LPs and articles with market context |
| **Lead-aware drafting** (`lead_aware`) | content drafting + `contacts:read` | Claude references the agent's real leads |
| **Full workspace** (`full_workspace`) | lead-aware + `contacts:write`, `campaigns:read`, `campaigns:write` | Power users. Explicitly excludes `campaigns:send`, `social:post` and `site:manage` |
| **Client research** (`client_research`) | `research:read`, `listings:read`, `market:read` | A read-only token an agent can hand to a client |
| **Custom** | Pick individual scopes | — |

**Gap — `site:manage` is missing from every Claude-work preset.** Only
`website` carries it. A paid agent who mints Content drafting, Lead-aware or
Full workspace for Claude cannot reach `site_status` / `connect_site` /
`set_site_live`: hidden on the hosted connector, 403 at the route on stdio.
The build guide's go-live step therefore stalls unless the agent re-mints with
the Website preset or adds `site:manage` under Custom (and, on hosted,
reconnects). `get_site_claim_code` was moved to `listings:read` on 2026-10-17
for this reason; the go-live tools were not. Reported as a bug; fix belongs in
`src/lib/skill-scopes.ts`.

### Tier gating (2026-07-23)

The mintable surface is **tier-gated server-side** in
`/api/integrations/api-tokens` per the ship-strategy free/paid ladder
(`docs/chatrealty-api/ship-strategy.md` §5): the Free plan sees and can mint
only the **Website & listings** preset / `FREE_TIER_SCOPES`
(`src/lib/skill-scopes.ts` `catalogForTier()`); out-of-tier scope requests get
an explicit 403 naming the scopes, never a silent downgrade. Paid tiers (and
admin, who is comped a paid tier) see everything. **Known gap:** tokens minted
before a plan downgrade keep their scopes until revoked.

`campaigns:send` is **never** in a preset. The agent has to tick it
individually and is shown an explicit warning ("This token can launch
campaigns that cost real money. Consider creating a separate, scoped token
for sending and revoking it when not in use.").

## Rate limits

`skillRateLimit()` in `src/lib/skill-auth.ts`: sliding 1-minute window,
**in-memory per Vercel instance** (`src/lib/rate-limit.ts`), bucketed by
tier + token last4 + token name. Each route picks its tier. The distributed
Upstash limiter (`src/lib/rate-limit-kv.ts`) exists but no route uses it yet —
see `docs/chatrealty-api/rate-limiting.md`.

| Tier | Typical routes | Limit / min |
|---|---|---|
| Identity | `/me`, `/me/profile`, `/me/stats` | 200 |
| Read | `:read` routes | 100 |
| Research | client-research routes | 60 |
| Write | `:write` routes, Instagram post | 30 |
| Send | `campaigns:send` (no route yet) | 5 |

Over-limit returns `429 rate_limited` with `retryAfter` seconds. Claude reads
that and either waits or asks the agent.

## Daily spend cap (`campaigns:send`) — design only

Nothing below is built. Per-token (NOT per-agent). On the token subdoc:

```ts
{
  ...,
  scopes: [..., "campaigns:send"],
  spendCapPerDay: number,        // cents — 0 = no send allowed even with scope
  spendCapResetTz: string,       // e.g. "America/Los_Angeles"
}
```

Server checks the cap on every `send_campaign` call:
1. Compute today's total spend attributable to this token (sum of recorded
   campaign costs from `CampaignExecution` records flagged with `mcpToken`).
2. Add the estimated cost of the requested send.
3. If total > cap → `403 cap_exceeded` with the cap, today's spend, and the
   estimated cost in the error body. Claude reports it back; agent has to
   raise the cap from the CRM dashboard (not from the MCP — caps are a
   deliberate friction).

Default cap is **0 cents**. An agent who wants Claude to launch campaigns
sets a per-day budget explicitly.

## Audit log — design only

Proposed collection `McpToolCallLog`. No model exists in `src/models/` and no
route writes one.

```ts
{
  _id: ObjectId,
  userId: ObjectId,         // owner of the token
  tokenLast4: string,
  tokenName: string,        // snapshot — survives token revoke
  tool: string,             // e.g. "create_landing_page"
  scopeUsed: string,        // e.g. "landing_pages:write"
  inputDigest: string,      // sha256 of input args — for dedupe / abuse detection
  inputPreview: object,     // first 1KB of input, PII-redacted (see below)
  result: "ok" | "error",
  errorCode?: string,
  durationMs: number,
  costUsdCents?: number,    // for `campaigns:send`
  createdAt: Date,
}
```

Index `{ userId: 1, createdAt: -1 }`. TTL: 90 days hot. After 90 days,
aggregate-and-archive (per-day count by tool + cost total) into a separate
`McpUsageDaily` collection and drop the per-call records.

### PII redaction in `inputPreview`

Before persisting:
- `email` → first 2 chars + "...@" + last 8 chars
- `phone` → last 4 only
- `name` → initials
- Anything matching a Mongo `_id` regex → kept as-is (those are non-PII)
- `content` / `excerpt` / `notes` → first 200 chars

The full input is NEVER stored. If an investigation needs more detail, it
comes from the response body cache (which we don't keep).

## PII and CRM

Anthropic stores prompts and completions for operational purposes (per
Anthropic's data policy at the time the agent's Claude subscription was
established). Any time a tool returns contact PII, it goes into Claude's
context and is subject to Anthropic's retention.

Mitigations in the design:
- **Explicit scope.** `contacts:read` is opt-in: only the Lead-aware and Full
  workspace presets carry it, never the default Website preset.
- **Tool descriptions name the data flow.** Example for `get_contact`:
  *"Returns the contact's name, phone, email, and notes. This information
  will be visible to Claude (Anthropic) and used for the duration of the
  conversation."*
- **Minimum returnable surface.** `search_my_contacts` returns only display
  name + last activity — agent has to explicitly call `get_contact` to pull
  full PII. Two-step gates Claude's enthusiasm.
- **No bulk export.** No tool returns more than N=50 contacts in one call.

The platform owner (you, Joseph) should publish a "What flows to Claude"
disclosure on `/legal/ai-tools` before Phase 2 ships. Out of scope for this
doc.

## Approval flow for high-blast-radius actions — design only

For `send_campaign` and `launch_ad_campaign` specifically (neither exists yet), the server
implements a **two-call confirmation**:

1. First call → returns `409 confirmation_required` with a `confirmationToken`
   that encodes the campaign id, estimated cost, and a 5-minute expiry. The
   error body contains a human-readable summary Claude can show the agent.
2. Second call within 5 minutes, same args + `confirmationToken` → executes.

Claude's natural conversation handles this well: "Send campaign X? Estimated
cost $42. Confirm?" → agent: "yes" → Claude calls again with the token. The
guard is server-side, so a malicious or runaway prompt loop can't bypass it.

## What the MCP server does NOT do

- **Doesn't store the token in plain text.** The agent passes it via env var
  at server start; the MCP process holds it in memory only. The Authorization
  header is constructed per request.
- **Doesn't log request bodies to stdout.** Anthropic shows MCP server stdio
  output in Claude Desktop's debug pane — we send only structured tool
  results, never raw request/response bodies that might contain PII.
- **Doesn't cache.** Every call hits the backend. We rely on the backend's
  caching (or lack thereof) so the agent sees fresh data.
- **Doesn't retry on failure.** If a tool fails, Claude decides whether to
  retry, ask the agent, or move on. Silent retries hide errors and double
  the blast radius of writes.
- **Doesn't auto-update (stdio).** A stdio install runs whatever npm version
  `npx` resolved. The hosted connector rebuilds from source on every deploy, so
  it ships updates centrally.

## Tech-debt callouts

- ~~`scopes` field migration on existing tokens~~ — done; legacy tokens resolve
  to `LEGACY_DEFAULT_SCOPES`.
- KV-backed rate limiter: the module exists (`src/lib/rate-limit-kv.ts`) but
  `skillRateLimit` still uses the per-instance in-memory limiter.
- `TOOL_SCOPE` gaps: `get_tracking`, `set_tracking`, `show_listing_board` have
  route scopes but no bridge entry, so hosted lists them to every token.
- `site:manage` absent from the Claude-work presets (see Presets).
- `CampaignExecution` needs an `mcpToken` field before any spend-cap work.
