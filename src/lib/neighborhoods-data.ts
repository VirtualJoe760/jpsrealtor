/**
 * Shared neighborhoods data fetcher
 * Used by both the API route and the city page server component
 * to avoid serverless self-referencing issues on Vercel.
 */

import dbConnect from '@/lib/mongoose';
import UnifiedListing from '@/models/unified-listing';

interface SubdivisionData {
  name: string;
  slug: string;
  listings: number;
}

interface CityData {
  name: string;
  slug: string;
  listings: number;
  subdivisions?: SubdivisionData[];
}

interface CountyData {
  name: string;
  slug: string;
  listings: number;
  cities: CityData[];
}

interface RegionData {
  name: string;
  slug: string;
  listings: number;
  counties: CountyData[];
}

// Coachella Valley cities
const COACHELLA_VALLEY_CITIES = [
  'Palm Springs', 'Palm Desert', 'La Quinta', 'Indio', 'Rancho Mirage',
  'Indian Wells', 'Cathedral City', 'Desert Hot Springs', 'Coachella',
  'Thousand Palms', 'Bermuda Dunes', 'Thermal', 'Mecca', 'Sky Valley',
  'North Shore', 'Desert Center', 'North Palm Springs', 'Oasis', 'Cabazon', 'Whitewater'
];

const JOSHUA_TREE_AREA_CITIES = [
  'Yucca Valley', 'Twentynine Palms', '29 Palms', 'Joshua Tree',
  'Morongo Valley', 'Pioneertown', 'Landers', 'Wonder Valley', 'Sunfair'
];

const COUNTY_TO_REGION: Record<string, string> = {
  'Los Angeles': 'Southern California', 'Orange': 'Southern California',
  'Riverside': 'Southern California', 'San Bernardino': 'Southern California',
  'San Diego': 'Southern California', 'Ventura': 'Southern California',
  'Imperial': 'Southern California', 'Santa Barbara': 'Southern California',
  'Kern': 'Central California', 'San Luis Obispo': 'Central California',
  'Fresno': 'Central California', 'Madera': 'Central California',
  'Merced': 'Central California', 'Tulare': 'Central California',
  'Kings': 'Central California', 'Monterey': 'Central California',
  'San Benito': 'Central California', 'Santa Cruz': 'Central California',
  'Alameda': 'Northern California', 'Contra Costa': 'Northern California',
  'Marin': 'Northern California', 'Napa': 'Northern California',
  'San Francisco': 'Northern California', 'San Mateo': 'Northern California',
  'Santa Clara': 'Northern California', 'Solano': 'Northern California',
  'Sonoma': 'Northern California', 'Sacramento': 'Northern California',
  'Placer': 'Northern California', 'El Dorado': 'Northern California',
  'Yolo': 'Northern California', 'Butte': 'Northern California',
  'Shasta': 'Northern California', 'Tehama': 'Northern California',
  'Lake': 'Northern California', 'Mendocino': 'Northern California',
  'Humboldt': 'Northern California', 'Del Norte': 'Northern California',
  'Siskiyou': 'Northern California', 'Modoc': 'Northern California',
  'Lassen': 'Northern California', 'Plumas': 'Northern California',
  'Sierra': 'Northern California', 'Nevada': 'Northern California',
  'Yuba': 'Northern California', 'Sutter': 'Northern California',
  'Colusa': 'Northern California', 'Glenn': 'Northern California',
  'Trinity': 'Northern California', 'Mariposa': 'Northern California',
  'Tuolumne': 'Northern California', 'Calaveras': 'Northern California',
  'Amador': 'Northern California', 'Alpine': 'Northern California',
  'Mono': 'Northern California', 'Inyo': 'Northern California',
  'Stanislaus': 'Northern California', 'San Joaquin': 'Northern California',
};

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function getCountyNameForCity(county: string, city: string): string {
  if (county === 'Riverside' && COACHELLA_VALLEY_CITIES.includes(city)) return 'Coachella Valley';
  if (county === 'San Bernardino' && JOSHUA_TREE_AREA_CITIES.includes(city)) return 'Joshua Tree Area';
  return county;
}

/**
 * Find a city by slug in the neighborhoods directory.
 * Returns the city data and county name, or null if not found.
 * This calls the DB directly — safe to use in server components.
 */
export async function findCityBySlug(slug: string): Promise<{ city: CityData; countyName: string } | null> {
  const data = await getNeighborhoodsDirectory();
  if (!data) return null;

  for (const region of data) {
    for (const county of region.counties) {
      const city = county.cities.find((c) => c.slug === slug);
      if (city) {
        return { city, countyName: county.name };
      }
    }
  }
  return null;
}

/**
 * Get the full neighborhoods directory data from MongoDB.
 * Cached in memory for the duration of the serverless function invocation.
 */
let cachedData: RegionData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getNeighborhoodsDirectory(): Promise<RegionData[] | null> {
  // Simple in-memory cache for the serverless function lifetime
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return cachedData;
  }

  try {
    await dbConnect();

    const listings = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: 'Active',
          listPrice: { $exists: true, $ne: null, $gt: 0 },
          city: { $exists: true, $nin: [null, ''] },
          countyOrParish: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: { county: '$countyOrParish', city: '$city', subdivision: '$subdivisionName' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: { county: '$_id.county', city: '$_id.city' },
          cityCount: { $sum: '$count' },
          subdivisions: {
            $push: {
              $cond: [
                { $and: [
                  { $ne: ['$_id.subdivision', null] },
                  { $ne: ['$_id.subdivision', ''] },
                  { $ne: ['$_id.subdivision', 'Not Applicable'] },
                  { $ne: ['$_id.subdivision', 'N/A'] },
                  { $ne: ['$_id.subdivision', 'NA'] },
                  { $ne: ['$_id.subdivision', 'None'] },
                  { $ne: ['$_id.subdivision', 'NONE'] },
                  { $ne: ['$_id.subdivision', 'not applicable'] },
                  { $ne: ['$_id.subdivision', 'Other'] },
                  { $ne: ['$_id.subdivision', 'Unknown'] },
                  { $ne: ['$_id.subdivision', 'Custom'] }
                ]},
                { name: '$_id.subdivision', count: '$count' },
                '$$REMOVE'
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.county',
          countyCount: { $sum: '$cityCount' },
          cities: {
            $push: { name: '$_id.city', count: '$cityCount', subdivisions: '$subdivisions' }
          }
        }
      },
      { $sort: { countyCount: -1 } }
    ]);

    // Build region → county → city hierarchy
    const regionMap = new Map<string, { counties: Map<string, { cities: CityData[]; listings: number }> }>();

    for (const countyGroup of listings) {
      for (const cityData of countyGroup.cities) {
        const actualCounty = countyGroup._id;
        const displayCounty = getCountyNameForCity(actualCounty, cityData.name);
        const region = COUNTY_TO_REGION[actualCounty] || 'Other';

        const subdivisions = (cityData.subdivisions || [])
          .filter((sub: any) => sub && sub.name && !sub.name.toLowerCase().startsWith('other') && sub.name.toLowerCase() !== 'unknown')
          .map((sub: any) => ({
            name: sub.name,
            slug: createSlug(sub.name),
            listings: sub.count,
          }))
          .sort((a: SubdivisionData, b: SubdivisionData) => b.listings - a.listings);

        if (!regionMap.has(region)) {
          regionMap.set(region, { counties: new Map() });
        }
        const regionEntry = regionMap.get(region)!;
        const countyKey = displayCounty;
        if (!regionEntry.counties.has(countyKey)) {
          regionEntry.counties.set(countyKey, { cities: [], listings: 0 });
        }
        const countyEntry = regionEntry.counties.get(countyKey)!;
        countyEntry.cities.push({
          name: cityData.name,
          slug: createSlug(cityData.name),
          listings: cityData.count,
          subdivisions,
        });
        countyEntry.listings += cityData.count;
      }
    }

    // Convert to array format
    const result: RegionData[] = [];
    for (const [regionName, regionData] of regionMap) {
      const counties: CountyData[] = [];
      for (const [countyName, countyData] of regionData.counties) {
        countyData.cities.sort((a, b) => b.listings - a.listings);
        counties.push({
          name: countyName,
          slug: createSlug(countyName) + '-county',
          listings: countyData.listings,
          cities: countyData.cities,
        });
      }
      counties.sort((a, b) => b.listings - a.listings);
      result.push({
        name: regionName,
        slug: createSlug(regionName),
        listings: counties.reduce((sum, c) => sum + c.listings, 0),
        counties,
      });
    }
    result.sort((a, b) => b.listings - a.listings);

    cachedData = result;
    cacheTime = Date.now();
    return result;
  } catch (error) {
    console.error('Error fetching neighborhoods directory:', error);
    return null;
  }
}
