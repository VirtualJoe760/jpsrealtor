// GET /sitemap/{static|cities|subdivisions|articles|listings-N}.xml
//
// One handler for every child sitemap declared by /sitemap.xml. Deliberately
// one file rather than five near-identical routes: the rules that matter (only
// 200s, only self-canonical URLs, only `index` URLs, real lastmod, no
// changefreq/priority) have to hold for all of them, and five copies is five
// places for one of those rules to quietly stop applying.
//
// Each child gets its OWN function invocation and therefore its own time
// budget, which is the entire reason the single-file sitemap was split. The
// cities and subdivisions children each run two bulk aggregations in parallel
// (~22s measured 2026-10-14); 60s leaves real headroom on a cold start.

import { headers } from 'next/headers'
import { getBaseUrl } from '@/lib/domain-utils'
import {
  getArticleEntries,
  getCityEntries,
  getListingEntries,
  getListingPageCount,
  getStaticEntries,
  getSubdivisionEntries,
  renderUrlset,
  type SitemapEntry,
} from '@/lib/sitemap-sources'
import { resolveDomain } from '@/lib/sitemap-generator'

export const maxDuration = 60

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=21600',
}

function notFound() {
  return new Response('Not found', { status: 404 })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params
  // Routed as a dynamic segment, so the ".xml" arrives as part of the value.
  // Requiring it keeps /sitemap/cities from also answering as a second URL for
  // the same document — which would be a duplicate of a sitemap, declared
  // nowhere and canonical to nothing.
  if (!rawSlug.endsWith('.xml')) return notFound()
  const slug = rawSlug.slice(0, -4)

  const headersList = await headers()
  const host = (headersList.get('host') || 'chatrealty.io').replace(/:\d+$/, '').toLowerCase()
  const baseUrl = getBaseUrl(host)

  let entries: SitemapEntry[]

  if (slug === 'static') {
    entries = getStaticEntries(baseUrl)
  } else if (slug === 'cities') {
    entries = await getCityEntries(baseUrl)
  } else if (slug === 'subdivisions') {
    entries = await getSubdivisionEntries(baseUrl)
  } else if (slug === 'articles') {
    // Agent-scoped: on an agent domain only that agent's articles belong in
    // their sitemap. resolveDomain already does the customDomain +
    // DomainRegistry owner chain — jpsrealtor.com is reachable only through the
    // registry fallback, and skipping it is what once gave the PRIMARY domain
    // an 11-URL platform sitemap.
    const domain = await resolveDomain(host)
    entries = await getArticleEntries(baseUrl, domain.agentName)
  } else if (slug.startsWith('listings-')) {
    const page = Number(slug.slice('listings-'.length))
    if (!Number.isInteger(page) || page < 1) return notFound()
    // Reject pages past the end rather than serving an empty urlset: an empty
    // child in a declared index reads as a broken sitemap in Search Console.
    const pages = await getListingPageCount()
    if (page > pages) return notFound()
    entries = await getListingEntries(baseUrl, page)
  } else {
    return notFound()
  }

  return new Response(renderUrlset(entries), { headers: XML_HEADERS })
}
