---
title: ChatRealty API Productization — Area Overview
status: current
last_verified: 2026-07-23
related: [./ship-strategy.md, ./architecture.md, ./build_plan.md]
---

# ChatRealty API productization

**TL;DR:** ChatRealty as a headless real-estate backend ("Payload for real
estate" in DX, **Stripe in boundary**): agents and developers build on the
platform's `/api/skill/*` surface, npm client packages, and MCP tools, while the
engine (data, analytics, campaigns, tenancy) stays server-side. Two tracks run in
this folder: the **v1 agent-site ship track** (live now — scaffolder published,
auth/CHAP packages next) and the **full BaaS build** (Neon db-per-tenant, BYOD
sync, OData — planned/design).

## Start here

| You want | Read |
|---|---|
| The strategy + current build plan (what we're shipping and why) | [`ship-strategy.md`](./ship-strategy.md) |
| The target BaaS architecture | [`architecture.md`](./architecture.md) |
| The 35-agent BaaS build program | [`build_plan.md`](./build_plan.md) |
| The shipped frontend scaffolder | [`create-site-scaffolder.md`](./create-site-scaffolder.md) |

## Gotchas

- **Two plans coexist.** `ship-strategy.md` is the *near-term v1 agent-site*
  track (phases A-F, runnable against today's Mongo-backed `/api/skill/*`).
  `build_plan.md` is the *full BaaS* program (Postgres/Neon, control plane,
  OData). Ship-strategy Phase F and the holstered sync work reference build_plan
  sections; they do not duplicate them.
- `@chatrealty/sync` is written but **deliberately unpublished** until the
  control plane can provision tenant DBs (ship-strategy §6 "Holstered").
- The skill surface is agent-token only today; end-user auth is Phase B of
  ship-strategy — nothing end-user-facing exists under `/api/skill` yet.

## File index

| File | What it covers |
|---|---|
| [`ship-strategy.md`](./ship-strategy.md) | Business model, locked decisions, three-layer update architecture, phases A-F |
| [`architecture.md`](./architecture.md) | Target BaaS architecture (tenancy, Neon, adapters) |
| [`build_plan.md`](./build_plan.md) | Executable 35-agent BaaS build program (phases 0-4 + §8 extensions) |
| [`research.md`](./research.md) | Productization research the architecture settled on |
| [`create-site-scaffolder.md`](./create-site-scaffolder.md) | `create-chatrealty-site` npm scaffolder (published v0.1.0) |
| [`chap-search-pg.md`](./chap-search-pg.md) | CHAP search ported to Postgres — area stats + glue |
| [`connection-resolver.md`](./connection-resolver.md) | Tenant connection resolver ("the keystone") |
| [`control-plane.md`](./control-plane.md) | Tenant registry + token→tenant resolution |
| [`data-dictionary.md`](./data-dictionary.md) | RESO field catalog (`src/lib/reso/data-dictionary.ts`) |
| [`db-adapter.md`](./db-adapter.md) | DB-agnostic adapter interface / DTOs / mappers |
| [`lead-capture.md`](./lead-capture.md) | Signup → auto-Contact per-tenant CRM (the `from-signup` surface) |
| [`neon-setup.md`](./neon-setup.md) | Neon provisioning |
| [`rate-limiting.md`](./rate-limiting.md) | KV sliding-window rate limiting design |
| [`spike-chap-postgis.md`](./spike-chap-postgis.md) | Spike: CHAP→PostGIS feasibility |
| [`spike-cmastats-schema.md`](./spike-cmastats-schema.md) | Spike: cmaStats strict Postgres schema |

## The `/api/skill/*` surface (v1 agent sites consume this)

26 routes; bearer `crt_live_…` tenant tokens; scopes per `src/lib/skill-scopes.ts`;
rate tiers per `src/lib/skill-auth.ts` (identity 200/min, read 100/min, write
30/min, send 5/min, research 60/min). Highlights:

| Group | Routes | Scope |
|---|---|---|
| Identity | `me`, `me/profile`, `me/stats` | none (any valid token) |
| Listings | `listings/search`, `listings/[key]` (+photos/comparables/cashflow), `listings/closed/search`, `rentals/going-rate` | `listings:read` |
| Market | `market/stats`, `market/mortgage-rates`, `market/neighborhoods/[slug]`, `market/subdivisions/[slug]` | `market:read` |
| CMS | `articles*`, `landing-pages*`, `images/*` | `articles:*` / `landing_pages:*` |
| CRM | `contacts/search`, `contacts/[id]`, `contacts/recent-leads` | `contacts:read` |
| Lead capture | `contacts/from-signup` (POST) | none — `withSkill` (auth+tenant only; **no rate limit yet**, see ship-strategy B2) |
| Social | `instagram/carousel` | `social:post` |

## npm packages

| Package | State |
|---|---|
| `create-chatrealty-site` | **published** v0.1.0 (unscoped, `npm create` convention) |
| `@chatrealty/mcp-server` | published; agent + research tiers (hosted-bridge tier gap: ship-strategy D0) |
| `@chatrealty/install-skill` | published (legacy skill installer) |
| `@chatrealty/auth`, `@chatrealty/ui` | planned — ship-strategy phases B/C |
| `@chatrealty/sync` | written, holstered |
