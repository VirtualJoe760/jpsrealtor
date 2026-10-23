/**
 * One decision function for whether a place page is worth indexing.
 *
 * Why one function: robots meta, sitemap inclusion and the internal link hubs
 * have to agree. A URL that is noindex but declared in the sitemap wastes
 * crawl budget and teaches Google the sitemap is unreliable; a URL that is
 * indexable but in no sitemap and linked from nowhere lands in "Discovered –
 * currently not indexed" (82% of undeclared listings here came back "URL is
 * unknown to Google" on 2026-10-11). So every surface calls THIS, and the
 * reason string is logged so indexable pages can actually be counted.
 *
 * The problem being solved: ~230 city pages plus ~1,400 subdivision pages were
 * all declared indexable regardless of whether they had anything on them. A
 * page for a market with six sales a year has no stable median to report, so
 * it renders the template and nothing else — which is what gets a whole
 * directory classified as scaled thin content rather than merely ignored.
 *
 * A failing page STAYS LIVE. It keeps serving users and keeps passing link
 * equity (`noindex, follow`); it just stops asking to be ranked.
 */

import type { MarketStats } from '@/lib/market-stats'
import { isNonPlaceSubdivision } from '@/lib/neighborhoods-data'

// ─────────────────────────────────────────────────────
// Thresholds — deliberately constants, not inline literals
// ─────────────────────────────────────────────────────

/**
 * Active residential for-sale listings a city needs. Below this the inventory
 * table and price-band split have too few rows to say anything.
 */
export const CITY_MIN_ACTIVE = 15

/**
 * Closed residential sales in the trailing 12 months.
 *
 * The audit that prompted this asked for "at least 12 months of closed sales"
 * and ALSO listed Mountain Center (21 active, 18 closed) as a page that must
 * come back noindex. Those two do not agree, so this is the number that
 * satisfies the acceptance case and has an independent justification: a median
 * price, median DOM and sale-to-list ratio need roughly two sales a month
 * before they stop swinging on single transactions. 24 is that floor.
 *
 * Measured 2026-10-14: Bradbury 6, Hawaiian Gardens 17, Mountain Center 18 all
 * fail; Thermal 38, Indian Wells 121, Indio 514, Palm Desert 832, Riverside
 * 1,089 all pass.
 *
 * Note that "12 months of closed sales" cannot be read as 12 DISTINCT months
 * either — the closed collection's freshest data is ~2 months behind, so even
 * Riverside only covers 10 calendar months.
 */
export const CITY_MIN_CLOSED_12MO = 24

/** A subdivision is a smaller unit; the audit's own numbers work here. */
export const SUBDIVISION_MIN_ACTIVE = 3
export const SUBDIVISION_MIN_CLOSED_12MO = 10

/**
 * Combined volume a subdivision needs when its description is GENERATED rather
 * than written.
 *
 * Only 149 of 1,426 subdivisions carry `hasManualData`. Requiring a hand-written
 * blurb outright would noindex ~1,250 pages, including ones that are genuinely
 * substantive — "Non-HOA Desert Hot Springs" has 118 active listings, real HOA
 * facts and a full sold history, and a page carrying all of that is not thin
 * just because a machine wrote its opening paragraph. So generated-description
 * subdivisions must instead clear this volume bar, which is what makes the
 * computed data on the page (stats, sold comps, HOA range, year-built range)
 * add up to something no other page has.
 */
export const SUBDIVISION_GENERATED_MIN_VOLUME = 25

// ─────────────────────────────────────────────────────
// Staged rollout
// ─────────────────────────────────────────────────────
//
// The audit asked for out-of-area cities to go live "in batches of 20–30,
// starting with the highest-priority regions", checking after each batch
// whether more than ~30% land in "Crawled – currently not indexed" before
// releasing the next. The reason is real: 186 city pages appearing at once off
// a domain with a 7% index rate is the shape of a content farm, and if the
// template has a problem it is cheaper to learn that on 20 pages than on 186.
//
// Batching is BY REGION rather than by a count, because the audit's own phrase
// is "highest-priority regions" and because a region is the only grouping each
// page already knows about itself. `cities.region` is on the document the page
// has already fetched, so this costs no extra query and the page and the
// sitemap cannot disagree about who is released — the failure this whole
// module exists to prevent.
//
// ── DEFAULT IS "EVERYTHING RELEASED" ────────────────────────────────────────
//
// Deliberately. Staging the rollout means choosing to withhold ~150 city pages
// from the index, which is a strategy call with real traffic consequences and
// is not mine to make silently. The mechanism is here, defaulted off, so the
// decision is one environment variable and not a code change:
//
//   SEO_ROLLOUT_REGIONS="Coachella Valley"
//       phase 1 — exactly what the audit asks to ship first
//   SEO_ROLLOUT_REGIONS="Coachella Valley,Inland Empire & Desert"
//       phase 2, and so on
//   unset, or "*"
//       everything that passes the quality gate is released (current default)
//
// Region names must match `cities.region` exactly; the known values are
// Coachella Valley, Inland Empire & Desert, Los Angeles County, Orange County,
// San Diego County, Ventura County, Santa Barbara County, Imperial Valley,
// High Desert and the non-SoCal set.

/**
 * Parsed at call time, not at module load: a serverless instance can outlive
 * an env change, and a rollout knob that needs a redeploy to take effect is a
 * knob nobody will turn mid-batch.
 */
function releasedRegions(): Set<string> | null {
  const raw = process.env.SEO_ROLLOUT_REGIONS?.trim()
  if (!raw || raw === '*') return null // null = no restriction
  const names = raw
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)
  return names.length ? new Set(names) : null
}

/**
 * Whether a region has been released for indexing yet.
 *
 * A page with NO region is treated as released. The alternative — withholding
 * anything whose `cities.region` is missing or reads "Unknown County" — would
 * silently noindex pages for a data-hygiene reason rather than a quality one,
 * and the gate above already covers quality.
 */
export function isRegionReleased(regionName?: string | null): boolean {
  const allowed = releasedRegions()
  if (!allowed) return true
  if (!regionName) return true
  return allowed.has(regionName.trim().toLowerCase())
}

export interface IndexabilityResult {
  index: boolean
  /** Machine-readable cause, stable enough to group on in logs. */
  reason: string
}

const ok = (reason: string): IndexabilityResult => ({ index: true, reason })
const no = (reason: string): IndexabilityResult => ({ index: false, reason })

/**
 * True when the stats block in the page body can actually render. "Enough
 * listings" is not the same as "enough populated fields": a market can have
 * inventory and still be missing every `livingArea` or `onMarketDate`, leaving
 * the block to print four em-dashes. That page is thinner than one with no
 * block at all, because it looks broken.
 */
export function canRenderStatsBlock(stats: MarketStats | null): boolean {
  if (!stats) return false
  return (
    stats.medianListPrice != null &&
    stats.medianClosePrice != null &&
    stats.medianDaysOnMarket != null &&
    stats.saleToListPercent != null
  )
}

export function getCityIndexability(
  stats: MarketStats | null,
  regionName?: string | null,
): IndexabilityResult {
  // Rollout FIRST: a withheld page should report why it is withheld, not the
  // quality reason it would also have passed or failed on.
  if (!isRegionReleased(regionName)) return no(`region-not-released:${regionName}`)
  if (!stats) return no('no-stats')
  if (stats.activeCount < CITY_MIN_ACTIVE) {
    return no(`active-below-${CITY_MIN_ACTIVE}:${stats.activeCount}`)
  }
  if (stats.closedCount < CITY_MIN_CLOSED_12MO) {
    return no(`closed-below-${CITY_MIN_CLOSED_12MO}:${stats.closedCount}`)
  }
  if (!canRenderStatsBlock(stats)) return no('stats-block-incomplete')
  return ok('city-ok')
}

/**
 * Synthetic "everything without an association" buckets, e.g. "Non-HOA
 * Riverside", "Non-HOA Los Angeles".
 *
 * These are not places. Whatever built the `subdivisions` collection grouped
 * every listing with no real `subdivisionName` into one row per city and gave
 * it a generated description ("With 118 active listings averaging $197k, this
 * area offers flexibility and independence..."). There are 132 of them, and
 * "Non-HOA Los Angeles" covers 67 unrelated homes spread across the entire
 * city — no shared HOA, no year-built range, no amenities, nothing a community
 * page is for.
 *
 * They were ALREADY failing the gate, but only by accident: their names never
 * match a real MLS `subdivisionName`, so the bulk volume aggregations return
 * zero for them. That is the right outcome reached for the wrong reason — the
 * day someone teaches that aggregation to resolve these buckets, 132 thin
 * pages would silently become indexable again. So the rule is stated here
 * instead of emerging from a join that happens to miss.
 *
 * They stay LIVE and linked (`noindex, follow`): the listings inside them are
 * real and the page is a usable filter for a visitor. It just does not ask to
 * be ranked. A bucket that genuinely carries curated community facts is let
 * through below, which is what the audit meant by "unless they hold real
 * data".
 */
export function isPlaceholderSubdivision(name?: string | null): boolean {
  if (!name) return false
  return /^non-hoa\b/i.test(name.trim())
}

export interface SubdivisionGateInput {
  name: string
  /** `hasManualData` on the Subdivision document. */
  hasManualData?: boolean
  /** Truthy when `communityFacts` holds anything beyond an empty object. */
  hasCommunityFacts?: boolean
}

export function getSubdivisionIndexability(
  sub: SubdivisionGateInput,
  stats: MarketStats | null,
  regionName?: string | null,
): IndexabilityResult {
  // A community is released with its region, never ahead of it — releasing
  // Sun City Shadow Hills while Indio is withheld would publish an orphan
  // whose parent city page says noindex.
  if (!isRegionReleased(regionName)) return no(`region-not-released:${regionName}`)
  // MLS filler ("Not Applicable", "Other"…) is never a place. Same list the
  // directory and the sitemap filter on, so all three agree by construction.
  if (isNonPlaceSubdivision(sub.name)) return no('non-place-name')
  // A synthetic Non-HOA bucket needs curated facts to earn an index.
  if (isPlaceholderSubdivision(sub.name) && !sub.hasManualData && !sub.hasCommunityFacts) {
    return no('placeholder-subdivision')
  }
  if (!stats) return no('no-stats')

  const meetsVolume =
    stats.activeCount >= SUBDIVISION_MIN_ACTIVE ||
    stats.closedCount >= SUBDIVISION_MIN_CLOSED_12MO
  if (!meetsVolume) {
    return no(`volume-below-min:${stats.activeCount}a/${stats.closedCount}c`)
  }

  // A written description, or real community facts, is enough on its own.
  if (sub.hasManualData || sub.hasCommunityFacts) return ok('subdivision-ok')

  const volume = stats.activeCount + stats.closedCount
  if (volume < SUBDIVISION_GENERATED_MIN_VOLUME) {
    return no(`generated-description-thin:${volume}`)
  }
  return ok('subdivision-ok-by-volume')
}

/**
 * Metadata `robots` value for a gate result.
 *
 * `follow` is the point: a gated page still passes authority to the listings
 * and the parent city it links to. `noindex, nofollow` would strand everything
 * downstream of a small market.
 */
export function robotsFor(result: IndexabilityResult) {
  return result.index
    ? { index: true, follow: true }
    : { index: false, follow: true }
}

/**
 * Single logging point, so "how many pages are indexable" is answerable from
 * the function logs instead of by crawling the site.
 */
export function logIndexability(
  kind: 'city' | 'subdivision',
  slug: string,
  result: IndexabilityResult,
) {
  console.log(
    `[indexability] ${kind} ${slug} ${result.index ? 'INDEX' : 'NOINDEX'} ${result.reason}`,
  )
}

// ─────────────────────────────────────────────────────
// Bulk gate (for the sitemap)
// ─────────────────────────────────────────────────────
//
// The page-level functions above take a MarketStats, which costs two
// aggregations per place. The sitemap has to decide for ~520 cities and ~1,700
// subdivisions in one request, and 4,400 aggregations is not a thing that
// finishes. So the sitemap computes the SAME INPUTS in bulk — four $group
// passes total — and feeds them through the functions below.
//
// These must stay in this file, next to the thresholds. The failure mode if
// they drift is the one the whole module exists to prevent: a URL declared in
// the sitemap that then serves `noindex`, which teaches Google the sitemap is
// unreliable for every other URL in it.

export interface CityGateCounts {
  /** Active, propertyType A, listPrice >= FOR_SALE_PRICE_FLOOR. */
  activeCount: number
  /** Closed, propertyType A, trailing 12 months. */
  closedCount: number
  /** Of those closed rows, how many carry a usable `onMarketDate` (median DOM). */
  closedWithDom: number
  /** Of those closed rows, how many carry a usable `listPrice` (sale-to-list). */
  closedWithListPrice: number
}

/**
 * The bulk equivalent of getCityIndexability().
 *
 * `closedWithDom` / `closedWithListPrice` stand in for canRenderStatsBlock():
 * a non-null median needs at least one contributing row, and medians over the
 * price fields are guaranteed once the counts are above zero. Measured
 * 2026-10-14, this reproduces the page-level gate's verdict on every city
 * sampled, including the audit's acceptance set — Bradbury, Hawaiian Gardens
 * and Mountain Center noindex; Indio, Palm Desert and Riverside index.
 */
export function getCityIndexabilityFromCounts(
  c: CityGateCounts,
  regionName?: string | null,
): IndexabilityResult {
  if (!isRegionReleased(regionName)) return no(`region-not-released:${regionName}`)
  if (c.activeCount < CITY_MIN_ACTIVE) {
    return no(`active-below-${CITY_MIN_ACTIVE}:${c.activeCount}`)
  }
  if (c.closedCount < CITY_MIN_CLOSED_12MO) {
    return no(`closed-below-${CITY_MIN_CLOSED_12MO}:${c.closedCount}`)
  }
  if (c.closedWithDom < 1 || c.closedWithListPrice < 1) {
    return no('stats-block-incomplete')
  }
  return ok('city-ok')
}

export interface SubdivisionGateCounts {
  activeCount: number
  closedCount: number
}

/** The bulk equivalent of getSubdivisionIndexability(). */
export function getSubdivisionIndexabilityFromCounts(
  sub: SubdivisionGateInput,
  c: SubdivisionGateCounts,
  regionName?: string | null,
): IndexabilityResult {
  if (!isRegionReleased(regionName)) return no(`region-not-released:${regionName}`)
  if (isNonPlaceSubdivision(sub.name)) return no('non-place-name')
  if (isPlaceholderSubdivision(sub.name) && !sub.hasManualData && !sub.hasCommunityFacts) {
    return no('placeholder-subdivision')
  }

  const meetsVolume =
    c.activeCount >= SUBDIVISION_MIN_ACTIVE || c.closedCount >= SUBDIVISION_MIN_CLOSED_12MO
  if (!meetsVolume) {
    return no(`volume-below-min:${c.activeCount}a/${c.closedCount}c`)
  }
  if (sub.hasManualData || sub.hasCommunityFacts) return ok('subdivision-ok')

  const volume = c.activeCount + c.closedCount
  if (volume < SUBDIVISION_GENERATED_MIN_VOLUME) {
    return no(`generated-description-thin:${volume}`)
  }
  return ok('subdivision-ok-by-volume')
}
