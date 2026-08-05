---
title: Coverage — what Tom is working toward, and when he is done
status: current
last_verified: 2026-08-05
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
| GPS MLS (Greater Palm Springs) | Spark RESO | ✗ untested | ✗ untested | ✗ untested | ✗ untested |
| *(next association)* | — | — | — | — | — |

**Nothing in this table has ever passed.** Sessions 5–8 read platform inventory
through a dogfood token; sessions 9–10 read the feed directly at runtime. Both
bypass every column. See `evidence.md`.

### Why it never passed — two blockers, both outside the test loop

Audited 2026-08-05. Neither was findable by building another site, which is why
ten sessions never surfaced them.

**1. Production cannot provision a Neon database at all.**
`POST /api/skill/tenant/provision` is deployed and correctly auth-gated (401
unauthenticated, not 404), and the code is sound. But the two environment
variables it needs to reach Neon are **absent from Vercel production**:

| Var | Local | Production |
|---|---|---|
| `MONGODB_URI` | set | set |
| `SECRETS_ENCRYPTION_KEY` | set | set |
| `NEON_API_KEY` | set | **missing** |
| `NEON_POOLED_CONN_URI` | set | **missing** |

Tom calls `https://jpsrealtor.com`. Provisioning has therefore never been
possible from where the loop actually runs, regardless of which token was used.

**2. Dogfood tokens are refused by design — correctly.**

```
dataSource = tenantBinding ? "tenant" : user.isAdmin ? "dogfood" : "none"
```

and the provision route returns `403 owner_account` when `dataSource` is
`"dogfood"`, because an owner account serves the internal dataset and must not
be rebound to a tenant DB. Joe's account is admin, so every session that used
his token hit this by design.

A **non-admin** account resolves to `"none"`, which the route permits. So
`scripts/test-accounts.ts promote` on a `+crtest` address produces exactly the
account shape provisioning requires.

Both must be cleared before a session can pass matrix 1. Until then, gate 8
fails every dispatch — correctly, and with no new information.

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
