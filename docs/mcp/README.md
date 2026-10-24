---
title: ChatRealty MCP Server
status: current
last_verified: 2026-10-23
last_verified_note: Tool count re-counted from packages/mcp-server/src/tools/index.ts ALL_TOOLS on 2026-10-23 — 43 (META 13, MLS 6, INVESTMENT 4, MARKET 4, CMS_LP 4, CMS_ARTICLES 4, CRM_READ 3, IMAGES 4, SOCIAL 1); package.json 0.26.0.
related: [./tools.md, ./site-building.md, ./scopes-and-safety.md, ./hosting.md, ./publishing.md, ./rollout-plan.md, ../integrations/README.md, ../chatrealty-api/external-site.md]
---

# ChatRealty MCP Server

> **TL;DR.** `@chatrealty/mcp-server` (`packages/mcp-server/`, package.json
> **0.26.0**) lets an agent's own Claude subscription read and write their
> ChatRealty workspace through **43 typed tools**: identity, MLS listings,
> rental cash-flow, market data, landing pages, articles, CRM reads, the
> website-building lifecycle (claim a site key, connect, go live), carousel
> images and Instagram posting. Every tool is a thin wrapper over a
> `/api/skill/*` route, authenticated with the agent's `crt_live_` token. It
> ships two ways: **stdio** (`npx @chatrealty/mcp-server`, token in env) and
> **hosted** (`https://www.chatrealty.io/api/mcp/mcp`, OAuth custom connector).
> The headline use today is building the agent's website — see
> [site-building.md](./site-building.md).

## Where things are

| Doc | Covers |
|---|---|
| [tools.md](./tools.md) | Every tool: scope, route, and which transport shows it |
| [site-building.md](./site-building.md) | The build-guide flow end to end, known gaps, versions |
| [scopes-and-safety.md](./scopes-and-safety.md) | Scope catalog, presets, rate limits, the connector-cache gotcha |
| [hosting.md](./hosting.md) | Hosted Streamable HTTP + OAuth transport |
| [publishing.md](./publishing.md) | npm release procedure for the packages |
| [instagram-posting.md](./instagram-posting.md) | `post_instagram_carousel` setup |
| [rollout-plan.md](./rollout-plan.md) | Phase history and the unbuilt CRM-write / campaign phases |

## Status (2026-10-17)

| Area | State |
|---|---|
| Read tools: listings, closed sales, comps, photos, market stats, CMA, neighborhoods, mortgage rates, cash-flow | Shipped |
| CMS: landing pages + articles (create / list / get / update; articles can publish a draft) | Shipped |
| CRM read (`contacts:read`, opt-in) | Shipped |
| Site lifecycle: `get_site_claim_code`, `connect_site`, `site_status`, `set_site_live`, tracking IDs | Shipped |
| Build guide (`get_build_guide` + stdio `guide://` resources) | Shipped |
| Images + Instagram posting | Shipped, hosted connector only (stdio agent tier hides them) |
| CRM write, campaign drafts, campaign send, analytics tools | **Designed only** — see [rollout-plan.md](./rollout-plan.md) |
| `McpToolCallLog` audit collection, daily spend cap, two-call confirmation | **Designed only** — no model or code exists |

Scopes: 15 in `src/lib/skill-scopes.ts`; presets `website` (the only one on
the Free plan), `content_drafting`, `lead_aware`, `full_workspace`,
`client_research`, plus Custom. Rate tiers in `src/lib/skill-auth.ts`:
identity 200/min, read 100/min, write 30/min, send 5/min, research 60/min.

## Architecture

```
Claude Code / Desktop ── stdio ──► @chatrealty/mcp-server (local)  ─┐  HTTPS, Bearer crt_live_
                                                                     ├─► /api/skill/* ──► MongoDB (legacy)
Claude web / mobile ── OAuth + Streamable HTTP ──► /api/mcp/mcp ─────┘    (scopes,        or the agent's
                         (src/lib/mcp-tool-bridge.ts, in-process        rate limits)    tenant Postgres
                          dispatch to the skill routes)
```

| Transport | Install | Filtering | Code it runs |
|---|---|---|---|
| stdio | `claude mcp add chatrealty -- npx -y @chatrealty/mcp-server` + `CHATREALTY_API_TOKEN` | Tier (`tiers.ts`): agent = all but carousel/Instagram; `CHATREALTY_TIER=research` = read-only allow-list | The npm version installed |
| Hosted | Claude → Connectors → Add custom connector → `https://www.chatrealty.io/api/mcp/mcp` → paste token | Token scopes (`TOOL_SCOPE`); no tier filter | Current source, rebuilt on every Vercel build |

The MCP layer holds no business logic: a tool declares its JSON Schema and
calls one route. Docs and tests for behavior live with the route.

## Linchpin files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\tools\index.ts` | `ALL_TOOLS` registry + `SERVER_INSTRUCTIONS` |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\tools\` | One file per tool (site lifecycle tools share `site_tools.ts`) |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\build-guide\prompts.ts` | The build guide — single source for the tool, the resources and the docs site |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\tiers.ts` | stdio tier filter |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\src\index.ts` | stdio entry |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-tool-bridge.ts` | Hosted registration + `TOOL_SCOPE` |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\[transport]\route.ts` | Hosted endpoint |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\skill-auth.ts` | Token auth, `dataSource`, `requireScope`, rate limits |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\skill-scopes.ts` | Scope catalog + presets + free-tier gating |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\site-claim.ts` | Claim codes for site keys |

## Gotchas

- **The two transports show different tools.** A carousel tool missing in
  Claude Code but present on claude.ai is the tier filter, not a bug. See
  [tools.md](./tools.md) → Two surfaces.
- **Connectors freeze scopes and schemas at connect time.** Nothing you ship
  reaches a connected client until it reconnects; new parameters are silently
  stripped. See [scopes-and-safety.md](./scopes-and-safety.md).
- **stdio users get nothing until a publish.** Hosted rebuilds from source;
  stdio runs whatever npm version is installed. Bump the version before
  publishing — the registry rejects a republish. See [publishing.md](./publishing.md).
- **PII through Claude.** CRM tools put lead names/phones/emails into Claude's
  context. `contacts:read` is opt-in and in neither the `website` nor the
  `content_drafting` preset.
- **Campaign sends spend real money.** No send tool exists yet; when built,
  it needs `campaigns:send` (never in a preset) plus a spend cap.
- **Tool count.** 43 tools is well past the ~20 where model tool selection
  degrades. The planned split into several servers has not happened; tiering
  and scope filtering are the only reduction today.
- **Never rename a tool.** Saved conversations reference names; add and
  deprecate instead.
- **A rule that lives in step 2 arrives after the damage.** *(verified
  2026-08-10, 0.25.3; still true.)* The build guide's VOICE rule once sat only in
  `scaffold-your-site`, but step 1 runs first, so a judged session opened "Let me
  start by pulling the build guide" (CRBR `6a7a23e4`). `VOICE_RULE` is now one
  export in `build-guide/prompts.ts`, prefixed to every step and returned by the
  no-id `get_build_guide` call and the `guide://` index. The no-id listing and
  the resource index are the only surfaces read before the model speaks.
- **Branch labels are internal vocabulary the model will repeat.** The guide
  branches on `dataSource` values (`tenant` / `none` / `dogfood`) and now ships a
  customer-facing phrase beside each, after a session said `dogfood` to a
  customer. An enum whose empty case is named makes every other value read as
  "has data"; account type is never inventory — only returned rows are.

## Related

- [../integrations/README.md](../integrations/README.md) — `crt_live_*` token model
- [../chatrealty-api/external-site.md](../chatrealty-api/external-site.md) — serving a Claude-built site on the agent's subdomain, claim codes
- [../chatrealty-api/create-site-scaffolder.md](../chatrealty-api/create-site-scaffolder.md) — the scaffolder the guide drives
- `F:\web-clients\joseph-sardella\jpsrealtor\packages\install-skill\` — legacy landing-page skill, still offered in Settings → Integrations
