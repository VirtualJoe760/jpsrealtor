---
title: Architecture Index
status: current
last_verified: 2026-07-26
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
Atlas is the source of truth; Cloudinary holds all images.

## Subsystem map

| Area | Linchpin file | Deep dive |
|---|---|---|
| Routing | `src/proxy.ts` | [routing/](./routing/) |
| Theming (system-pref default, Dynamic Island sync) | `src/app/contexts/ThemeContext.tsx` | [theming/](./theming/) |
| Auth | `src/lib/auth.ts` | [auth/](./auth/) |
| Multi-tenant scoping | `src/lib/resolveDomainOwner.ts` | [multi-tenant/](./multi-tenant/) |
| CMS / articles | `src/lib/publishing-pipeline.ts` | [cms/](./cms/) |
| CRM | `src/models/Contact.ts` | [crm/](./crm/) — *not yet written* |
| Listings / MLS | `src/models/UnifiedListing.ts` | [listings/](./listings/) — *not yet written* |
| Chat / CHAP | `src/lib/chat-search/` | [chat/](./chat/) — *not yet written* |
| Commerce | `src/models/AgentSubscription.ts` | [commerce/](./commerce/) |
| External integrations | `src/lib/` (each integration is one file) | [integrations/](./integrations/) — *not yet written* |
| MCP server (agent's Claude → ChatRealty) | `packages/mcp-server/` (planned) + `src/app/api/skill/*` | [mcp/](./mcp/) |
| Content templates — IG carousels, cover slides, reels | `scripts/carousel-build.js` + `src/lib/cover-templates/` | [content-templates/](./content-templates/) |
| API productization — headless backend BaaS (**planned/design**) | `src/app/api/skill/*` + Neon per-tenant DB | [chatrealty-api/](./chatrealty-api/) |

## Cross-cutting invariants

These bite hardest when forgotten. Read every time.

- **Multi-tenant scoping.** Any public endpoint displaying content MUST use `resolveDomainOwner` — not `session.user.id`. Failure mode: visitors see the wrong agent's data, or empty pages on apex domains. See [multi-tenant/](./multi-tenant/).
- **Vercel `after()`.** Background work on serverless functions needs `after()` from `next/server` to survive the 200 response. Bare fire-and-forget is killed when the function returns. Used in `/api/crm/contacts/import/confirm` and similar.
- **`vercel.json` cache trap.** The catch-all sets `Cache-Control: public, max-age=31536000, immutable` on every path including `/api/*`. Any dynamic API route MUST set explicit `Cache-Control: no-store` on its response, or per-user data freezes in browser caches for a year.
- **Middleware file is `src/proxy.ts`**, not `middleware.ts` (Next.js 16 renamed the convention; many legacy docs still say middleware).
- **Windows absolute paths** for all file ops (Claude Code bug with relative paths).
- **CMS source of truth is MongoDB.** The MDX files in `src/posts/` are a git-stored mirror; production reads from Mongo only.
- **Cookies are domain-scoped.** Sign-in on `jpsrealtor.com` does NOT carry to `chatrealty.io`. Cross-domain transfer goes through `/api/auth/transfer` → `/api/auth/receive`.
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
8. `src/models/UnifiedListing.ts` — MLS listing model
9. `src/app/api/articles/list/route.ts` — reference impl for `resolveDomainOwner` scoping

## Known tech debt

See [tech-debt.md](./tech-debt.md) for the live list. Most recent entries from the May 2026 work:
- `vercel.json` over-aggressive cache catch-all
- Several public-facing API routes still scope by `session.user.id`
- `AGENT_DOMAIN_MAP` in `proxy.ts` is hardcoded empty
- `Campaign` model has a duplicate `campaignId` index warning
