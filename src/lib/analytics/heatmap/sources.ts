/**
 * Read layer for the sales heat map (Analytics tab).
 *
 * ── The invariant ───────────────────────────────────────────────────────────
 *
 * THIS FILE NEVER CALCULATES. Every number returned is a stored field. Each
 * function is a `find` with a filter, a projection and a sort. No `$group`, no
 * `$geoNear` aggregation, no arithmetic over rows after the fetch.
 *
 * `getAreas` runs two finds and merges them by key. That is a lookup, not a
 * calculation, and is the one composition the precompute spec allows.
 *
 * If the tab needs a number that is not stored, it does not get computed here —
 * it gets requested as a precompute field. That is an architectural rule, not a
 * preference, and it is why this module lives in its own folder: it must never
 * import from `../calculations` or `../aggregators`, which exist to do the
 * opposite. `src/app/api/analytics/README.md` documents that split.
 *
 * ── Three corrections to the precompute spec, all measured ──────────────────
 *
 *   1. `sales_hotspots.year` is a NUMBER, not a string. The spec's pitfall list
 *      and its verbatim sample both say string ("2026"). Measured 2026-10-23:
 *      { year: '2026' } matches 0 docs, { year: 2026 } matches 1,951. Filtering
 *      by string returns an empty map with no error, which is why `parseYear`
 *      below is the only place a year is turned into a query value.
 *
 *      Note this is NOT uniform across the three collections, so do not
 *      "simplify" it: `sales_grid.salesByYear` keys ARE strings (salesByYear
 *      ["2026"]), while `sales_hotspots.year` and `market_history.year` are
 *      numbers. Both forms appear below, deliberately.
 *
 *   2. `$geoWithin: { $box }` does NOT use the 2dsphere index. Measured on
 *      sales_grid: $box scans all 34,082 keys (294ms); an equivalent
 *      `$geometry` Polygon returns the identical 1,362 rows off the index
 *      (1,440 keys, 47ms). The backend confirmed the same on sales_hotspots.
 *      `bboxPolygon` below is the only way a viewport enters a query.
 *
 *   3. `rank` is global within { propertyType, year }, so an unfiltered top-50
 *      for 2026 is entirely Los Angeles and Orange County — the valley's
 *      busiest zone is rank 8. Every hotspot read is therefore bounded by a
 *      viewport or a city list; `getHotspots` refuses to run unbounded.
 */

import dbConnect from '@/lib/mongoose'
import mongoose from 'mongoose'

/**
 * All five analytics collections live in the `admin` database, which is also
 * what MONGODB_URI selects — verified 2026-10-23, `connection.db.databaseName`
 * is "admin" and holds unified_listings alongside the precomputes. So this is
 * the same accessor `lib/sitemap-sources.ts` uses, not a second connection.
 */
async function db() {
  await dbConnect()
  const conn = mongoose.connection.db
  if (!conn) throw new Error('[analytics/heatmap] no mongo connection')
  return conn
}

/** Only type A is built. Leases (B) have no rows in sales_grid or hotspots. */
export const PROPERTY_TYPE = 'A' as const

/** sales_grid is a single cell size; passing it keeps the cell_sales index usable. */
export const CELL = 0.005

export const YEARS = [2021, 2022, 2023, 2024, 2025, 2026] as const

export interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/**
 * The ONLY place a year string from a query param becomes a query value.
 *
 * Returns a number because that is what `sales_hotspots.year` and
 * `market_history.year` store. Returns null for "all years", which the
 * hotspots collection represents as `allYears: true`, not `year: null`.
 */
export function parseYear(raw: string | null | undefined): number | null {
  if (!raw || raw === 'all') return null
  const n = Number(raw)
  return Number.isInteger(n) && YEARS.includes(n as (typeof YEARS)[number]) ? n : null
}

/**
 * A viewport as a GeoJSON Polygon, wound counter-clockwise.
 *
 * Used instead of $box so the 2dsphere index is actually consulted — see
 * correction 2 in the header.
 */
export function bboxPolygon(b: Bbox) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [b.minLng, b.minLat],
        [b.maxLng, b.minLat],
        [b.maxLng, b.maxLat],
        [b.minLng, b.maxLat],
        [b.minLng, b.minLat],
      ],
    ],
  }
}

/** Parses the four bbox numbers out of a `minLng,minLat,maxLng,maxLat` param. */
export function parseBbox(raw: string | null | undefined): Bbox | null {
  if (!raw) return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [minLng, minLat, maxLng, maxLat] = parts
  if (minLng >= maxLng || minLat >= maxLat) return null
  if (Math.abs(minLat) > 90 || Math.abs(maxLat) > 90) return null
  if (Math.abs(minLng) > 180 || Math.abs(maxLng) > 180) return null
  return { minLng, minLat, maxLng, maxLat }
}

// ─────────────────────────────────────────────────────
// Captions
// ─────────────────────────────────────────────────────

export type LabelKind = 'subdivision' | 'city_multiple' | 'city_zip'

export interface Caption {
  label: string
  kind: LabelKind
  /** Why this caption was chosen, for the "why am I seeing a ZIP" note in the UI. */
  reason: string
}

export const NAMED_FLOOR = 0.2
export const LABEL_FLOOR = 0.5

/**
 * The caption rules, applied to a sales_grid cell.
 *
 * Two different failures, so both are checked:
 *
 *   namedShare — does this area carry subdivision names AT ALL? A cell can read
 *     subdivisionLabel "Prado" on one named sale out of fifteen.
 *   labelShare — does ONE community dominate? A cell can be 97% named and still
 *     have no single community worth naming.
 *
 * The mix INVERTS by region, so do not tune the UI for either one alone.
 * Measured 2026-10-23:
 *
 *   statewide (34,082 cells):  city_zip 26,688 · city_multiple 4,651 ·
 *                              subdivision 2,743 (8.0%)
 *   Coachella Valley viewport  subdivision 870 (75%) · city_multiple 224 ·
 *   (1,157 cells, 2026):       city_zip 63
 *
 * Statewide, city+ZIP is the normal caption and not a degraded one — Spark
 * stopped sending SubdivisionName for CRMLS listings in Sept 2025, so coverage
 * on type-A closings is ~11% outside the valley. Inside the valley the data
 * predates that gap and three quarters of cells carry a real community name.
 * The UI therefore has to look right both ways: a list that is all "Indio
 * 92201" and a list that is all "Monterey Country Club" are both normal.
 *
 * `nearestSubdivision` is never a caption. It means "near", not "in".
 */
export function captionForCell(cell: {
  subdivisionLabel?: string | null
  namedShare?: number | null
  labelShare?: number | null
  city?: string | null
  postalCode?: string | null
}): Caption {
  const city = cell.city?.trim() || 'Unknown area'
  const zip = cell.postalCode?.trim() || ''
  const cityZip = zip ? `${city} ${zip}` : city
  const named = cell.namedShare ?? 0
  const label = cell.subdivisionLabel?.trim()

  if (named < NAMED_FLOOR) {
    return {
      label: cityZip,
      kind: 'city_zip',
      reason: `Only ${Math.round(named * 100)}% of sales here carry a subdivision name, so this area is identified by city and ZIP.`,
    }
  }
  if ((cell.labelShare ?? 0) < LABEL_FLOOR || !label) {
    return {
      label: `${city} — multiple communities`,
      kind: 'city_multiple',
      reason: `Sales here are named, but no single community covers half of them (${Math.round((cell.labelShare ?? 0) * 100)}%).`,
    }
  }
  return {
    label,
    kind: 'subdivision',
    reason: `${Math.round((cell.labelShare ?? 0) * 100)}% of named sales here are in ${label}.`,
  }
}

// ─────────────────────────────────────────────────────
// sales_grid — the heat cells
// ─────────────────────────────────────────────────────

export interface GridCell {
  lat: number
  lng: number
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  sales: number
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  caption: Caption
  city: string | null
  postalCode: string | null
  subdivisionLabel: string | null
  namedShare: number
  labelShare: number
}

/**
 * Cells inside a viewport, optionally weighted by one year.
 *
 * `weight` is the number the heat layer renders: the year's count when a year
 * is selected, otherwise the all-time `sales`. Reading one key out of a stored
 * object is a lookup, not a calculation — nothing is summed across years, and
 * nothing may be: `salesByYear` keys are strings, and adding them would produce
 * a number the precompute never blessed.
 */
export async function getGridCells(opts: {
  bbox: Bbox
  year: number | null
  minSales: number
  limit: number
}): Promise<GridCell[]> {
  const conn = await db()
  const { bbox, year, minSales, limit } = opts

  const filter: Record<string, unknown> = {
    propertyType: PROPERTY_TYPE,
    cell: CELL,
    center: { $geoWithin: { $geometry: bboxPolygon(bbox) } },
  }
  // salesByYear keys are STRINGS here, unlike sales_hotspots.year. See header.
  if (year !== null) filter[`salesByYear.${year}`] = { $gte: minSales }
  else filter.sales = { $gte: minSales }

  const rows = await conn
    .collection('sales_grid')
    .find(filter, {
      projection: {
        _id: 0,
        lat: 1,
        lng: 1,
        bbox: 1,
        sales: 1,
        salesByYear: 1,
        subdivisionLabel: 1,
        labelShare: 1,
        namedShare: 1,
        city: 1,
        postalCode: 1,
        medianClosePrice: 1,
        medianPricePerSqft: 1,
      },
      limit,
    })
    .toArray()

  return rows.map((r) => {
    const byYear = (r.salesByYear ?? {}) as Record<string, number>
    return {
      lat: r.lat,
      lng: r.lng,
      bbox: r.bbox,
      sales: year !== null ? (byYear[String(year)] ?? 0) : (r.sales ?? 0),
      medianClosePrice: r.medianClosePrice ?? null,
      medianPricePerSqft: r.medianPricePerSqft ?? null,
      // The driver types a projected find as WithId<Document>, which shares no
      // declared properties with the caption input, so the shape is asserted
      // here rather than widening captionForCell's parameter to `any`.
      caption: captionForCell(r as unknown as Parameters<typeof captionForCell>[0]),
      city: r.city ?? null,
      postalCode: r.postalCode ?? null,
      subdivisionLabel: r.subdivisionLabel ?? null,
      namedShare: r.namedShare ?? 0,
      labelShare: r.labelShare ?? 0,
    }
  })
}

// ─────────────────────────────────────────────────────
// sales_hotspots — the zone circles
// ─────────────────────────────────────────────────────

export interface Hotspot {
  zoneId: string
  rank: number
  lat: number
  lng: number
  radiusMiles: number
  sales: number
  cellCount: number
  label: string
  labelKind: LabelKind
  namedShare: number
  labelShare: number
  city: string | null
  postalCode: string | null
  county: string | null
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  partialYear: boolean
  yearMonthsCovered: number | null
  /**
   * How the detail panel should look this zone up in market_history.
   *
   * Resolved server-side and shipped with the zone so the client never
   * reimplements `zoneLookupKey`. The key format is case-sensitive and the
   * `wider` flag changes what the panel is allowed to claim, so a second copy
   * of this logic in the browser is a correctness risk, not just duplication.
   */
  lookup: { scope: AreaScope; key: string; wider: boolean } | null
}

const HOTSPOT_PROJECTION = {
  _id: 0,
  memberCellIds: 0,
  bbox: 0,
  center: 0,
  seedCell: 0,
  source: 0,
  builtAt: 0,
} as const

/**
 * Zones, bounded by viewport or city — never unbounded.
 *
 * `rank` is global within { propertyType, year }: 2026's top ten is Long Beach,
 * Seal Beach, West Hollywood, Pasadena, LA, Hemet, Huntington Beach, Palm
 * Springs, Laguna Woods, Laguna Woods. An agent in the Coachella Valley asking
 * for "the top 50" would get a map of somewhere else, so this throws rather
 * than quietly returning the wrong region.
 */
export async function getHotspots(opts: {
  bbox?: Bbox | null
  cities?: string[] | null
  year: number | null
  limit: number
}): Promise<Hotspot[]> {
  const { bbox, cities, year, limit } = opts
  if (!bbox && !(cities && cities.length)) {
    throw new Error('getHotspots requires a bbox or a city list — rank is global, not local')
  }
  const conn = await db()

  const filter: Record<string, unknown> = { propertyType: PROPERTY_TYPE }
  // year is a NUMBER here. All-years zones are flagged, not null-keyed.
  if (year !== null) filter.year = year
  else filter.allYears = true

  if (bbox) filter.center = { $geoWithin: { $geometry: bboxPolygon(bbox) } }
  if (cities && cities.length) filter.city = { $in: cities }

  const rows = await conn
    .collection('sales_hotspots')
    .find(filter, { projection: HOTSPOT_PROJECTION })
    .sort({ rank: 1 })
    .limit(limit)
    .toArray()

  return rows.map((r) => ({
    zoneId: r.zoneId,
    rank: r.rank,
    lat: r.lat,
    lng: r.lng,
    radiusMiles: r.radiusMiles,
    sales: r.sales ?? 0,
    cellCount: r.cellCount ?? 0,
    label: r.label,
    labelKind: r.labelKind,
    namedShare: r.namedShare ?? 0,
    labelShare: r.labelShare ?? 0,
    city: r.city ?? null,
    postalCode: r.postalCode ?? null,
    county: r.county ?? null,
    medianClosePrice: r.medianClosePrice ?? null,
    medianPricePerSqft: r.medianPricePerSqft ?? null,
    partialYear: Boolean(r.partialYear),
    yearMonthsCovered: r.yearMonthsCovered ?? null,
    lookup: zoneLookupKey({
      labelKind: r.labelKind,
      city: r.city,
      postalCode: r.postalCode,
      label: r.label,
    }),
  }))
}

// ─────────────────────────────────────────────────────
// market_history + area_geo — the named-area list
// ─────────────────────────────────────────────────────

export type AreaScope = 'subdivision' | 'city' | 'zip'

export interface AreaRow {
  key: string
  label: string
  city: string | null
  scope: AreaScope
  closedCount: number
  medianClosePrice: number | null
  medianPricePerSqft: number | null
  medianDaysOnMarket: number | null
  medianCloseToListRatio: number | null
  confidence: string | null
  partialYear: boolean
  yearMonthsCovered: number | null
  /** Null when area_geo has no placeholder-free record for this key. */
  lat: number | null
  lng: number | null
  radiusMiles: number | null
}

/**
 * Top areas for a year, joined to their geometry.
 *
 * Two finds merged by key. market_history and area_geo use the SAME key
 * (`<city>|<subdivision>`, a bare ZIP, or a city name), so the merge needs no
 * translation — which is what keeps this a lookup rather than a computation.
 *
 * `placeholder: false` is mandatory on area_geo: 567 of 4,302 subdivision
 * records are placeholders ("Other", "N/A") and would plot a whole city's
 * unnamed sales at one point.
 */
export async function getAreas(opts: {
  scope: AreaScope
  year: number
  city?: string | null
  limit: number
}): Promise<AreaRow[]> {
  const conn = await db()
  const { scope, year, city, limit } = opts

  // 1. The ranked rows. year is a NUMBER in market_history too.
  const histFilter: Record<string, unknown> = {
    scope,
    propertyType: PROPERTY_TYPE,
    year,
  }
  const history = await conn
    .collection('market_history')
    .find(histFilter, {
      projection: {
        _id: 0,
        key: 1,
        label: 1,
        closedCount: 1,
        medianClosePrice: 1,
        medianPricePerSqft: 1,
        medianDaysOnMarket: 1,
        medianCloseToListRatio: 1,
        quality: 1,
        partialYear: 1,
        yearMonthsCovered: 1,
      },
    })
    .sort({ closedCount: -1 })
    .limit(city ? limit * 8 : limit)
    .toArray()

  if (!history.length) return []

  // 2. Their geometry, by the same key.
  const geo = await conn
    .collection('area_geo')
    .find(
      { scope, key: { $in: history.map((h) => h.key) }, placeholder: false },
      { projection: { _id: 0, key: 1, label: 1, city: 1, lat: 1, lng: 1, radiusMiles: 1 } },
    )
    .toArray()

  const geoByKey = new Map(geo.map((g) => [g.key, g]))

  const merged: AreaRow[] = history.map((h) => {
    const g = geoByKey.get(h.key)
    return {
      key: h.key,
      label: g?.label ?? h.label,
      city: g?.city ?? null,
      scope,
      closedCount: h.closedCount ?? 0,
      medianClosePrice: h.medianClosePrice ?? null,
      medianPricePerSqft: h.medianPricePerSqft ?? null,
      medianDaysOnMarket: h.medianDaysOnMarket ?? null,
      medianCloseToListRatio: h.medianCloseToListRatio ?? null,
      confidence: h.quality?.confidence ?? null,
      partialYear: Boolean(h.partialYear),
      yearMonthsCovered: h.yearMonthsCovered ?? null,
      lat: g?.lat ?? null,
      lng: g?.lng ?? null,
      radiusMiles: g?.radiusMiles ?? null,
    }
  })

  // Filtering an already-fetched list by an exact city string is a filter, not
  // an aggregation; market_history carries no city field to push this down to.
  const filtered = city ? merged.filter((m) => m.city === city) : merged
  return filtered.slice(0, limit)
}

/**
 * One area by its exact key — what the detail panel opens when a zone is clicked.
 *
 * Zones carry a label and their own medians, but median days-on-market and
 * median close-to-list ratio live only in market_history, so the panel looks
 * them up rather than doing without. Both collections key the same way, which
 * is what makes this one indexed find on { scope, key, propertyType, year }.
 *
 * Returns null rather than a partial row: a detail panel showing a name with
 * every metric blank is worse than one that says it has no data for this area.
 */
export async function getAreaByKey(opts: {
  scope: AreaScope
  key: string
  year: number
}): Promise<AreaRow | null> {
  const conn = await db()
  const { scope, key, year } = opts

  const h = await conn.collection('market_history').findOne(
    { scope, key, propertyType: PROPERTY_TYPE, year },
    {
      projection: {
        _id: 0,
        key: 1,
        label: 1,
        closedCount: 1,
        medianClosePrice: 1,
        medianPricePerSqft: 1,
        medianDaysOnMarket: 1,
        medianCloseToListRatio: 1,
        quality: 1,
        partialYear: 1,
        yearMonthsCovered: 1,
      },
    },
  )
  if (!h) return null

  const g = await conn
    .collection('area_geo')
    .findOne(
      { scope, key, placeholder: false },
      { projection: { _id: 0, label: 1, city: 1, lat: 1, lng: 1, radiusMiles: 1 } },
    )

  return {
    key: h.key,
    label: g?.label ?? h.label,
    city: g?.city ?? null,
    scope,
    closedCount: h.closedCount ?? 0,
    medianClosePrice: h.medianClosePrice ?? null,
    medianPricePerSqft: h.medianPricePerSqft ?? null,
    medianDaysOnMarket: h.medianDaysOnMarket ?? null,
    medianCloseToListRatio: h.medianCloseToListRatio ?? null,
    confidence: h.quality?.confidence ?? null,
    partialYear: Boolean(h.partialYear),
    yearMonthsCovered: h.yearMonthsCovered ?? null,
    lat: g?.lat ?? null,
    lng: g?.lng ?? null,
    radiusMiles: g?.radiusMiles ?? null,
  }
}

/**
 * The market_history key for a hotspot zone.
 *
 * Zones are captioned by the same rules the grid uses, and the caption tells
 * you which scope can answer for them: a `subdivision` zone keys as
 * "<city>|<subdivision>", anything captioned by city+ZIP keys as the bare ZIP,
 * and a city_multiple zone has no single community so it falls back to its ZIP
 * and then its city. Returns null when the zone carries neither.
 *
 * Keys are LOWERCASED for subdivision and city scope, and left alone for ZIP —
 * verified 2026-10-23 against live rows ("palm desert|sun city", "oakland",
 * "90802"). Passing a display-cased city here silently misses every time.
 *
 * `wider` is the important half of the return. A zone is at most 1 mile in
 * radius; a ZIP or city is not. Resolving a zone to zip:92262 answers with 485
 * closed sales when the zone itself had 181, so days-on-market and
 * close-to-list from that row describe the surrounding area, NOT the zone. The
 * detail panel has to say so rather than let a zone appear to have numbers it
 * does not have.
 */
export function zoneLookupKey(zone: {
  labelKind: LabelKind
  city?: string | null
  postalCode?: string | null
  label?: string | null
}): { scope: AreaScope; key: string; wider: boolean } | null {
  const city = zone.city?.trim()
  if (zone.labelKind === 'subdivision' && city && zone.label) {
    return {
      scope: 'subdivision',
      key: `${city.toLowerCase()}|${zone.label.trim().toLowerCase()}`,
      wider: false,
    }
  }
  if (zone.postalCode?.trim()) return { scope: 'zip', key: zone.postalCode.trim(), wider: true }
  if (city) return { scope: 'city', key: city.toLowerCase(), wider: true }
  return null
}
