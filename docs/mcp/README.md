---
title: ChatRealty MCP Server
status: current
last_verified: 2026-06-04
last_verified_note: v0.3.0 (propertyType resolver + photo URL fix)
related: [../integrations/README.md, ../cms/README.md, ../crm/README.md, ../listings/README.md, ./publishing.md]
---

# ChatRealty MCP Server

> **Status: Phase 1 shipped, Phase 2 partial.** `@chatrealty/mcp-server` v0.3.0
> ships 23 tools across agent meta / MLS / market / CMS landing pages
> (Phase 1) plus CMS articles and CRM read (Phase 2). Code lives in
> `packages/mcp-server/`. Backend routes under `src/app/api/skill/*` enforce
> per-token scopes (12 scopes, 4 UI presets) and tiered rate limits
> (identity / read / write / send). The legacy `@chatrealty/install-skill`
> ships alongside as a fallback for Claude Code installs without MCP support.
> Both packages live on npm under the `@chatrealty` scope — see
> [publishing.md](./publishing.md). v0.3.0 added the human-readable
> propertyType resolver (rentals/land/multi-family now searchable, sales
> are the default), photo-URL fix (camelCase field mismatch), and a `limit`
> param on `get_listing_photos`. Phase 2 remaining (analytics reads, hosted
> MCP, `/legal/ai-tools`) + Phase 3/4 (CRM writes, campaign drafts, sends)
> still in design — see [rollout-plan.md](./rollout-plan.md).

## TL;DR

`@chatrealty/mcp-server` is a Model Context Protocol server that lets an agent's
**existing Claude subscription** (Claude.ai web, Claude Desktop, Claude Code) read
and write data on their ChatRealty platform: pulling MLS listings, drafting
landing pages and articles, reviewing leads, building campaigns. The agent never
pastes an Anthropic API key — billing for inference stays on their Claude account;
ChatRealty just exposes typed tools they can call.

Auth reuses the same `crt_live_*` API tokens defined in
[`../integrations/README.md`](../integrations/README.md) (sha256-hashed,
revokable, optionally scoped). The transport is **stdio for v1** (local
`npx @chatrealty/mcp-server` process), with a **hosted HTTP/SSE endpoint
planned** for one-click Claude Desktop Connectors install.

The MCP server is intentionally a *thin transport adapter* over the existing
`/api/skill/*` REST surface. Every tool maps 1:1 to a route, so docs and tests
live with the route, not the MCP wrapper.

## Why MCP (and not just the skill)

| | Skill (Markdown + curl) | MCP server |
|---|---|---|
| Discovery in Claude UI | Markdown instruction Claude reads at activation | Tools listed in the tool tray, agent sees them by name |
| Install on Claude Desktop | Manual file edits | Native "Add Connector" UI |
| Install on Claude Code | `npx install-skill` | `claude mcp add chatrealty` |
| Parameter validation | None — Claude builds JSON, curl, hopes | JSON Schema enforced by the protocol; bad input rejected before the API call |
| Errors | curl stderr, Claude has to parse | Structured `{ isError: true, content: ... }` Claude renders inline |
| Auth | `$CHATREALTY_API_TOKEN` env var | Same — token passed at server start |
| Updates | Agent re-runs installer | `npm update -g`, or auto-refresh for hosted variant |

Skills work everywhere MCP works, but the UX gap is large enough that we treat
the skill as the Claude-Code-power-user fallback and MCP as the headline path.

## Capability map (target surface)

| Domain | Read | Write | Phase |
|---|---|---|---|
| **MLS / Listings** | search, get, photos, comparables | — (MLS is upstream; we don't write it) | 1 |
| **Market data** | market stats, mortgage rates, subdivision CMA, neighborhood info | — | 1 |
| **CMS / Landing pages** | list, get | create, update | 1 |
| **CMS / Articles** | list, get | create, update | 2 |
| **CRM / Contacts** | search, get, recent leads, contact history | add note, create contact | 2-3 |
| **Campaigns** | list, get, spend summary | create (draft), update | 3 |
| **Campaigns / Send** | — | launch postcard / voicemail / email / ads | 4 (separate scope, separate consent) |
| **Agent meta** | profile, stats | — | 1 |

Full per-tool catalog with schemas: [tools.md](./tools.md).
Token scopes that gate each domain: [scopes-and-safety.md](./scopes-and-safety.md).
Per-phase shipping plan: [rollout-plan.md](./rollout-plan.md).

## Architecture

```
                                          ChatRealty backend
                                          (Vercel / Next.js)
Claude Desktop / Code / .ai                       │
       │                                          │
       │  MCP tool call                           │
       ▼                                          │
@chatrealty/mcp-server (stdio, local)             │
       │                                          │
       │  HTTPS, Bearer crt_live_...              │
       ▼                                          │
/api/skill/* route ──────────────────────────────►┤
                                                  │
                                          ┌───────┴───────┐
                                          │   MongoDB     │
                                          │   Atlas       │
                                          └───────────────┘
```

Two transports planned. Both auth identically:

| Transport | Install UX | Hosting | Status |
|---|---|---|---|
| **stdio (local)** | `npx @chatrealty/mcp-server` + JSON config snippet | On agent's machine | v1 — designed, not built |
| **HTTP/SSE (hosted)** | Claude Desktop "Add Connector" → paste URL | `mcp.chatrealty.io` we deploy | v2 — planned |

stdio is simpler: it's a small Node CLI on the agent's machine that speaks MCP
over stdin/stdout and calls our REST API for every tool. We don't host
anything new for v1; the existing `/api/skill/*` endpoints carry the load.

Hosted MCP lets agents add ChatRealty as a Connector with one paste of a URL,
which is the experience Anthropic is rapidly building toward in Claude Desktop.
We do it second because we don't want to operate a new long-lived service
before we know agents will use it.

## Linchpin files (when built)

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\index.ts` | stdio MCP server entry — wires tools to `/api/skill/*` routes |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\tools\` | One file per tool; each declares JSON Schema + the API path it calls |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\skill-auth.ts` | Already exists — bearer token auth used by every `/api/skill/*` route |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\skill\` | All MCP tools land here as REST endpoints; MCP server is a transport, not a second source of truth |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\McpToolCallLog.ts` | New collection — every tool invocation logged for audit (designed in `scopes-and-safety.md`) |

## Gotchas to design around

- **PII through Claude.** CRM read tools surface lead names/phones/emails to
  Claude — Claude logs are visible to Anthropic. Mark every CRM tool in its
  description so the agent understands data flow, and gate CRM tools behind a
  separate `contacts:read` scope an agent must opt into when minting a token.
- **Token = blank check.** Today's `crt_live_*` tokens are all-or-nothing. With
  campaigns and contacts in scope, we need per-token scopes. Add a `scopes: string[]`
  field on `User.agentProfile.aiIntegrations.apiTokens[]` before Phase 2 ships.
- **Campaign launches spend real money.** Postcard send goes through Thanks.io
  (per-piece pricing), voicemail through Drop Cowboy, ads through Google/Meta.
  Any "send" tool needs a separate `campaigns:send` scope AND a per-day spend
  cap. Defaults to OFF.
- **MLS is upstream and not always ours to write.** Listings come from CRMLS /
  GPS via the nightly cron. Tools that "edit a listing" don't exist — we'd be
  fighting the sync. Listing-flavored writes are about LP/article content
  *about* listings, not the listing record itself.
- **Audit log isn't free.** Every tool call writes one document. Index for
  `(userId, createdAt)`; tier the retention (90 days hot, archive after).
- **MCP tool count has a discoverability ceiling.** Anthropic recommends ≤20
  tools per server before naming collisions confuse the model. We're going to
  blow past that easily — group tools by domain and consider splitting into
  multiple MCP servers (`chatrealty-cms`, `chatrealty-crm`, `chatrealty-campaigns`)
  if any single one gets large.
- **Backwards compatibility.** Once an agent installs the server and Claude
  learns the tool names, renaming a tool breaks every saved conversation. Pick
  names that age well; deprecate by adding new tools, not by renaming.

## Related

- [tools.md](./tools.md) — full tool catalog by domain
- [scopes-and-safety.md](./scopes-and-safety.md) — token scope model, rate limits, audit
- [rollout-plan.md](./rollout-plan.md) — phased ship plan
- [../integrations/README.md](../integrations/README.md) — `crt_live_*` token model (parent doc)
- [../cms/README.md](../cms/README.md) — landing-page draft endpoint backing Phase 1 write tools
- [../crm/README.md](../crm/README.md) — Contact model + label system Phase 2/3 tools sit on top of
- `F:\web-clients\joseph-sardella\jpsrealtor\packages\install-skill\` — predecessor skill; still ships for Claude Code users who don't want MCP
