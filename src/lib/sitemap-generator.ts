/**
 * Dynamic per-domain sitemap generator for the ChatRealty multi-tenant network.
 *
 * Each domain gets a sitemap reflecting only its relevant content:
 *   - chatrealty.io                         => platform pages only
 *   - agent custom domains / subdomains     => agent-specific pages (includes jpsrealtor.com, etc.)
 */

import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dbConnect from '@/lib/mongoose'
import UnifiedListing from '@/models/unified-listing'
import { City } from '@/models/cities'
import Subdivision from '@/models/subdivisions'
import { NON_PLACE_SUBDIVISION_NAMES } from '@/lib/neighborhoods-data'
import { CRMLSListing } from '@/models/crmls-listings'
import User from '@/models/User'
import { getBaseUrl } from '@/lib/domain-utils'

// ─────────────────────────────────────────────────────
// Domain classification
// ─────────────────────────────────────────────────────

type DomainType = 'platform' | 'agent'

interface DomainInfo {
  type: DomainType
  baseUrl: string
  /** Only set for type === 'agent' */
  agentId?: string
  /** Service area city names for agent domains */
  serviceAreas?: string[]
  /** Agent's blog posts (slugIds) */
  agentName?: string
}

/** Platform domain */
const PLATFORM_DOMAINS = ['chatrealty.io', 'www.chatrealty.io']

/**
 * Classify a hostname and resolve associated agent data (if applicable).
 */
export async function resolveDomain(hostname: string): Promise<DomainInfo> {
  const host = hostname.replace(/:\d+$/, '').toLowerCase() // strip port

  // 1. Platform domain
  if (PLATFORM_DOMAINS.includes(host)) {
    return { type: 'platform', baseUrl: `https://${host}` }
  }

  // 3. Agent subdomain on chatrealty.io (e.g., agent-name.chatrealty.io)
  const subdomainMatch = host.match(/^([a-z0-9-]+)\.chatrealty\.io$/)
  if (subdomainMatch) {
    const subdomain = subdomainMatch[1]
    if (subdomain === 'www') {
      return { type: 'platform', baseUrl: 'https://chatrealty.io' }
    }
    return await resolveAgentBySubdomain(subdomain, host)
  }

  // 4. Agent custom domain — look up in DB
  return await resolveAgentByCustomDomain(host)
}

async function resolveAgentBySubdomain(subdomain: string, host: string): Promise<DomainInfo> {
  try {
    await dbConnect()
    const agent = await User.findOne({ 'agentProfile.subdomain': subdomain })
      .select('_id name agentProfile.serviceAreas agentProfile.subdomain')
      .lean()

    if (agent) {
      const ap = (agent as any).agentProfile || {}
      return {
        type: 'agent',
        baseUrl: `https://${host}`,
        agentId: (agent as any)._id.toString(),
        agentName: (agent as any).name,
        serviceAreas: (ap.serviceAreas || []).map((a: any) => a.name || a),
      }
    }
  } catch (err) {
    console.error('[Sitemap] Error resolving subdomain:', subdomain, err)
  }

  // Fallback: treat as platform
  return { type: 'platform', baseUrl: `https://${host}` }
}

async function resolveAgentByCustomDomain(host: string): Promise<DomainInfo> {
  // The <loc> host is the CANONICAL primary (getBaseUrl applies the
  // supplementary→primary alias), never the raw request host — a sitemap on
  // josephsardella.com listing josephsardella.com URLs was directly fighting
  // the canonical consolidation to jpsrealtor.com.
  const canonicalBase = getBaseUrl(host)
  const bareHost = host.replace(/^www\./, '')

  try {
    await dbConnect()
    // customDomain with and without www, matching the other host resolvers.
    let agent: any = await User.findOne({
      'agentProfile.customDomain': { $in: [host, bareHost, `www.${bareHost}`] },
    })
      .select('_id name agentProfile.serviceAreas agentProfile.customDomain')
      .lean()

    // DomainRegistry fallback: hosts registered to an agent that aren't their
    // agentProfile.customDomain (jpsrealtor.com — the PRIMARY — is exactly
    // this case; without it the primary domain got the 11-URL platform
    // sitemap while the 2,189-URL agent sitemap only existed on the
    // supplementary domain).
    if (!agent) {
      const mongooseMod = await import('mongoose')
      const db = mongooseMod.default.connection.db
      if (db) {
        const entry = await db
          .collection('domainregistries')
          .findOne(
            { domain: { $in: [host, bareHost] }, status: 'active', ownerId: { $ne: null } },
            { projection: { ownerId: 1 } }
          )
        if (entry?.ownerId) {
          agent = await User.findById(entry.ownerId)
            .select('_id name agentProfile.serviceAreas agentProfile.customDomain')
            .lean()
        }
      }
    }

    if (agent) {
      const ap = (agent as any).agentProfile || {}
      return {
        type: 'agent',
        baseUrl: canonicalBase,
        agentId: (agent as any)._id.toString(),
        agentName: (agent as any).name,
        serviceAreas: (ap.serviceAreas || []).map((a: any) => a.name || a),
      }
    }
  } catch (err) {
    console.error('[Sitemap] Error resolving custom domain:', host, err)
  }

  // Unknown domain — default to platform
  return { type: 'platform', baseUrl: `https://${host}` }
}

// ─────────────────────────────────────────────────────
// Sitemap generators per domain type
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// Indexable scope: Southern California, Coachella Valley emphasized
// ─────────────────────────────────────────────────────
//
// Why this is not the agent's serviceAreas: a sitemap is the ONLY channel
// Google has for discovering listing pages here — no hub page renders
// server-side <a href> links to a listing, and /chap (the map that exposes
// the whole catalog) is Disallowed in robots.txt. Measured 2026-10-11 on a
// random sample of 200 active listings: 100% of sitemap-declared listings
// were "Submitted and indexed", while 82% of undeclared ones came back
// "URL is unknown to Google". Narrowing this filter to 6 service-area cities
// left ~45,600 live listing pages undiscoverable and pinned the whole domain
// at ~3,700 indexed pages. Declared scope == indexed scope, so the filter
// below defines reach.
const SOCAL_COUNTIES = [
  'Los Angeles', 'Orange', 'Riverside', 'San Bernardino',
  'San Diego', 'Ventura', 'Imperial', 'Santa Barbara',
]

// Coachella Valley keeps top sitemap priority — this is still a CV-first site,
// the rest of SoCal is reach.
const COACHELLA_VALLEY_CITIES = [
  'Palm Springs', 'Palm Desert', 'La Quinta', 'Indio', 'Rancho Mirage',
  'Indian Wells', 'Cathedral City', 'Desert Hot Springs', 'Coachella',
  'Thousand Palms', 'Bermuda Dunes', 'Thermal', 'Mecca', 'Sky Valley',
  'North Shore', 'Desert Center', 'North Palm Springs', 'Oasis',
  'Cabazon', 'Whitewater',
]

interface ScopeCity { name: string; slug: string; isCV: boolean }

/** SoCal cities that actually have inventory, CV first. */
async function getScopeCities(): Promise<ScopeCity[]> {
  try {
    await dbConnect()
    const rows = await City.find({
      listingCount: { $gt: 0 },
      county: { $in: SOCAL_COUNTIES },
    }).select('name slug').sort({ listingCount: -1 }).lean()

    const cvSet = new Set(COACHELLA_VALLEY_CITIES.map(c => c.toLowerCase()))
    return (rows as any[])
      .filter(r => r?.slug && r?.name)
      .map(r => ({ name: r.name, slug: r.slug, isCV: cvSet.has(String(r.name).toLowerCase()) }))
      .sort((a, b) => Number(b.isCV) - Number(a.isCV))
  } catch (error) {
    console.error('[Sitemap] getScopeCities failed:', error)
    return []
  }
}

// Hard ceiling for a single sitemap file. The spec allows 50,000 URLs;
// we stay under it so static/city/subdivision/blog entries always fit and
// only the long tail of listings is ever truncated. Crossing this means
// splitting into a sitemap index (generateSitemaps), not raising the number.
const SITEMAP_URL_CEILING = 49_500

/**
 * Main entry point: generate sitemap entries for the requesting domain.
 */
export async function generateSitemapForDomain(hostname: string): Promise<MetadataRoute.Sitemap> {
  const domain = await resolveDomain(hostname)

  switch (domain.type) {
    case 'platform':
      return generatePlatformSitemap(domain)
    case 'agent':
      return generateAgentSitemap(domain)
    default:
      return generatePlatformSitemap(domain)
  }
}

function getCityPages(baseUrl: string, now: Date, scope: ScopeCity[]): MetadataRoute.Sitemap {
  return scope.flatMap((city) => {
    // CV stays the priority tier; the rest of SoCal is reach.
    const base = city.isCV ? 0.9 : 0.7
    return [
      { url: `${baseUrl}/neighborhoods/${city.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: base },
      { url: `${baseUrl}/neighborhoods/${city.slug}/buy`, lastModified: now, changeFrequency: 'weekly' as const, priority: base - 0.2 },
      { url: `${baseUrl}/neighborhoods/${city.slug}/sell`, lastModified: now, changeFrequency: 'weekly' as const, priority: base - 0.2 },
    ]
  })
}

async function getSubdivisionPages(baseUrl: string, now: Date, scope: ScopeCity[]): Promise<MetadataRoute.Sitemap> {
  if (!scope.length) return []
  try {
    await dbConnect()
    const cityBySlug = new Map(scope.map(c => [c.name, c]))
    const rows = await Subdivision.find({
      listingCount: { $gt: 0 },
      city: { $in: scope.map(c => c.name) },
      // "Not Applicable" et al are MLS filler, not neighborhoods. Declaring them
      // ships thin duplicate pages that the directory page does not even link to.
      name: { $nin: NON_PLACE_SUBDIVISION_NAMES },
    }).select('slug city').sort({ listingCount: -1 }).lean()

    const pages: MetadataRoute.Sitemap = []
    for (const row of rows as any[]) {
      const city = cityBySlug.get(row?.city)
      if (!city || !row?.slug) continue
      pages.push({
        url: `${baseUrl}/neighborhoods/${city.slug}/${row.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: city.isCV ? 0.8 : 0.6,
      })
    }
    return pages
  } catch (error) {
    console.error('[Sitemap] getSubdivisionPages failed:', error)
    return []
  }
}

function getBlogPages(baseUrl: string, now: Date, agentName?: string): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = []
  const postsDir = path.join(process.cwd(), 'src/posts')
  if (!fs.existsSync(postsDir)) return pages

  const blogFiles = fs.readdirSync(postsDir).filter((file) => file.endsWith('.mdx'))
  blogFiles.forEach((file) => {
    const filePath = path.join(postsDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(fileContent)

    if (!data.slugId || !data.section) return

    // For agent domains, only include posts authored by this agent
    if (agentName && data.author && data.author !== agentName) return

    const url = data.section === 'landing-page'
      ? `${baseUrl}/lp/${data.slugId}`
      : `${baseUrl}/insights/${data.section}/${data.slugId}`

    pages.push({
      url,
      lastModified: data.date ? new Date(data.date) : now,
      changeFrequency: data.section === 'landing-page' ? 'weekly' : 'monthly',
      priority: data.section === 'landing-page' ? 0.8 : 0.7,
    })
  })

  return pages
}

async function getListingPages(
  baseUrl: string,
  now: Date,
  scope: ScopeCity[],
  budget: number,
): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = []
  if (!scope.length || budget <= 0) return pages

  try {
    await dbConnect()

    const cvNames = scope.filter(c => c.isCV).map(c => c.name)
    const allNames = scope.map(c => c.name)

    const baseFilter = {
      standardStatus: 'Active',
      propertyType: 'A',
      slugAddress: { $exists: true, $ne: null },
    }

    // Two passes so the CV inventory is never the part that gets truncated
    // when the 50K-per-file sitemap ceiling bites.
    const select = 'slugAddress modificationTimestamp city'
    const [cvGps, cvCrmls] = await Promise.all([
      UnifiedListing.find({ ...baseFilter, city: { $in: cvNames } } as any)
        .select(select).sort({ modificationTimestamp: -1 }).limit(budget).lean(),
      CRMLSListing.find({ ...baseFilter, city: { $in: cvNames } } as any)
        .select(select).sort({ modificationTimestamp: -1 }).limit(budget).lean(),
    ])

    const seen = new Set<string>()
    const push = (listing: any, priority: number) => {
      const slug = listing?.slugAddress
      if (!slug || seen.has(slug)) return
      if (/[&<>"']/.test(slug)) return
      seen.add(slug)
      pages.push({
        url: `${baseUrl}/mls-listings/${slug}`,
        lastModified: listing.modificationTimestamp
          ? new Date(listing.modificationTimestamp)
          : now,
        changeFrequency: 'daily',
        priority,
      })
    }

    for (const l of [...cvGps, ...cvCrmls]) {
      if (pages.length >= budget) break
      push(l, 0.8)
    }

    if (pages.length < budget) {
      const remaining = budget - pages.length
      const [gps, crmls] = await Promise.all([
        UnifiedListing.find({ ...baseFilter, city: { $in: allNames } } as any)
          .select(select).sort({ modificationTimestamp: -1 }).limit(remaining + seen.size).lean(),
        CRMLSListing.find({ ...baseFilter, city: { $in: allNames } } as any)
          .select(select).sort({ modificationTimestamp: -1 }).limit(remaining + seen.size).lean(),
      ])
      for (const l of [...gps, ...crmls]) {
        if (pages.length >= budget) break
        push(l, 0.6)
      }
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching MLS listings:', error)
  }

  return pages
}

// ─────────────────────────────────────────────────────
// 2. Platform (chatrealty.io) — landing + directory only
// ─────────────────────────────────────────────────────

async function generatePlatformSitemap(domain: DomainInfo): Promise<MetadataRoute.Sitemap> {
  const { baseUrl } = domain
  const now = new Date()

  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms-of-service`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // NO cross-host <loc> entries. The sitemap protocol requires every URL to
  // live on the sitemap's own host — agent domains/subdomains listed here
  // were invalid and ignored by Google. Agent sites are discovered via their
  // OWN per-host sitemaps (this same route, served on their domain) plus
  // on-page cross-links, not via the platform sitemap.

  console.log(`[Sitemap] ${baseUrl}: ${pages.length} platform URLs`)
  return pages
}

// ─────────────────────────────────────────────────────
// 3. Agent custom domain / subdomain — agent-specific
// ─────────────────────────────────────────────────────

async function generateAgentSitemap(domain: DomainInfo): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, agentName } = domain
  const now = new Date()

  // Agent static pages (their profile, appointment, listings)
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/book-appointment`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/mls-listings`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/selling`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/neighborhoods`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]

  // Scope is Southern California (CV weighted first), NOT the agent's
  // serviceAreas — see the note on SOCAL_COUNTIES. Anything left out of this
  // sitemap is, in practice, invisible to Google on this site.
  const scope = await getScopeCities()

  const cityPages = getCityPages(baseUrl, now, scope)
  const subdivisionPages = await getSubdivisionPages(baseUrl, now, scope)

  // Blog posts (filtered to agent's authored content, or all if no filter applies)
  const blogPages = getBlogPages(baseUrl, now, agentName)

  // Listings take whatever room is left under the single-file ceiling.
  const fixedCount =
    staticPages.length + cityPages.length + subdivisionPages.length + blogPages.length
  const listingPages = await getListingPages(
    baseUrl,
    now,
    scope,
    SITEMAP_URL_CEILING - fixedCount,
  )

  // No cross-host entries (sitemap protocol: every <loc> must be on the
  // sitemap's own host — the old chatrealty.io link here was invalid).
  const allPages = [
    ...staticPages,
    ...cityPages,
    ...subdivisionPages,
    ...blogPages,
    ...listingPages,
  ]

  console.log(
    `[Sitemap] ${baseUrl} (agent): ${staticPages.length} static, ${cityPages.length} city, ` +
    `${subdivisionPages.length} subdivision, ${blogPages.length} blog, ` +
    `${listingPages.length} listings = ${allPages.length} total URLs ` +
    `(scope: ${scope.length} SoCal cities, ceiling ${SITEMAP_URL_CEILING})`
  )

  return allPages
}
