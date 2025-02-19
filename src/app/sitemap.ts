import type { MetadataRoute } from 'next';
import { coachellaValleyCities as cities } from '@/app/constants/cities';
import subdivisions from '@/app/constants/subdivisions';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://jpsrealtor.com';

  // Generate neighborhood pages
  const neighborhoodUrls: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/neighborhoods/${city.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const, // ✅ FIXED: Explicitly set as const
    priority: 0.8,
  }));

  // Generate subdivision pages
  const subdivisionUrls: MetadataRoute.Sitemap = Object.entries(subdivisions).flatMap(([cityKey, subdivisionList]) => {
    const matchedCity = cities.find(city => cityKey.includes(city.id));
    if (!matchedCity) return [];

    return subdivisionList.map(sub => ({
      url: `${baseUrl}/neighborhoods/${matchedCity.id}/subdivisions/${sub.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const, // ✅ FIXED: Explicitly set as const
      priority: 0.7,
    }));
  });

  // Generate blog post pages
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
          changeFrequency: 'weekly' as const, // ✅ FIXED: Explicitly set as const
          priority: 0.6,
        });
      }
    });
  }

  // Combine all URLs
  return [...neighborhoodUrls, ...subdivisionUrls, ...blogUrls];
}
