---
title: Analytics
status: current
last_verified: 2026-10-23
related: [sales-heatmap.md, ../../src/app/api/analytics/README.md]
---

# Analytics

Market analytics for agents — currently the sales heat map on the agent
dashboard, plus the older calculation endpoints that power AI answers.

## Two surfaces, opposite rules

`/api/analytics/*` holds both. Know which half you are in before adding a route.

| | Calculation surface | Read surface |
|---|---|---|
| Routes | `appreciation`, `cashflow`, `compare`, `cma` | `sales-grid`, `hotspots`, `areas` |
| Library | `src/lib/analytics/{calculations,aggregators}` | `src/lib/analytics/heatmap` |
| Computes? | yes, that is its job | **never** |
| Data | live listing collections | precomputed collections in `admin` |
| Consumer | AI answers, dynamic cards | the Analytics tab |

The read surface serves only stored fields. A number it cannot look up gets
**requested as a precompute field**, not calculated in the route. The two
libraries must not import each other.

## What's here

| Doc | Covers |
|---|---|
| [sales-heatmap.md](sales-heatmap.md) | The Analytics tab: collections, caption rules, the three endpoints, and the four footguns (year types, `$box`, global `rank`, ZIP-widening) |

## Status

- **Sales heat map** — shipped, **admin-only** while captions and query cost are
  evaluated on real data. Three layers: cells, zones, pins.
- **Leases (`propertyType: B`)** — not built; the precompute is type A only.
- **Calculation endpoints** — only `appreciation` ships. The checklist in
  `src/app/api/analytics/README.md` is stale and marked as such.
