---
title: MCP Tool Catalog
status: partial
last_verified: 2026-06-02
related: [./README.md, ./scopes-and-safety.md, ./rollout-plan.md]
---

# MCP Tool Catalog

> Design doc. Each tool listed here is a target; only the ones marked **Phase 1**
> + already-shipped (`create_landing_page`, `list_my_landing_pages`,
> `get_landing_page`, `whoami`) have backing REST routes today.

Every tool is a thin wrapper over a `/api/skill/*` REST endpoint. The MCP
server's only responsibilities are: declare the JSON Schema, pass the bearer
token, render the result for Claude. All business logic lives in the route.

## Tool naming convention

- **Verb_noun** in snake_case. `search_listings`, `create_landing_page`.
- Prefix with `my_` when the tool is scoped to the authenticated agent's own
  data: `my_recent_leads`, `list_my_landing_pages`. Tools without `my_` are
  platform-wide reads (MLS, market data).
- No prefix for the agent's domain — Claude will pick `create_landing_page`
  over `chatrealty_create_landing_page` more reliably from natural language.

## Tools by domain

### 1. Agent meta · `Phase 1`

Smallest possible surface to confirm auth works and orient Claude.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `whoami` | (any token) | `GET /api/skill/me` | Returns agent name, email, site URL, token name + last4. Claude calls this once at the start of a session to know who it's helping. Already shipped. |
| `my_agent_profile` | (any token) | `GET /api/skill/me/profile` | Bio, service areas, specializations, headshot URL. Used to tailor LP / article content. |
| `my_stats` | (any token) | `GET /api/skill/me/stats` | Counts: published articles, draft landing pages, active campaigns, contacts. Helps Claude answer "what should I work on?". |

### 2. MLS / Listings · `Phase 1`

Read-only. Listings come from the CRMLS / GPS nightly sync; we can't write back.
All searches scope to the agent's licensed territories where applicable.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `search_listings` | `listings:read` | `GET /api/skill/listings/search` | Filter by city, zip, subdivision, beds, baths, price range, property type, status. Returns paginated list with key fields + slug. Backed by `UnifiedListing` model. |
| `get_listing` | `listings:read` | `GET /api/skill/listings/[slug]` | Full listing detail incl. description, lot/structure, days-on-market, list price history. |
| `get_listing_photos` | `listings:read` | `GET /api/skill/listings/[slug]/photos` | Cloudinary URLs ordered by display priority. Use for hero photo selection in landing pages. |
| `find_comparables` | `listings:read` | `GET /api/skill/listings/[slug]/comparables` | Computed comps for a listing — closed sales within radius, beds/baths range, time window. Returns the same shape as the agent CRM's "Comparables" panel. |
| `search_closed_listings` | `listings:read` | `GET /api/skill/listings/closed/search` | Same filters as `search_listings` but against the closed/sold historical data. For CMA narratives. |

### 3. Market data · `Phase 1`

Read-only. Aggregated data that doesn't tie to a single listing.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `get_market_stats` | `market:read` | `GET /api/skill/market/stats` | City / zip / subdivision-level: median price, days on market, inventory, YoY change. Backed by precomputed market stats models (`CaliforniaStats`, `subdivisions.cmaStats`). |
| `get_subdivision_cma` | `market:read` | `GET /api/skill/market/subdivisions/[id]` | Full CMA stats for a subdivision (the 1,424-subdivision pre-built model). Includes hierarchy parent for PGA West-style nested subdivisions. |
| `get_neighborhood_info` | `market:read` | `GET /api/skill/market/neighborhoods/[slug]` | POIs, demographics, schools — same data backing the public neighborhood page. |
| `get_mortgage_rates` | `market:read` | `GET /api/skill/market/mortgage-rates` | Live rates from API Ninjas + FRED. Useful for landing page CTAs. |

### 4. CMS · Landing pages · `Phase 1` (partly shipped)

Shipped today: `create_landing_page` via `POST /api/skill/landing-pages`.
Adding read tools and an update tool here.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `create_landing_page` | `landing_pages:write` | `POST /api/skill/landing-pages` | **Shipped.** Creates a draft. Title, content (MDX), featuredImage, seo, landingPage config (hero type, theme, form). Draft-only. Returns `{ slugId, editUrl, previewUrl }`. |
| `list_my_landing_pages` | `landing_pages:read` | `GET /api/skill/landing-pages` | List the agent's drafts + published LPs, paginated, with status filter. |
| `get_landing_page` | `landing_pages:read` | `GET /api/skill/landing-pages/[slug]` | **Shipped (partial — auth-scoped).** Full LP body. Lets Claude review prior work before drafting variants. |
| `update_landing_page` | `landing_pages:write` | `PATCH /api/skill/landing-pages/[slug]` | Partial update of a draft. Reject if status=published (publish goes through the CMS so the agent makes the final call). |

### 5. CMS · Articles · `Phase 2`

Articles (blog posts, market insights, real estate tips) — same Article model
as landing pages but `category != "landing-page"`. Per `docs/cms/`:
publishing-pipeline.ts handles MDX file write + git push + Vercel rebuild;
draft-only tools skip that pipeline.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `create_article` | `articles:write` | `POST /api/skill/articles` | Draft article. Same fields as create_landing_page minus the LP-specific options. Category required (`articles` / `market-insights` / `real-estate-tips`). |
| `list_my_articles` | `articles:read` | `GET /api/skill/articles` | Agent's articles, filterable by status + category. |
| `get_article` | `articles:read` | `GET /api/skill/articles/[slug]` | Full article body. |
| `update_article` | `articles:write` | `PATCH /api/skill/articles/[slug]` | Draft updates. Publish stays in CMS UI. |

### 6. CRM · Contacts · `Phase 2-3`

Read in Phase 2, write in Phase 3. Per memory: leads come from Follow Up Boss
sync (Zillow + other sources) into the `Contact` model. **PII flows through
Claude on every call** — see [scopes-and-safety.md](./scopes-and-safety.md#pii-and-crm).

| Tool | Scope | Phase | Route | Description |
|---|---|---|---|---|
| `search_my_contacts` | `contacts:read` | 2 | `GET /api/skill/contacts/search` | By name, phone, email, label. Returns id + display name + primary contact + last activity date. Does NOT return full notes/history (use `get_contact` for that). |
| `get_contact` | `contacts:read` | 2 | `GET /api/skill/contacts/[id]` | Full record: phones[], emails[], addresses, labels, notes, last activity, source. |
| `my_recent_leads` | `contacts:read` | 2 | `GET /api/skill/contacts/recent-leads` | Last N days of newly-created leads, optionally filtered by source (zillow, manual, postcard-response, etc.). |
| `add_contact_note` | `contacts:write` | 3 | `POST /api/skill/contacts/[id]/notes` | Append a note. Stamped with `source: "mcp:<tool_name>"` so it's distinguishable from human-authored notes in the CRM UI. |
| `create_contact` | `contacts:write` | 3 | `POST /api/skill/contacts` | Manual contact creation. Subject to dedupe-by-phone/email rules from the CRM service layer. |
| `add_contact_label` | `contacts:write` | 3 | `POST /api/skill/contacts/[id]/labels` | Apply labels (matching the existing `Label` model). |

### 7. Campaigns · Draft / configure · `Phase 3`

Per memory: Campaign covers postcards (Thanks.io), voicemails (Drop Cowboy),
emails (Resend), and ads (Google/Meta). All Phase 3 tools create or edit
campaigns but **never send** — send is its own scope (Phase 4).

| Tool | Scope | Route | Description |
|---|---|---|---|
| `list_my_campaigns` | `campaigns:read` | `GET /api/skill/campaigns` | Campaigns the agent owns, with status (draft / scheduled / sent / archived). |
| `get_campaign` | `campaigns:read` | `GET /api/skill/campaigns/[id]` | Full config, scripts, audience, schedule. |
| `create_postcard_campaign` | `campaigns:write` | `POST /api/skill/campaigns/postcard` | Draft postcard campaign — design, audience filter, schedule. Mirrors `/api/campaigns/create` for type=postcard. |
| `create_voicemail_campaign` | `campaigns:write` | `POST /api/skill/campaigns/voicemail` | Draft voicemail campaign — script, audience, schedule. |
| `create_email_campaign` | `campaigns:write` | `POST /api/skill/campaigns/email` | Draft email campaign — subject, body MDX, audience, schedule. |
| `estimate_campaign_cost` | `campaigns:read` | `GET /api/skill/campaigns/estimate` | Returns predicted cost for a given audience size + medium. Wraps Thanks.io pricing table for postcard. Used pre-send by Claude to warn the agent. |
| `update_campaign` | `campaigns:write` | `PATCH /api/skill/campaigns/[id]` | Edit a draft. Reject if status != draft. |
| `archive_campaign` | `campaigns:write` | `POST /api/skill/campaigns/[id]/archive` | Soft-delete (existing archive route). |

### 8. Campaigns · Send · `Phase 4`

Separate scope. Separate consent flow. Requires the token to have
`campaigns:send` AND for the agent to have a non-zero daily spend cap set.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `send_campaign` | `campaigns:send` | `POST /api/skill/campaigns/[id]/send` | Actually launches the campaign. Server-side cap enforcement: if today's spend + estimated cost > cap, fails with `cap_exceeded` and the cap in the error so the agent can raise it intentionally from the CRM. |
| `launch_ad_campaign` | `campaigns:send` | `POST /api/skill/campaigns/[id]/launch-ads` | Specifically for ad campaigns (Google + Meta). Different than `send_campaign` because ads have ongoing daily budgets, not one-shot send. |

### 9. Analytics · `Phase 2`

Read-only, agent-scoped.

| Tool | Scope | Route | Description |
|---|---|---|---|
| `my_landing_page_traffic` | `analytics:read` | `GET /api/skill/analytics/landing-pages` | Per-LP view counts, lead form submissions, time on page. Backed by existing Article.metadata.views + form submission records. |
| `my_campaign_performance` | `analytics:read` | `GET /api/skill/analytics/campaigns` | Sends, opens, clicks (email), responses (postcard via Thanks.io webhooks), call-backs (voicemail). |
| `my_ad_spend_summary` | `analytics:read` | `GET /api/skill/analytics/ad-spend` | YTD ad spend by platform, mirrors `/api/campaigns/[id]/spend-summary` aggregated. |

## Tool response shape

Every tool returns:

```jsonc
{
  // For lists, the primary array
  "items": [...],
  "nextCursor": "..." | null,

  // OR for single-record fetches
  "id": "...",
  "data": { ... },

  // Always
  "_meta": {
    "tool": "search_listings",
    "tokenLast4": "ab12",
    "executedAt": "2026-06-02T18:43:00Z",
    "scope": "listings:read"
  }
}
```

The `_meta` block is what gets shown when Claude renders "I called
`search_listings`" — keeps the agent informed about what the model is doing.

## Errors

Tools return MCP-protocol errors (`isError: true`) with this body:

```jsonc
{
  "error": "missing_scope" | "validation_failed" | "cap_exceeded" | "not_found"
         | "rate_limited" | "upstream_failed" | "internal",
  "message": "Plain-English explanation",
  "details": { ... }  // tool-specific
}
```

Claude is good at understanding structured errors and asking the agent for
correction or escalation. Never return raw stack traces or include the bearer
token in error messages.

## What's deliberately NOT a tool

- **Delete-anything** — no `delete_listing`, `delete_contact`, `delete_campaign`
  in v1. Archive yes, delete no. Reduces blast radius of a misunderstood prompt.
- **Bulk export** — no `export_all_contacts` or similar. Limits PII exfil.
- **Direct DB queries** — no `run_mongo_aggregate`. Every tool maps to a
  vetted route, not a generic query interface.
- **Acting as the agent in third-party UIs** — no `post_to_facebook` /
  `send_sms` for ad-hoc messages outside the campaign system. If it's a real
  channel, it goes through Campaign.
- **Domain provisioning / billing** — no `add_domain`, `change_subscription`.
  Those are admin-grade ops and shouldn't be a prompt away.
