/**
 * Multi-domain SEO utilities for the ChatRealty multi-tenant network.
 *
 * Provides domain-aware helpers for generating canonical URLs, structured data,
 * and OpenGraph metadata across jpsrealtor.com, chatrealty.io, and agent custom
 * domains.
 */

import { headers } from 'next/headers'

// ─────────────────────────────────────────────────────
// Domain classification
// ─────────────────────────────────────────────────────

export type DomainType = 'jpsrealtor' | 'platform' | 'agent'

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

/** Joseph Sardella's canonical domains */
const JPS_DOMAINS = new Set([
  'jpsrealtor.com',
  'www.jpsrealtor.com',
  'josephsardella.com',
  'www.josephsardella.com',
])

/** ChatRealty platform domains */
const PLATFORM_DOMAINS = new Set([
  'chatrealty.io',
  'www.chatrealty.io',
])

// ─────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────

/**
 * Returns true if the hostname belongs to Joseph Sardella's personal sites.
 */
export function isOwnerDomain(hostname: string): boolean {
  return JPS_DOMAINS.has(normalizeHostname(hostname))
}

/**
 * Returns true if the hostname belongs to the ChatRealty SaaS platform.
 */
export function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.has(normalizeHostname(hostname))
}

/**
 * Returns true if the hostname is an agent custom domain (not JPS, not platform).
 */
export function isAgentDomain(hostname: string): boolean {
  const h = normalizeHostname(hostname)
  return !JPS_DOMAINS.has(h) && !PLATFORM_DOMAINS.has(h) && h !== 'localhost'
}

/**
 * Build the full base URL (with protocol) for a given hostname.
 * Falls back to reading the Host header when no hostname is provided.
 */
export function getBaseUrl(hostname?: string): string {
  const h = hostname || 'jpsrealtor.com'
  const bare = normalizeHostname(h)
  return `https://${bare}`
}

/**
 * Async version of getBaseUrl that reads from the request headers.
 * Use this in Server Components / generateMetadata.
 */
export async function getBaseUrlFromHeaders(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'jpsrealtor.com'
  return getBaseUrl(host)
}

/**
 * Async helper to get the hostname from request headers.
 */
export async function getHostnameFromHeaders(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'jpsrealtor.com'
  return normalizeHostname(host)
}

/**
 * Returns domain-specific SEO configuration.
 *
 * For agent domains this returns generic defaults — the caller should enrich
 * with data from the agent's DB profile (name, logo, description, etc.).
 */
export function getDomainConfig(hostname: string): DomainSeoConfig {
  const bare = normalizeHostname(hostname)
  const baseUrl = `https://${bare}`

  if (JPS_DOMAINS.has(bare)) {
    return {
      type: 'jpsrealtor',
      baseUrl,
      hostname: bare,
      siteName: 'JPS Realtor - Joseph Sardella Real Estate',
      siteDescription:
        'Buy, sell, or invest in the Palm Desert real estate market with Joseph Sardella, a local expert and trusted Realtor in the Coachella Valley.',
      defaultTitle: 'Joseph Sardella | Palm Desert Real Estate Agent | JPS Realtor',
      titleTemplate: '%s | Joseph Sardella Real Estate',
      logoUrl:
        'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png',
      ogImage:
        'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/joey/about.png',
      twitterHandle: '@jpsrealtor',
    }
  }

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

  // Agent custom domain — return generic defaults
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
 * For agent subdomains, enriches the config with the agent's name and dynamic OG image.
 */
export async function getDomainConfigFromHeaders(): Promise<DomainSeoConfig> {
  const hostname = await getHostnameFromHeaders()
  const config = getDomainConfig(hostname)

  // Enrich agent subdomain config with real agent data
  if (config.type === 'agent') {
    const bare = normalizeHostname(hostname)

    // Extract subdomain from chatrealty or localhost
    let subdomain: string | undefined
    if (bare.includes('chatrealty')) {
      const parts = bare.split('chatrealty')[0]?.replace(/\.$/, '')
      subdomain = parts?.split('.').filter(s => s && s !== 'www').pop()
    } else if (bare.endsWith('.localhost')) {
      const sub = bare.split('.localhost')[0]
      if (sub && sub !== 'www') subdomain = sub
    }

    if (subdomain) {
      try {
        const mongoose = await import('mongoose')
        const db = mongoose.default.connection.db
        if (db) {
          const agent = await db.collection('users').findOne(
            { 'agentProfile.subdomain': subdomain },
            { projection: { name: 1, brokerageName: 1, 'agentProfile.headline': 1, 'agentProfile.metaTitle': 1, 'agentProfile.metaDescription': 1 } }
          )
          if (agent) {
            config.siteName = agent.name || config.siteName
            config.defaultTitle = (agent as any).agentProfile?.metaTitle || `${agent.name} | ChatRealty`
            config.titleTemplate = `%s | ${agent.name}`
            config.siteDescription = (agent as any).agentProfile?.metaDescription || (agent as any).agentProfile?.headline || `Real estate services by ${agent.name}`
            config.ogImage = `/api/og?subdomain=${subdomain}`
          }
        }
      } catch {
        // Non-blocking — use defaults
      }
    }
  }

  return config
}

// ─────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────

function normalizeHostname(host: string): string {
  return host.split(':')[0].toLowerCase()
}
