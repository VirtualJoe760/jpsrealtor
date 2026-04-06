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

// Next.js uses generateSitemaps() to create a sitemap index at /sitemap.xml
// with child sitemaps at /sitemap/0.xml, /sitemap/1.xml, etc.
// IMPORTANT: This runs at BUILD time — no DB access. Use fixed IDs.
// IDs: 0 = static+neighborhoods, 1 = blog, 2 = listings (paginated at request time)
export async function generateSitemaps() {
  return [
    { id: 0 }, // static pages + neighborhoods + subdivisions
    { id: 1 }, // blog/insights posts
    { id: 2 }, // MLS listings
  ]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Sitemap 0: Static pages + neighborhoods + subdivisions
  if (id === 0) {
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

    // City neighborhood pages
    const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
      url: `${baseUrl}/neighborhoods/${city.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // City buy/sell variant pages
    const cityVariantPages: MetadataRoute.Sitemap = cities.flatMap((city) => [
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

    // Subdivision pages
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

    return [...staticPages, ...cityPages, ...cityVariantPages, ...subdivisionPages]
  }

  // Sitemap 1: Blog/Insights posts
  if (id === 1) {
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
    return blogPages
  }

  // Sitemap 2: MLS Listings (all active, up to 50k URLs per sitemap spec)
  let listingPages: MetadataRoute.Sitemap = []
  try {
    await dbConnect()

    const [gpsListings, crmlsListings] = await Promise.all([
      UnifiedListing.find(
        { standardStatus: 'Active', slugAddress: { $exists: true, $ne: null } },
        { slugAddress: 1, modificationTimestamp: 1 }
      ).lean(),
      CRMLSListing.find(
        { standardStatus: 'Active', slugAddress: { $exists: true, $ne: null } },
        { slugAddress: 1, modificationTimestamp: 1 }
      ).lean(),
    ])

    listingPages = [...gpsListings, ...crmlsListings].map((listing: any) => ({
      url: `${baseUrl}/mls-listings/${listing.slugAddress}`,
      lastModified: listing.modificationTimestamp
        ? new Date(listing.modificationTimestamp)
        : now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))
  } catch (error) {
    console.error('Sitemap: Error fetching MLS listings:', error)
  }

  return listingPages
}
