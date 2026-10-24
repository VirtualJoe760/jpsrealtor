---
title: MCP Tool Catalog
status: current
last_verified: 2026-10-23
related: [./README.md, ./scopes-and-safety.md, ./hosting.md, ./site-building.md, ./rollout-plan.md, ../chatrealty-api/external-site.md]
---

# MCP Tool Catalog

> **TL;DR.** `@chatrealty/mcp-server` registers **43 tools** in
> `packages/mcp-server/src/tools/index.ts` (`ALL_TOOLS`). Every tool is a thin
> wrapper over one `/api/skill/*` route; the route is the authoritative auth +
> scope gate. Two transports serve the same registry but **filter it
> differently** (see "Two surfaces" below), so the tool set a Claude session
> sees depends on which one it is connected to. The hosted scope map is
> `TOOL_SCOPE` in `src/lib/mcp-tool-bridge.ts`. For the website-building flow
> that strings these tools together, see [site-building.md](./site-building.md).

The MCP server's only responsibilities are: declare the JSON Schema, pass the
bearer token, render the result for Claude. All business logic lives in the route.

## Two surfaces — what a session actually sees

| | stdio (`npx @chatrealty/mcp-server`) | Hosted (`/api/mcp/mcp`) |
|---|---|---|
| Entry | `packages/mcp-server/src/index.ts` | `src/app/api/mcp/[transport]/route.ts` → `src/lib/mcp-tool-bridge.ts` |
| Filter | **Tier** (`tiers.ts`): `agent` (default) = everything except `MARKETING_TOOL_NAMES`; `CHATREALTY_TIER=research` = `RESEARCH_TOOL_NAMES` allow-list | **Token scope** (`TOOL_SCOPE`): a tool is listed and callable only if the token holds its scope; tools absent from the map need none. **No tier filter is applied.** |
| Image/carousel + Instagram tools | **Hidden** (agent tier denies them) | Listed when the token has the scope |
| Site tools without `site:manage` | Listed; the route answers 403 | Hidden (`site_status`, `connect_site`, `set_site_live`) |
| Build-guide `guide://` resources | Served (`build-guide/resource.ts`) | **Not served** — only the listing-board UI resource; `get_build_guide` (tool) works on both |
| Code freshness | Whatever version is installed from npm | Compiled from source on every Vercel build (root `prebuild` runs `build:mcp-server`) |

A connected client caches `tools/list` at connect time — a new tool or
parameter reaches it only after reconnecting. See
[scopes-and-safety.md](./scopes-and-safety.md#gotcha-connectors-freeze-scopes-and-tool-schemas-at-connect-time).

## Tool naming convention

- **Verb_noun** in snake_case. `search_listings`, `create_landing_page`.
- Prefix with `my_` when the tool is scoped to the authenticated agent's own
  data: `my_recent_leads`, `list_my_landing_pages`.
- No product prefix — Claude picks `create_landing_page` over
  `chatrealty_create_landing_page` more reliably from natural language.
- Never rename a shipped tool: saved conversations break. Deprecate by adding.

## Shipped tools (43)

"Hosted scope" is the `TOOL_SCOPE` entry; "—" means no entry, so the hosted
bridge lists the tool for every token. "Route scope" is what the route's
`requireScope` enforces (the real gate).

### 1. Agent meta, testing, site lifecycle (13)

| Tool | Hosted scope | Route scope | Route | Notes |
|---|---|---|---|---|
| `whoami` | — | none | `GET /api/skill/me` | Name, email, site URL, token name + last4, `dataSource` (`tenant` / `dogfood` / `none`). The route also returns a `database` summary for tenants (listings, associations, property types, closed history, last sync) — **but the MCP tool's handler whitelists fields and drops it** (`packages/mcp-server/src/tools/whoami.ts:30-40`), so Claude never sees `database` even though the build guide and `get_site_claim_code` tell it to read `whoami.database`. Known bug. |
| `my_agent_profile` | — | none | `GET /api/skill/me/profile` | Bio, service areas, specializations, headshot, license. The build guide reads it before asking the agent anything. |
| `my_stats` | — | none | `GET /api/skill/me/stats` | Article + landing-page counts by category × status. Contact and campaign counts are commented out in the route (they would need `contacts:read` / `campaigns:read`). |
| `get_build_guide` | — | (no route) | local data | The build-guide prompts from `build-guide/prompts.ts`. No `id` = step list + the voice rule; `id` = one step's body. In both tiers. |
| `report_bug` | — | none | `POST /api/skill/bugs` | File a defect: title, severity, area, repro, exact errors (never secrets). |
| `report_data_issue` | — | none | `POST /api/skill/tickets` | Structured data-pipeline failure (association, failing step, verbatim error, payload SHAPE). Clusters by fingerprint server-side. Rejects `envVarNames` containing `=`. See `docs/testing/tickets.md`. |
| `give_feedback` | — | none | `POST /api/skill/feedback` | Returns a one-time upload URL for a source-only session zip (no `.env`, no `node_modules`). |
| `site_status` | `site:manage` | `site:manage` | `GET /api/skill/site/status` | `status` (none/preview/live), deployment URL, subdomain, `licenseOnFile`. |
| `connect_site` | `site:manage` | `site:manage` | `POST /api/skill/site/connect` | Point `{subdomain}.chatrealty.io` at the agent's deployment. Sets `preview` (agent + admins only) and registers the subdomain on the Vercel edge (`subdomainRegistered`). See `docs/chatrealty-api/external-site.md`. |
| `set_site_live` | `site:manage` | `site:manage` | `POST /api/skill/site/go-live` | Preview → public. **License-gated** — 409 `license_required` without a license number on the profile. Confirm with the agent first. |
| `get_tracking` | — | `site:manage` | `GET /api/skill/site/tracking` | Meta Pixel / GA4 / Google Ads IDs + a `capabilities` block. GA4 alone cannot build Google Ads audiences (`youtubeRetargeting` false until an `AW-` tag is set). Missing from `TOOL_SCOPE`, so hosted lists it to tokens the route then refuses. |
| `set_tracking` | — | `site:manage` | `PATCH /api/skill/site/tracking` | Set those public measurement IDs. Partial update; empty string clears; malformed IDs rejected; `enabled:false` renders no tags. Same `TOOL_SCOPE` gap. |
| `get_site_claim_code` | `listings:read` | `listings:read` | `POST /api/skill/site/claim-code` | One-time code (15 min, one use) + `claimScript` + `steps`. Claude runs the script in the site folder; it trades the code at `POST /api/skill/site/claim` for a website key bound to the agent's seeded database and writes `CHATREALTY_API_TOKEN` into `.env.local` (removing `CHATREALTY_TEST_DATA`). The key = website preset **capped to the asking key's scopes** (`src/lib/site-claim.ts`) and never enters the conversation. 409 `no_database` without an active tenant. See `docs/chatrealty-api/external-site.md` → claim codes. |

### 2. MLS / Listings (6)

Read-only. A tenant token reads its own database; `dataSource: none` tokens get
403 `no_data_source` from every data route.

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `search_listings` | `listings:read` | `GET /api/skill/listings/search` | City, zip, subdivision, beds, baths, price, property type, status, pool, days-on-market. Rows carry `listAgentName` / `listOfficeName` for the IDX "Listed by {office} — {agent}" rule, plus `listAgentMlsId` / `listOfficeMlsId`. Route-only filters the tool does not expose: `subdivisions=A,B`; `mine=true` (422 `no_agent_id` without a license on the profile); `agentIds=GPS:d22668`; `brokerages=`; raw `listAgentMlsIds=` / `listOfficeMlsIds=` (legacy Mongo path; `src/lib/skill-api/listing-party-filter.ts`). |
| `show_listing_board` | — | `GET /api/skill/listings/search` | Same search, rendered as the MCP-Apps listing board (`ui://chatrealty/listing-board.html`, `src/ui/listing-board.ts`). No `TOOL_SCOPE` entry; the route still requires `listings:read`. |
| `get_listing` | `listings:read` | `GET /api/skill/listings/[listingKey]` | Full detail. |
| `get_listing_photos` | `listings:read` | `GET /api/skill/listings/[listingKey]/photos` | Ordered photo URLs from the synced listing media. |
| `find_comparables` | `listings:read` | `GET /api/skill/listings/[listingKey]/comparables` | Closed comps for a listing. |
| `search_closed_listings` | `listings:read` | `GET /api/skill/listings/closed/search` | Sold history (the `unified_closed_listings` collection on the legacy path). |

Route-only listing endpoints (no MCP tool yet), all `listings:read`:
`GET /api/skill/agents/search`, `/api/skill/agents/profile`,
`/api/skill/brokerages/profile`, `/api/skill/market/places`.

### 3. Investment — rental cash-flow (4)

No analysis at request time: every figure is precomputed by the
`chatrealty-backend` repo's VPS jobs and read through
`src/lib/listings/cashflow-query.ts`. Data contract: `chatrealty-backend/docs/tools/`.

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `get_area_cashflow` | `listings:read` | `GET /api/skill/rentals/area-cashflow` | Whole-area answer (`subdivisions`/`cities.cashflowProfile`): per-strategy verdicts, break-even down payments, per-bedroom economics, caveats. Misses are 200s (`found:false` + `candidates`). |
| `find_cashflowing_listings` | `listings:read` | `GET /api/skill/listings/cashflow` | Active listings that cash-flow in an area; re-derives from stored `fixedCosts` for a custom down payment/rate. |
| `analyze_listing_cashflow` | `listings:read` | `GET /api/skill/listings/[listingKey]/cashflow` | One listing's `cashflowStats`. `null` = no rent signal, never `$0`. |
| `get_going_rate` | `listings:read` | `GET /api/skill/rentals/going-rate` | Long-term rent going rate for a subdivision or ZIP. |

Two things the table can't carry, because they are the reasons the code looks the
way it does:

- **Fractional ownership is filtered here, not upstream.** `find_cashflowing_listings`
  drops `propertySubType` in `FRACTIONAL_SUBTYPES` (`Co-Ownership`, `Own Your Own`,
  `Timeshare`) and requires list price ≥ $50k and cap rate ≤ 30%. A fractional row
  prices a *share* against a whole-home rent, so before the guard (2026-10-16) one
  was the #1 result in 4 of the 9 cities that have any (Palm Desert: 72985 Somera
  Road, $289k). `build-cashflow.py` does not exclude them, so the filter lives in
  `src/lib/listings/cashflow-query.ts`.
- **The seasonal sort indexes are deliberately NOT declared in Mongoose.**
  `src/models/unified-listing.ts` omits them on purpose: `autoIndex` would build
  them against production on the next deploy. The long-term sorts use the existing
  `city_cashflow20` / `zip_cashflow20`; the two seasonal paths sort in memory over
  the whole city (0.4–0.9 s mid-size, 6–10 s Los Angeles, measured 2026-10-16).
  Create them by hand — partial filters keep them small (≈570 seasonal and ≈2,040
  achieved-seasonal listings cash-flow out of ~86k), and they apply because the
  fast path always includes `…down20.cashflows: true`:

  ```js
  for (const s of ["seasonal", "closedSeasonal"]) {
    const sp = `cashflowStats.strategies.${s}.scenarios.down20`;
    const opts = { partialFilterExpression: { [`${sp}.cashflows`]: true } };
    db.unified_listings.createIndex({ city: 1, [`${sp}.monthlyCashflow`]: -1 }, { ...opts, name: `city_cashflow20_${s}` });
    db.unified_listings.createIndex({ postalCode: 1, [`${sp}.monthlyCashflow`]: -1 }, { ...opts, name: `zip_cashflow20_${s}` });
  }
  ```

  A custom `mortgageRate` scores **every** candidate the stored `breakEvenDownPct`
  can't rule out, with no cap (the bound is exact in both directions — see the
  comments in `cashflow-query.ts`). Los Angeles is 0.2–0.4 s warm with an area and
  ~13 s without one, since `breakEvenDownPct` has no index.

### 4. Market data (4)

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `get_market_stats` | `market:read` | `GET /api/skill/market/stats` | City / zip / subdivision medians, DOM, inventory. |
| `get_subdivision_cma` | `market:read` | `GET /api/skill/market/subdivisions/[slug]` | Prebuilt subdivision `cmaStats`. |
| `get_neighborhood_info` | `market:read` | `GET /api/skill/market/neighborhoods/[slug]` | Neighborhood page data. |
| `get_mortgage_rates` | `market:read` | `GET /api/skill/market/mortgage-rates` | National 30/15-yr rates via the existing `/api/mortgage-rates` route (hourly cache). |

### 5. CMS — landing pages (4)

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `create_landing_page` | `landing_pages:write` | `POST /api/skill/landing-pages` | Creates a draft. |
| `list_my_landing_pages` | `landing_pages:read` | `GET /api/skill/landing-pages` | Drafts + published. |
| `get_landing_page` | `landing_pages:read` | `GET /api/skill/landing-pages/[slugId]` | Full body. |
| `update_landing_page` | `landing_pages:write` | `PATCH /api/skill/landing-pages/[slugId]` | Drafts only — 409 on a published page (take it back to draft in the CMS). |

### 6. CMS — articles (4)

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `create_article` | `articles:write` | `POST /api/skill/articles` | Draft article (`articles` / `market-insights` / `real-estate-tips`). |
| `list_my_articles` | `articles:read` | `GET /api/skill/articles` | Filter by status + category. |
| `get_article` | `articles:read` | `GET /api/skill/articles/[slugId]` | Full body. |
| `update_article` | `articles:write` | `PATCH /api/skill/articles/[slugId]` | Edits drafts; **`status: "published"` publishes a draft** through `src/lib/publishing-pipeline.ts` (since 2026-07-23, the free-tier blog). Content edits to an already-published article are refused. The build guide only publishes on explicit agent approval. |

### 7. CRM — contacts, read (3)

`contacts:read` is opt-in (`lead_aware` / `full_workspace` presets only). **PII
flows to Claude** — see [scopes-and-safety.md](./scopes-and-safety.md#pii-and-crm).

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `search_my_contacts` | `contacts:read` | `GET /api/skill/contacts/search` | Name/phone/email/label search; summary rows. |
| `get_contact` | `contacts:read` | `GET /api/skill/contacts/[id]` | Full record. |
| `my_recent_leads` | `contacts:read` | `GET /api/skill/contacts/recent-leads` | Last N days of new leads. |

### 8. Images — carousel production (4) · hosted only

Denied on the stdio agent tier (`MARKETING_TOOL_NAMES`), so only the hosted
connector exposes these. See `docs/content-templates/`.

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `plan_listing_carousel` | `listings:read` | `POST /api/skill/content/carousel-plan` | Turn a listingKey into post material. |
| `stage_listing_with_agent` | `landing_pages:write` | `POST /api/skill/images/agent-staged-listing` | AI composite of the agent into listing photos (`photoIndexes` picks which). |
| `create_listing_cover` | `landing_pages:write` | `POST /api/skill/images/cover-slide` | Templated 4:5 cover slide. |
| `create_carousel_slide` | `landing_pages:write` | `POST /api/skill/images/carousel-slide` | The other slide types. |

### 9. Social — real-world publish (1) · hosted only

| Tool | Hosted scope | Route | Notes |
|---|---|---|---|
| `post_instagram_carousel` | `social:post` | `POST /api/skill/instagram/carousel` | **Publishes immediately**, no draft. `social:post` is in no preset. See [instagram-posting.md](./instagram-posting.md). |

## Designed, not built

None of these exist in `ALL_TOOLS` or under `src/app/api/skill/`. Kept as the
design target; see [rollout-plan.md](./rollout-plan.md).

| Domain | Tools | Scope |
|---|---|---|
| CRM write | `add_contact_note`, `create_contact`, `add_contact_label` | `contacts:write` |
| Campaign drafts | `list_my_campaigns`, `get_campaign`, `create_postcard_campaign`, `create_voicemail_campaign`, `create_email_campaign`, `estimate_campaign_cost`, `update_campaign`, `archive_campaign` | `campaigns:read` / `campaigns:write` |
| Campaign send | `send_campaign`, `launch_ad_campaign` (daily spend cap + two-call confirmation) | `campaigns:send` |
| Analytics | `my_landing_page_traffic`, `my_campaign_performance`, `my_ad_spend_summary` | `analytics:read` |

## Tool response shape

There is no envelope. A tool returns the route's JSON body: the stdio server
wraps it as one pretty-printed text block, the hosted bridge as compact JSON
(~35% fewer tokens). Two exceptions, both handled identically by the two
transports: a result carrying `_mcpContent` is passed through as raw MCP
content blocks (rendered images), and one carrying `_structuredContent` returns
`structuredContent` plus a short `_mcpText` summary (the listing board).

## Errors

Errors come back as `isError: true` with a JSON text body
`{ "error": <code>, "message": <text>, "details"?: { status, body } }`. Codes are
whatever the route returned (`missing_scope`, `no_data_source`,
`license_required`, `no_database`, `rate_limited`, `not_found`, …) plus
transport-level ones: `insufficient_scope` (hosted, token lacks the
`TOOL_SCOPE` entry), `forbidden` (stdio, tool outside the tier), `unauthorized`,
`internal`. Never include the bearer token in an error.

## What's deliberately NOT a tool

- **Delete-anything** — archive yes, delete no.
- **Bulk export** — no `export_all_contacts`.
- **Direct DB queries** — every tool maps to a vetted route.
- **Ad-hoc third-party messaging** — no `send_sms`; real channels go through campaigns.
- **Domain provisioning / billing** — admin-grade ops, not a prompt away.
