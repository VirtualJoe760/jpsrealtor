---
title: MCP Scopes, Rate Limits, and Safety
status: current
last_verified: 2026-06-02
related: [./README.md, ./tools.md, ./rollout-plan.md, ../integrations/README.md]
---

# MCP Scopes, Rate Limits, and Safety

> Phase 1 shipped: scopes catalog + 4 presets + UI picker + per-route
> enforcement + tiered rate limits are all live.
> `McpToolCallLog` collection, daily spend cap, and two-call confirmation
> flow for `campaigns:send` remain design-only — they land with the
> campaigns tools in Phase 3/4.

## Token scope model

Tokens are minted with a set of **scopes** the agent picks at creation time
in Settings → Integrations. A tool call requires the token to carry every
scope the route declares; missing any scope returns `403 missing_scope` and
the MCP server surfaces a structured error so Claude can ask the agent to
revoke and re-issue with the right boxes checked.

### Schema change

Add `scopes` to the existing token subdoc on `User.agentProfile.aiIntegrations.apiTokens[]`:

```ts
apiTokens: [{
  tokenHash: string,
  last4: string,
  name: string,
  scopes: string[],         // NEW — empty array = legacy "all read, no write"
  createdAt: Date,
  lastUsedAt?: Date,
  revokedAt?: Date,
}]
```

Legacy tokens (created before scopes exist) default to a safe read-only set
on first call after the migration ships. They can be revoked + re-minted with
explicit scopes at any time.

### Scope catalog

| Scope | Tools it unlocks | Risk |
|---|---|---|
| `landing_pages:read` | `list_my_landing_pages`, `get_landing_page` | none |
| `landing_pages:write` | `create_landing_page`, `update_landing_page` (draft only) | low — drafts only |
| `articles:read` | `list_my_articles`, `get_article` | none |
| `articles:write` | `create_article`, `update_article` (draft only) | low |
| `listings:read` | All listings search/get/photos/comparables | none — MLS data is public to licensed agents anyway |
| `market:read` | Market stats, neighborhoods, mortgage rates, subdivision CMA | none |
| `contacts:read` | `search_my_contacts`, `get_contact`, `my_recent_leads` | **medium** — PII flows to Claude |
| `contacts:write` | `add_contact_note`, `create_contact`, `add_contact_label` | low — additive only, no delete |
| `campaigns:read` | `list_my_campaigns`, `get_campaign`, `estimate_campaign_cost` | none |
| `campaigns:write` | `create_*_campaign`, `update_campaign`, `archive_campaign` | low — drafts only |
| `campaigns:send` | `send_campaign`, `launch_ad_campaign` | **high** — real money |
| `analytics:read` | All `my_*` analytics tools | none |

### Default scope presets in the Integrations UI

To avoid the agent staring at twelve checkboxes:

| Preset | Scopes | Use case |
|---|---|---|
| **Content drafting** *(default)* | `landing_pages:*`, `articles:*`, `listings:read`, `market:read`, `analytics:read` | Most agents — write LPs and articles, look up market data and listings |
| **Lead-aware drafting** | + `contacts:read` | Agents who want Claude to reference their actual leads when drafting |
| **Full workspace** | + `contacts:write`, `campaigns:read`, `campaigns:write` | Power users — Claude can draft campaigns and manage contact notes |
| **Custom** | Pick individual scopes | For agents who know exactly what they want |

`campaigns:send` is **never** in a preset. The agent has to tick it
individually and is shown an explicit warning ("This token can launch
campaigns that cost real money. Consider creating a separate, scoped token
for sending and revoking it when not in use.").

## Rate limits

Per token. Sliding 1-minute window, in-memory backed (KV-backed eventually —
see tech-debt entry for the rate limiter).

| Tier | Tools | Limit / min |
|---|---|---|
| Read | All `:read` scopes | 100 |
| Write | All `:write` scopes (draft) | 30 |
| Send | `campaigns:send` | 5 |
| Identity | `whoami`, `my_*` meta | 200 |

Over-limit returns `429 rate_limited` with `retryAfter` seconds. Claude reads
that and either waits or asks the agent.

## Daily spend cap (`campaigns:send`)

Per-token (NOT per-agent). On the token subdoc:

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

## Audit log

New collection: `McpToolCallLog`.

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
- **Explicit scope.** `contacts:read` is opt-in, not in any default preset,
  and the Settings UI shows a warning when the agent ticks it.
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

## Approval flow for high-blast-radius actions

For `send_campaign` and `launch_ad_campaign` specifically, the server
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
- **Doesn't auto-update.** Version pinning is the agent's responsibility
  (`npx @chatrealty/mcp-server@1.2.0`). The hosted variant in Phase 2 can
  ship updates centrally.

## Tech-debt callouts

Add to `docs/tech-debt.md` before Phase 2 ships:

- `scopes` field migration on existing tokens. Default to a safe read-only
  set on first call after the migration; surface a banner in the Integrations
  tab asking the agent to revoke and re-mint with explicit scopes.
- KV-backed rate limiter (the in-memory one already noted in tech-debt
  becomes acute here — MCP clients can hit the server hard).
- `CampaignExecution` needs an `mcpToken` field so we can attribute spend per
  token for the daily cap math. Schema migration.
