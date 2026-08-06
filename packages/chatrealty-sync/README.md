# @chatrealty/sync

> **The BYOD activation moment.** This package pulls *your* MLS RESO Web API feed
> into *your own* ChatRealty database (Postgres + PostGIS, hosted for you by
> ChatRealty) and keeps it fresh on a daily cron. Run it on your machine or your
> server; ChatRealty never touches your raw feed.

This README is written **for Claude first** (build_plan §3.9). If you are an LLM
scaffolding this on a customer's machine, follow the steps top-to-bottom — every
value you need is named explicitly.

---

## What it does

```
RESO Web API feed  ──►  reso-fetch.ts  ──►  map.ts  ──►  write.ts  ──►  your ChatRealty database
   (your MLS)           (OData pull)      (RESO→snake)   (upsert)        (`property` table, PostGIS)
```

- **Full seed** on the first run (no watermark yet) — pulls the whole `Property` feed.
- **Incremental** thereafter — `$filter=ModificationTimestamp gt <watermark>` with a
  **26-hour overlap window** so a boundary record is never missed.
- **Upsert-only, never deletes.** `INSERT … ON CONFLICT (listing_key) DO UPDATE`.
  There is no `--purge`, by design (the April-6-2026 incident). Listings leave
  "Active" only via status transitions in the feed.
- **Attribution is guaranteed** (IDX/MLS compliance, build_plan §3.8): every row
  carries `list_agent_name` + `list_office_name` (+ phones + MLS ids). These
  columns are `NOT NULL`; the mapper substitutes a placeholder rather than ever
  emitting null, and always preserves real attribution when the feed provides it.
- **Nothing is silently lost.** RESO fields the catalog doesn't model fall into the
  `extras` jsonb column; the full raw payload is retained in `raw`.

The column naming is **not guessed** — it is read from the canonical RESO Data
Dictionary at `src/lib/reso/data-dictionary.ts`, the same source the tenant DB
schema is built from. The three casings (`ListingKey` / `listingKey` /
`listing_key`) never drift.

---

## Quick start (fully self-serve)

```bash
# 1. Provision your ChatRealty database + write CHATREALTY_DB_URL to .env.local
npx @chatrealty/sync init --token crt_live_…     # token: Settings → Integrations

# 2. Add your MLS feed credentials to .env.local (Spark bearer OR RESO OAuth — see below)

# 3. Validate everything
npx @chatrealty/sync doctor

# 4. Small local test fetch (no writes), then the full seed
npx @chatrealty/sync run --once --dry-run --max 25
npx @chatrealty/sync run
```

Recommended for production: a VPS running the daily cron (see below).

## Install & layout

Published on npm as **`@chatrealty/sync`** — always invoke it scoped:
`npx @chatrealty/sync …`. There is no unscoped `chatrealty-sync` package, so
`npx chatrealty-sync` is a registry 404; `chatrealty-sync` is only the bin name
once the package is installed.
For development inside the monorepo: `npm install` in this directory, `npm run
build` compiles to `dist/`.

Files:

| File | Role |
|---|---|
| `src/reso-fetch.ts` | RESO Web API client — OAuth2 client-credentials bearer, OData pull, `@odata.nextLink` paging. |
| `src/map.ts` | `mapResoProperty(record)` → snake_case `property` row. Attribution + extras + geom. |
| `src/write.ts` | `upsertProperties(client, rows)` — batched `ON CONFLICT DO UPDATE`. |
| `src/index.ts` | `runSync(config)` orchestration + watermark state + `configFromEnv`. |
| `src/cli.ts` | the `chatrealty-sync` bin (the daily cron entry). |

---

## Environment (the only place secrets live)

**What "RESO" means, since nothing else here explains it:** RESO is the industry
standard every MLS uses to hand out its listing data over the web. The `RESO_*`
vars below are simply *your MLS feed's address and your password for it* — you
get them from your MLS or your feed vendor, not from ChatRealty.

- `RESO_BASE_URL` is the web address of your feed. On **Spark** it is
  `https://replication.sparkapi.com/Reso/OData`. On **Bridge** it is
  `https://api.bridgedataoutput.com/api/v2/OData`. Your MLS will tell you yours.
- `RESO_BEARER_TOKEN` is the access token out of your Spark (or equivalent)
  credentials — one long string. If you have this, you are done; skip the
  `RESO_CLIENT_ID` / `RESO_CLIENT_SECRET` / `RESO_TOKEN_URL` trio entirely.
- The client-id/secret trio is the *other* way some MLSs authenticate. You need
  **either** the bearer token **or** the trio, never both.

If you don't know which you have, run `npx @chatrealty/sync doctor` — it says
which half is missing and what to do about it.

Secrets come **from the environment only** — never a checked-in config file, never
logged. The CLI auto-loads `.env.local` then `.env`. Set:

| Var | Required | Meaning |
|---|---|---|
| `CHATREALTY_DB_URL` | ✅ | Your ChatRealty database URL (**pooled**) — written automatically by `init`. |
| `RESO_BASE_URL` | ✅ | Feed OData base, e.g. `https://replication.sparkapi.com/Reso/OData` (Spark) or your RESO Web API base. |
| `RESO_BEARER_TOKEN` | mode A | Static access token (e.g. Spark API access token). Set this and skip the three OAuth vars. |
| `RESO_TOKEN_URL` | mode B | OAuth2 token endpoint (client-credentials grant). |
| `RESO_CLIENT_ID` | mode B | Your MLS RESO client id. |
| `RESO_CLIENT_SECRET` | mode B | Your MLS RESO client secret. |
| `RESO_SCOPE` | — | OAuth2 scope, if your MLS requires one. |
| `RESO_RESOURCE` | — | Resource name (default `Property`). |
| `RESO_PAGE_SIZE` | — | OData page size (default `200`). |
| `SYNC_STATE_PATH` | — | Watermark file path for **capped/dry runs only** (default `./.sync-state`). A real `run` checkpoints in your database, not here. |
| `SYNC_OVERLAP_HOURS` | — | Incremental lookback (default `26`). |
| `SYNC_BATCH_SIZE` | — | Upsert batch size (default `400`). |

Example `.env.local` (do not commit):

```dotenv
CHATREALTY_DB_URL=postgresql://USER:PASS@HOST/DB?sslmode=require   # provided by ChatRealty at provisioning
RESO_BASE_URL=https://api.bridgedataoutput.com/api/v2/OData
RESO_TOKEN_URL=https://api.bridgedataoutput.com/oauth2/token
RESO_CLIENT_ID=your-client-id
RESO_CLIENT_SECRET=your-client-secret
```

---

## Running it

```bash
# Default: full seed on first run, incremental on every run after.
npx @chatrealty/sync run

# Dry run — pull + map everything, write NOTHING (safe to inspect).
npx @chatrealty/sync run --dry-run

# Single bounded pass (SMOKE TEST ONLY — caps at 500 records): prove the
# plumbing works, then throw it away and seed for real with `run`.
npx @chatrealty/sync run --once
npx @chatrealty/sync run --once --max 50
```

**`--once` is not a seed.** It stops at 500 records, and which 500 you get is
arbitrary — very often mostly one city. A site built on that slice looks broken
in a way that has nothing to do with the site: a judged session ran `--once`,
saw `pulled=500`, called the data step done, and then could not work out why
`/listings` showed the wrong market. Always follow it with a bare
`npx @chatrealty/sync run`.

A capped run also **never commits a checkpoint**, deliberately. The feed is
walked `ModificationTimestamp asc`, so committing the timestamp of an arbitrary
mid-feed record would tell the next run "everything up to here is synced" and
skip the rest of your inventory permanently.

### Interruptions and rate limits

A bare `run` checkpoints into your database (`sync_state`) **after every page**,
so it is safe to kill and resume — and it shares that checkpoint with the
scaffolded site's hourly Vercel cron, so a local run and the cron hand off to
each other.

This is load-bearing, not a nicety. Before v0.5.0 the checkpoint lived only in
`./.sync-state` and was written once, at the very end. Any interruption threw
the whole run away, and because the file is per-directory, the next session — in
a fresh project folder — restarted from the oldest record in the feed. One
tenant synced across three sessions, accumulated thousands of rows, and still
had zero for-sale inventory: every run re-walked 1998's closings and never
reached the present.

**MLS feeds rate-limit per API key, not per run**, so a fresh seed can get
`429 Too Many Requests` on its first request because an earlier session spent
the quota. The client retries automatically (honoring `Retry-After`). If it
still gives up, your credentials are fine — wait (15–60 minutes is typical) and
re-run. Nothing is lost.

### Reading the output

The CLI prints a summary and exits non-zero on failure. It never prints secrets.

| Number | What it means | Healthy |
|---|---|---|
| `mode` | `seed` = first run, pulling everything; `incremental` = only what changed | either, depending on run |
| `pulled` | records your MLS returned **this run** | on a seed, your whole active inventory (thousands). On a daily incremental, tens or low hundreds — a small number here is *good*, it means little changed |
| `mapped` | records that converted to storable rows | should equal `pulled` |
| `upserted` | rows actually written | should equal `mapped` |
| `skippedKeyless` | records with no listing key, which cannot be stored | 0, or a handful. Hundreds means a feed-mapping problem — file it |
| `watermark` | the timestamp the next incremental run starts from | any ISO date. `none` after a real run means the next run will re-seed |

After a seed, **open `/listings` and confirm the homes shown are in the cities
you serve.** The counts can all look right while the data is wrong for the site.

**A row count is not an inventory count.** The only number that decides whether
your site shows homes is **Active for-sale** listings, which is why `doctor`
reports that specifically. The feed is walked oldest-first, so a partial seed is
mostly Closed archival sales — comps, not inventory. One tenant had 500 rows,
then 3,600, and a browse that stayed empty the whole time; at 500 rows its
single Active listing was a rental lease, which a for-sale browse excludes by
design. If the browse is empty, check `doctor`'s Active-for-sale line before
suspecting the API.

### Daily cadence (cron)

Run it once a day. The first run seeds; every run after is incremental off the
persisted watermark. Example crontab (6 AM daily):

```cron
0 6 * * *  cd /path/to/packages/chatrealty-sync && npx @chatrealty/sync run >> sync.log 2>&1
```

The watermark in your database's `sync_state` table is what makes the daily run
incremental — it travels with the data, so it survives a machine change, a fresh
checkout, or a switch between the local CLI and the site's Vercel cron.

---

## How Claude scaffolds this on a customer machine

1. Confirm the ChatRealty database is provisioned (the `property` table +
   PostGIS exist). `CHATREALTY_DB_URL` is the pooled URL ChatRealty handed the
   customer at provisioning.
2. Write `.env.local` from the customer's MLS RESO credentials (above). Secrets go
   in env only.
3. `npx @chatrealty/sync run --once --dry-run` to verify the feed parses and maps
   (no writes). Inspect the printed counts.
4. `npx @chatrealty/sync run` for the full seed.
5. Add the daily cron line above.

## Testing

```bash
npx tsx --test packages/chatrealty-sync/src/__tests__/*.test.ts
```

- `map.test.ts` — pure mapper tests (RESO → columns, **attribution**, extras, geom,
  derived subdivision). No DB, no network.
- `write.live.test.ts` — **LIVE**: mocks the RESO fetch, maps ~10 records, upserts
  into a real `property` table, asserts attribution + geom round-trip and
  idempotency, **deletes its seeded rows in `finally`**, closes the pool in
  `after()`. **Skips cleanly** when no live DB env is present.

---

## Gotchas

- **Pooled URL for runtime.** Use the pooled connection URL ChatRealty provides
  for the sync. (DDL / `CREATE EXTENSION` happen at provision time over the
  direct connection — not here.)
- **Never `--purge`.** This package has no delete path. The live test is the only
  place a `DELETE` runs, and only against its own uniquely-marked test rows.
- **`geom` is derived** from `Longitude`/`Latitude` as a GeoJSON Point and written
  through `ST_SetSRID(ST_GeomFromGeoJSON(...),4326)`. No coordinates → null geom.
- **`list_price` doubles as rent for rentals** (`property_type = "B"`) — there is no
  separate rent column. The mapper copies it straight through; UI branches on type.
- **Watermark overlap is intentional.** The 26h lookback re-pulls a small recent
  window every run; upserts make that harmless and guard against feed clock skew.

## Related

- `src/lib/reso/data-dictionary.ts` — the column-naming source of truth this mapper consumes.
- `src/lib/db/schema/listings.ts` — the Drizzle view of the same `property` table.
- `docs/listings/README.md` — the MLS feed shape (8 MLS associations, property-type codes).
- `docs/chatrealty-api/build_plan.md` §6.8, §3.8 — the sync spec + attribution invariant.
