/**
 * The data behind each child sitemap, and the XML serializer they share.
 *
 * ── Why this replaced the single-file sitemap ────────────────────────────────
 *
 * The old generator (lib/sitemap-generator.ts, still used for the platform
 * host) produced ONE file inside one function invocation, which forced three
 * compromises that this split removes:
 *
 *   1. ONE `lastmod` FOR EVERY URL. `const now = new Date()` was stamped on all
 *      ~33,000 entries, so the field said "the sitemap was built just now" —
 *      true, and useless. Google learns to ignore a lastmod that always equals
 *      fetch time, and then stops using it to prioritise recrawls, which is the
 *      entire point of the field. Real per-URL values are below.
 *
 *   2. A 12,000-LISTING CEILING. Not a sitemap limit (the spec allows 50,000) —
 *      a wall-clock limit. Reading all ~60,000 active SoCal listings takes ~52s
 *      against this cluster and blew the function timeout, serving Google
 *      nothing at all. Each child sitemap is now its own route with its own
 *      time budget, so the listings split across several files instead of being
 *      truncated to fit one.
 *
 *   3. NO GATE. Everything with inventory was declared. The indexability gate
 *      needs per-place sales history, which is ~4,400 aggregations if done one
 *      place at a time; done in bulk here it is four $group passes.
 *
 * ── `priority` and `changefreq` are gone ─────────────────────────────────────
 *
 * Google has said for years that it ignores both. They were also actively
 * embarrassing here: priority was computed as `base - 0.2` in floating point
 * and serialised as `0.49999999999999994`.
 *
 * ── Cost, measured 2026-10-14 ───────────────────────────────────────────────
 *
 * The two aggregations each gate needs run in PARALLEL, which matters and is
 * the opposite of the note in lib/sitemap-generator.ts about per-county
 * parallelism being slower. That case was concurrent cursors on ONE collection
 * contending for the same I/O. These are different collections:
 *
 *   cities:       33s sequential → 22s parallel
 *   subdivisions: 49s sequential → 22s parallel
 *
 * Both fit inside a 60s function. Cached in-process for 6h afterwards.
 */

import dbConnect from '@/lib/mongoose'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { City } from '@/models/cities'
import Subdivision from '@/models/subdivisions'
import { isNonPlaceSubdivision } from '@/lib/neighborhoods-data'
import { FOR_SALE_PRICE_FLOOR } from '@/lib/market-stats'
import {
  getCityIndexabilityFromCounts,
  getSubdivisionIndexabilityFromCounts,
} from '@/lib/indexability'

export interface SitemapEntry {
  loc: string
  /** ISO 8601. Omitted rather than faked when there is nothing real to say. */
  lastmod?: string
}

const SOCAL_COUNTIES = [
  'Los Angeles', 'Orange', 'Riverside', 'San Bernardino',
  'San Diego', 'Ventura', 'Imperial', 'Santa Barbara',
]

const DAY_MS = 86_400_000
const TRAILING_DAYS = 365

/**
 * Last time a static page's CONTENT changed.
 *
 * Hardcoded on purpose, which the audit explicitly allows. The alternative —
 * build time — is the same lie the old generator told for every URL, just
 * narrowed to seven of them. Bump this when you change the homepage, /about,
 * /buy, /sell, /contact, /mls-listings or /neighborhoods.
 */
const STATIC_PAGES_LAST_MODIFIED = '2026-10-14T00:00:00.000Z'

/**
 * Listing sitemaps are partitioned BY COUNTY, not by a page number.
 *
 * The first version of this used `skip: (page - 1) * 10_000` with a
 * `modificationTimestamp` sort, and listings-2/3/4 returned 504 in production
 * — the exact FUNCTION_INVOCATION_TIMEOUT this whole split was meant to end.
 * Two compounding reasons, measured 2026-10-14:
 *
 *   - `skip` is O(n) in MongoDB. It walks and discards every skipped document,
 *     so page 4 pays for 30,000 rows before returning one.
 *   - The sort was NOT index-covered. `modificationTimestamp_desc` indexes the
 *     sort key alone, but the filter also constrains `countyOrParish` and
 *     `slugAddress`, so the planner either scans the sort index and filters
 *     row by row, or filters first and sorts in memory. Either way the
 *     "the sort is free here" claim in the original comment was wrong.
 *
 *   page-2 query, as shipped:        55,082ms  (504s behind a 60s limit)
 *   per-county, no sort, no skip:    14,959ms worst case (Los Angeles)
 *
 * County is the right partition because `idx_county_status` already covers
 * {countyOrParish, standardStatus}, the split is deterministic and stable
 * (a URL never migrates between children as inventory changes, which a
 * page-number split does on every crawl), and the largest county is 15,728
 * URLs — comfortably under the spec's 50,000.
 *
 * Counts on 2026-10-14: LA 15,728 · Riverside 7,883 · San Bernardino 6,353 ·
 * Orange 4,890 · San Diego 2,761 · Ventura 1,545 · Santa Barbara 281 ·
 * Imperial 63. Total 39,504.
 */
export const LISTING_COUNTY_PARTITIONS = SOCAL_COUNTIES

/** `Los Angeles` → `los-angeles`, for the child sitemap's URL. */
function countySlug(county: string): string {
  return county.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Reverse of countySlug, so the route can resolve a child back to a county. */
export function countyFromSlug(slug: string): string | null {
  return LISTING_COUNTY_PARTITIONS.find((c) => countySlug(c) === slug) || null
}

const TTL_MS = 6 * 60 * 60 * 1000
const cache = new Map<string, { at: number; value: unknown }>()

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T
  const value = await fn()
  // Never cache an empty result: a transient DB blip would otherwise become a
  // six-hour outage of this child sitemap.
  if (Array.isArray(value) ? value.length > 0 : value != null) {
    cache.set(key, { at: Date.now(), value })
  }
  return value
}

async function db() {
  await dbConnect()
  const conn = mongoose.connection.db
  if (!conn) throw new Error('[sitemap-sources] no mongo connection')
  return conn
}

// ─────────────────────────────────────────────────────
// XML
// ─────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** A urlset document. No changefreq, no priority — see the header. */
export function renderUrlset(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : ''
      return `<url><loc>${escapeXml(e.loc)}</loc>${lastmod}</url>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}

/** A sitemapindex document. */
export function renderSitemapIndex(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : ''
      return `<sitemap><loc>${escapeXml(e.loc)}</loc>${lastmod}</sitemap>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`
}

/**
 * `modificationTimestamp` is stored as an ISO STRING ("2026-09-17T12:30:46Z"),
 * not a Date. That is why `$max` on it works at all — Z-suffixed ISO-8601 sorts
 * correctly as a string — and why it needs normalising before it goes in XML.
 */
function toIso(value: unknown): string | undefined {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** The newer of two timestamps, either of which may be missing. */
function newest(...values: (string | undefined)[]): string | undefined {
  const valid = values.filter(Boolean) as string[]
  if (!valid.length) return undefined
  return valid.reduce((a, b) => (a > b ? a : b))
}

// ─────────────────────────────────────────────────────
// Static pages
// ─────────────────────────────────────────────────────

/**
 * The static pages, every one of which returns 200 and is self-canonical.
 *
 * `/selling` is NOT here any more. It was declared for months while its
 * component rendered the literal string "page" inside a div; it now 301s to
 * /sell, which is a real page. A declared URL that renders nothing spends
 * crawl budget to prove the site has empty pages.
 */
export function getStaticEntries(baseUrl: string): SitemapEntry[] {
  return [
    '',
    '/about',
    '/buy',
    '/sell',
    '/neighborhoods',
    '/mls-listings',
    '/book-appointment',
    '/contact',
  ].map((p) => ({ loc: `${baseUrl}${p}`, lastmod: STATIC_PAGES_LAST_MODIFIED }))
}

// ─────────────────────────────────────────────────────
// Cities
// ─────────────────────────────────────────────────────

interface CityAggRow {
  _id: string
  last?: string
  resi: number
}

export async function getCityEntries(baseUrl: string): Promise<SitemapEntry[]> {
  return cached(`cities:${baseUrl}`, async () => {
    try {
      const conn = await db()
      const since = new Date(Date.now() - TRAILING_DAYS * DAY_MS)

      // Parallel across two collections — 22s vs 33s sequential.
      const [activeRows, closedRows, cityDocs] = await Promise.all([
        conn
          .collection('unified_listings')
          .aggregate<CityAggRow>(
            [
              { $match: { standardStatus: 'Active', countyOrParish: { $in: SOCAL_COUNTIES } } },
              {
                $group: {
                  _id: '$city',
                  // The freshest listing change in the city. This is the real
                  // lastmod for a city page: the page's content IS its
                  // inventory, so a new listing or a price change is a content
                  // change.
                  last: { $max: '$modificationTimestamp' },
                  resi: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$propertyType', 'A'] },
                            { $gte: ['$listPrice', FOR_SALE_PRICE_FLOOR] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            { allowDiskUse: true },
          )
          .toArray(),
        conn
          .collection('unified_closed_listings')
          .aggregate(
            [
              {
                $match: {
                  countyOrParish: { $in: SOCAL_COUNTIES },
                  propertyType: 'A',
                  closeDate: { $gte: since },
                  closePrice: { $gte: FOR_SALE_PRICE_FLOOR },
                },
              },
              {
                $group: {
                  _id: '$city',
                  n: { $sum: 1 },
                  withDom: { $sum: { $cond: [{ $ifNull: ['$onMarketDate', false] }, 1, 0] } },
                  withRatio: {
                    $sum: {
                      $cond: [{ $gte: ['$listPrice', FOR_SALE_PRICE_FLOOR] }, 1, 0],
                    },
                  },
                },
              },
            ],
            { allowDiskUse: true },
          )
          .toArray(),
        City.find({ county: { $in: SOCAL_COUNTIES } })
          // `region` drives the staged rollout — see SEO_ROLLOUT_REGIONS in
          // lib/indexability. Selecting it here is what keeps the sitemap and
          // the page agreeing about which batch is live.
          .select('name slug region lastUpdated')
          .lean(),
      ])

      const activeByCity = new Map(activeRows.map((r) => [String(r._id), r]))
      const closedByCity = new Map(closedRows.map((r: any) => [String(r._id), r]))

      const entries: SitemapEntry[] = []
      let gated = 0
      for (const doc of cityDocs as any[]) {
        if (!doc?.slug || !doc?.name) continue
        const active = activeByCity.get(doc.name)
        const closed = closedByCity.get(doc.name)

        const gate = getCityIndexabilityFromCounts(
          {
            activeCount: active?.resi ?? 0,
            closedCount: closed?.n ?? 0,
            closedWithDom: closed?.withDom ?? 0,
            closedWithListPrice: closed?.withRatio ?? 0,
          },
          doc.region,
        )
        if (!gate.index) {
          gated++
          continue
        }

        // Newer of "inventory changed" and "the city record was re-aggregated".
        entries.push({
          loc: `${baseUrl}/neighborhoods/${doc.slug}`,
          lastmod: newest(toIso(active?.last), toIso(doc.lastUpdated)),
        })
      }

      // NOTE: no /buy or /sell city URLs. Those ~460 pages 301 to the city
      // page's #buy / #sell sections now, and a sitemap must never list a URL
      // that redirects.
      console.log(
        `[sitemap] cities: ${entries.length} indexable, ${gated} gated out of ${cityDocs.length}`,
      )
      return entries
    } catch (error) {
      console.error('[sitemap-sources] getCityEntries failed:', error)
      return []
    }
  })
}

// ─────────────────────────────────────────────────────
// Subdivisions
// ─────────────────────────────────────────────────────

function hasFacts(sub: any): boolean {
  const f = sub?.communityFacts
  if (!f || typeof f !== 'object') return false
  return Object.values(f).some((v) => v !== null && v !== undefined && v !== '')
}

export async function getSubdivisionEntries(baseUrl: string): Promise<SitemapEntry[]> {
  return cached(`subdivisions:${baseUrl}`, async () => {
    try {
      const conn = await db()
      const since = new Date(Date.now() - TRAILING_DAYS * DAY_MS)

      const [activeRows, closedRows, subDocs, cityDocs] = await Promise.all([
        conn
          .collection('unified_listings')
          .aggregate(
            [
              {
                $match: {
                  standardStatus: 'Active',
                  countyOrParish: { $in: SOCAL_COUNTIES },
                  propertyType: 'A',
                  listPrice: { $gte: FOR_SALE_PRICE_FLOOR },
                },
              },
              {
                $group: {
                  _id: { c: '$city', s: '$subdivisionName' },
                  n: { $sum: 1 },
                  last: { $max: '$modificationTimestamp' },
                },
              },
            ],
            { allowDiskUse: true },
          )
          .toArray(),
        conn
          .collection('unified_closed_listings')
          .aggregate(
            [
              {
                $match: {
                  countyOrParish: { $in: SOCAL_COUNTIES },
                  propertyType: 'A',
                  closeDate: { $gte: since },
                  closePrice: { $gte: FOR_SALE_PRICE_FLOOR },
                },
              },
              { $group: { _id: { c: '$city', s: '$subdivisionName' }, n: { $sum: 1 } } },
            ],
            { allowDiskUse: true },
          )
          .toArray(),
        Subdivision.find({ county: { $in: SOCAL_COUNTIES } })
          .select('name slug city region hasManualData communityFacts lastUpdated')
          .lean(),
        City.find({ county: { $in: SOCAL_COUNTIES } })
          .select('name slug')
          .lean(),
      ])

      const key = (city: string, sub: string) => `${city}\u0000${sub}`
      const activeBy = new Map(
        activeRows.map((r: any) => [key(String(r._id?.c), String(r._id?.s)), r]),
      )
      const closedBy = new Map(
        closedRows.map((r: any) => [key(String(r._id?.c), String(r._id?.s)), r]),
      )
      // The route resolves the city from the subdivision RECORD, so the slug
      // must come from the city collection rather than being re-derived — that
      // mismatch is what produced 4 declared 404s before 2026-10-11.
      const citySlugByName = new Map((cityDocs as any[]).map((c) => [c.name, c.slug]))

      const entries: SitemapEntry[] = []
      let gated = 0
      for (const sub of subDocs as any[]) {
        if (!sub?.slug || !sub?.name || !sub?.city) continue
        if (isNonPlaceSubdivision(sub.name)) {
          gated++
          continue
        }
        const citySlug = citySlugByName.get(sub.city)
        if (!citySlug) continue

        const k = key(sub.city, sub.name)
        const active = activeBy.get(k)
        const closed = closedBy.get(k)

        const gate = getSubdivisionIndexabilityFromCounts(
          {
            name: sub.name,
            hasManualData: sub.hasManualData,
            hasCommunityFacts: hasFacts(sub),
          },
          { activeCount: active?.n ?? 0, closedCount: closed?.n ?? 0 },
          sub.region,
        )
        if (!gate.index) {
          gated++
          continue
        }

        entries.push({
          loc: `${baseUrl}/neighborhoods/${citySlug}/${sub.slug}`,
          lastmod: newest(toIso(active?.last), toIso(sub.lastUpdated)),
        })
      }

      console.log(
        `[sitemap] subdivisions: ${entries.length} indexable, ${gated} gated out of ${subDocs.length}`,
      )
      return entries
    } catch (error) {
      console.error('[sitemap-sources] getSubdivisionEntries failed:', error)
      return []
    }
  })
}

// ─────────────────────────────────────────────────────
// Listings
// ─────────────────────────────────────────────────────

/**
 * Active listing URLs for one county.
 *
 * `lastmod` is the listing's own `modificationTimestamp`, which is the one
 * thing the original single-file generator already got right.
 *
 * NO `.sort()` and NO `.skip()`, both deliberately — see the note on
 * LISTING_COUNTY_PARTITIONS for the 55s measurement that killed the previous
 * shape. This is the same rule as lib/crawl-index.ts: let Mongo stream matches
 * off an index and stop. Sitemap entries carry their own lastmod, so document
 * order is meaningless to the consumer anyway.
 */
export async function getListingEntries(
  baseUrl: string,
  county: string,
): Promise<SitemapEntry[]> {
  return cached(`listings:${baseUrl}:${county}`, async () => {
    try {
      const conn = await db()
      const rows = await conn
        .collection('unified_listings')
        .find(
          {
            // Field order matches idx_county_status so the planner has an
            // obvious choice.
            countyOrParish: county,
            standardStatus: 'Active',
            propertyType: 'A',
            slugAddress: { $exists: true, $ne: null },
          },
          {
            projection: { slugAddress: 1, modificationTimestamp: 1 },
            // A ceiling, not a page size: the largest county is 15,728 and the
            // sitemap spec allows 50,000. If a county ever crosses this, split
            // THAT county (by postal code, say) rather than raising the number.
            limit: 50_000,
          },
        )
        .toArray()

      const seen = new Set<string>()
      const entries: SitemapEntry[] = []
      for (const r of rows as any[]) {
        const slug = r?.slugAddress
        // A slug carrying XML metacharacters would break the document; it also
        // cannot be a real URL on this site.
        if (!slug || seen.has(slug) || /[&<>"']/.test(slug)) continue
        seen.add(slug)
        entries.push({
          loc: `${baseUrl}/mls-listings/${slug}`,
          lastmod: toIso(r.modificationTimestamp),
        })
      }
      return entries
    } catch (error) {
      console.error('[sitemap-sources] getListingEntries failed:', county, error)
      return []
    }
  })
}

// ─────────────────────────────────────────────────────
// Articles
// ─────────────────────────────────────────────────────

/**
 * Articles, from MONGO — which is the source of truth (see
 * docs/ARCHITECTURE.md: the MDX files in src/posts are a git-stored mirror and
 * production reads Mongo only).
 *
 * The old generator read the MDX directory and used frontmatter `date`, i.e.
 * the PUBLISH date, as lastmod. So an article edited last week still declared
 * its original publish date and Google had no reason to recrawl it. `updatedAt`
 * is the field that actually answers "has this changed".
 *
 * Articles are the highest-CTR pages on this site (1.74% vs 0.35% for city
 * pages), so getting their recrawl signal right is worth more here than
 * anywhere else. The MDX directory stays as a fallback for when Mongo is
 * unreachable.
 */
export async function getArticleEntries(
  baseUrl: string,
  agentName?: string,
): Promise<SitemapEntry[]> {
  return cached(`articles:${baseUrl}:${agentName || ''}`, async () => {
    try {
      const conn = await db()
      const rows = await conn
        .collection('articles')
        .find(
          { status: 'published' },
          { projection: { slug: 1, category: 1, updatedAt: 1, publishedAt: 1, author: 1 } },
        )
        .toArray()

      const entries: SitemapEntry[] = []
      for (const a of rows as any[]) {
        if (!a?.slug || !a?.category) continue
        // On an agent domain, only that agent's articles. Same filter the old
        // generator applied by frontmatter author.
        if (agentName && a.author?.name && a.author.name !== agentName) continue
        const loc =
          a.category === 'landing-page'
            ? `${baseUrl}/lp/${a.slug}`
            : `${baseUrl}/insights/${a.category}/${a.slug}`
        entries.push({
          loc,
          lastmod: newest(toIso(a.updatedAt), toIso(a.publishedAt)),
        })
      }
      if (entries.length) return entries
    } catch (error) {
      console.error('[sitemap-sources] getArticleEntries (mongo) failed:', error)
    }

    // Fallback: the MDX mirror.
    try {
      const postsDir = path.join(process.cwd(), 'src/posts')
      if (!fs.existsSync(postsDir)) return []
      const entries: SitemapEntry[] = []
      for (const file of fs.readdirSync(postsDir).filter((f) => f.endsWith('.mdx'))) {
        const { data } = matter(fs.readFileSync(path.join(postsDir, file), 'utf-8'))
        if (!data.slugId || !data.section) continue
        if (agentName && data.author && data.author !== agentName) continue
        const loc =
          data.section === 'landing-page'
            ? `${baseUrl}/lp/${data.slugId}`
            : `${baseUrl}/insights/${data.section}/${data.slugId}`
        entries.push({ loc, lastmod: toIso(data.date) })
      }
      return entries
    } catch (error) {
      console.error('[sitemap-sources] getArticleEntries (mdx) failed:', error)
      return []
    }
  })
}

// ─────────────────────────────────────────────────────
// The index
// ─────────────────────────────────────────────────────

export interface ChildSitemap {
  slug: string
  label: string
}

/**
 * The child sitemaps, in the order the index declares them.
 *
 * Served from /sitemap/{slug}.xml — the same shape Next.js's own
 * `generateSitemaps()` produces, so it is the idiomatic layout for this router
 * even though the audit suggested root-level `sitemap-cities.xml` names. Google
 * does not care about the filenames, only the index structure.
 */
export function getChildSitemaps(): ChildSitemap[] {
  // Synchronous and DB-free on purpose. The previous version called
  // getListingPageCount(), a countDocuments over the whole filter, which made
  // the INDEX itself an 18.6s request — the one document Googlebot fetches
  // most often. The county list is static, so the index is now instant.
  return [
    { slug: 'static', label: 'Static pages' },
    { slug: 'cities', label: 'City pages' },
    { slug: 'subdivisions', label: 'Subdivision pages' },
    { slug: 'articles', label: 'Articles and landing pages' },
    ...LISTING_COUNTY_PARTITIONS.map((county) => ({
      slug: `listings-${countySlug(county)}`,
      label: `Listings — ${county} County`,
    })),
  ]
}
