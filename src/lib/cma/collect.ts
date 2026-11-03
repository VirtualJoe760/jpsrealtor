/**
 * Comparable collection and statistics for the tile CMA.
 *
 * ── Why this is NOT in lib/analytics/heatmap ────────────────────────────────
 *
 * That module never calculates: every number it serves is a stored field, and
 * that is a hard architectural rule, not a preference. This module DOES
 * calculate — averages, medians, min/max, price-per-sqft, sale-to-list, days
 * in market. It therefore lives outside the read surface on purpose, and must
 * never be imported by a route under `api/analytics/{sales-grid,hotspots,areas}`.
 *
 * The distinction is not a loophole. The invariant exists because a computed
 * market statistic served from an API is unverifiable — the reader cannot see
 * what went into it, so it has to come from a precompute that was built and
 * checked once. A CMA is the opposite shape: it enumerates every comparable it
 * used, on the same page as the summary row. "Average $1,607 SqFt" sits
 * directly above the ten rows it averages, and the reader can check it. The
 * source template says the same thing of its own numbers — "Source summary
 * rows (average, minimum, maximum, median) are preserved above."
 *
 * If a number here ever needs to be served WITHOUT its source rows beside it,
 * it belongs in the precompute instead.
 *
 * ── Field substitutions, all measured 2026-10-25 ────────────────────────────
 *
 * Three columns the template shows are not where you would expect them. On
 * 5,508 trailing-12-month type-A Coachella Valley closings:
 *
 *   lotSizeSqft        0%      -> use `lotSizeArea` (98.7%)
 *   daysOnMarket       0%      -> derive from closeDate - onMarketDate (100%)
 *   poolPrivateYN      0%      -> infer from `poolFeatures` (79.3%)
 *
 * Reading the obvious field name would have produced a column of blanks that
 * looked like sparse MLS data rather than the wrong column.
 */

import dbConnect from '@/lib/mongoose'
import mongoose from 'mongoose'

async function db() {
  await dbConnect()
  const conn = mongoose.connection.db
  if (!conn) throw new Error('[cma] no mongo connection')
  return conn
}

export interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface Comp {
  mlsNumber: string | null
  address: string | null
  city: string | null
  subdivisionName: string | null
  yearBuilt: number | null
  pool: boolean | null
  /** True only for a shared/association pool, which is not a private one. */
  poolShared: boolean
  spa: boolean | null
  /** closeDate for closed comps, onMarketDate for active ones. */
  statusDate: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  lotSize: number | null
  listPrice: number | null
  originalListPrice: number | null
  closePrice: number | null
  /** listPrice / sqft */
  lpPerSqft: number | null
  /** closePrice / sqft — closed comps only */
  spPerSqft: number | null
  /** closePrice / listPrice — closed comps only */
  spToLp: number | null
  /** Days in market: closeDate - onMarketDate, or today - onMarketDate if active. */
  dim: number | null
}

/** Average / min / max / median for one numeric column, nulls excluded. */
export interface ColStats {
  average: number | null
  min: number | null
  max: number | null
  median: number | null
  /** How many comps actually contributed — a median of 2 is not a median. */
  n: number
}

export type StatKey =
  | 'beds' | 'baths' | 'sqft' | 'lotSize' | 'lpPerSqft'
  | 'originalListPrice' | 'listPrice' | 'closePrice'
  | 'spPerSqft' | 'spToLp' | 'dim'

export type CompStats = Record<StatKey, ColStats>

const STAT_KEYS: StatKey[] = [
  'beds', 'baths', 'sqft', 'lotSize', 'lpPerSqft',
  'originalListPrice', 'listPrice', 'closePrice',
  'spPerSqft', 'spToLp', 'dim',
]

function round(n: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function ratio(a: number | null, b: number | null, dp = 2): number | null {
  if (a == null || b == null || !b) return null
  return round(a / b, dp)
}

/**
 * Days between two dates, floored at 0.
 *
 * `daysOnMarket` is empty on every row in this collection, so DIM is derived.
 * A negative span (close before on-market, which the feed does contain) is
 * clamped rather than dropped, so the comp still appears in the table.
 */
function daysBetween(from: string | Date | null, to: string | Date | null): number | null {
  if (!from || !to) return null
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/**
 * Pool presence from the free-text `poolFeatures` list.
 *
 * Values look like "Association, Community, Fenced, In Ground" or
 * "Above Ground, Filtered". "None" and empty mean no pool. An Association or
 * Community entry with no private indicator is a SHARED pool — reported
 * separately so the sheet does not imply a private pool the property lacks.
 */
function readPool(poolFeatures: unknown): { pool: boolean | null; shared: boolean } {
  if (poolFeatures == null || poolFeatures === '') return { pool: null, shared: false }
  const s = String(poolFeatures).toLowerCase()
  if (s === 'none' || s === 'no') return { pool: false, shared: false }
  const sharedOnly = /association|community/.test(s) && !/private|in ground|above ground|gunite|lap|salt/.test(s)
  return { pool: true, shared: sharedOnly }
}

function mapComp(r: Record<string, any>, isClosed: boolean): Comp {
  const { pool, shared } = readPool(r.poolFeatures)
  const sqft = r.livingArea ?? null
  const listPrice = r.listPrice ?? null
  const closePrice = isClosed ? (r.closePrice ?? null) : null
  const statusDate = isClosed ? r.closeDate : r.onMarketDate

  return {
    mlsNumber: r.listingId != null ? String(r.listingId) : (r.mlsId != null ? String(r.mlsId) : null),
    address: r.unparsedAddress ?? null,
    city: r.city ?? null,
    subdivisionName: r.subdivisionName ?? null,
    yearBuilt: r.yearBuilt ?? null,
    pool,
    poolShared: shared,
    spa: typeof r.spaYN === 'boolean' ? r.spaYN : null,
    statusDate: statusDate ? new Date(statusDate).toISOString() : null,
    beds: r.bedsTotal ?? null,
    baths: r.bathroomsTotalInteger ?? null,
    sqft,
    // lotSizeArea, not lotSizeSqft — the latter is empty on every row. Values
    // are passed through exactly as reported, including the occasional acre
    // figure, which the source template also preserves rather than "fixing".
    lotSize: r.lotSizeArea ?? null,
    listPrice,
    originalListPrice: r.originalListPrice ?? null,
    closePrice,
    lpPerSqft: ratio(listPrice, sqft),
    spPerSqft: isClosed ? ratio(closePrice, sqft) : null,
    spToLp: isClosed ? ratio(closePrice, listPrice) : null,
    dim: isClosed
      ? daysBetween(r.onMarketDate, r.closeDate)
      : daysBetween(r.onMarketDate, new Date()),
  }
}

function colStats(rows: Comp[], key: StatKey): ColStats {
  const vals = rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)
  if (!vals.length) return { average: null, min: null, max: null, median: null, n: 0 }
  const mid = Math.floor(vals.length / 2)
  return {
    average: round(vals.reduce((s, v) => s + v, 0) / vals.length),
    min: vals[0],
    max: vals[vals.length - 1],
    median: vals.length % 2 ? vals[mid] : round((vals[mid - 1] + vals[mid]) / 2),
    n: vals.length,
  }
}

export function statsFor(rows: Comp[]): CompStats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, colStats(rows, k)])) as CompStats
}

const CLOSED_PROJECTION = {
  _id: 0, listingId: 1, mlsId: 1, unparsedAddress: 1, city: 1, subdivisionName: 1,
  yearBuilt: 1, poolFeatures: 1, spaYN: 1, closeDate: 1, onMarketDate: 1,
  bedsTotal: 1, bathroomsTotalInteger: 1, livingArea: 1, lotSizeArea: 1,
  listPrice: 1, originalListPrice: 1, closePrice: 1,
} as const

const ACTIVE_PROJECTION = {
  _id: 0, listingId: 1, mlsId: 1, unparsedAddress: 1, city: 1, subdivisionName: 1,
  yearBuilt: 1, poolFeatures: 1, spaYN: 1, onMarketDate: 1,
  bedsTotal: 1, bathroomsTotalInteger: 1, livingArea: 1, lotSizeArea: 1,
  listPrice: 1, originalListPrice: 1,
} as const

export interface CmaData {
  active: Comp[]
  closed: Comp[]
  activeStats: CompStats
  closedStats: CompStats
  bbox: Bbox
  year: number | null
  cities: string[]
  truncated: boolean
}

/**
 * Every comparable inside a tile's bbox — active and closed.
 *
 * Uses the lat/lng scalar pair, NOT the 2dsphere index. Measured on this
 * collection, a `$geoWithin` Polygon on `coordinates` returns 0 rows where the
 * lat/lng range returns the real sales: those documents have no usable
 * `coordinates` value, so the geo index under-returns silently. The scalar
 * pair is covered by `latitude_1_longitude_1_closeDate_1_propertyType_1`.
 */
export async function collectComps(opts: {
  bbox: Bbox
  year: number | null
  limit: number
}): Promise<CmaData> {
  const conn = await db()
  const { bbox, year, limit } = opts

  const geo = {
    latitude: { $gte: bbox.minLat, $lt: bbox.maxLat },
    longitude: { $gte: bbox.minLng, $lt: bbox.maxLng },
  }

  const closedFilter: Record<string, unknown> = { propertyType: 'A', ...geo }
  if (year !== null) {
    closedFilter.closeDate = {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lt: new Date(Date.UTC(year + 1, 0, 1)),
    }
  }

  const [closedRows, activeRows] = await Promise.all([
    conn.collection('unified_closed_listings')
      .find(closedFilter, { projection: CLOSED_PROJECTION, limit })
      .sort({ closeDate: -1 })
      .toArray(),
    conn.collection('unified_listings')
      .find({ propertyType: 'A', standardStatus: 'Active', ...geo },
            { projection: ACTIVE_PROJECTION, limit })
      .toArray(),
  ])

  const closed = closedRows.map((r) => mapComp(r, true))
  const active = activeRows.map((r) => mapComp(r, false))
  const cities = [...new Set([...closed, ...active].map((c) => c.city).filter(Boolean) as string[])]

  return {
    active,
    closed,
    activeStats: statsFor(active),
    closedStats: statsFor(closed),
    bbox,
    year,
    cities,
    truncated: closedRows.length === limit || activeRows.length === limit,
  }
}
