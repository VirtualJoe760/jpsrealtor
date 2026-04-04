import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://jpsrealtor.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/mls-listings/',
          '/neighborhoods/',
          '/insights/',
          '/about',
          '/selling',
          '/book-appointment',
        ],
        disallow: [
          '/api/',
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
        disallow: ['/api/', '/admin/', '/dashboard/', '/agent/', '/auth/', '/chap', '/map'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/city-images/', '/joey/', '/misc/'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/agent/', '/auth/', '/chap', '/map'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
