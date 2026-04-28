/**
 * Shared neighborhoods data fetcher
 * Used by both the API route and the city page server component
 * to avoid serverless self-referencing issues on Vercel.
 *
 * Uses pre-built City and Subdivision models for fast reads (~200ms)
 * instead of aggregating unified_listings (~15s).
 */

import dbConnect from '@/lib/mongoose';
import { City } from '@/models/cities';
import Subdivision from '@/models/subdivisions';
import { createSlug } from '@/lib/utils/slug';

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

function getCountyNameForCity(county: string, city: string): string {
  if (county === 'Riverside' && COACHELLA_VALLEY_CITIES.includes(city)) return 'Coachella Valley';
  if (county === 'San Bernardino' && JOSHUA_TREE_AREA_CITIES.includes(city)) return 'Joshua Tree Area';
  return county;
}

/**
 * Find a city by slug in the neighborhoods directory.
 * Returns the city data and county name, or null if not found.
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
 * Get the full neighborhoods directory from pre-built City and Subdivision models.
 * Fast (~200ms) compared to the old aggregation approach (~15s).
 * Cached in memory for 1 minute.
 */
let cachedData: RegionData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getNeighborhoodsDirectory(): Promise<RegionData[] | null> {
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return cachedData;
  }

  try {
    await dbConnect();

    // Use pre-built models (fast indexed reads) instead of aggregating raw listings
    const [cities, subdivisions] = await Promise.all([
      City.find({ listingCount: { $gt: 0 } })
        .select('name slug county region listingCount avgPrice')
        .sort({ listingCount: -1 })
        .lean(),
      Subdivision.find({ listingCount: { $gt: 0 } })
        .select('name slug city listingCount')
        .sort({ listingCount: -1 })
        .lean(),
    ]);

    // Index subdivisions by city
    const subsByCity: Record<string, SubdivisionData[]> = {};
    for (const sub of subdivisions) {
      const cityName = (sub as any).city;
      const name = (sub as any).name;
      if (!name || ['Not Applicable', 'N/A', 'NA', 'None', 'NONE', 'Other', 'Unknown', 'Custom', 'not applicable'].includes(name)) {
        continue;
      }
      if (!subsByCity[cityName]) subsByCity[cityName] = [];
      subsByCity[cityName].push({
        name,
        slug: (sub as any).slug,
        listings: (sub as any).listingCount || 0,
      });
    }

    // Build hierarchy: Region → County → City → Subdivisions
    const regionMap: Record<string, Record<string, CityData[]>> = {};

    for (const city of cities) {
      const cityName = (city as any).name;
      const actualCounty = (city as any).county || 'Other';
      const region = COUNTY_TO_REGION[actualCounty] || 'Other';
      const displayCounty = getCountyNameForCity(actualCounty, cityName);

      if (!regionMap[region]) regionMap[region] = {};
      if (!regionMap[region][displayCounty]) regionMap[region][displayCounty] = [];

      regionMap[region][displayCounty].push({
        name: cityName,
        slug: (city as any).slug,
        listings: (city as any).listingCount || 0,
        subdivisions: (subsByCity[cityName] || []).sort((a, b) => b.listings - a.listings),
      });
    }

    // Convert to sorted array
    const result: RegionData[] = Object.entries(regionMap)
      .map(([regionName, counties]) => {
        const countiesData: CountyData[] = Object.entries(counties)
          .map(([countyName, citiesList]) => ({
            name: countyName,
            slug: createSlug(countyName) + '-county',
            listings: citiesList.reduce((sum, c) => sum + c.listings, 0),
            cities: citiesList.sort((a, b) => b.listings - a.listings),
          }))
          .sort((a, b) => b.listings - a.listings);

        return {
          name: regionName,
          slug: createSlug(regionName),
          listings: countiesData.reduce((sum, c) => sum + c.listings, 0),
          counties: countiesData,
        };
      })
      .sort((a, b) => b.listings - a.listings);

    cachedData = result;
    cacheTime = Date.now();
    return result;
  } catch (error) {
    console.error('Error fetching neighborhoods directory:', error);
    return null;
  }
}
