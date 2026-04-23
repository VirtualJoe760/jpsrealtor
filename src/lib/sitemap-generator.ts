/**
 * Dynamic per-domain sitemap generator for the ChatRealty multi-tenant network.
 *
 * Each domain gets a sitemap reflecting only its relevant content:
 *   - jpsrealtor.com / josephsardella.com  => full agent site
 *   - chatrealty.io                         => platform pages only
 *   - agent custom domains / subdomains     => agent-specific pages
 */

import { MetadataRoute } from 'next'
import { coachellaValleyCities as cities } from '@/app/constants/cities'
import subdivisions from '@/app/constants/subdivisions'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dbConnect from '@/lib/mongoose'
import UnifiedListing from '@/models/unified-listing'
import { CRMLSListing } from '@/models/crmls-listings'
import User from '@/models/User'

// ─────────────────────────────────────────────────────
// Domain classification
// ─────────────────────────────────────────────────────

type DomainType = 'jpsrealtor' | 'platform' | 'agent'

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

/** Canonical domain aliases — these all resolve to Joseph Sardella's full site */
const JPS_DOMAINS = ['jpsrealtor.com', 'www.jpsrealtor.com', 'josephsardella.com', 'www.josephsardella.com']

/** Platform domain */
const PLATFORM_DOMAINS = ['chatrealty.io', 'www.chatrealty.io']

/**
 * Classify a hostname and resolve associated agent data (if applicable).
 */
export async function resolveDomain(hostname: string): Promise<DomainInfo> {
  const host = hostname.replace(/:\d+$/, '').toLowerCase() // strip port

  // 1. JPS Realtor domains
  if (JPS_DOMAINS.includes(host)) {
    return { type: 'jpsrealtor', baseUrl: `https://${host}` }
  }

  // 2. Platform domain
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
  try {
    await dbConnect()
    const agent = await User.findOne({ 'agentProfile.customDomain': host })
      .select('_id name agentProfile.serviceAreas agentProfile.customDomain')
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
    console.error('[Sitemap] Error resolving custom domain:', host, err)
  }

  // Unknown domain — default to platform
  return { type: 'platform', baseUrl: `https://${host}` }
}

// ─────────────────────────────────────────────────────
// Sitemap generators per domain type
// ─────────────────────────────────────────────────────

const MAX_LISTING_URLS = 49_000

/**
 * Main entry point: generate sitemap entries for the requesting domain.
 */
export async function generateSitemapForDomain(hostname: string): Promise<MetadataRoute.Sitemap> {
  const domain = await resolveDomain(hostname)

  switch (domain.type) {
    case 'jpsrealtor':
      return generateJpsRealtorSitemap(domain)
    case 'platform':
      return generatePlatformSitemap(domain)
    case 'agent':
      return generateAgentSitemap(domain)
    default:
      return generatePlatformSitemap(domain)
  }
}

// ─────────────────────────────────────────────────────
// 1. JPS Realtor — full site (mirrors existing sitemap)
// ─────────────────────────────────────────────────────

async function generateJpsRealtorSitemap(domain: DomainInfo): Promise<MetadataRoute.Sitemap> {
  const { baseUrl } = domain
  const now = new Date()

  const staticPages = getJpsStaticPages(baseUrl, now)
  const cityPages = getCityPages(baseUrl, now)
  const subdivisionPages = getSubdivisionPages(baseUrl, now)
  const blogPages = getBlogPages(baseUrl, now)
  const listingPages = await getListingPages(baseUrl, now)

  const allPages = [...staticPages, ...cityPages, ...subdivisionPages, ...blogPages, ...listingPages]

  console.log(
    `[Sitemap] ${domain.baseUrl}: ${staticPages.length} static, ${cityPages.length} city, ` +
    `${subdivisionPages.length} subdivision, ${blogPages.length} blog, ` +
    `${listingPages.length} listings = ${allPages.length} total URLs`
  )

  return allPages
}

function getJpsStaticPages(baseUrl: string, now: Date): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/selling`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/book-appointment`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/mls-listings`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/neighborhoods`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]
}

function getCityPages(baseUrl: string, now: Date, filterCities?: string[]): MetadataRoute.Sitemap {
  let filteredCities = cities
  if (filterCities?.length) {
    const lcFilter = new Set(filterCities.map(c => c.toLowerCase()))
    filteredCities = cities.filter(c => lcFilter.has(c.name.toLowerCase()))
  }

  return filteredCities.flatMap((city) => [
    { url: `${baseUrl}/neighborhoods/${city.id}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/neighborhoods/${city.id}/buy`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/neighborhoods/${city.id}/sell`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
  ])
}

function getSubdivisionPages(baseUrl: string, now: Date, filterCities?: string[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = []
  const lcFilter = filterCities?.length ? new Set(filterCities.map(c => c.toLowerCase())) : null

  Object.entries(subdivisions).forEach(([cityKey, subdivisionList]) => {
    const city = cities.find((c) => cityKey.includes(c.id))
    if (!city) return
    if (lcFilter && !lcFilter.has(city.name.toLowerCase())) return

    subdivisionList.forEach((sub: any) => {
      pages.push({
        url: `${baseUrl}/neighborhoods/${city.id}/${sub.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    })
  })

  return pages
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
  filterCities?: string[],
): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = []

  try {
    await dbConnect()

    const filter: any = {
      standardStatus: 'Active',
      propertyType: 'A',
      slugAddress: { $exists: true, $ne: null },
    }

    // If filtering by service areas, restrict to those cities
    if (filterCities?.length) {
      filter.city = { $in: filterCities }
    }

    const [gpsListings, crmlsListings] = await Promise.all([
      UnifiedListing.find(filter as any)
        .select('slugAddress modificationTimestamp')
        .sort({ modificationTimestamp: -1 })
        .limit(MAX_LISTING_URLS)
        .lean(),
      CRMLSListing.find(filter as any)
        .select('slugAddress modificationTimestamp')
        .sort({ modificationTimestamp: -1 })
        .limit(MAX_LISTING_URLS)
        .lean(),
    ])

    const seen = new Set<string>()
    const all = [...gpsListings, ...crmlsListings]
    for (const listing of all) {
      let slug = (listing as any).slugAddress
      if (!slug || seen.has(slug)) continue
      if (/[&<>"']/.test(slug)) continue
      seen.add(slug)
      pages.push({
        url: `${baseUrl}/mls-listings/${slug}`,
        lastModified: (listing as any).modificationTimestamp
          ? new Date((listing as any).modificationTimestamp)
          : now,
        changeFrequency: 'daily',
        priority: 0.6,
      })
      if (pages.length >= MAX_LISTING_URLS) break
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

  // Add cross-domain links to known agent sites
  try {
    await dbConnect()
    const agents = await User.find({
      roles: 'realEstateAgent',
      $or: [
        { 'agentProfile.customDomain': { $exists: true, $ne: null } },
        { 'agentProfile.subdomain': { $exists: true, $ne: null } },
      ],
    })
      .select('agentProfile.customDomain agentProfile.subdomain')
      .lean()

    for (const agent of agents) {
      const ap = (agent as any).agentProfile || {}
      if (ap.customDomain) {
        pages.push({
          url: `https://${ap.customDomain}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      } else if (ap.subdomain) {
        pages.push({
          url: `https://${ap.subdomain}.chatrealty.io`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch (err) {
    console.error('[Sitemap] Error fetching agent cross-links:', err)
  }

  console.log(`[Sitemap] ${baseUrl}: ${pages.length} platform URLs`)
  return pages
}

// ─────────────────────────────────────────────────────
// 3. Agent custom domain / subdomain — agent-specific
// ─────────────────────────────────────────────────────

async function generateAgentSitemap(domain: DomainInfo): Promise<MetadataRoute.Sitemap> {
  const { baseUrl, serviceAreas, agentName } = domain
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

  // Neighborhoods limited to the agent's service areas
  const cityPages = getCityPages(baseUrl, now, serviceAreas)
  const subdivisionPages = getSubdivisionPages(baseUrl, now, serviceAreas)

  // Blog posts (filtered to agent's authored content, or all if no filter applies)
  const blogPages = getBlogPages(baseUrl, now, agentName)

  // Listings limited to agent's service area cities
  const listingPages = await getListingPages(baseUrl, now, serviceAreas)

  // Cross-domain link back to platform
  const crossDomainLinks: MetadataRoute.Sitemap = [
    { url: 'https://chatrealty.io', lastModified: now, changeFrequency: 'weekly', priority: 0.3 },
  ]

  const allPages = [
    ...staticPages,
    ...cityPages,
    ...subdivisionPages,
    ...blogPages,
    ...listingPages,
    ...crossDomainLinks,
  ]

  console.log(
    `[Sitemap] ${baseUrl} (agent): ${staticPages.length} static, ${cityPages.length} city, ` +
    `${subdivisionPages.length} subdivision, ${blogPages.length} blog, ` +
    `${listingPages.length} listings = ${allPages.length} total URLs`
  )

  return allPages
}
