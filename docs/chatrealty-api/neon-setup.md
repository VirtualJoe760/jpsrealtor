---
title: Neon Setup & Provisioning
status: current
last_verified: 2026-08-06
related: [./architecture.md, ./build_plan.md, ./db-adapter.md, ./data-dictionary.md]
---

# Neon Setup & Provisioning

> **TL;DR.** A typed Neon Management API client (`src/lib/neon/client.ts`) plus a
> one-shot, repeatable CLI (`scripts/neon-setup.ts`) that — given a `NEON_API_KEY` —
> creates a Neon project + database, enables **PostGIS** and **pg_trgm**, applies the
> per-tenant data-plane schema (`src/lib/reso/migrations/0001_init.sql`), verifies it,
> and prints the connection strings (passwords masked). This is the Neon mechanics
> layer for the database-per-tenant keystone (architecture §2).

## The one manual step

Everything is automated **except** getting an API key. You do this once:

1. Create a free Neon account at <https://neon.tech>.
2. Open <https://console.neon.tech/app/settings/api-keys>.
3. Create an API key and add it to `.env.local`:

   ```bash
   NEON_API_KEY=neon_api_xxxxxxxxxxxxxxxx
   ```

That's it — the rest is `npx tsx scripts/neon-setup.ts`.

## Run it

```bash
npx tsx scripts/neon-setup.ts
```

What it does, in order:

| Step | Action | Notes |
|---|---|---|
| 1 | Loads `.env.local` (dotenv) | falls back to `.env`; exits with key instructions if `NEON_API_KEY` absent |
| 2 | Reuse or create project | reuses `NEON_PROJECT_ID` if set, else creates `chatrealty-dev` in `NEON_REGION` (default `aws-us-west-2`) |
| 3 | Connect over the **direct** URI with `pg` | extensions/DDL need a non-pooled session connection |
| 4 | `CREATE EXTENSION IF NOT EXISTS postgis` / `pg_trgm` | PostGIS failure → **loud warning, does not crash** |
| 5 | Apply `0001_init.sql` | the per-tenant schema; idempotent (all `CREATE … IF NOT EXISTS`) |
| 6 | Verify | `SELECT postgis_version()` + assert the `property` table exists |
| 7 | Print summary | projectId + pooled/direct conn strings (**password masked**) + the env vars to set next |

### Reusing an existing project

Neon returns a connection string (with password) **only at creation time** — it is not
recoverable from the API afterward. So when you set `NEON_PROJECT_ID` to re-run against an
existing project, you must also supply the direct connection string yourself:

```bash
NEON_PROJECT_ID=<your-project-id>
NEON_DIRECT_CONN_URI=postgresql://...neon.tech/neondb?sslmode=require   # or DATABASE_URL_DIRECT
```

Re-running is safe: every statement in `0001_init.sql` is `IF NOT EXISTS`, and the
`schema_migrations` ledger insert is `ON CONFLICT DO NOTHING`.

## Env vars

**Inputs** (read by the CLI):

| Var | Required | Default | Purpose |
|---|---|---|---|
| `NEON_API_KEY` | yes | — | Neon Management API auth (Bearer). Never logged. |
| `NEON_REGION` | no | `aws-us-west-2` | region for a newly created project |
| `NEON_PROJECT_ID` | no | — | reuse an existing project instead of creating one |
| `NEON_DIRECT_CONN_URI` / `DATABASE_URL_DIRECT` | only when reusing | — | direct conn string for a reused project |
| `NEON_POOLED_CONN_URI` | no | derived | pooled conn string for a reused project (else derived from the direct URI) |

**Outputs** (the CLI prints these to set next — store **encrypted**, never commit):

| Var | Use |
|---|---|
| `NEON_PROJECT_ID` | identifies the tenant's Neon project |
| `NEON_POOLED_CONN_URI` | **runtime traffic** — the pooled (`-pooler`/pgBouncer) endpoint. This is what the tenant resolver encrypts (`src/lib/secrets.ts`) and stores as the runtime connection. |
| `NEON_DIRECT_CONN_URI` | **migrations / DDL only** — the non-pooled endpoint |

## The client API (`src/lib/neon/client.ts`)

SDK-free; every call goes through `neonApi<T>` (Bearer auth), which throws a `NeonApiError`
(carrying `status` + Neon's message) on any non-2xx and **never logs the key**.

| Export | Signature | Notes |
|---|---|---|
| `neonApi<T>` | `(method, path, body?) => Promise<T>` | the single HTTP entry point |
| `createProject` | `({ name, pgVersion=16, regionId="aws-us-west-2" }) => Promise<CreatedProject>` | `POST /projects`; parses `connection_uris[0]`, returns `{ projectId, directConnUri, pooledConnUri, defaultDatabase, defaultRole }` |
| `getProject` | `(projectId) => Promise<NeonProject>` | `GET /projects/{id}` |
| `listProjects` | `() => Promise<NeonProject[]>` | `GET /projects` |
| `deleteProject` | `(projectId) => Promise<void>` | `DELETE /projects/{id}` |
| `derivePooledUri` | `(directUri) => string` | **pure** — inserts `-pooler` into the host's first DNS label; idempotent |
| `NeonApiError` | `class` | `{ status, message, endpoint }` |

`derivePooledUri` example:

```
ep-foo-123.us-west-2.aws.neon.tech
  -> ep-foo-123-pooler.us-west-2.aws.neon.tech
```

User, password, database, and query params are preserved verbatim.

## PostGIS caveat (read this)

> **PostGIS is mandatory for the geo/map layer** (map bounds, radius search, clustering —
> CHAP). On some Neon plans/regions the `postgis` extension may be gated.

If `CREATE EXTENSION postgis` fails, the CLI prints a **loud, framed warning** and keeps
going (it does not crash) — but the data plane is incomplete until PostGIS is enabled. Fix:
confirm your Neon plan/region allows `postgis`, then re-run the script. `postgis_version()`
in the verify step is the green light. (See the CHAP-on-PostGIS spike,
`spike-chap-postgis.md`, for the geo dependency.)

## The 512 MB ceiling (the limit that stops a seed)

A Neon **free-tier project has a hard ~512 MB storage limit**, and it is a *project*
limit — WAL and history count toward it, so `pg_database_size()` is a lower bound, not
the whole story. A large multi-association MLS does not fit: two judged test sessions
seeded ~21k then ~28k rows into one tenant and the next write died with

```
could not extend file because project size limit (512 MB) has been exceeded
```

**Reads keep working when this happens.** The tenant in question was still serving its
39 Active listings correctly. Only writes are blocked — so the seed cannot finish, no
watermark is ever committed, and the nightly refresh never gets configured. Every
downstream symptom (no photos, incomplete inventory, "Gate 8 fail") is that one cause.

Three things surface it instead of leaving it to be discovered by a dying write
(`@chatrealty/sync` 0.6.1):

- `doctor` queries `pg_database_size(current_database())` and reports headroom on every
  run — `!` warning from 70%, `✗` failure at 90%.
- `run` detects the error text and prints a plain-English explanation.
- `doctor`'s "What to do next" now distinguishes **connection** / **seeding** /
  **storage** failures. It previously answered *every* check-1 failure with "the problem
  is `CHATREALTY_DB_URL`" — which told a tenant whose URL was perfect to re-run `init`,
  i.e. to provision an empty database and discard a two-session seed.

### The second run path (0.6.2)

0.6.1 shipped with the translation living inside `cli.ts`, and this doc claimed **both**
run paths translated. They did not. The scaffolded site's hourly cron route
(`/api/sync/cron`) is the other way a sync runs, it could not import anything out of
`cli.ts`, and it returned `{"error":"could not extend file because project size limit
(512 MB) has been exceeded"}` verbatim — the raw Postgres string, to the same agent the
CLI was carefully speaking plain English to. Session 17 caught it.

The words now live in `packages/chatrealty-sync/src/errors.ts` and are exported from the
package (`explainSyncError`, `isStorageLimitError`, `storageLimitHelp`,
`STORAGE_LIMIT_MB`). `cli.ts` renders them wrapped for a terminal; the cron route renders
them as `{ok:false, reason:"database_full", error, whatToDo[], detail}` — `detail` keeps
the raw text for logs. **Do not re-word a sync failure at a call site.** Two vocabularies
for one condition is what this file previously documented as fixed.

The template now depends on `@chatrealty/sync` `^0.6.2` (it was pinned at `^0.2.2`, so
every scaffolded site's cron ran a build four minors old — no `$expand=Media`, no
translation).

### The failure handler is not a witness (0.6.4)

0.6.3 added `sync_state.last_error` so a checkpointed-but-dead pass would stop
reporting forward motion. It is written **from the catch block** — which is exactly
as likely to fail as the write that just died, because the headline failure here is
*the database is full*. And a tenant seeded before 0.6.3 has no such column at all.
Both leave the identical state, and it is the one that reads as healthy:

```json
{"seeding":true,"stalled":false,"started":true,"watermark":null,
 "lastRunAt":null,"lastError":null,
 "progress":"26,400 listings so far — resuming next tick"}
```

Session 19 read that off a permanently stuck tenant and could not tell it from a
seed in flight. **Never derive liveness from something the dying process had to
write.** Staleness now comes from `sync_state.updated_at`, stamped on every landed
page by the checkpoint write itself: if a cursor is saved and that timestamp has not
moved in 90 minutes (the cron is hourly), nothing is resuming.

`isStalled(state)` in `slice.ts` is the single rule — exported from the package and
read by BOTH the CLI's `status` and the template's cron route, so the two cannot
drift apart the way the error translation once did. It returns `null` when there is
no cursor to judge; callers must render that as "not applicable", never as healthy.
A stall with nothing recorded reports `reason: "stopped_without_recorded_cause"` and
sends the operator to `doctor`, which is what actually measures the disk.

`SliceState` gained `updatedAt` (additive), so the template moved to `^0.6.4`.

**Recovery is a fresh database AND narrowing — both, in that order.** `RESO_NETWORKS`
scopes what a load *pulls*; it cannot shrink a database that is already full, because the
rows already written still occupy the space and the saved checkpoint still points into the
un-narrowed walk. A session set `RESO_NETWORKS`, re-ran, got the identical error, and read
that as the flag being ignored. So: `init` a new empty database first (that is what frees
room), set `RESO_NETWORKS` before loading it, then `run`. One market fits; five markets'
history does not. Raising a tenant's limit is **not self-serve today** — that gap is real
and unowned.

## Common mistakes

- **Running the migration over the pooled URI.** pgBouncer cannot run `CREATE EXTENSION`
  or other session DDL — the CLI deliberately connects over the **direct** URI for steps
  4–6. Use the pooled URI only for runtime app traffic.
- **Expecting to recover a conn string from the API.** Neon returns it only at creation.
  For a reused `NEON_PROJECT_ID`, supply `NEON_DIRECT_CONN_URI` yourself.
- **Committing a connection string.** They embed a password. Store encrypted
  (`src/lib/secrets.ts`); the CLI masks the password in everything it prints.

## Testing

The client is unit-tested against a mocked `global.fetch` (no network, no live key needed):

```bash
npx tsx --test src/lib/neon/__tests__/client.test.ts
```

Covers: method/path/body/auth-header on requests, `connection_uris` parsing,
`derivePooledUri` across host shapes, and `NeonApiError` status+message on a 4xx.
The live setup path (the CLI) cannot be exercised without a real `NEON_API_KEY`; it is
written to be defensive and clearly logged instead.
