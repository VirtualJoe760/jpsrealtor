import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

// Domain-specific robots.txt rules and sitemap references.
// Each domain in the ChatRealty network gets its own robots.txt that points
// to the correct sitemap URL for that domain.

const JPS_DOMAINS = ['jpsrealtor.com', 'www.jpsrealtor.com', 'josephsardella.com', 'www.josephsardella.com']
const PLATFORM_DOMAINS = ['chatrealty.io', 'www.chatrealty.io']

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') || 'jpsrealtor.com'
  const hostname = host.replace(/:\d+$/, '').toLowerCase()
  const baseUrl = `https://${hostname}`

  // Determine domain type for tailored rules
  const isJps = JPS_DOMAINS.includes(hostname)
  const isPlatform = PLATFORM_DOMAINS.includes(hostname)

  if (isPlatform) {
    return {
      rules: [
        {
          userAgent: '*',
          allow: ['/', '/about', '/pricing', '/agents'],
          disallow: ['/api/', '/admin/', '/dashboard/', '/auth/', '/_next/', '/private/'],
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    }
  }

  if (!isJps) {
    // Agent custom domain or subdomain — allow their public pages
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
            '/selling',
            '/book-appointment',
            '/contact',
            '/about',
          ],
          disallow: [
            '/api/',
            '/admin/',
            '/dashboard/',
            '/agent/',
            '/auth/',
            '/private/',
            '/_next/',
            '/chap',
            '/map',
          ],
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    }
  }

  // JPS Realtor domains — full rules (original behavior)
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
          '/selling',
          '/book-appointment',
        ],
        disallow: [
          '/api/',
          '/v1/',           // Spark Platform API photo paths that leak as relative URLs
          '/*/property-stats', // Removed page — block any lingering crawl attempts
          '/admin/',
          '/dashboard/',
          '/agent/',
          '/auth/',
          '/private/',
          '/test/',
          '/_next/',
          '/chap',
          '/map',
          '/404',
          '/500',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/v1/', '/admin/', '/dashboard/', '/agent/', '/auth/', '/chap', '/map'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/city-images/', '/joey/', '/misc/'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/v1/', '/admin/', '/dashboard/', '/agent/', '/auth/', '/chap', '/map'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
