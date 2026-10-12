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

// The widened SoCal scope makes this a genuinely expensive route: tens of
// thousands of listing rows off an I/O-bound Atlas cluster. The default 15s
// function limit returned 504 FUNCTION_INVOCATION_TIMEOUT on first deploy and
// served Google nothing, so give it room. generateSitemapForDomain() caches the
// result in-process for 6h, which is what keeps the steady-state cost near zero
// (ISR cannot cache this route because headers() forces dynamic rendering).
export const maxDuration = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const hostname = headersList.get('host') || 'chatrealty.io'

  return generateSitemapForDomain(hostname)
}
