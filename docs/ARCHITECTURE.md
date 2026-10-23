---
title: Architecture Index
status: current
last_verified: 2026-10-23
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
| Routing | `src/proxy.ts` | [routing/](./routing/) — subdomains serve EITHER the platform-rendered page OR a proxy-rewrite onto the agent's own MCP-built deployment; see [chatrealty-api/external-site.md](./chatrealty-api/external-site.md) |
| Theming (system-pref default, Dynamic Island sync) | `src/app/contexts/ThemeContext.tsx` | [theming/](./theming/) |
| Auth | `src/lib/auth.ts` | [auth/](./auth/) |
| Multi-tenant scoping | `src/lib/resolveDomainOwner.ts` | [multi-tenant/](./multi-tenant/) |
| CMS / articles | `src/lib/publishing-pipeline.ts` | [cms/](./cms/) |
| CRM | `src/models/Contact.ts` | [crm/](./crm/) — [full dialer build plan](./crm/dialer/build-plan.md) (saved simulation queues/attempts + agent lock + inline contact editing; credit reservations and isolated Stripe test wallets added; live voice and billing activation pending) |
| Listings / MLS | `src/models/unified-listing.ts` | [listings/](./listings/) |
| Chat / CHAP | `src/lib/chat-search/` | [chat/](./chat/) — *not yet written* |
| Commerce | `src/models/AgentSubscription.ts` | [commerce/](./commerce/) |
| External integrations | `src/lib/` (each integration is one file) | [integrations/](./integrations/) |
| MCP server (agent's Claude → ChatRealty) | `packages/mcp-server/` (planned) + `src/app/api/skill/*` | [mcp/](./mcp/) |
| Content templates — IG carousels, cover slides, reels | `scripts/carousel-build.js` + `src/lib/cover-templates/` | [content-templates/](./content-templates/) |
| API productization — headless backend BaaS (**planned/design**) | `src/app/api/skill/*` + Neon per-tenant DB | [chatrealty-api/](./chatrealty-api/) |

## Cross-cutting invariants

These bite hardest when forgotten. Read every time.

- **Multi-tenant scoping.** Any public endpoint displaying content MUST use `resolveDomainOwner` — not `session.user.id`. Failure mode: visitors see the wrong agent's data, or empty pages on apex domains. See [multi-tenant/](./multi-tenant/).
- **Vercel `after()`.** Background work on serverless functions needs `after()` from `next/server` to survive the 200 response. Bare fire-and-forget is killed when the function returns. Used in `/api/crm/contacts/import/confirm` and similar.
- **API caching.** `vercel.json` currently sets `/api/(.*)` to `Cache-Control: no-store, max-age=0`; immutable caching is scoped to static assets. Dynamic API routes should also return explicit `Cache-Control: no-store` to protect private responses if deployment headers change.
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
8. `src/models/unified-listing.ts` — MLS listing model
9. `src/app/api/articles/list/route.ts` — reference impl for `resolveDomainOwner` scoping

## Known tech debt

See [tech-debt.md](./tech-debt.md) for the live list. Most recent entries from the May 2026 work:
- Historical API cache catch-all was corrected; preserve the current API `no-store` rule.
- Several public-facing API routes still scope by `session.user.id`
- `AGENT_DOMAIN_MAP` in `proxy.ts` is hardcoded empty
- `Campaign` model has a duplicate `campaignId` index warning

Dialer provider work now has an unscheduled lease/fencing foundation; see [provider jobs](./crm/dialer/provider-jobs.md). A separate gated Twilio adapter and signed status inbox are implemented; no live dispatch is connected.

Dialer agent audio preferences/tests are local browser controls; persistent phone-agent audio is planned in [agent audio](./crm/dialer/agent-audio.md).

The Contacts dialer now defaults to a compact contact summary and two-pane desktop view, with a collapsible 10-row paginated queue; mobile swipe navigation remains.

Dialer MLS defaults now match the existing contact nearby-sales query, with optional explicit filters; inline dialer credits were removed in favor of navigation credit management.


<!-- Dialer layout verified 2026-10-18 -->
Dialer layout: the full-width contact/calling row sits above Property and MLS comps tools. The duplicate Contact tab is removed. MLS comps use a subject-home marker and numbered comparable markers linked to the sale list; missing coordinates are omitted from the map. Mobile uses Dialer, Property tools and Queue panels. The gear opposite Back to contacts groups audio devices, desktop queue visibility and saved-session recovery; the previous preview/header block is removed. Calls remain simulated.

Dialer settings open in a native modal overlay with an independent scroll area, backdrop dismissal and Escape support. Opening settings does not move the calling workspace; focus returns to the gear when closed. Verified 2026-10-18.

Inline dialer contact editing (verified 2026-10-18): the full-contact launcher is replaced by editable name, phone/email lists with primary selection, and address fields in the calling row. Save contact uses owner-scoped PATCH with validated detail fields; legacy primary phone/email values stay synchronized. Unsaved details block leaving or changing contacts. Saved queue phone snapshots remain unchanged. Address edits clear old map coordinates so research cannot silently use the previous home. The existing contact panel phone/email PATCH rejection is fixed by this shared API extension.

Sold-comps map interactions (verified 2026-10-18): pointer hover or keyboard focus previews the MLS photo, sold price, address and beds/baths/size without zooming. Click/tap opens a native property-details dialog with saved closed-listing media, description, sale/build/lot/pool facts, attribution and external research links. Sale-list Property details offers the same view, including sales without map coordinates. The contact-owned comparables route projects primaryPhotoUrl/media/publicRemarks/listingId from unified_closed_listings; no active-listing or live-provider fallback is used. Missing facts/photos remain explicitly unavailable. Mobile map gestures preserve one-finger panel scrolling.

Property photo enrichment (2026-10-18): contacts and sold-property dialogs share free, best-effort address-verified photo lookup and provenance-aware caching. POST lookups can seed declared externalPhotos fields on contacts/closed listings; MLS media is preserved. Source blocks are reported; no paid search provider or bypass is used. See [property-photo-discovery](./crm/property-photo-discovery.md).
