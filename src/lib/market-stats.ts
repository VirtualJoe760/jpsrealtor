/**
 * Computed market statistics for city and subdivision pages.
 *
 * Why this exists: before 2026-10-14 the only per-city data on a city page was
 * four numbers copied off the pre-aggregated `cities` document — active count,
 * average, range, median. Every other word on the page was template. ~230 city
 * pages sharing one template with four numbers swapped is the definition of
 * scaled thin content, and it is why the statewide expansion was at risk of
 * being classified that way rather than indexed.
 *
 * Everything here is derived from MLS data at request time, so each page
 * carries numbers that exist nowhere else and change every month.
 *
 * ── Three traps this file is built around ────────────────────────────────────
 *
 * 1. `cities.listingCount` COUNTS EVERY PROPERTY TYPE. Indio's 818 is 487
 *    residential + 189 leases + 66 land + 9 income. That is why the page said
 *    "818 active" while its own About text said 571, and why the price range
 *    read "$1k – $5.9M": the $1,300 floor was a RENTAL. Never use that field
 *    for a for-sale number. `activeCount` here is propertyType 'A' only.
 *
 * 2. ACTIVE LISTINGS HAVE NO `daysOnMarket`. The field is indexed
 *    (daysOnMarket_city) but unpopulated — measured 0 of 486 Indio actives on
 *    2026-10-14. Median DOM therefore comes from CLOSED sales
 *    (onMarketDate → closeDate), which is the more meaningful number anyway.
 *
 * 3. THERE IS NO HISTORICAL INVENTORY SNAPSHOT. `californiastats` holds exactly
 *    one document (a statewide roll-up), so "inventory is up 18% YoY" is not
 *    computable from this database, only invented. Year-over-year here is
 *    median close price and SALES VOLUME, both of which the closed collection
 *    genuinely supports. Do not add an inventory trend without first adding a
 *    monthly snapshot collection to write it from.
 *
 * ── Cost ─────────────────────────────────────────────────────────────────────
 *
 * Two aggregations, both index-covered (`city_propertyType_listPrice` and
 * `city_closeDate_closePrice`; subdivision equivalents exist too). Measured
 * ~2.1s cold for Indio on 2026-10-14. Cached in-process for 6h because city
 * pages are read far more often than MLS medians move.
 */

import dbConnect from '@/lib/mongoose'
import mongoose from 'mongoose'

// Residential for sale. The MLS packs four different markets into
// `propertyType`, and conflating them is trap #1 above.
const PT_RESIDENTIAL = 'A'
const PT_LEASE = 'B'
const PT_INCOME = 'C'
const PT_LAND = 'D'

/**
 * Price floor for a for-sale listing. Below this a row is a data error, a
 * rental that escaped the propertyType filter, or a placeholder — all three
 * wreck a min/max price range. The audit caught "$3k – $1.0M" on Sun City
 * Shadow Hills this way.
 */
export const FOR_SALE_PRICE_FLOOR = 10_000

/** Living area below this is a data error, not a home — it would blow up $/sqft. */
const MIN_LIVING_AREA = 200

/** Closed sales older than this are not "the current market". */
const TRAILING_DAYS = 365

const DAY_MS = 86_400_000

const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: 'Under $300K', min: 0, max: 300_000 },
  { label: '$300K – $500K', min: 300_000, max: 500_000 },
  { label: '$500K – $750K', min: 500_000, max: 750_000 },
  { label: '$750K – $1M', min: 750_000, max: 1_000_000 },
  { label: '$1M – $2M', min: 1_000_000, max: 2_000_000 },
  { label: '$2M+', min: 2_000_000, max: Infinity },
]

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  [PT_RESIDENTIAL]: 'Residential',
  [PT_INCOME]: 'Residential income',
  [PT_LAND]: 'Land',
  [PT_LEASE]: 'For lease',
}

export interface CountBucket {
  label: string
  count: number
}

export interface RecentSale {
  slugAddress?: string
  address: string
  closePrice: number
  closeDate: string
  livingArea?: number
  daysOnMarket?: number
}

export interface MarketStats {
  scope: 'city' | 'subdivision'
  name: string

  /** Residential for-sale only — NOT cities.listingCount. See trap #1. */
  activeCount: number
  /** Every active row regardless of type, for an honest "x of y" label. */
  activeAllTypes: number
  medianListPrice: number | null
  /** 10th/90th percentile, not min/max — one bad row destroys min/max. */
  listPriceP10: number | null
  listPriceP90: number | null
  medianListPricePerSqFt: number | null
  newLast7Days: number
  inventoryByType: CountBucket[]
  inventoryByPriceBand: CountBucket[]

  /** Closed sales, trailing 12 months. */
  closedCount: number
  medianClosePrice: number | null
  medianClosePricePerSqFt: number | null
  /** From closed sales only — active rows carry no DOM. See trap #2. */
  medianDaysOnMarket: number | null
  /** Percent, e.g. 97.9 means homes sell for 97.9% of list. */
  saleToListPercent: number | null
  monthsOfSupply: number | null

  /** The 12 months BEFORE the trailing year, for year-over-year. */
  priorClosedCount: number
  priorMedianClosePrice: number | null
  yoyMedianPricePercent: number | null
  yoySalesVolumePercent: number | null

  recentSales: RecentSale[]

  computedAt: string
  /** True when there was enough closed history to trust the closed-side numbers. */
  hasClosedHistory: boolean
}

// ─────────────────────────────────────────────────────
// Math helpers (kept local: these run on arrays already in memory)
// ─────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length / 2
  return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

function pctChange(now: number | null, before: number | null): number | null {
  if (now == null || before == null || before === 0) return null
  return ((now - before) / before) * 100
}

function round(n: number | null, dp = 0): number | null {
  if (n == null || !Number.isFinite(n)) return null
  const f = 10 ** dp
  return Math.round(n * f) / f
}

// ─────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────

const TTL_MS = 6 * 60 * 60 * 1000
const cache = new Map<string, { at: number; stats: MarketStats }>()

// ─────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────

/**
 * Raw collection handles. Aggregations run against the COLLECTIONS, not the
 * Mongoose models, on purpose:
 *   - `unifiedlistings` is a VIEW over `unified_listings`; aggregating the view
 *     adds a pipeline stage for nothing.
 *   - the aggregation framework ignores the Mongoose schema entirely, so a
 *     field the schema happens not to declare (AGENTS.md rule 7's trap, in its
 *     read-side form) still comes back.
 */
async function collections() {
  await dbConnect()
  const db = mongoose.connection.db
  if (!db) throw new Error('[market-stats] no mongo connection')
  return {
    active: db.collection('unified_listings'),
    closed: db.collection('unified_closed_listings'),
  }
}

type Scope = { scope: 'city'; name: string } | { scope: 'subdivision'; name: string; city: string }

/** The match key differs by scope but nothing else does. */
function scopeMatch(s: Scope): Record<string, unknown> {
  return s.scope === 'city'
    ? { city: s.name }
    : { subdivisionName: s.name, city: s.city }
}

export async function getMarketStats(s: Scope): Promise<MarketStats | null> {
  const key = s.scope === 'city' ? `city:${s.name}` : `sub:${s.city}:${s.name}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.stats

  try {
    const { active, closed } = await collections()
    const match = scopeMatch(s)
    const now = Date.now()
    const since = new Date(now - TRAILING_DAYS * DAY_MS)
    const priorSince = new Date(now - 2 * TRAILING_DAYS * DAY_MS)
    const sevenDaysAgo = new Date(now - 7 * DAY_MS)

    // ── Active side ──────────────────────────────────────────────────────────
    // One pass, grouped by propertyType, so the inventory split and the
    // residential medians come out of the same read.
    const activeRows = await active
      .aggregate([
        { $match: { ...match, standardStatus: 'Active' } },
        {
          $group: {
            _id: '$propertyType',
            count: { $sum: 1 },
            prices: {
              $push: {
                $cond: [{ $gte: ['$listPrice', FOR_SALE_PRICE_FLOOR] }, '$listPrice', '$$REMOVE'],
              },
            },
            ppsf: {
              $push: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$livingArea', MIN_LIVING_AREA] },
                      { $gte: ['$listPrice', FOR_SALE_PRICE_FLOOR] },
                    ],
                  },
                  { $divide: ['$listPrice', '$livingArea'] },
                  '$$REMOVE',
                ],
              },
            },
            newRecently: {
              $sum: {
                $cond: [{ $gte: [{ $toDate: '$onMarketDate' }, sevenDaysAgo] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray()

    const byType = new Map<string, (typeof activeRows)[number]>()
    for (const r of activeRows) byType.set(String(r._id), r)

    const residential = byType.get(PT_RESIDENTIAL)
    const forSalePrices: number[] = residential?.prices ?? []
    const activeCount = forSalePrices.length
    const activeAllTypes = activeRows.reduce((sum, r) => sum + r.count, 0)

    const inventoryByType: CountBucket[] = activeRows
      .filter((r) => r._id !== PT_LEASE && r.count > 0)
      .map((r) => ({
        label: PROPERTY_TYPE_LABELS[String(r._id)] || 'Other',
        count: r.count,
      }))
      .sort((a, b) => b.count - a.count)

    const inventoryByPriceBand: CountBucket[] = PRICE_BANDS.map((b) => ({
      label: b.label,
      count: forSalePrices.filter((p) => p >= b.min && p < b.max).length,
    })).filter((b) => b.count > 0)

    // ── Closed side ──────────────────────────────────────────────────────────
    // Two years in one read, split by a boolean, so year-over-year costs the
    // same as the trailing year alone.
    const closedRows = await closed
      .aggregate([
        {
          $match: {
            ...match,
            propertyType: PT_RESIDENTIAL,
            closeDate: { $gte: priorSince },
            closePrice: { $gte: FOR_SALE_PRICE_FLOOR },
          },
        },
        {
          $project: {
            closePrice: 1,
            listPrice: 1,
            livingArea: 1,
            recent: { $gte: ['$closeDate', since] },
            ratio: {
              $cond: [
                { $gte: ['$listPrice', FOR_SALE_PRICE_FLOOR] },
                { $divide: ['$closePrice', '$listPrice'] },
                '$$REMOVE',
              ],
            },
            ppsf: {
              $cond: [
                { $gt: ['$livingArea', MIN_LIVING_AREA] },
                { $divide: ['$closePrice', '$livingArea'] },
                '$$REMOVE',
              ],
            },
            dom: {
              $cond: [
                { $ifNull: ['$onMarketDate', false] },
                {
                  $divide: [
                    { $subtract: ['$closeDate', { $toDate: '$onMarketDate' }] },
                    DAY_MS,
                  ],
                },
                '$$REMOVE',
              ],
            },
          },
        },
        {
          $group: {
            _id: '$recent',
            count: { $sum: 1 },
            prices: { $push: '$closePrice' },
            ratios: { $push: '$ratio' },
            ppsf: { $push: '$ppsf' },
            doms: { $push: '$dom' },
          },
        },
      ])
      .toArray()

    const recent = closedRows.find((r) => r._id === true)
    const prior = closedRows.find((r) => r._id === false)

    const closedCount = recent?.count ?? 0
    const priorClosedCount = prior?.count ?? 0

    // A DOM can come back negative or absurd when onMarketDate is a relist
    // artifact. Filter rather than let one row drag the median.
    const doms = (recent?.doms ?? []).filter((d: number) => d > 0 && d < 1500)

    const medianClosePrice = median(recent?.prices ?? [])
    const priorMedianClosePrice = median(prior?.prices ?? [])
    const ratio = median(recent?.ratios ?? [])

    const monthsOfSupply =
      closedCount > 0 && activeCount > 0 ? activeCount / (closedCount / 12) : null

    // ── Recent sales ─────────────────────────────────────────────────────────
    // Rides city_closeDate_closePrice / subdivisionName_closeDate_closePrice,
    // so the sort is free here (unlike the listing queries in crawl-index.ts).
    const soldDocs = await closed
      .find(
        {
          ...match,
          propertyType: PT_RESIDENTIAL,
          closeDate: { $gte: since },
          closePrice: { $gte: FOR_SALE_PRICE_FLOOR },
        },
        {
          projection: {
            slugAddress: 1,
            unparsedAddress: 1,
            closePrice: 1,
            closeDate: 1,
            livingArea: 1,
          },
          sort: { closeDate: -1 },
          limit: 10,
        },
      )
      .toArray()

    const recentSales: RecentSale[] = soldDocs
      .filter((d) => d.unparsedAddress || d.slugAddress)
      .map((d) => ({
        slugAddress: typeof d.slugAddress === 'string' ? d.slugAddress : undefined,
        address: d.unparsedAddress || String(d.slugAddress).replace(/-/g, ' '),
        closePrice: d.closePrice,
        closeDate: new Date(d.closeDate).toISOString(),
        livingArea: d.livingArea > MIN_LIVING_AREA ? d.livingArea : undefined,
      }))

    const stats: MarketStats = {
      scope: s.scope,
      name: s.name,

      activeCount,
      activeAllTypes,
      medianListPrice: round(median(forSalePrices)),
      listPriceP10: round(percentile(forSalePrices, 10)),
      listPriceP90: round(percentile(forSalePrices, 90)),
      medianListPricePerSqFt: round(median(residential?.ppsf ?? [])),
      newLast7Days: residential?.newRecently ?? 0,
      inventoryByType,
      inventoryByPriceBand,

      closedCount,
      medianClosePrice: round(medianClosePrice),
      medianClosePricePerSqFt: round(median(recent?.ppsf ?? [])),
      medianDaysOnMarket: round(median(doms)),
      saleToListPercent: ratio == null ? null : round(ratio * 100, 1),
      monthsOfSupply: round(monthsOfSupply, 1),

      priorClosedCount,
      priorMedianClosePrice: round(priorMedianClosePrice),
      yoyMedianPricePercent: round(pctChange(medianClosePrice, priorMedianClosePrice), 1),
      yoySalesVolumePercent: round(
        pctChange(closedCount, priorClosedCount || null),
        1,
      ),

      recentSales,

      computedAt: new Date().toISOString(),
      hasClosedHistory: closedCount >= 10,
    }

    cache.set(key, { at: Date.now(), stats })
    return stats
  } catch (error) {
    // A city page without stats is worse than a slow one but far better than a
    // 500, and the indexability gate (lib/indexability.ts) reads a null here as
    // "not enough data to index", which is the correct conclusion either way.
    console.error('[market-stats] failed for', JSON.stringify(s), error)
    return null
  }
}

// ─────────────────────────────────────────────────────
// Prose generated FROM the numbers
// ─────────────────────────────────────────────────────

export function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function signed(n: number): string {
  return `${n > 0 ? 'up' : 'down'} ${Math.abs(n).toFixed(1)}%`
}

/**
 * Three to four sentences assembled from the computed numbers.
 *
 * These are the per-page uniqueness that matters: they differ by city because
 * the numbers do, and they change as the market moves, which is exactly what a
 * hand-written paragraph cannot do across ~230 markets. Each sentence is
 * emitted ONLY when its inputs exist — a template that falls back to "contact
 * us for details" when the data is thin is the boilerplate this replaces.
 *
 * Deliberately NOT here: any claim about inventory direction. See trap #3.
 */
export function describeMarket(stats: MarketStats, placeName: string): string[] {
  const out: string[] = []

  if (stats.medianClosePrice != null) {
    const yoy = stats.yoyMedianPricePercent
    const base = `The median home in ${placeName} sold for ${formatPrice(stats.medianClosePrice)} over the past 12 months`
    out.push(
      yoy != null && Math.abs(yoy) >= 0.5
        ? `${base}, ${signed(yoy)} from the year before.`
        : `${base}, little changed from the year before.`,
    )
  }

  if (stats.activeCount > 0 && stats.medianListPrice != null) {
    const ppsf = stats.medianListPricePerSqFt
    out.push(
      `There ${stats.activeCount === 1 ? 'is' : 'are'} ${stats.activeCount.toLocaleString()} ${
        stats.activeCount === 1 ? 'home' : 'homes'
      } for sale right now, asking a median of ${formatPrice(stats.medianListPrice)}${
        ppsf ? ` — about $${Math.round(ppsf)} per square foot` : ''
      }.`,
    )
  }

  if (stats.medianDaysOnMarket != null && stats.saleToListPercent != null) {
    out.push(
      `Homes here take a median of ${Math.round(stats.medianDaysOnMarket)} days to sell and close at ${stats.saleToListPercent}% of asking price.`,
    )
  }

  if (stats.monthsOfSupply != null && stats.closedCount > 0) {
    const mos = stats.monthsOfSupply
    // The 6-month line is the standard balanced-market convention; stating the
    // reading without it leaves the reader no way to interpret the number.
    const tone =
      mos < 4 ? 'a seller’s market' : mos > 7 ? 'a buyer’s market' : 'a balanced market'
    out.push(
      `At ${stats.closedCount.toLocaleString()} sales over the past year, current inventory represents about ${mos.toFixed(1)} months of supply — ${tone} by the usual six-month benchmark.`,
    )
  }

  return out
}

// ─────────────────────────────────────────────────────
// Physical profile of the housing stock
// ─────────────────────────────────────────────────────
//
// Separate from MarketStats because only subdivision pages need it, and it is
// one more aggregation. Subdivision pages had nothing on them that a city page
// did not also have — the audit's request was HOA fee range, Mello-Roos flag,
// age restriction, year-built range and lot-size range, and every one of those
// is derivable from the active listings in the community:
//
//   Sun City Shadow Hills, measured 2026-10-14 — yearBuilt 2003–2016,
//   associationFee $346–$399, lot 4,792–9,583 sq ft, 58 of 60 flagged senior.
//
// `communityFacts` on the Subdivision document is better where it exists
// (curated HOA figures, Mello-Roos, golf courses) but covers only 146 of 1,426
// communities, so it is an overlay on top of this rather than a replacement.

export interface PlaceProfile {
  yearBuiltMin: number | null
  yearBuiltMax: number | null
  hoaMonthlyMin: number | null
  hoaMonthlyMax: number | null
  hoaMonthlyMedian: number | null
  lotSqFtMin: number | null
  lotSqFtMax: number | null
  livingAreaMin: number | null
  livingAreaMax: number | null
  /** Share of active listings flagged as a senior community, 0–1. */
  seniorShare: number | null
  sampleSize: number
}

const profileCache = new Map<string, { at: number; profile: PlaceProfile | null }>()

export async function getPlaceProfile(s: Scope): Promise<PlaceProfile | null> {
  const key = s.scope === 'city' ? `city:${s.name}` : `sub:${s.city}:${s.name}`
  const hit = profileCache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.profile

  try {
    const { active } = await collections()
    const rows = await active
      .aggregate([
        {
          $match: {
            ...scopeMatch(s),
            standardStatus: 'Active',
            propertyType: PT_RESIDENTIAL,
          },
        },
        {
          $group: {
            _id: null,
            sampleSize: { $sum: 1 },
            // 1850 rules out the 0s and the obvious typos without excluding a
            // genuinely old home.
            yearBuiltMin: {
              $min: { $cond: [{ $gt: ['$yearBuilt', 1850] }, '$yearBuilt', '$$REMOVE'] },
            },
            yearBuiltMax: {
              $max: { $cond: [{ $gt: ['$yearBuilt', 1850] }, '$yearBuilt', '$$REMOVE'] },
            },
            hoaMin: {
              $min: { $cond: [{ $gt: ['$associationFee', 0] }, '$associationFee', '$$REMOVE'] },
            },
            hoaMax: {
              $max: { $cond: [{ $gt: ['$associationFee', 0] }, '$associationFee', '$$REMOVE'] },
            },
            hoaValues: {
              $push: { $cond: [{ $gt: ['$associationFee', 0] }, '$associationFee', '$$REMOVE'] },
            },
            lotMin: {
              $min: {
                $cond: [{ $gt: ['$lotSizeSquareFeet', 100] }, '$lotSizeSquareFeet', '$$REMOVE'],
              },
            },
            lotMax: {
              $max: {
                $cond: [{ $gt: ['$lotSizeSquareFeet', 100] }, '$lotSizeSquareFeet', '$$REMOVE'],
              },
            },
            areaMin: {
              $min: {
                $cond: [{ $gt: ['$livingArea', MIN_LIVING_AREA] }, '$livingArea', '$$REMOVE'],
              },
            },
            areaMax: {
              $max: {
                $cond: [{ $gt: ['$livingArea', MIN_LIVING_AREA] }, '$livingArea', '$$REMOVE'],
              },
            },
            seniorCount: {
              $sum: { $cond: [{ $eq: ['$seniorCommunityYN', true] }, 1, 0] },
            },
          },
        },
      ])
      .toArray()

    const r = rows[0]
    if (!r || !r.sampleSize) {
      profileCache.set(key, { at: Date.now(), profile: null })
      return null
    }

    const profile: PlaceProfile = {
      yearBuiltMin: r.yearBuiltMin ?? null,
      yearBuiltMax: r.yearBuiltMax ?? null,
      hoaMonthlyMin: round(r.hoaMin ?? null),
      hoaMonthlyMax: round(r.hoaMax ?? null),
      hoaMonthlyMedian: round(median(r.hoaValues ?? [])),
      lotSqFtMin: round(r.lotMin ?? null),
      lotSqFtMax: round(r.lotMax ?? null),
      livingAreaMin: round(r.areaMin ?? null),
      livingAreaMax: round(r.areaMax ?? null),
      seniorShare: r.sampleSize ? r.seniorCount / r.sampleSize : null,
      sampleSize: r.sampleSize,
    }

    profileCache.set(key, { at: Date.now(), profile })
    return profile
  } catch (error) {
    console.error('[market-stats] getPlaceProfile failed for', JSON.stringify(s), error)
    return null
  }
}
