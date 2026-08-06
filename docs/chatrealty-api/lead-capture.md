---
title: Lead Capture — Signup → auto-Contact (per-tenant CRM)
status: current
last_verified: 2026-08-06
related: [./build_plan.md, ./db-adapter.md, ./connection-resolver.md]
---

# Lead Capture (`src/lib/crm/`)

> **TL;DR.** Any end-user who registers through a tenant's surface is
> automatically **upserted as a Contact in that tenant's CRM** — deduped by phone
> then email, linked to their end-user account, stamped `source` + a
> `"Website Signup"` tag. This is a **port** of the legacy `linkUserToAgent()`
> (`src/lib/signup-origin.ts`) onto the per-tenant Postgres CRM (the `contact` /
> `end_user` / `saved_search` tables from migration `0002_crm_leadloop`). It is
> the entry point of the lead loop: the Contact then accrues favorites + saved
> searches. **Non-blocking** — a CRM error never fails the signup.

`status: current` — Agent 32's modules (`upsert-contact-from-signup.ts`,
`end-user.ts`), the BYO-auth route, and the live test are landed and pass **LIVE
against Neon**.

## The invariant (build_plan §8.3)

THE DATABASE IS THE AGENT (§3.3). The product is database-per-tenant, so a
contact carries **no `userId` agent-scoping** — the tenant DB is the isolation
boundary. Dedup therefore drops the legacy `(userId, phone)` compound and becomes
a per-tenant lookup mirroring `linkUserToAgent`'s `$or`:

1. **phone** (the `contact` table's only hard sparse-unique) — checked first,
2. then a soft **email** match (legacy scalar mirror `email` **or** structured
   `emails[].address` via jsonb containment),
3. then the **`linked_user_id`** link (a re-signup of the same account).

A hit **links** the end-user account if not already linked and leaves the rest
untouched; a miss **inserts** one row.

## Files

| File | Owner | Role | State |
|---|---|---|---|
| `src/lib/crm/upsert-contact-from-signup.ts` | Agent 32 | `upsertContactFromSignup(adapter, input)` — the ported dedup+upsert. NON-BLOCKING (returns `{contactId, created}`, never throws) | **landed** |
| `src/lib/crm/end-user.ts` | Agent 32 | `registerEndUser(adapter, …)` (citext-unique upsert) + `onSignup(adapter, payload)` — the single signup hook (create/link end_user → upsert contact) | **landed** |
| `src/app/api/skill/contacts/from-signup/route.ts` | Agent 32 | BYO-auth `POST` endpoint: `withSkill` + zod validation → `onSignup` → `{ contactId, endUserId }` | **landed** |
| `src/lib/crm/__tests__/lead-capture.live.test.ts` | Agent 32 | LIVE Neon test: one-contact create, re-signup no-dup, source/tag/link stamped, phone-only dedup; `after()` cleanup + pool close; SKIPs without conn | **landed** |

## Two integration paths

Both auto-assign to the token's / surface's tenant; both run the SAME `onSignup`.

1. **Product-provided end-user identity** — the API's own end-user
   registration calls `onSignup` (so favorites / saved-searches / auto-contact
   work out of the box).
2. **BYO-auth** — an agent running their own auth `POST`s the new user's details
   to `/api/skill/contacts/from-signup` with their tenant token. The route is
   wrapped in `withSkill` (auth → keystone tenant-adapter injection), validates
   the payload with zod (at least one of `email`/`phone` required), and calls
   `onSignup`. Returns only `{ contactId, endUserId }` — **no PII echoed back**.
   `201` on a fresh contact, `200` when an existing one was linked.

## Contract / DTO shape stamped on a created contact

`source` (default `"website"`), `status` `"uncontacted"`, structured
`phones[]`/`emails[]` jsonb **plus** the legacy scalar mirrors (`phone`, `email`,
lowercased) — so the same `toContactDTO` collapses the row identically to a Mongo
`Contact`. Tags always include the canonical `"Website Signup"`; the caller may
add more (e.g. the origin domain). `linked_user_id` is set when an `endUserId`
is supplied.

## The schema has to actually be there (2026-08-06)

Every lead a self-serve tenant site captured returned **500** from
`POST /api/skill/contacts/from-signup`. Nothing in this document was wrong and no
module here had a bug — the tenant's database had no `end_user` table to write to,
so `registerEndUser()` threw `relation "end_user" does not exist`.

Two provisioning paths had drifted apart, and the one that mattered applied
neither `0001_init.sql` nor `0002_crm_leadloop.sql`:

| Path | Applies | Used by |
|---|---|---|
| `src/lib/tenant/provision-service.ts` | `0001_init.sql` | internal/orchestrated provisioning |
| `src/lib/tenant/provision.ts` | Drizzle `0000_supreme_maginty.sql` | **the self-serve path every real tenant takes** (`npx @chatrealty/sync init` → `POST /api/skill/tenant/provision`) |

`applyMigration0002()` existed, was correct, and had **zero callers** — its own
docstring claimed the provisioning runner drove it. Nothing did.

Consequences on a provisioned tenant: no `end_user` (the 500), no `saved_search`,
and a `contact` table in the **Drizzle placeholder shape** from
`schema/contacts.ts` (`id text` with no default, no `linked_user_id`, no
`labels`, no `updated_at`) rather than the lead-loop shape from `schema/crm.ts`
that `upsertContactFromSignup` inserts into — so even the contact write would
have failed, silently, because the mirror is non-blocking by design.

**Fixed** by `0004_leadloop_repair.sql`: idempotent DDL that creates
`end_user` / `saved_search` and ALTERs an existing `contact` into shape without
dropping or retyping anything. `prepareDataPlane()` applies it on create, the
idempotent reconnect branch applies it again on every `init`, and provisioning
now verifies **`end_user` as well as `property`** before declaring a data plane
ready — verifying only the listings half is how a tenant went live with a lead
form that could never succeed. Tenants provisioned before it exists are healed by
`node scripts/repair-tenant-leadloop.mjs --all`.

## Gotchas

- **Driver split.** Reads use the neon HTTP driver; **writes (INSERT/UPDATE with
  positional params) route through the adapter's WS `Pool`.** In Node that needs
  `neonConfig.webSocketConstructor = ws` — production sets this globally; the
  live test sets it at the top. The CRM modules themselves stay driver-agnostic
  (they only call `adapter.query`).
- **Non-blocking is structural.** `upsertContactFromSignup` wraps its whole body
  in try/catch and returns `{contactId:null, created:false}` on any error, logging
  only the error **message** (never the email/phone body). `onSignup` lets a hard
  `end_user` write error propagate (registration is the primary action) but the
  contact mirror is always best-effort.
- **No identity → no row.** A payload with neither email nor phone has nothing to
  dedup on; the upsert skips cleanly with a null result (mirrors the legacy guard).
- **end_user dedup** is the `email citext UNIQUE` (ON CONFLICT DO UPDATE no-op so
  RETURNING always yields the row). A phone-only / null-email end-user has no
  unique key — a fresh account is created each call, but the **contact** still
  dedupes on the phone key downstream.

## Test

```
npx tsx --test src/lib/crm/__tests__/lead-capture.live.test.ts
```

LIVE against `NEON_POOLED_CONN_URI` (from `.env.local`); SKIPs cleanly when
absent. Cleans up every marker-scoped row in `after()` and ends the WS pool.
