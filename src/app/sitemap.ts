import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { generateSitemapForDomain } from '@/lib/sitemap-generator'

// Dynamic per-domain sitemap generation.
//
// Each domain in the ChatRealty network gets its own sitemap reflecting only
// its relevant content. The hostname is read from the incoming request headers
// and dispatched to the appropriate generator.
//
// Total URLs per domain:
//   - chatrealty.io:   ~10 platform pages + agent cross-links
//   - agent domains:   varies by service area coverage (includes jpsrealtor.com, etc.)
//
// All stay well within the 50K sitemap spec limit.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const hostname = headersList.get('host') || 'chatrealty.io'

  return generateSitemapForDomain(hostname)
}
