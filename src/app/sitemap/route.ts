import { NextResponse } from 'next/server';
import type { MetadataRoute } from 'next';
import { coachellaValleyCities as cities } from '@/app/constants/cities';
import subdivisions from '@/app/constants/subdivisions';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function GET() {
  const baseUrl = 'https://jpsrealtor.com';
  const now = new Date().toISOString();

  const urls: MetadataRoute.Sitemap = [];

  // Homepage
  urls.push({
    url: `${baseUrl}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // City pages
  cities.forEach(city => {
    urls.push({
      url: `${baseUrl}/neighborhoods/${city.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    });
  });

  // Subdivision pages
  Object.entries(subdivisions).forEach(([cityKey, subdivisionList]) => {
    const city = cities.find(c => cityKey.includes(c.id));
    if (!city) return;

    subdivisionList.forEach(sub => {
      urls.push({
        url: `${baseUrl}/neighborhoods/${city.id}/${sub.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
      });
    });
  });

  // Blog post pages (from src/posts)
  const postsDir = path.join(process.cwd(), 'src/posts');
  if (fs.existsSync(postsDir)) {
    const blogFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.mdx'));
    blogFiles.forEach(file => {
      const filePath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      if (data.slugId && data.section) {
        urls.push({
          url: `${baseUrl}/insights/${data.section}/${data.slugId}`,
          lastModified: now,
          changeFrequency: 'daily',
          priority: 1.0,
        });
      }
    });
  }

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    url => `<url>
  <loc>${url.url}</loc>
  <lastmod>${url.lastModified}</lastmod>
  <changefreq>${url.changeFrequency}</changefreq>
  <priority>${(url.priority ?? 1.0).toFixed(1)}</priority>
</url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
