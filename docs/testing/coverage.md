---
title: Coverage — what Tom is working toward, and when he is done
status: current
last_verified: 2026-08-06
related: [README.md, evidence.md, agents/tom/AGENTS.md, agents/tom/USER.md]
---

# Coverage

Tom's job is not "run sessions forever and report a score." It has a
destination, and this is it:

> **Tom is done when every MLS association ChatRealty serves has been tested
> across the full backend chain, and the data from each one lands in
> ChatRealty's standard shape — with whatever it is missing identified rather
> than silently absent.**

The score ranks findings inside a session. **This file is the actual progress
measure.** A session that fills a cell here advanced the product; a session that
produced a nice site and filled no cell did not.

Everything below is honest about status. Almost all of it is untested today.

---

## Why this is the shape of the work

ChatRealty is a backend framework. The website is what the backend feeds. The
thing that decides whether the framework is real is **whether it can take any
MLS feed and turn it into ChatRealty's standard shape.**

That is not one problem, it is a family of them:

- Some associations have no subdivision data at all. The product builds
  subdivision-level CMAs on that field — so "absent" has to be *detected and
  reported*, never rendered as an empty page with no explanation.
- Some carry the same concept under a different key. Same data, different name,
  and a mapper that doesn't know it drops the field.
- Some are missing fields we could enrich from elsewhere. Enrichment should be
  an **option** the agent can turn on, not a silent gap and not a silent
  fabrication.
- Later feeds may not be Spark, may not even be RESO-shaped, and may use
  entirely different keys. Flattening them to the standard is the whole job.

Every one of those is discoverable only by pointing the pipeline at a real feed
and looking at what comes out. That is what Tom is for.

---

## The phases

```
  PHASE 1 ── prove the chain on one association          ← we are here
             GPS MLS / Spark. Provision → seed → serve → refresh.
             Nothing else can be trusted until this works once.
                │
                ▼
  PHASE 2 ── prove the standard holds across shapes
             Subdivision present / absent / renamed. Missing fields
             identified. Enrichment offered where it makes sense.
                │
                ▼
  PHASE 3 ── prove the surfaces agree
             UI vs MCP parity. Listing treatment and data accuracy
             identical whichever way a setting was changed.
                │
                ▼
  PHASE 4 ── expand to new associations, live
             New state, new keys. Tom works the credentials live,
             reviews incoming ChatRealty feedback, routes what breaks
             to Dev Claude, and the data model adapts.
```

Phase 1 should be fast. Ten sessions have not completed it, because the loop
kept routing around the blocker instead of reporting it — which is why gate 8
now exists.

---

## Matrix 1 — the backend chain, per association

The chain, every link required (gate 8):

```
agent's MLS credentials ─► fetch + flatten ─► SEED the agent's own database
                              ─► site reads from it ─► nightly refresh
```

| Association | Feed | Provision | Seed | Serve | Nightly refresh |
|---|---|---|---|---|---|
| GPS MLS (Greater Palm Springs) | Spark RESO | ✔ session 14, 2026-08-05 | ◐ partial — 5,600 rows / 39 Active FOR-SALE in the tenant DB, but no committed checkpoint yet | ✔ session 14, 2026-08-05 | ✗ untested |
| *(next association)* | — | — | — | — | — |

**First cells filled: session 14 (2026-08-05).** The site served listings from
the agent's own tenant database (`t-dianamarsh-msgn4g0r`), seeded by
`@chatrealty/sync` from the agent's own MLS credentials — gate 8's first pass.

- **Provision ✔** — `npx @chatrealty/sync init` created the tenant DB and bound
  the token; re-init reconnected idempotently.
- **Seed ◐** — inventory is real and the site shows it, but no full uncapped run
  has completed, so `sync_state.watermark` is still null. Until one does, every
  fresh pass restarts from the oldest record in the feed. Capped runs
  (`--once` / `--max`) never checkpoint by design, so they cannot close this.
- **Serve ✔** — browse, filters, detail pages and neighborhood counts all read
  the tenant DB and agree with it. One gap: `primaryPhotoUrl` is null on all 39
  (`media` has 0 rows — the sync pulls the Property resource only; open bug
  `6a73de5f…`), so every card renders the no-photo placeholder.
- **Nightly refresh ✗** — the route exists and reports its state honestly, but it
  cannot be called verified until a committed watermark exists to resume from.
  **Session 17 (2026-08-06) gave the cell evidence rather than passing it:** on
  the same full tenant DB, `GET /api/sync/cron` returned the raw Postgres string
  `could not extend file because project size limit (512 MB) has been exceeded`
  while the CLI translated the identical failure into plain English. Fixed in
  `@chatrealty/sync` 0.6.2 / `create-chatrealty-site` 0.16.4 — the translation
  is now a package export both paths import. Re-running the route on this DB
  still fails (it is still full); it should now fail in words an agent can act
  on. The cell passes when a route call resumes from a committed watermark.

Sessions 5–8 read platform inventory through a dogfood token; sessions 9–10 read
the feed directly at runtime. Both bypass every column. See `evidence.md`.

### Why it never passed — two blockers, both outside the test loop

Audited 2026-08-05. Neither was findable by building another site, which is why
ten sessions never surfaced them. **Both are now cleared.**

**1. Production could not reach Neon.** `POST /api/skill/tenant/provision` was
deployed and correctly auth-gated (401 unauthenticated, not 404) and the code
was sound — but `NEON_API_KEY` was absent from Vercel production. It is read
lazily in `src/lib/neon/client.ts`, so the route authenticated fine and then
failed at project creation. Tom calls `https://jpsrealtor.com`, so provisioning
was impossible from where the loop actually runs, regardless of token.

*(`NEON_POOLED_CONN_URI` is **not** a production requirement — every read site
is a `__tests__` file. It gates the live test suites only.)*

**Fixed 2026-08-05:** `NEON_API_KEY` added to Vercel production and the
deployment rebuilt. Env vars only take effect on a new deployment, which is
worth remembering — adding the variable alone would have changed nothing.

**2. Dogfood tokens are refused by design — correctly.**

```
dataSource = tenantBinding ? "tenant" : user.isAdmin ? "dogfood" : "none"
```

The route returns `403 owner_account` on `"dogfood"`, because an owner account
serves the internal dataset and must not be rebound to a tenant DB. Joe's
account is admin, so every session using his token hit this by design. A
**non-admin** account resolves to `"none"`, which the route permits.

**Resolved by tooling:** `scripts/test-accounts.ts promote` on a `+crtest`
address produces a non-admin agent account, and `… token --out=<file>` mints
the `crt_live_` token it needs. That token — not Joe's — is what a session uses.

### Verified end to end, 2026-08-05

Against production, with a promoted non-admin `+crtest` account:

| Check | Result |
|---|---|
| `POST /api/skill/tenant/provision` | **201** `created: true`, tenant id returned, Neon database live |
| Re-POST (idempotency) | **200** `created: false`, same tenant, token bound to it |
| `GET /api/skill/listings/search` on that token | **200** — tenant-scoped, database empty as expected |

Provisioning is no longer the blocker. The remaining columns — seed, serve,
nightly refresh — are still untested, and a session confirms them, not a
by-hand check.

---

## Matrix 2 — data shape handling

The question each row answers: *when the feed looks like this, does the standard
still hold, and do we tell the truth about what's missing?*

| Case | What must happen | Status |
|---|---|---|
| Subdivision data present | Maps to the standard field; subdivision pages and CMAs populate | untested |
| Subdivision data **absent** | Detected at sync time and surfaced as "this feed has no subdivision data" — never an unexplained empty page | untested |
| Same concept, **different key** | Mapped to the standard; no field silently dropped | untested |
| Field absent, enrichable | Offered as an **option**, clearly labelled as enriched, never silently invented | untested |
| Non-Spark RESO feed | Flattens to the same standard | untested |
| Non-RESO source, foreign keys | Flattens to the same standard | untested |
| Attribution fields | `list_agent_name` / `list_office_name` always present — compliance, never null | untested end-to-end |
| **Media resource synced** | Photos land in `media` and `primaryPhotoUrl` resolves — an empty media table served placeholders for 7+ sessions before the sync gap was treated as structural | ✗ failing — sync pulls Property only (bug filed 8/5, falsely marked fixed) |
| **Value normalization** | The same association under two spellings maps to ONE — live example: our own feed carries both `i-Tech MLS` and `iTech MLS` | untested; known instance unhandled |

**Accuracy is part of every row.** A field that maps is not a field that
*matches*. Spot-check seeded values against the source: price, beds, baths,
status, address, attribution. A mapper that puts the right shape in the wrong
column passes every structural check and ships wrong numbers.

---

## Matrix 3 — surface parity (UI vs MCP)

Every setting reachable two ways has to behave the same both ways, and the data
it governs has to agree. This is where things break quietly.

| Area | Test | Status |
|---|---|---|
| Change a setting in the UI | MCP reflects it | untested |
| Change a setting via MCP | UI reflects it | untested |
| Listing treatment | Identical whichever surface configured it | untested |
| Counts and stats | Agree across site, MCP responses, and the database | untested |
| Values | Prices, beds, baths, sqft identical across all three | untested |

Tom's instruction for this matrix is to **try to break it**: set a value one
way, read it the other, set conflicting values, set an empty value, set an
out-of-range value. The interesting failures are where two surfaces disagree
and neither one is obviously wrong.

---

## Matrix 4 — styling diversity

The build must come out **clean, neat, and different every time.** Two failures
count here, and they pull in opposite directions:

| Failure | Looks like | Status |
|---|---|---|
| Not diverse | Reads as the scaffold with new colours | partially covered by the *unmistakably theirs* dimension |
| Not clean | Diverse but sloppy — stray default hues, inconsistent radius, broken 375px | partially covered by *craft* |

Already caught and fixed here: hardcoded Tailwind radii bypassing `--radius`,
stray status colours surviving a restyle, Leaflet's own vendor radii. The open
question is whether N consecutive builds actually look like N different brands
— which needs a side-by-side of finished builds, not a single-session judgment.

---

## How a session advances this file

0. **Open ticket fingerprints come first** (`tickets.md`). A configuration
   reality has already broken outranks one that is merely unverified — Tom
   triages the population-heaviest open fingerprint into a goal before
   spending a session on coverage. No open fingerprints ⇒ coverage-driven,
   exactly as below.
1. Tom picks the **highest phase with an untested cell** and briefs toward it.
2. If a cell fails, the report leads with it — the exact step, the verbatim
   error. A documented failure fills the cell with information; a working site
   built around the blocker fills nothing.
3. Dev Claude updates the status here in the same commit as the fix.
4. A cell is only marked passing when a **later, independent** session
   confirms it — the same durability rule as everything else in this loop.

---

## Phase 4 — the live loop

Once the framework holds, the work changes shape. New associations arrive with
new keys; Tom works those credentials live, and real ChatRealty feedback starts
arriving from actual agents. The loop then runs on real input: Tom reviews
incoming feedback, routes what breaks to Dev Claude, and the data model adapts
to what real feeds actually contain.

That is the point of all of it. Tom is not here to find problems for their own
sake — he is here to get the framework to the state where new data can be
brought on without breaking, and then to keep it there as real data arrives.
