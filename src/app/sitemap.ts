import { MetadataRoute } from 'next'
import { coachellaValleyCities as cities } from '@/app/constants/cities'
import subdivisions from '@/app/constants/subdivisions'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dbConnect from '@/lib/mongoose'
import { Listing } from '@/models/listings'
import { CRMLSListing } from '@/models/crmls-listings'

const baseUrl = 'https://jpsrealtor.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static pages
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
      url: `${baseUrl}/map`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/neighborhoods`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/newsletter-signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
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

  // Blog/Insights pages from MDX files
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

  // MLS Listing pages - fetch active listings from database
  let listingPages: MetadataRoute.Sitemap = []
  try {
    await dbConnect()

    // Fetch GPS listings with slugAddress
    const gpsListings = await Listing.find(
      { standardStatus: 'Active', slugAddress: { $exists: true, $ne: null } },
      { slugAddress: 1, modificationTimestamp: 1 }
    )
      .lean()
      .limit(10000) // Limit for sitemap size

    // Fetch CRMLS listings with slugAddress
    const crmlsListings = await CRMLSListing.find(
      { standardStatus: 'Active', slugAddress: { $exists: true, $ne: null } },
      { slugAddress: 1, modificationTimestamp: 1 }
    )
      .lean()
      .limit(10000)

    const allListings = [...gpsListings, ...crmlsListings]

    listingPages = allListings.map((listing: any) => ({
      url: `${baseUrl}/mls-listings/${listing.slugAddress}`,
      lastModified: listing.modificationTimestamp
        ? new Date(listing.modificationTimestamp)
        : now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))

    console.log(`Sitemap: Added ${listingPages.length} MLS listings`)
  } catch (error) {
    console.error('Sitemap: Error fetching MLS listings:', error)
  }

  return [
    ...staticPages,
    ...cityPages,
    ...cityVariantPages,
    ...subdivisionPages,
    ...blogPages,
    ...listingPages,
  ]
}
