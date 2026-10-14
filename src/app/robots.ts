import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getBaseUrl } from '@/lib/domain-utils'

// Domain-specific robots.txt rules and sitemap references.
// Each domain in the ChatRealty network gets its own robots.txt that points
// to the correct sitemap URL for that domain.
//
// ── The rule everyone gets wrong, and this file got wrong ───────────────────
//
// A crawler obeys EXACTLY ONE group: the most specific `User-agent` that
// matches it, and nothing from any other group. So once a `User-agent:
// Googlebot` group exists, Googlebot stops reading the `*` group entirely —
// every disallow that lives only under `*` becomes invisible to the one
// crawler that matters most.
//
// That is what happened here. `/private/`, `/test/`, `/*/property-stats`,
// `/404`, `/500` and the Spark `/v1/` photo paths were disallowed under `*`
// only, so Googlebot was free to crawl all of them while the file looked
// locked down. Each agent-specific group below now repeats the FULL disallow
// list; the duplication is the protocol working as designed, not redundancy to
// factor out.

const PLATFORM_DOMAINS = ['chatrealty.io', 'www.chatrealty.io']

/**
 * Paths no crawler should spend budget on.
 *
 * `/_next/` is deliberately ABSENT. Blocking the JS and CSS bundles stops
 * Google rendering the page at all, which on a site whose maps, stats widgets
 * and listing grids are client components means it sees an empty shell. It was
 * already allowed for Googlebot and Bingbot; it is allowed for everyone now,
 * because the same reasoning applies to every rendering crawler.
 */
const DISALLOW_ALL_CRAWLERS = [
  '/api/',
  '/v1/',            // Spark Platform API photo paths that leak as relative URLs
  '/*/property-stats', // Removed page — block any lingering crawl attempts
  '/admin/',
  '/dashboard/',
  '/agent/',
  '/auth/',
  '/private/',
  '/test/',
  '/chap',           // The full-catalog map: infinite crawl surface, no content
  '/map',
  '/404',
  '/500',
]

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') || 'chatrealty.io'
  const hostname = host.replace(/:\d+$/, '').toLowerCase()
  // The Sitemap: directive uses the CANONICAL host (supplementary domains
  // alias to the primary via getBaseUrl) — josephsardella.com's robots.txt
  // used to point at itself, reinforcing the wrong host against the canonical
  // consolidation to jpsrealtor.com.
  const baseUrl = getBaseUrl(hostname)

  const isPlatform = PLATFORM_DOMAINS.includes(hostname)

  // NO `host:` FIELD, on either branch.
  //
  // `Host:` is a Yandex-only extension. Google, Bing and everyone else ignore
  // it, Yandex itself deprecated it in 2018 in favour of a 301 plus a
  // canonical, and a non-standard directive in robots.txt is one more thing a
  // strict parser can choke on. The canonical consolidation this was meant to
  // reinforce is carried by `alternates.canonical` and by the Sitemap: host
  // below, both of which every crawler actually reads.

  if (isPlatform) {
    return {
      rules: [
        {
          userAgent: '*',
          allow: ['/', '/about', '/pricing', '/agents'],
          disallow: ['/api/', '/admin/', '/dashboard/', '/auth/', '/private/'],
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
    }
  }

  // Agent domain (custom domain or subdomain) — allow their public pages.
  //
  // Every group carries the same disallow list. See the note at the top: a
  // crawler reads one group and only one, so a rule that appears only under
  // `*` does not apply to Googlebot.
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/mls-listings/',
          '/neighborhoods/',
          '/insights/',
          '/lp/',
          '/buy',
          '/sell',
          '/book-appointment',
          '/contact',
          '/about',
        ],
        disallow: DISALLOW_ALL_CRAWLERS,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOW_ALL_CRAWLERS,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: DISALLOW_ALL_CRAWLERS,
      },
      {
        // Image crawling explicitly ALLOWS the asset paths so a blocked page
        // does not also block its photos from Google Images — a longer Allow
        // beats a shorter Disallow under the robots.txt specificity rule.
        //
        // It carries the full disallow list for the same reason every other
        // group does: with only `disallow: ['/api/']` here, everything outside
        // /images/ and /api/ was implicitly crawlable by Googlebot-Image,
        // including images under /private/ and /test/.
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/city-images/', '/joey/', '/misc/'],
        disallow: DISALLOW_ALL_CRAWLERS,
      },
    ],
    // The sitemap INDEX. Child sitemaps live at /sitemap/{name}.xml and are
    // discovered through it — they are deliberately not listed here, because
    // the index is the single declaration point and two sources of truth for
    // "which sitemaps exist" is how one of them goes stale.
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
