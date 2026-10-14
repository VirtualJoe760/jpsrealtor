// GET /sitemap.xml — the sitemap INDEX.
//
// Replaced app/sitemap.ts (Next's MetadataRoute.Sitemap convention) on
// 2026-10-14. The convention produces one urlset from one function invocation,
// and three things that had to change could not be done inside it:
//
//   - per-URL `lastmod` for ~33,000 entries, where cities and subdivisions each
//     need their own bulk aggregation (22s apiece, measured);
//   - more than ~12,000 listing URLs, which is where one invocation ran out of
//     wall clock against this cluster and started returning
//     504 FUNCTION_INVOCATION_TIMEOUT — serving Google nothing at all;
//   - omitting `changefreq` / `priority`, both of which Google ignores and one
//     of which was serialising as 0.49999999999999994.
//
// A hand-written index of per-type children gives each child its own 60s
// budget. The platform host (chatrealty.io) keeps the old generator: it has ~6
// URLs and none of this applies to it.

import { headers } from 'next/headers'
import { getBaseUrl } from '@/lib/domain-utils'
import { isPlatformDomain } from '@/lib/domain-utils'
import { getChildSitemaps, renderSitemapIndex, renderUrlset } from '@/lib/sitemap-sources'
import { generateSitemapForDomain } from '@/lib/sitemap-generator'

export const maxDuration = 30

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  // An hour at the edge. Googlebot refetches a sitemap index often and the
  // index itself is cheap, but there is no reason to rebuild it per request.
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}

export async function GET() {
  const headersList = await headers()
  const host = (headersList.get('host') || 'chatrealty.io').replace(/:\d+$/, '').toLowerCase()
  // The canonical host, never the request host: a sitemap on
  // josephsardella.com listing josephsardella.com URLs fights the canonical
  // consolidation to jpsrealtor.com.
  const baseUrl = getBaseUrl(host)

  if (isPlatformDomain(host)) {
    // chatrealty.io is ~6 static pages. An index pointing at one child would be
    // ceremony; serve the flat urlset the old generator already produces.
    const entries = await generateSitemapForDomain(host)
    return new Response(
      renderUrlset(
        entries.map((e) => ({
          loc: String(e.url),
          lastmod: e.lastModified ? new Date(e.lastModified as any).toISOString() : undefined,
        })),
      ),
      { headers: XML_HEADERS },
    )
  }

  const children = await getChildSitemaps()
  // No `lastmod` on the index rows. Computing one honestly would mean building
  // every child to find its newest entry — the whole cost the split exists to
  // avoid — and stamping "now" on them is the exact lie this change removes.
  return new Response(
    renderSitemapIndex(
      children.map((c) => ({ loc: `${baseUrl}/sitemap/${c.slug}.xml` })),
    ),
    { headers: XML_HEADERS },
  )
}
