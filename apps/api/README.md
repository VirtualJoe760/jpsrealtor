# @chatrealty/api

Standalone **NestJS** application that exposes the ChatRealty product API. It
**reuses the framework-agnostic core** already built in the Next app's
`../../src/lib` — the tenant connection resolver, the DB adapters (Mongo +
Postgres/Neon), the token hashing, and the pure param→filter mapping. No
business logic is re-implemented here.

## Run

```bash
cd apps/api
npm install            # add --legacy-peer-deps if a workspace peer conflict blocks it
npm run start:dev      # ts-node + watch, alias @/* resolved via tsconfig-paths
```

Or run the compiled build:

```bash
npm run build          # nest build → tsc, then tsc-alias rewrites @/* imports
npm run start:prod     # node dist/apps/api/src/main.js
```

- **Base URL:** `http://localhost:3001/v1`
- **Swagger / OpenAPI:** `http://localhost:3001/docs`
- **Port:** `PORT` env var, default `3001` (Next dev runs on 3000).

Environment is loaded from the **repo-root `.env.local`** (`MONGODB_URI`,
`SECRETS_ENCRYPTION_KEY`, tenant Neon connection strings, etc.) — `main.ts` finds
it whether you run from `dist` or via ts-node.

## Auth

Every route requires a bearer token:

```
Authorization: Bearer crt_live_<...>
```

The token is sha256-hashed with the **same `hashToken`** the Next app uses and
resolved against the control-plane tenant registry
(`resolveTenantByTokenHash`). A token bound to an ACTIVE tenant authenticates
here identically to the Next skill routes. Missing/malformed → 401; valid-looking
but no active tenant → 403.

## Endpoints

| Method | Path                                   | Description                                    |
|--------|----------------------------------------|------------------------------------------------|
| GET    | `/v1/listings`                         | Structured search → `Page<ListingDTO>`         |
| GET    | `/v1/listings/:listingKey`             | Single listing (404 if absent)                 |
| GET    | `/v1/listings/:listingKey/comparables` | Closed comps + subject + median stats          |

Search query params: `city, subdivision, propertyType, status, minPrice,
maxPrice, minBeds, maxBeds, minBaths, maxBaths, minYearBuilt, maxYearBuilt,
hasPool, minDaysOnMarket, maxDaysOnMarket, limit, skip`. They map to a
`ListingFilter` via the reused `buildTenantListingFilter`, then
`adapter.listings.find/get` does the real data access against the tenant's DB.

## How the reuse is wired (alias resolution)

The reused core imports use the `@/*` alias (e.g. `@/lib/db/adapter`), which in
the Next app maps to `./src/*`. Here:

- **`tsconfig.json`** sets `baseUrl: ../..`, `rootDir: ../..`, and
  `paths: { "@/*": ["src/*"] }`. `tsconfig.build.json` additionally `include`s
  the exact reused `../../src/...` files, so `nest build` (tsc) compiles both the
  Nest app **and** the reused core into `dist`, preserving the tree
  (`dist/apps/api/src/main.js`, `dist/src/lib/...`).
- **`tsc-alias`** then runs (`build` script) and rewrites every emitted `@/...`
  import into a real relative path pointing at the compiled `dist/src/...`, so
  `node dist/apps/api/src/main.js` runs with **zero unresolved `@/` imports**.
- **Dev/runtime (`start` / `start:dev`)** resolves `@/*` on the fly via
  `tsconfig-paths` (nest start reads the tsconfig `paths`).

Runtime deps the reused core transitively needs (`@neondatabase/serverless`,
`drizzle-orm`, `lru-cache`, `mongoose`, `pg`, `ws`) are declared here so they
resolve from `apps/api/node_modules`.
