import type { MetadataRoute } from 'next';
import { coachellaValleyCities as cities } from '@/app/constants/cities';
import subdivisions from '@/app/constants/subdivisions';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://jpsrealtor.com';

  // ✅ Add the homepage (Highest priority)
  const homeUrl: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
  ];

  // Generate neighborhood pages
  const neighborhoodUrls: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/neighborhoods/${city.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Generate subdivision pages
  const subdivisionUrls: MetadataRoute.Sitemap = Object.entries(subdivisions).flatMap(([cityKey, subdivisionList]) => {
    const matchedCity = cities.find(city => cityKey.includes(city.id));
    if (!matchedCity) return [];

    return subdivisionList.map(sub => ({
      url: `${baseUrl}/neighborhoods/${matchedCity.id}/subdivisions/${sub.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  });

  // Generate blog post pages (Now with priority 0.9!)
  const postsDir = path.join(process.cwd(), 'src/posts');
  const blogUrls: MetadataRoute.Sitemap = [];

  if (fs.existsSync(postsDir)) {
    const blogFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.mdx'));

    blogFiles.forEach(file => {
      const filePath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      if (data.slugId && data.section) {
        blogUrls.push({
          url: `${baseUrl}/insights/${data.section}/${data.slugId}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.9, // ✅ Boosted blog priority for frequent indexing
        });
      }
    });
  }

  // Combine all URLs (Homepage first)
  const allUrls = [...homeUrl, ...neighborhoodUrls, ...subdivisionUrls, ...blogUrls];

  // Generate XML content for the sitemap
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${allUrls
      .map(url => {
        // Ensure that lastModified is always a Date and handle undefined cases
        const lastModifiedDate = url.lastModified instanceof Date ? url.lastModified : new Date();

        return `
        <url>
          <loc>${url.url}</loc>
          <lastmod>${lastModifiedDate.toISOString()}</lastmod>
          <changefreq>${url.changeFrequency}</changefreq>
          <priority>${url.priority}</priority>
        </url>`;
      })
      .join('')}
  </urlset>`;

  // Write the generated sitemap to the public directory as sitemap.xml
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml);

  // Return the URLs for use in the Sitemap generation for other purposes (not needed in this case if we're writing to a file)
  return allUrls;
}
