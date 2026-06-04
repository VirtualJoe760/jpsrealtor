/**
 * Multi-domain SEO utilities for the ChatRealty multi-tenant network.
 *
 * Provides domain-aware helpers for generating canonical URLs, structured data,
 * and OpenGraph metadata across chatrealty.io (platform) and agent custom
 * domains (including jpsrealtor.com, josephsardella.com, etc.).
 */

import { headers } from 'next/headers'

// ─────────────────────────────────────────────────────
// Domain classification
// ─────────────────────────────────────────────────────

export type DomainType = 'platform' | 'agent'

export interface DomainSeoConfig {
  type: DomainType
  baseUrl: string
  hostname: string
  siteName: string
  siteDescription: string
  defaultTitle: string
  titleTemplate: string
  logoUrl: string
  ogImage: string
  twitterHandle: string
  /** Only set for type === 'agent' — filled later from DB if needed */
  agentId?: string
}

/** ChatRealty platform domains */
const PLATFORM_DOMAINS = new Set([
  'chatrealty.io',
  'www.chatrealty.io',
])

// ─────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────

/**
 * Returns true if the hostname belongs to the ChatRealty SaaS platform.
 */
export function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.has(normalizeHostname(hostname))
}

/**
 * Returns true if the hostname is an agent domain (custom domain or subdomain, not platform).
 */
export function isAgentDomain(hostname: string): boolean {
  const h = normalizeHostname(hostname)
  return !PLATFORM_DOMAINS.has(h) && h !== 'localhost'
}

/**
 * Build the full base URL (with protocol) for a given hostname.
 * Falls back to reading the Host header when no hostname is provided.
 */
export function getBaseUrl(hostname?: string): string {
  const h = hostname || 'chatrealty.io'
  const bare = normalizeHostname(h)
  return `https://${bare}`
}

/**
 * Async version of getBaseUrl that reads from the request headers.
 * Use this in Server Components / generateMetadata.
 */
export async function getBaseUrlFromHeaders(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'chatrealty.io'
  return getBaseUrl(host)
}

/**
 * Async helper to get the hostname from request headers.
 */
export async function getHostnameFromHeaders(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'chatrealty.io'
  return normalizeHostname(host)
}

/**
 * Returns domain-specific SEO configuration.
 *
 * For agent domains this returns generic defaults — the caller should enrich
 * with data from the agent's DB profile (name, logo, description, etc.).
 * getDomainConfigFromHeaders() handles this enrichment automatically.
 */
export function getDomainConfig(hostname: string): DomainSeoConfig {
  const bare = normalizeHostname(hostname)
  const baseUrl = `https://${bare}`

  if (PLATFORM_DOMAINS.has(bare)) {
    return {
      type: 'platform',
      baseUrl,
      hostname: bare,
      siteName: 'ChatRealty',
      siteDescription:
        'AI-powered real estate platform. Find your dream home with intelligent search, market insights, and verified local agents.',
      defaultTitle: 'ChatRealty | AI-Powered Real Estate Platform',
      titleTemplate: '%s | ChatRealty',
      logoUrl: '/images/brand/chatrealty-logo-light-1436x356.png',
      ogImage: '/images/brand/chatrealty-logo-og.png',
      twitterHandle: '@chatrealty',
    }
  }

  // Agent custom domain (includes jpsrealtor.com, josephsardella.com, etc.) — return generic defaults
  return {
    type: 'agent',
    baseUrl,
    hostname: bare,
    siteName: 'Real Estate Agent',
    siteDescription: 'Your trusted local real estate expert.',
    defaultTitle: 'Real Estate Agent',
    titleTemplate: '%s | Real Estate',
    logoUrl: '/images/brand/chatrealty-logo-light-1436x356.png',
    ogImage: '/images/brand/chatrealty-logo-og.png',
    twitterHandle: '',
  }
}

/**
 * Async version that reads hostname from headers.
 * For agent subdomains and custom domains, enriches the config with the agent's
 * name and dynamic OG image from the DB.
 */
export async function getDomainConfigFromHeaders(): Promise<DomainSeoConfig> {
  const hostname = await getHostnameFromHeaders()
  const config = getDomainConfig(hostname)

  // Enrich with the agent's profile so jpsrealtor.com / bethanyklier.chatrealty.io /
  // etc. show the owning agent's metaTitle / metaDescription / OG image instead of
  // the generic "Real Estate Agent" fallback in getDomainConfig().
  if (config.type === 'agent') {
    const bare = normalizeHostname(hostname)

    // Extract subdomain from chatrealty or localhost — used to identify
    // *.chatrealty.io agent subdomains BEFORE hitting the database.
    let subdomain: string | undefined
    if (bare.includes('chatrealty')) {
      const parts = bare.split('chatrealty')[0]?.replace(/\.$/, '')
      subdomain = parts?.split('.').filter(s => s && s !== 'www').pop()
    } else if (bare.endsWith('.localhost')) {
      const sub = bare.split('.localhost')[0]
      if (sub && sub !== 'www') subdomain = sub
    }

    // Single $or lookup — matches whichever of {customDomain, subdomain} is set
    // on the agent's record. Project everything we need in one round trip so a
    // custom-domain agent with an empty subdomain field still gets enriched.
    // (Previously this was a two-hop lookup that silently fell through to the
    // bare "Real Estate Agent" defaults when only customDomain was set.)
    try {
      const dbConnect = (await import('@/lib/mongoose')).default
      await dbConnect()
      const mongoose = await import('mongoose')
      const db = mongoose.default.connection.db
      if (db) {
        const or: Record<string, string>[] = [{ 'agentProfile.customDomain': bare }]
        if (subdomain) or.push({ 'agentProfile.subdomain': subdomain })

        const agent: any = await db.collection('users').findOne(
          { $or: or },
          {
            projection: {
              name: 1,
              brokerageName: 1,
              'agentProfile.subdomain': 1,
              'agentProfile.headline': 1,
              'agentProfile.metaTitle': 1,
              'agentProfile.metaDescription': 1,
            },
          }
        )

        if (agent) {
          const ap = agent.agentProfile || {}
          const agentName = agent.name || config.siteName
          config.siteName = agentName
          config.defaultTitle = ap.metaTitle || `${agentName} | ChatRealty`
          config.titleTemplate = `%s | ${agentName}`
          config.siteDescription =
            ap.metaDescription ||
            ap.headline ||
            `Real estate services by ${agentName}`

          // Resolved subdomain may have come from the DB (for custom-domain
          // matches) or from the hostname parse above (for chatrealty.io
          // subdomains). Prefer whichever is set.
          const resolvedSubdomain = subdomain || ap.subdomain
          if (resolvedSubdomain) {
            const ogBase =
              process.env.NODE_ENV === 'production'
                ? 'https://chatrealty.io'
                : `http://localhost:${process.env.PORT || 3000}`
            config.ogImage = `${ogBase}/api/og?subdomain=${resolvedSubdomain}`
          }
        }
      }
    } catch {
      // Non-blocking — fall back to the bare defaults from getDomainConfig().
    }
  }

  return config
}

// ─────────────────────────────────────────────────────
// Domain ownership check
// ─────────────────────────────────────────────────────

/**
 * Check if the requesting domain belongs to a specific agent (by userId).
 * Resolves ownership via:
 *   1. Platform domain (chatrealty.io) → always allowed
 *   2. localhost → always allowed (dev)
 *   3. Agent subdomain (*.chatrealty.io, *.localhost) → match by subdomain lookup
 *   4. Custom domain → match via agentProfile.customDomain
 *   5. DomainRegistry → match via ownerId
 *
 * Use this for visibility checks on articles, landing pages, etc.
 */
export async function doesDomainBelongToAgent(authorId: string): Promise<boolean> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const hostname = normalizeHostname(host)

  // Platform domain and bare localhost always have access
  if (PLATFORM_DOMAINS.has(hostname) || hostname === 'localhost') return true

  // Extract subdomain from chatrealty or localhost
  let subdomain: string | undefined
  if (hostname.includes('chatrealty')) {
    const parts = hostname.split('chatrealty')[0]?.replace(/\.$/, '')
    subdomain = parts?.split('.').filter(s => s && s !== 'www').pop()
  } else if (hostname.endsWith('.localhost')) {
    const sub = hostname.split('.localhost')[0]
    if (sub && sub !== 'www') subdomain = sub
  }

  try {
    const dbConnect = (await import('@/lib/mongoose')).default
    await dbConnect()
    const mongoose = await import('mongoose')
    const db = mongoose.default.connection.db
    if (!db) return false

    // Subdomain check
    if (subdomain) {
      const agent = await db.collection('users').findOne(
        { 'agentProfile.subdomain': subdomain },
        { projection: { _id: 1 } }
      )
      return !!agent && agent._id.toString() === authorId
    }

    // Custom domain check (agentProfile.customDomain)
    const agentByDomain = await db.collection('users').findOne(
      { 'agentProfile.customDomain': hostname },
      { projection: { _id: 1 } }
    )
    if (agentByDomain && agentByDomain._id.toString() === authorId) return true

    // DomainRegistry check
    const domainEntry = await db.collection('domainregistries').findOne(
      { domain: hostname, status: 'active' },
      { projection: { ownerId: 1 } }
    )
    if (domainEntry && domainEntry.ownerId?.toString() === authorId) return true
  } catch {
    // Non-blocking
  }

  return false
}

// ─────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────

function normalizeHostname(host: string): string {
  return host.split(':')[0].toLowerCase()
}
