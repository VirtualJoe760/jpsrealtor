---
title: Domain-owner scoping (resolveDomainOwner)
status: current
last_verified: 2026-10-17
related: [./README.md, ./custom-domains.md, ../routing/README.md, ../cms/README.md, ../seo/README.md]
---

# Domain-owner scoping

## TL;DR

On **platform-rendered** sites, a public page shows the content of the agent
who owns the hostname, not of whoever is signed in. `src/lib/resolveDomainOwner.ts`
answers "whose site is this?" and returns that agent's `_id`. Scoping a public
feed by `session.user.id` is the most common multi-tenant bug in this codebase.
None of this applies to an agent subdomain proxied to an external deployment
(that site owns the hostname outright) or to the `/api/skill/*` product API,
where a token maps to exactly one tenant database.

## The rule

> Public endpoints that scope content to "this site" MUST use
> `resolveDomainOwner(request)`, NOT `session.user.id`.

Failure modes when you get it wrong:

- Anonymous visitor on `jpsrealtor.com`: `session.user.id` is undefined → filter dropped → every agent's content shows (the Bethany-Klier-articles-on-jpsrealtor bug).
- Bethany signed in on `jpsrealtor.com`: her content shows on Joseph's site.
- Joseph signed in on `jpsrealtor.com`: works for the wrong reason.

CRM, CMS editing and other agent-private routes correctly scope by
`session.user.id` — different category, don't migrate them.

## How it resolves

| Order | Source | Lookup |
|---|---|---|
| 1 | `?subdomain=` query param, else `x-agent-subdomain` **request** header | `User.findOne({ "agentProfile.subdomain": … })` |
| 2 | Host (www-stripped and with www) | `agentProfile.customDomain` `$in [host, bare, www.bare]` |
| 3 | Host | raw `db.collection("domainregistries")` `{ domain ∈ [host, bare], status: "active" }` → `ownerId` |
| 4 | Fallback | `User.findOne({ email: PRIMARY_AGENT_EMAIL })` (default `josephsardella@gmail.com`) |

Returns `{ ownerId, source: "subdomain" | "customDomain" | "domainRegistry" |
"primaryAgentFallback" | null, host, subdomain }`. It calls `dbConnect()`
itself and returns only the id — callers run their own `findById(...).select(...)`.

**It does not parse an agent subdomain out of the Host.** Step 1 needs the
query param or the header, and the proxy sets `x-agent-subdomain` only on the
response (see the README gotcha). Without one of them, a request on
`bethanyklier.chatrealty.io` falls through to step 4 — the primary agent.
`/api/agent/public`, `/api/agent-branding`, `src/lib/signup-origin.ts`,
`src/lib/og-image-source.ts` and `src/app/agent-site/` each parse the Host as a
last resort; `resolveDomainOwner` should too (reported, not fixed).

## Who uses it

| Caller | Purpose |
|---|---|
| `src/app/api/articles/list/route.ts` | Public insights feed (`?mine=true` = agent CMS, scoped by session; `?all=true` = admin) |
| `src/app/api/newsletter/subscribe/route.ts` | Each branded site builds its own list (`NewsletterSubscriber.ownerId`) |
| `src/lib/nav-layout.ts` (`getServerTenantConfig`, root layout) | Nav layout, theme mode, tracking IDs |
| `src/app/components/SiteFooter.tsx`, `seo/JsonLd.tsx`, `seo/ServiceAreaNote.tsx` | Agency treatment, structured data, service-area note |
| `src/app/about/page.tsx`, `privacy-policy`, `terms-of-service` | Owner identity on legal/about pages |
| `src/lib/og-image-source.ts` | OG card branding (after its own Host parse) |

`/api/agent/public` and `/api/agent-branding` do **not** call it — they carry
their own copy of the same chain (plus the Host parse). `src/lib/domain-utils.ts`
(`getDomainConfigFromHeaders`) and `src/lib/sitemap-generator.ts` carry a third
and fourth. Four copies of one lookup is how they drift.

## Reference pattern

`src/app/api/articles/list/route.ts`: resolve the owner; admin `?all=true`
bypass; if `ownerId` is null return an empty result rather than the whole
network; filter by `authorId = ownerId` (Mongoose casts the string to
ObjectId for ObjectId schema fields; raw collection access needs an explicit
`new ObjectId`).

## Not yet migrated (audit pending)

Grep every API route for `session.user.id`, classify agent-private vs.
public-facing, migrate the public ones. Known candidates: public
CMS/landing-page reads, any agent "featured listings" feed.

## Gotchas

- **Step 3 reads the wrong collection.** The `DomainRegistry` model is bound to
  `domain_registry` (`src/models/DomainRegistry.ts`), and admin-approved domains
  are written there; the resolver (and its three copies) read the legacy
  `domainregistries`. See [custom-domains.md](./custom-domains.md) and
  `../tech-debt.md`.
- **The fallback is Joseph.** Any unrecognized host (including a misrouted
  agent subdomain) silently shows the primary agent — a wrong answer that looks
  like a right one. If `PRIMARY_AGENT_EMAIL` doesn't resolve, `ownerId` is
  null; handle it defensively.
- **`?subdomain=` is caller-controlled.** Fine for public data; never use the
  resolved owner as an authorization decision.
