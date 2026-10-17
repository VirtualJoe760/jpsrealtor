---
title: Multi-tenancy — one deployment, many sites, one database per agent
status: current
last_verified: 2026-10-17
related:
  - ./domain-owner-scoping.md
  - ./custom-domains.md
  - ./agent-directory.md
  - ../routing/README.md
  - ../auth/README.md
  - ../chatrealty-api/external-site.md
  - ../chatrealty-api/control-plane.md
  - ../chatrealty-api/connection-resolver.md
  - ../chatrealty-api/data-tiers.md
supersedes: docs/multi-tenant/index.md
---

# Multi-tenancy

## TL;DR

One Next.js deployment on Vercel serves every site: the platform
(`chatrealty.io`), every agent subdomain (`{slug}.chatrealty.io`), custom
domains (`jpsrealtor.com`, agent-bought domains), and — by reverse proxy —
agent sites hosted on the agent's own Vercel. `src/proxy.ts` decides per
request from the `Host` header. **Content** on platform-rendered pages is scoped
to the agent who owns the hostname (`resolveDomainOwner`, see
[domain-owner-scoping.md](./domain-owner-scoping.md)), not to whoever is signed
in. **Listing data** for the product API is bring-your-own-data: each agent's
MLS feed lives in their own Neon Postgres database, found through a control
plane (`Tenant`) keyed by API-token hash. Two different isolation models — know
which one a route uses.

## The host matrix (as `src/proxy.ts` runs it today)

| Host | What serves it | Owner / data |
|---|---|---|
| `chatrealty.io`, `www.chatrealty.io` (dev: `chatrealty.localhost`) | Platform. `/` rewrites to `/chat-landing`; a signed-in **agent** hitting `/`, `/dashboard*` or `/agent*` is sent to their own subdomain (below). Admins stay on www. | Fallback owner (Joseph) for any content lookups |
| `agent.chatrealty.io` (dev: `agent.localhost`) | Admin-only preview of the owner site. Non-admins are redirected to www. | Joseph's content |
| `{slug}.chatrealty.io` (dev: `{slug}.localhost`) | **Either** the agent's own external deployment (reverse proxy, pages + whole `/api`) **or** the platform-rendered agent site, or `/coming-soon`. Agent portal (`/agent`, `/dashboard`, `/admin`, `/auth`) always renders from the platform. | `agentProfile.subdomain` |
| `jpsrealtor.com`, `josephsardella.com` (+ www) | `OWNER_HOSTNAMES` — normal routing, insights homepage. No agent-home redirect. | Joseph (DomainRegistry / `customDomain`; see SEO note) |
| Any other host (agent custom domains) | Falls through to normal routing. `AGENT_DOMAIN_MAP` is empty, so no rewrite happens at the edge. | `agentProfile.customDomain`, then the legacy `domainregistries` collection, then Joseph |
| Bare `localhost:3000` | Not the platform (host lacks "chatrealty") — renders the primary agent's site. Use `chatrealty.localhost:3000` for the platform. | Joseph |

Order inside `proxy()`: `/api/*` first (external-site rewrite for agent
subdomains, then the deny-by-default API gate) → static bypass → owner hosts →
`agent.` → agent subdomain → platform root → `AGENT_DOMAIN_MAP` → auth
protection. Details: [../routing/README.md](../routing/README.md).

## Agent subdomains

**Minting.** `generateSubdomain()` (`src/lib/generate-subdomain.ts`) slugs the
name (`[a-z0-9]{3,30}`, reserved words like `agent`/`api`/`admin` refused,
conflicts get `2`, `3`, …) on admin approval of an agent application
(`src/app/api/admin/applications/agents/route.ts`) and in a `User` pre-save hook
(`src/models/User.ts`). It then **awaits** `ensureSubdomainRegistered()` —
`*.chatrealty.io` is wildcard DNS on Cloudflare, but the Vercel project cannot
hold a wildcard while DNS is on Cloudflare, so every subdomain must be added to
the project individually or Vercel 404s it before `proxy.ts` runs.
Backfill: `scripts/backfill-vercel-subdomains.ts`.

**Serving.** For a page request on `{slug}.chatrealty.io` the proxy asks
`GET /api/site-config?subdomain={slug}` on the platform host (edge code can't
reach Mongo):

1. `externalSite.status` `live` (or `preview` + valid signed preview credential,
   `?crpv=` → 15-min `cr_site_preview` cookie) → `rewriteToExternal()` onto
   `externalSite.deploymentUrl`, with NextAuth session cookies stripped. The
   same check runs first for `/api/*`, so the external site owns its whole API.
   Full lifecycle: [../chatrealty-api/external-site.md](../chatrealty-api/external-site.md).
2. Agent exists but `isSiteReady()` (the profile checklist,
   `src/lib/agent-site-readiness.ts`) is false → rewrite to `/coming-soon`.
3. Otherwise → the normal app routes render; the agent is found by the
   Host header (see the header gotcha below).

**Two "site live" rules exist** — the edge gate above uses the checklist only;
`/api/agent/public` reports `hasActiveSubscription = checklist ||
active/trialing AgentSubscription || agentProfile.siteForceActive`. They
disagree for force-activated or paid-but-incomplete agents. Free-tier policy:
[../commerce/free-tier-gating.md](../commerce/free-tier-gating.md).

## Sessions per host (since 2026-10-16)

`src/lib/agent-host.ts` is the shared, edge-safe rulebook. **A signed-in agent
works on their own subdomain**, and sessions there are **host-only cookies**
(`getCookieDomain()` in `src/lib/auth.ts` returns `undefined`), so a session is
never sent to www, to another agent's site, or to an agent's external
deployment.

- **Moving hosts:** `/api/auth/transfer?target=…` (allowed: chatrealty.io,
  jpsrealtor.com, josephsardella.com, localhost and their subdomains) mints a
  30-second NextAuth-encrypted token → `/api/auth/receive` on the target host
  re-reads the user from Mongo and sets a 30-day cookie. Only
  `jpsrealtor.com`/`josephsardella.com` get an apex-wide cookie.
- **Agent sent home:** `agentHomeSubdomain()` — real agent session (role
  `realEstateAgent`, not admin, not impersonating), platform host, workspace
  path → `sendAgentHome()` → transfer → receive on the subdomain.
- **Admin "Log in as":** `/api/auth/impersonate` mints a hand-off whose
  redemption is bound to the agent's own host; the admin's www session is
  untouched. An admin on an agent subdomain's portal without impersonating is
  sent to `/auth/admin-access`.
- **Portal gates** (`portalGates()` — billing redirect, onboarding wizard,
  free-tier page blocks) run on agent subdomains as well as www.

More: [../auth/README.md](../auth/README.md).

## Custom domains

Two acquisition paths, two collections — see
[custom-domains.md](./custom-domains.md). In short: buying through
`/api/domains/purchase` writes `agentProfile.customDomain` (resolves); requesting
a mapping (`/api/agent/domains` → admin approval) writes `domain_mappings` +
`domain_registry` (does **not** resolve — the resolvers read `domainregistries`).
Community/landing-page targets are stored but never applied at request time.

## BYOD data plane (product API + MCP)

| Piece | File | Role |
|---|---|---|
| Control plane | `src/models/control/Tenant.ts`, `src/lib/control/store.ts` | One `Tenant` per agent (`ownerUserId` unique) on the shared Mongo; encrypted Neon conn strings; `tokenHashes[]` mirror. Statuses: pending, approved, provisioning, **active** (only one that serves), suspended, teardown, rejected, provision_failed |
| Token → tenant | `src/lib/skill-auth.ts` | Token must exist on the User; then `Tenant.tokenHashes` lookup. Non-admin keys minted in Settings auto-bind to the owner's active tenant on first use. Result `dataSource`: `tenant` / `dogfood` (admin only) / `none` (data reads 403 `no_data_source`) |
| Connection | `src/lib/tenant/resolve-connection.ts` | LRU-cached per-tenant adapter / SQL handle |
| Provisioning | `src/lib/tenant/provision.ts` via `POST /api/skill/tenant/provision` (CLI `npx @chatrealty/sync init`) | One **Neon project per tenant**, PostGIS + pg_trgm, schema, encrypted conn strings |
| Seeding | `src/lib/mls-seed.ts`, `src/lib/mls-feed.ts`, Settings → Integrations → MLS Data Feed, `GET /api/cron/mls-sync` (every 5 min, `vercel.json`) | Hosted seed + nightly updates from the agent's stored (encrypted) MLS key; or the customer-run CLI |

Deep dives: [control-plane](../chatrealty-api/control-plane.md),
[connection-resolver](../chatrealty-api/connection-resolver.md),
[neon-setup](../chatrealty-api/neon-setup.md),
[data-tiers](../chatrealty-api/data-tiers.md) (hosted seeding).
The platform's own sites (jpsrealtor.com etc.) still read the legacy shared
Mongo (`unifiedlistings`), which is the owner's dataset — never served to
other agents' tokens.

## Gotchas

- **`x-agent-subdomain` is set on the *response*, not the request.** The proxy
  calls `response.headers.set(...)` on `NextResponse.next()`, which goes to the
  browser; route handlers and `headers()` never see it. Code that parses the
  Host itself works (`/api/agent/public`, `/api/agent-branding`,
  `agent-site`, `signup-origin`, `og-image-source`); `resolveDomainOwner` does
  **not** parse the Host for subdomains, so callers that rely on the header —
  root layout `getServerTenantConfig()` (nav layout, theme, **tracking IDs**),
  `SiteFooter`, `JsonLd`, `about`, privacy/terms — likely resolve the
  **fallback owner** on agent subdomains. Unverified at runtime; check with a
  cookie-less request to an agent subdomain.
- **A public endpoint must also be in the proxy allowlist**
  (`PUBLIC_API_EXACT` / `PUBLIC_API_PREFIXES`) or anonymous visitors get 401.
  Verify public routes with a cookie-less request, not a signed-in browser.
- **External-site agents vs. the portal.** The external rewrite covers *every*
  `/api/*` path on the subdomain except `/api/site-config` — including
  `/api/auth/*` and the portal's own API calls — while `/agent/*` pages still
  render from the platform. An agent with a live external site who is sent
  home to their subdomain lands on a portal whose API is their own deployment.
- **Strip `www.` before host lookups** — all owner resolvers match apex + www.
- **`agent` is reserved** (admin preview host and `generate-subdomain`'s
  reserved list).
- **Unregistered subdomain = Vercel 404**, not a proxy bug.
- **`/agent-site/[[...slug]]` is orphaned** — nothing rewrites to it; the
  subdomain homepage is the normal `/` route.

## Files

`src/proxy.ts`, `src/lib/agent-host.ts`, `src/lib/resolveDomainOwner.ts`,
`src/lib/generate-subdomain.ts`, `src/app/api/site-config/route.ts`,
`src/app/api/auth/{transfer,receive,impersonate}/route.ts`,
`src/models/{DomainRegistry,DomainMapping}.ts`, `src/models/control/Tenant.ts`,
`src/lib/tenant/`, `src/lib/control/store.ts`, `src/lib/skill-auth.ts`,
`src/lib/mls-seed.ts`, `vercel.json` (headers + crons only — no rewrites).
