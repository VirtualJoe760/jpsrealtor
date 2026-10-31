---
title: Architecture Index
status: current
last_verified: 2026-10-28
---

# Architecture Index

> Thin map of the platform. For each subsystem, points to its deep-dive doc.
> Read this + the area README first when starting a task.

## TL;DR

**ChatRealty / jpsrealtor.** One Next.js 16 deployment on Vercel serves multiple
branded domains via host routing. Every entity (Article, Contact, Listing, Campaign,
etc.) is owned by an agent (`User`). Public pages scope content to the **domain
owner** — jpsrealtor.com → Joseph, bethanyklier.chatrealty.io → Bethany — via
`src/lib/resolveDomainOwner.ts`. Identity is NextAuth JWT; cross-domain sessions
use a transfer → receive handshake; signout is a chained multi-apex flow. MongoDB
is the source of truth — a DigitalOcean **Managed MongoDB** cluster
(`jpsrealtor-mongodb-911080c1`), **not Atlas**, despite what this line said
until 2026-10-10. Cloudinary holds all images.

## Subsystem map

| Area | Linchpin file | Deep dive |
|---|---|---|
| Routing | `src/proxy.ts` | [routing/](./routing/) — subdomains serve EITHER the platform-rendered page OR a proxy-rewrite onto the agent's own MCP-built deployment; see [chatrealty-api/external-site.md](./chatrealty-api/external-site.md) |
| Theming (system-pref default, Dynamic Island sync) | `src/app/contexts/ThemeContext.tsx` | [theming/](./theming/) |
| Auth | `src/lib/auth.ts` | [auth/](./auth/) |
| Multi-tenant scoping — one deployment, every host | `src/proxy.ts` + `src/lib/agent-host.ts` + `src/lib/resolveDomainOwner.ts` | [multi-tenant/](./multi-tenant/) — also [custom-domains](./multi-tenant/custom-domains.md), [domain-owner-scoping](./multi-tenant/domain-owner-scoping.md) |
| Admin dashboard, "Log in as", moderation | `src/app/admin/` + `src/lib/admin-auth.ts` | [admin/](./admin/) |
| Agent identity (affiliation / brokerage / team) | `src/models/User.ts` (`agentProfile.brokerage`) + `src/app/api/agent-branding/route.ts` | [agent-identity/](./agent-identity/) |
| Agent onboarding — signup → manual approval → subdomain | `src/app/api/admin/applications/agents/route.ts` + `src/lib/generate-subdomain.ts` | [agent-onboarding/](./agent-onboarding/) |
| SEO — canonicals, sitemaps, structured data | `src/lib/domain-utils.ts` (`getBaseUrl`) + `src/lib/sitemap-generator.ts` | [seo/](./seo/) |
| CMS / articles | `src/lib/publishing-pipeline.ts` | [cms/](./cms/) |
| CRM | `src/models/Contact.ts` | [crm/](./crm/) — [dialer build plan](./crm/dialer/build-plan.md) |
| Listings / MLS | `src/models/unified-listing.ts` (collection `unified_listings`; closed history is `unified-closed-listing.ts`) | [listings/](./listings/) |
| Chat / CHAP | `src/lib/chat-search/` | [chat/](./chat/) — tool index in [chat/TOOLS_INDEX.md](./chat/TOOLS_INDEX.md) |
| Analytics — sales heat map (read-only over precomputes; never calculates) | `src/lib/analytics/heatmap/sources.ts` + `src/app/api/analytics/{sales-grid,hotspots,areas}` | [analytics/](./analytics/) — deep dive in [analytics/sales-heatmap.md](./analytics/sales-heatmap.md) |
| Commerce | `src/models/AgentSubscription.ts` | [commerce/](./commerce/) |
| Campaigns & advertising (spends real money) | `src/app/api/campaigns/[id]/launch-ads/route.ts` + `src/models/Campaign.ts` | [campaigns/](./campaigns/) |
| External integrations | `src/lib/` (each integration is one file) | [integrations/](./integrations/) |
| MCP server (agent's Claude → ChatRealty) | `packages/mcp-server/` + `src/lib/mcp-tool-bridge.ts` (hosted) + `src/app/api/skill/*` | [mcp/](./mcp/) — Claude building the agent's site: [mcp/site-building.md](./mcp/site-building.md) |
| Content templates — IG carousels, cover slides, reels | `scripts/carousel-build.js` + `src/lib/cover-templates/` | [content-templates/](./content-templates/) |
| API productization — headless backend, BYOD Neon DB per tenant (built: provisioning, hosted seeding, claim codes; open items in ship-strategy) | `src/app/api/skill/*` + `src/models/control/Tenant.ts` + `src/lib/mls-seed.ts` | [chatrealty-api/](./chatrealty-api/) |
| Testing / judge loop — Tom (judge), Test Claude (builder), the repairer, tickets, `/admin/loop` | `src/app/api/skill/testing/route.ts` + `src/models/AgentTesting.ts` + `src/models/LoopTicket.ts` + `src/app/admin/loop/page.tsx` | [testing/](./testing/) — operational reference: [testing/mcp/web-design/](./testing/mcp/web-design/) |
| Review queue — bugs awaiting a decision | — | [review/](./review/) |

## Cross-cutting invariants

These bite hardest when forgotten. Read every time.

- **Multi-tenant scoping.** Any public endpoint displaying content MUST use `resolveDomainOwner` — not `session.user.id`. Failure mode: visitors see the wrong agent's data, or empty pages on apex domains. See [multi-tenant/](./multi-tenant/).
- **Vercel `after()`.** Background work on serverless functions needs `after()` from `next/server` to survive the 200 response. Bare fire-and-forget is killed when the function returns. Used in `/api/crm/contacts/import/confirm` and similar.
- **`vercel.json` caching — FIXED, and this entry used to be wrong.** It claimed the catch-all put `max-age=31536000, immutable` on every path "including `/api/*`". It does not: the catch-all source is `/((?!api/|_next/).*)` (`vercel.json:13`), which *excludes* `api/` and `_next/`, and now sets only `public, max-age=0, must-revalidate` (it used to stamp `immutable` on non-API HTML too — the 2026-07-25 PWA favorites leak; see [tech-debt.md](./tech-debt.md)). `immutable` is scoped to `/_next/static/*` and `/fonts/*`; `/images/*` gets 1 day + stale-while-revalidate. A later `/api/(.*)` rule sets `no-store, max-age=0`. Verified against `vercel.json` 2026-10-17 (last-match-wins ordering still applies). So an API route does **not** need its own `no-store` for production — but note those headers are Vercel-only and do not apply in `next dev`, so set it explicitly on responses that must never be cached locally either (e.g. error responses).
- **Middleware file is `src/proxy.ts`**, not `middleware.ts` (Next.js 16 renamed the convention; many legacy docs still say middleware).
- **Absolute paths** for all file ops (Claude Code bug with relative paths). The prefix differs per machine — macOS `/Users/averagexjoe/Documents/websites/jpsrealtor/...`, Windows `F:\web-clients\joseph-sardella\jpsrealtor\...`. See AGENTS.md rule 1.
- **No component hardcodes a brokerage.** One deployment serves many agents, so a literal brokerage name or logo asset in shared code stamps one agency onto every other agent's site. Resolve from `/api/agent-branding`. See [agent-identity/](./agent-identity/).
- **CMS source of truth is MongoDB.** The MDX files in `src/posts/` are a git-stored mirror; production reads from Mongo only.
- **Cookies are host-scoped.** On `chatrealty.io` and every agent subdomain the session cookie is **host-only** (2026-10-16) — www and `{sub}.chatrealty.io` each hold their own; only `jpsrealtor.com` / `josephsardella.com` set an apex-wide cookie (`src/app/api/auth/receive/route.ts`). Moving between hosts always goes `/api/auth/transfer` → `/api/auth/receive`. See [auth/](./auth/) and [multi-tenant/](./multi-tenant/).
- **Two content paths, and they are not interchangeable.** Joseph's own posts ship from the LOCAL scripts (`scripts/carousel-build.js` → `scripts/carousel-upload-and-publish.js`), which read `.env.local` and hit the Meta Graph API directly — no MCP, no token scopes, no connector. The MCP tools (`create_listing_cover`, `create_carousel_slide`, `post_instagram_carousel`) are the PRODUCT, for other agents. When the job is "get a post out", use the scripts; when the job is "make the product work", use the MCP path and verify it separately. Conflating the two turns a 20-minute task into a day. See [content-templates/](./content-templates/).
- **MCP connectors freeze scopes AND tool schemas at connect time.** Shipping a new tool, a new tool parameter, or a token scope does nothing for an already-connected client until it reconnects — and an unknown parameter is silently STRIPPED client-side by the cached schema, so it looks like a broken deploy rather than a stale connection. Never iterate on tool surface through a live connector. See [mcp/scopes-and-safety.md](./mcp/scopes-and-safety.md).

## Linchpin files (read first when onboarding)

1. `src/proxy.ts` — every request goes through here
2. `src/lib/auth.ts` — NextAuth config
3. `src/lib/resolveDomainOwner.ts` — the multi-tenant scoping helper
4. `src/lib/publishing-pipeline.ts` — CMS publish flow
5. `src/lib/signout-chain.ts` — multi-apex signout orchestration
6. `src/models/User.ts` — anchors most relationships via `agentProfile`
7. `src/models/Contact.ts` — CRM model with phones[] / emails[] arrays
8. `src/models/unified-listing.ts` — MLS listing model (Active listings; closed history is `unified-closed-listing.ts`)
9. `src/app/api/articles/list/route.ts` — reference impl for `resolveDomainOwner` scoping

## Known tech debt

See [tech-debt.md](./tech-debt.md) for the live list (fixed items stay in it, marked resolved). Open as of 2026-10-17:
- Most public-facing API routes still scope by `session.user.id` rather than `resolveDomainOwner` (audit never done)
- `AGENT_DOMAIN_MAP` in `proxy.ts` is hardcoded empty
- `DomainRegistry` writes `domain_registry` but six modules read `domainregistries` (admin-approved custom domains don't resolve on that path alone)
- Older OAuth/ad-platform credentials on `User` are stored plaintext; only newer features use `src/lib/secrets.ts`
- Joseph's name/DRE#/phone are hardcoded in shared CRM components (tenant leak)
- Rate limiting is per-serverless-instance; the Upstash limiter exists but nothing uses it

Dialer state as of 2026-10-18 (calls are still simulated; no live dispatch) is
tracked in [crm/dialer/implementation-status.md](./crm/dialer/implementation-status.md),
with the provider lease/fencing foundation in
[crm/dialer/provider-jobs.md](./crm/dialer/provider-jobs.md) and best-effort
address-verified photo lookup in
[crm/property-photo-discovery.md](./crm/property-photo-discovery.md).
