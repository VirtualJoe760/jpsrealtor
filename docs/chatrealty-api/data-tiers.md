---
title: Data tiers — storage allowances and the seed preflight
status: current
last_verified: 2026-08-10
related: [./external-site.md, ./neon-setup.md, ../testing/coverage.md]
---

# Data tiers

Storage is part of the plan. Association size spans three orders of magnitude
— measured against our own feed (2026-08-06, ~20 KB/listing with raw payload
retention):

| Association | Active listings | Seeded size |
|---|---|---|
| i-Tech MLS | 19 | < 1 MB |
| GPS (Greater Palm Springs) | 4,515 | ~90 MB |
| CRISNet | 7,413 | ~145 MB |
| The MLS | 13,516 | ~260 MB |
| CRMLS | 53,513 | ~1 GB+ |
| Whole 8-network feed | ~85,000 | ~1.7 GB |

A free 512 MB database holds one small/mid association comfortably and dies
mid-seed on anything bigger — which is exactly how the first seeded tenant
failed, at row ~26,400, twice, with no way to finish and no way to start over.
Tiered storage turns that wall into a priced choice made **before any row is
written**.

## The tiers (`src/lib/data-tiers.ts`)

| Subscription tier | Storage | Covers |
|---|---|---|
| free | 512 MB | one small/mid association |
| beginner | 2 GB | one large association |
| experienced | 10 GB | multi-network regional |
| topagent | 50 GB | full-market plus history |

> **Numbers are defaults pending Joe's pricing pass.** One file to change;
> the CLI, the API, and billing copy all quote it.

> **KNOWN GAP (2026-08-10, CRBR 6a7a3405 — open):** billing copy does *not*
> quote it. `/agent/settings → Billing` lists all four tiers in marketing terms
> only — no tier mentions storage, a database size, or an allowance — and every
> paid tier's button reads "Coming soon" and is not clickable. So the preflight
> tells a blocked tenant to "upgrade your data plan" and links to a page that
> can neither explain which tier raises 512 MB nor sell it. The allowances above
> already exist in code; they are simply not surfaced. Until the tiers are
> purchasable the preflight should say no upgrade path is currently available
> rather than link to a page that cannot deliver one. **This is a pricing/product
> decision, not a code fix** — deliberately left open.

Served to tooling by `GET /api/skill/tenant` (any valid token, scoped to the
caller): `{ tenantId, dataSource, tier, storageLimitBytes, storageLabel,
upgradeUrl }`.

## Seed scope — the axis that decides everything else (`≥ 0.8.0`)

**Most of a feed is history a tenant site cannot display.** Greater Palm Springs
is 223,935 records; its for-sale set is ~4,500. Before 0.8.0 the seed had no
status filter at all, so every tenant paid ~50× the storage its browse could
use, and a free-plan tenant on a single-association key could not seed one
listing (CRBR 6a7a33bc / 6a7a3405). Closed history is not *useless* — it is what
comps run on — but tenant reads still `501` on comps, so today it is stored and
unreadable.

Three env vars scope the pull, all applying to the seed **and** every
incremental pull after it:

| var | default | notes |
|---|---|---|
| `RESO_STATUSES` | `Active, Active Under Contract, Pending` | the for-sale set. **Not** bare `Active` — a home under contract still shows until close. `all` restores the full archive. |
| `RESO_PROPERTY_TYPES` | unset (every type) | leases, land and commercial otherwise ride along |
| `RESO_NETWORKS` | unset (every association) | |

Effect on GPS: **223,935 rows / ~4,374 MB → ~4,500 rows / ~90 MB**, i.e. from
854% of the free allowance to 18% of it.

### Choosing the scope: `npx @chatrealty/sync access`

Reports everything the key can reach on all three axes with **exact** counts and
projected sizes, deliberately ignoring the configured scope so the choice can
always be revisited. Run it **before `init`** — afterwards, changing scope costs
a destroyed database.

Prefer it over `networks`, which samples the first pages of a feed walked
oldest-record-first: its shares describe the oldest corner of the archive, and a
judged session read "100.0%" off it and concluded the key reached exactly one
association.

## The preflight (`@chatrealty/sync` ≥ 0.7.0)

On a **fresh seed** (no committed watermark), before writing anything:

```
[preflight] this seed will pull ~53,513 listings (ALL networks this key can see).
[preflight] projected size ≈ 1,045 MB at ~20 KB/listing (typical). Your plan (free) allows 512 MB.
[preflight] EXCEEDS YOUR PLAN — …
[preflight]   1. Seed only what your site displays: … RESO_STATUSES …
[preflight]   2. Serve fewer associations: set RESO_NETWORKS …
[preflight]   3. Upgrade your data plan: https://www.chatrealty.io/agent/settings
```

**Only remedies that can reduce THIS feed are listed** (0.8.0). Narrowing is
dropped when `RESO_NETWORKS` already names one association or the key reaches
one; status-scoping is dropped when the pull is already for-sale only. When both
are spent the preflight says so outright. A remedy the tool can prove is a no-op
is worse than none: it reads as the cheap fix, and taking it costs an `init`
that discards the database for an identical projection.

Mechanics:

1. **Exact `$count`** of what this config will pull — the same network **and
   status/type** filters the seed uses, not a sample
   (`ResoClient.countScope()`). A count taken without the seed's own filter is
   the number that produced a 4,374 MB verdict for a ~90 MB seed. Vendors that
   reject `$count` degrade to an honest "cannot project" rather than a guess.
2. **Measured bytes/row** from the tenant's own database when it holds ≥500
   rows; the observed ~20 KB default otherwise.
3. **Allowance from the platform** (`GET /api/skill/tenant`, 8s timeout),
   falling back to the free limit with an "assumed" label when unreachable.
4. **Verdict:** fits (<70%) / tight (70–99%) / exceeds (≥100%). On exceeds
   the CLI **refuses to start** — `--force` overrides, and the build guide
   tells the builder not to use it and not to sneak under with `--max`
   (capped runs never checkpoint).

Incremental pulls skip the preflight — tens of rows need no ceremony. A
preflight-internal failure never blocks a seed the operator asked for; it is
advisory infrastructure.

## Where the enforcement is honest

The preflight advises and refuses **client-side**; the hard wall remains the
database's actual size limit. That is deliberate for now: the failure mode
without the preflight was never "someone maliciously oversized" — it was
"nobody knew until the write died." Platform-side enforcement (refusing to
provision beyond tier, metering usage into billing) is the follow-up once the
tier prices are settled.
