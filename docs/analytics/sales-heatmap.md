---
title: Sales Heat Map (Analytics tab)
status: current
last_verified: 2026-10-23
related: [README.md, ../../src/app/api/analytics/README.md, ../listings/README.md]
---

# Sales heat map

The Analytics tab (`/agent/analytics`) renders closed-sale volume across
Southern California as three map layers, from four precomputed MongoDB
collections. **Admin-only** while the captions and query cost are evaluated.

## The one rule

**The read surface never calculates.** Every number served is a stored field.
Each source function is a `find` with a filter, a projection and a sort — no
`$group`, no `$geoNear` aggregation, no arithmetic over rows after the fetch.

If the tab needs a number that is not stored, it is **requested as a precompute
field** rather than computed in the route. That is why hot-spot clustering lives
in the Python builder and not here. `src/lib/analytics/heatmap/` must not import
from `src/lib/analytics/calculations/` or `aggregators/`, which exist to do the
opposite — see the table at the top of `src/app/api/analytics/README.md`.

## Collections

All five live in the **`admin`** database, which is what `MONGODB_URI` selects;
`mongoose.connection.db` is already the right handle.

| Collection | Docs | Role |
|---|---|---|
| `sales_grid` | 34,082 | closed sales per ~0.3 mi cell — the cell layer |
| `sales_hotspots` | 11,369 | clustered zones per year — circles, pins, side list |
| `area_geo` | 6,420 | centroid + radius per named area |
| `market_history` | 26,287 | annual medians per area — the detail panel |

## Why the map is built on coordinates, not names

`subdivisionName` is free text and frequently absent. Grouping sales by name
collapses every unnamed sale in a city into one bucket plotted at a single
point. So cells group by **location**, and the name is a label you look up with
a confidence attached.

Two stored numbers decide every caption, and they catch different failures:

| Check | Question it answers | Rule |
|---|---|---|
| `namedShare` | does this area carry names **at all**? | `< 0.20` → caption `City ZIP` |
| `labelShare` | does **one** community dominate? | `< 0.50` → `City — multiple communities` |
| both healthy | | caption with `subdivisionLabel` |

`nearestSubdivision` is **never** a caption. It means "near", not "in".

### The mix inverts by region — design for both

Measured 2026-10-23:

| | subdivision | city_multiple | city_zip |
|---|---|---|---|
| Statewide (34,082 cells) | 2,743 (8.0%) | 4,651 | **26,688 (78%)** |
| Coachella Valley (1,157 cells, 2026) | **870 (75%)** | 224 | 63 |

Spark stopped sending `SubdivisionName` for CRMLS listings in Sept 2025, so
coverage outside the valley is ~11%. Inside the valley the data predates that
gap. A list that is all "Indio 92201" and a list that is all "Monterey Country
Club" are **both normal** — the UI has to look right either way.

## Endpoints

All three are admin-gated by `requireAdmin()` and return `Cache-Control:
private, max-age=300`.

| Route | Required | Optional |
|---|---|---|
| `GET /api/analytics/sales-grid` | `bbox` | `year`, `minSales` |
| `GET /api/analytics/hotspots` | `bbox` **or** `cities` | `year`, `limit` |
| `GET /api/analytics/areas` | — | `scope`, `year`, `city`, `key`, `limit` |

`bbox` is `minLng,minLat,maxLng,maxLat`. `/areas?key=` returns a single area
(what the detail panel opens) instead of a ranked list.

## Four things that will bite you

**1. `year` is a NUMBER in `sales_hotspots` and `market_history`, but
`sales_grid.salesByYear` keys are STRINGS.** Not uniform — do not "simplify" it.
Measured: `{ year: '2026' }` matches 0 docs; `{ year: 2026 }` matches 1,951.
Querying by string returns an empty map **with no error**. `parseYear()` is the
only place a query param becomes a year value.

> The backend spec's pitfall list and its verbatim sample both say string. They
> are wrong; the live collection is numeric.

**2. `$geoWithin: { $box }` does not use the 2dsphere index.** Measured on
`sales_grid`: `$box` scans all 34,082 keys (294 ms); an equivalent `$geometry`
Polygon returns the identical 1,362 rows off the index (1,440 keys, 47 ms).
`bboxPolygon()` is the only way a viewport enters a query.

**3. `rank` is global within `{ propertyType, year }`, not local.** The
unfiltered top ten for 2026 is Long Beach, Seal Beach, West Hollywood, Pasadena,
Los Angeles, Hemet, Huntington Beach, Palm Springs, Laguna Woods, Laguna Woods.
The valley's busiest zone is rank 8. `getHotspots()` **throws** without a bbox
or city list rather than return a confidently wrong region.

**4. A zone resolved to a ZIP answers for a wider area.** Zones are ≤1 mi
radius; ZIPs are not. `zip:92262` reports 485 closed sales where the zone itself
had 181, so its days-on-market describes the surrounding ZIP. `zoneLookupKey()`
returns `wider: true` for exactly this case and the detail panel says so.
Subdivision and city keys are **lowercased** (`"palm desert|sun city"`,
`"oakland"`); ZIP keys are not. Verified against live rows — passing a
display-cased city silently misses every time.

## Partial years

2026 covers **11 of 12 months**; 2021 covers 3. Both are stored (`partialYear`,
`yearMonthsCovered`) so the UI reads them rather than deriving them. Never
compare a raw 2026 count to a full year without saying so — the tab shows a
banner. 2021 is left out of the year selector entirely.

Medians never sum or average. They are per area, per year, full stop.

## Rendering notes

Cells are drawn as **rectangles on their true bbox**, not a blurred heat layer.
The data is already gridded and each cell carries its own caption and median; a
gaussian blur discards that, has no clickable unit, and rescales with zoom so
the same market looks hotter when you zoom in. It would also invent gradient
between unrelated cells.

Colour is the `dataviz` skill's published sequential blue ramp (steps 100→700),
used unchanged — one hue, light→dark, never a rainbow. Dark mode gets its own
stepping rather than an inverted flip: over dark tiles the bright end has to
mean "more" or hot cells vanish into the basemap. A legend states the direction
in both modes, so magnitude is never inferred from colour alone.

Layers follow zoom by default (zones + pins below z12, cells at or above), with
a manual override.

## Not built yet

- **Leases (`propertyType: B`).** `sales_grid` and `sales_hotspots` are type A
  only. The builder supports `--type B` (~6 minutes) but it has not been run.
- **Hot-spot drill-down by member cell.** `memberCellIds` is stored and
  projected out; nothing consumes it yet.
