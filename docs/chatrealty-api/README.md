---
title: ChatRealty API Productization — Area Overview
status: current
last_verified: 2026-10-17
related: [./ship-strategy.md, ./architecture.md, ./build_plan.md, ./external-site.md, ./data-tiers.md, ../multi-tenant/README.md]
---

# ChatRealty API productization

**TL;DR:** ChatRealty as a headless real-estate backend ("Payload for real
estate" in DX, **Stripe in boundary**): agents and developers build on the
platform's `/api/skill/*` surface, npm client packages, and MCP tools, while the
engine (data, analytics, campaigns, tenancy) stays server-side. The
database-per-tenant core is **built and live**: control plane (`Tenant`),
self-serve Neon provisioning, the connection resolver, `@chatrealty/sync`, and
hosted seeding from Settings. MCP-built agent sites are served on
`{slug}.chatrealty.io` by reverse proxy. Still open: `@chatrealty/auth` /
`@chatrealty/ui` packages, CHAP on tenant Postgres, metering/billing.
How hosts, subdomains and tenant databases fit together:
[../multi-tenant/README.md](../multi-tenant/README.md).

## Start here

| You want | Read |
|---|---|
| The strategy + current build plan (what we're shipping and why) | [`ship-strategy.md`](./ship-strategy.md) |
| How an MCP-built site goes live on a subdomain | [`external-site.md`](./external-site.md) |
| How a tenant DB is seeded (CLI or hosted) and sized | [`data-tiers.md`](./data-tiers.md) |
| The tenancy architecture | [`architecture.md`](./architecture.md) |
| The original 35-agent BaaS build program | [`build_plan.md`](./build_plan.md) |

## Gotchas

- **Two plans coexist.** `ship-strategy.md` is the v1 agent-site track (phases
  A-F, P). `build_plan.md` is the original full-BaaS program; much of its
  Phase 0-4 has landed. Ship-strategy references build_plan sections; it does
  not duplicate them.
- **BYOD gate (2026-07-23):** tokens report `dataSource` on `/api/skill/me`:
  `tenant` (own DB), `dogfood` (admin-only owner dataset), `none` (listing/
  market/research reads and tenant writes refuse with 403 `no_data_source` —
  `requireScope` in `src/lib/skill-auth.ts` + `withSkill`). Never reintroduce a
  shared listing pool. Since 2026-10-17 a non-admin key minted in Settings binds
  to the agent's own active tenant on first use.
- **Two seed paths.** `npx @chatrealty/sync init|doctor|status|run|access`
  (customer-run; package name is scoped — `npx chatrealty-sync` is a registry
  404) or **Settings → Integrations → MLS Data Feed** (hosted, serverless,
  nightly updates; `src/lib/mls-seed.ts`). Provisioning a tenant DB is still the
  token flow (`POST /api/skill/tenant/provision`) — no UI.
- **The `no_data_source` message only names the CLI** (`noDataSourceResponse`
  in `src/lib/skill-auth.ts`), not hosted seeding.
- **Photos come from the Property pull, not a second pass** (`$expand=Media`,
  sync ≥0.6.0). Tenants seeded before 0.6.0 have `primary_photo_url` NULL until
  they re-run.
- **End-user routes exist** (`/api/skill/end-users/*`, magic link + social
  upsert + favorites) — see [`end-user-auth.md`](./end-user-auth.md). Neither
  they nor `contacts/from-signup` are rate-limited yet (ship-strategy B2).

## File index

| File | What it covers |
|---|---|
| [`ship-strategy.md`](./ship-strategy.md) | Business model, locked decisions, three-layer updates, phases A-F + P |
| [`architecture.md`](./architecture.md) | Tenancy architecture (control plane, Neon, adapters) — built vs. open |
| [`build_plan.md`](./build_plan.md) | The original 35-agent BaaS build program |
| [`control-plane.md`](./control-plane.md) | Tenant registry + token→tenant resolution |
| [`connection-resolver.md`](./connection-resolver.md) | Tenant connection resolver ("the keystone") |
| [`db-adapter.md`](./db-adapter.md) | DB-agnostic adapter interface / DTOs / mappers |
| [`neon-setup.md`](./neon-setup.md) | Neon client, dev setup CLI, self-serve provisioning, storage ceiling |
| [`data-tiers.md`](./data-tiers.md) | Storage allowances, seed preflight, hosted seeding |
| [`external-site.md`](./external-site.md) | MCP-built deployments on `{slug}.chatrealty.io`, claim codes |
| [`end-user-auth.md`](./end-user-auth.md) | End-user magic-link/social auth + account favorites |
| [`lead-capture.md`](./lead-capture.md) | Signup → auto-Contact per-tenant CRM (`from-signup`) |
| [`create-site-scaffolder.md`](./create-site-scaffolder.md) | `create-chatrealty-site` npm scaffolder |
| [`chap-search-pg.md`](./chap-search-pg.md) | CHAP search ported to Postgres — area stats + glue |
| [`data-dictionary.md`](./data-dictionary.md) | RESO field catalog (`src/lib/reso/data-dictionary.ts`) |
| [`rate-limiting.md`](./rate-limiting.md) | KV sliding-window rate limiting design |
| [`research.md`](./research.md) | Productization research the architecture settled on |
| [`spike-chap-postgis.md`](./spike-chap-postgis.md), [`spike-cmastats-schema.md`](./spike-cmastats-schema.md) | Spikes |

## The `/api/skill/*` surface

52 route files; bearer `crt_live_…` tokens; scopes per `src/lib/skill-scopes.ts`;
rate tiers per `src/lib/skill-auth.ts` (identity 200/min, read 100/min, write
30/min, send 5/min, research 60/min — in-memory, per instance).

| Group | Routes | Scope |
|---|---|---|
| Identity | `me`, `me/profile`, `me/stats` | none (any valid token) |
| Listings | `listings/search`, `listings/[listingKey]` (+`photos`/`comparables`/`cashflow`), `listings/cashflow`, `listings/closed/search`, `rentals/going-rate`, `rentals/area-cashflow`, `content/carousel-plan` | `listings:read` |
| Agents / brokerages | `agents/search`, `agents/profile`, `brokerages/profile` | `listings:read` |
| Market | `market/stats`, `market/places`, `market/mortgage-rates`, `market/neighborhoods/[slug]`, `market/subdivisions/[slug]` | `market:read` (`market/places`: `listings:read`) |
| CMS | `articles*`, `landing-pages*`, `images/*` | `articles:*` / `landing_pages:*` |
| CRM | `contacts/search`, `contacts/[id]`, `contacts/recent-leads` | `contacts:read` |
| Lead capture | `contacts/from-signup` (POST) | none — `withSkill` (auth + tenant only, no rate limit) |
| End users | `end-users/auth/{request,verify,upsert}`, `end-users/me`, `end-users/favorites` | `withSkill`; 501 without a tenant |
| Site | `site/connect`, `site/go-live`, `site/status`, `site/tracking` (`site:manage`); `site/claim-code` (`listings:read`); `site/claim` (public, IP-limited) | see [`external-site.md`](./external-site.md) |
| Tenant | `tenant` (allowance), `tenant/provision` | any valid token |
| Social | `instagram/carousel` | `social:post` — publishes immediately |
| Testing / support | `bugs`, `feedback`, `feedback/[id]/upload`, `tickets`, `testing`, `testing/messages` | token only |

## npm packages (versions as committed in `packages/*/package.json`)

| Package | State |
|---|---|
| `create-chatrealty-site` | published; repo at **0.17.1** (unscoped, `npm create` convention) |
| `@chatrealty/mcp-server` | published; repo at **0.26.0**. Hosted bridge filters tools by token scope (`src/lib/mcp-tool-bridge.ts`), not by tier (ship-strategy D0) |
| `@chatrealty/sync` | published; repo at **0.8.0** — provisioning, seed, nightly refresh, photos, `access` scope report, preflight |
| `@chatrealty/install-skill` | published (legacy skill installer) |
| `@chatrealty/auth`, `@chatrealty/ui` | planned — no package yet (ship-strategy B/C) |

Publishing: bump the version first (the registry rejects a republish). The
published versions were not checked against the registry for this pass.
