import { MetadataRoute } from 'next'
import { coachellaValleyCities as cities } from '@/app/constants/cities'
import subdivisions from '@/app/constants/subdivisions'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dbConnect from '@/lib/mongoose'
import UnifiedListing from '@/models/unified-listing'
import { CRMLSListing } from '@/models/crmls-listings'

const baseUrl = 'https://jpsrealtor.com'

// Single sitemap — all content types merged.
//
// Total URLs: ~500 static/neighborhoods + ~50 blog + ~38K listings ≈ 38.5K
// Well within the 50K sitemap spec limit. Using a single sitemap avoids
// the Next.js 16 id-dispatch bug where generateSitemaps() ids weren't
// being passed through correctly to the sitemap function.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ─── 1. Static pages ───
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/selling`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/book-appointment`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mls-listings`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/neighborhoods`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  // ─── 2. City neighborhood pages + buy/sell variants ───
  const cityPages: MetadataRoute.Sitemap = cities.flatMap((city) => [
    {
      url: `${baseUrl}/neighborhoods/${city.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/neighborhoods/${city.id}/buy`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/neighborhoods/${city.id}/sell`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ])

  // ─── 3. Subdivision pages ───
  const subdivisionPages: MetadataRoute.Sitemap = []
  Object.entries(subdivisions).forEach(([cityKey, subdivisionList]) => {
    const city = cities.find((c) => cityKey.includes(c.id))
    if (!city) return

    subdivisionList.forEach((sub) => {
      subdivisionPages.push({
        url: `${baseUrl}/neighborhoods/${city.id}/${sub.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    })
  })

  // ─── 4. Blog/Insights posts ───
  const blogPages: MetadataRoute.Sitemap = []
  const postsDir = path.join(process.cwd(), 'src/posts')
  if (fs.existsSync(postsDir)) {
    const blogFiles = fs.readdirSync(postsDir).filter((file) => file.endsWith('.mdx'))
    blogFiles.forEach((file) => {
      const filePath = path.join(postsDir, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)

      if (data.slugId && data.section) {
        blogPages.push({
          url: `${baseUrl}/insights/${data.section}/${data.slugId}`,
          lastModified: data.date ? new Date(data.date) : now,
          changeFrequency: 'monthly',
          priority: 0.7,
        })
      }
    })
  }

  // ─── 5. MLS Listings (residential sale only, capped at 49K) ───
  const MAX_LISTING_URLS = 49_000
  const listingPages: MetadataRoute.Sitemap = []
  try {
    await dbConnect()

    const filter: any = {
      standardStatus: 'Active',
      propertyType: 'A',
      slugAddress: { $exists: true, $ne: null },
    }

    const [gpsListings, crmlsListings] = await Promise.all([
      UnifiedListing.find(filter as any)
        .select('slugAddress modificationTimestamp')
        .sort({ modificationTimestamp: -1 })
        .limit(MAX_LISTING_URLS)
        .lean(),
      CRMLSListing.find(filter as any)
        .select('slugAddress modificationTimestamp')
        .sort({ modificationTimestamp: -1 })
        .limit(MAX_LISTING_URLS)
        .lean(),
    ])

    // De-duplicate by slugAddress (both collections may contain the same listing)
    const seen = new Set<string>()
    const all = [...gpsListings, ...crmlsListings]
    for (const listing of all) {
      const slug = (listing as any).slugAddress
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      listingPages.push({
        url: `${baseUrl}/mls-listings/${slug}`,
        lastModified: (listing as any).modificationTimestamp
          ? new Date((listing as any).modificationTimestamp)
          : now,
        changeFrequency: 'daily',
        priority: 0.6,
      })
      if (listingPages.length >= MAX_LISTING_URLS) break
    }
  } catch (error) {
    console.error('Sitemap: Error fetching MLS listings:', error)
  }

  const allPages = [
    ...staticPages,
    ...cityPages,
    ...subdivisionPages,
    ...blogPages,
    ...listingPages,
  ]

  console.log(
    `[Sitemap] Generated: ${staticPages.length} static, ${cityPages.length} city, ` +
    `${subdivisionPages.length} subdivision, ${blogPages.length} blog, ` +
    `${listingPages.length} listings = ${allPages.length} total URLs`
  )

  return allPages
}
