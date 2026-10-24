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

### The same cells, rendered two ways by zoom

| Zoom | Layer | Question it answers |
|---|---|---|
| `< 12` | radial heat (leaflet.heat) + zone rings + pins | "where is it hot?" |
| `>= 12` | rectangles on each cell's true bbox | "what is THIS block?" |

Both are needed and neither is a downgrade. At 0.005° a cell is a couple of
screen pixels when zoomed out, so rectangles degenerate into confetti the eye
cannot aggregate — a blur is the honest summary. Zoomed in, a rectangle maps
one-to-one onto a stored document, is clickable, and carries its own caption,
median and name-coverage; a blur there would invent gradient between two
unrelated cells and give nothing to click.

> An earlier version rendered rectangles at every zoom and argued against a heat
> layer outright. That reasoning holds at high zoom and fails at low zoom.

Two things the heat layer needs to be told explicitly:

- **`max` must be passed.** Left to itself leaflet.heat normalises against the
  hottest point on screen, so panning into empty desert repaints the desert as
  hot.
- **The gradient starts at 0.05, not 0.** Stop 0 is painted across the whole
  blurred tail, which washes colour over genuinely empty areas.

Over the blur, zone circles are a **neutral thin ring with no fill** — a
boundary, not a second intensity encoding. Ramp-coloured rings on top of the
blur made the eye read two competing signals for one quantity. They take ramp
colour only when the blur is off.

### Colour

**Turbo, cold blue → hot red**, sampled at 11 stops, defined once in
`heatmap-shared.ts`. Dark mode drops the two coldest indigo stops, which are
invisible against dark tiles — a floor on the same ramp, not a different
palette and not a flip.

Turbo rather than the classic jet rainbow: jet gives green a huge perceptual
stretch and has false edges at the cyan and yellow boundaries, inventing
structure that is not in the data.

The tradeoff, recorded so it is not re-litigated: a multi-hue ramp makes
**relative** intensity easy to see and **absolute** value hard to judge, because
the eye ranks lightness but not hue. A single hue is better for reading a value
off the map; this is a density map where the job is spotting concentration. So
colour is never the only carrier of a number — every cell and zone has its count
in a hover tooltip and in the detail panel, and the legend is always on screen.
(This is a deliberate departure from the `dataviz` skill's "sequential = one
hue, never a rainbow" default, made on an explicit product call.)

### Bundle note

`heatmap-shared.ts` holds the constants, types and ramp, and imports nothing
from Leaflet. `SalesHeatMap` is `dynamic(..., { ssr: false })` because Leaflet
touches `window` at module scope — importing `CELL_ZOOM` or the ramp as a
**value** from the map module pulls leaflet, react-leaflet and leaflet.heat back
into the parent chunk and defeats the split. `import type` would be erased;
`CELL_ZOOM` is not a type.

## Not built yet

- **Leases (`propertyType: B`).** `sales_grid` and `sales_hotspots` are type A
  only. The builder supports `--type B` (~6 minutes) but it has not been run.
- **Hot-spot drill-down by member cell.** `memberCellIds` is stored and
  projected out; nothing consumes it yet.
