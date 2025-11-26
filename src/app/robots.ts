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
          '/auth/',
          '/private/',
          '/test/',
          '/_next/',
          '/404',
          '/500',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/city-images/', '/joey/', '/misc/'],
        disallow: ['/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
