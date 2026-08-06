---
title: Data tiers — storage allowances and the seed preflight
status: current
last_verified: 2026-08-06
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

Served to tooling by `GET /api/skill/tenant` (any valid token, scoped to the
caller): `{ tenantId, dataSource, tier, storageLimitBytes, storageLabel,
upgradeUrl }`.

## The preflight (`@chatrealty/sync` ≥ 0.7.0)

On a **fresh seed** (no committed watermark), before writing anything:

```
[preflight] this seed will pull ~53,513 listings (ALL networks this key can see).
[preflight] projected size ≈ 1,045 MB at ~20 KB/listing (typical). Your plan (free) allows 512 MB.
[preflight] EXCEEDS YOUR PLAN — …
[preflight]   1. Serve fewer associations: set RESO_NETWORKS …
[preflight]   2. Upgrade your data plan: https://www.chatrealty.io/agent/settings
```

Mechanics:

1. **Exact `$count`** of what this config will pull — the same
   `RESO_NETWORKS` filter the seed uses, not a sample
   (`ResoClient.countScope()`). Vendors that reject `$count` degrade to an
   honest "cannot project" rather than a guess.
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
