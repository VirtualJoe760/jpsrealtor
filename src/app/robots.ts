import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/private/', '/admin/'], // Block sensitive pages
      },
    ],
    sitemap: 'https://jpsrealtor.com/sitemap.xml',
  };
}
