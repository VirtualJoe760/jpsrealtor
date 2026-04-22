import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { City } from '@/models/cities';
import Subdivision from '@/models/subdivisions';

// Cache for 1 hour on Vercel edge
export const revalidate = 3600;

// Special city-to-region mappings
const COACHELLA_VALLEY_CITIES = new Set([
  'Palm Springs', 'Palm Desert', 'La Quinta', 'Indio', 'Rancho Mirage',
  'Indian Wells', 'Cathedral City', 'Desert Hot Springs', 'Coachella',
  'Thousand Palms', 'Bermuda Dunes', 'Thermal', 'Mecca', 'Sky Valley',
  'North Shore', 'Desert Center', 'North Palm Springs', 'Oasis',
  'Cabazon', 'Whitewater',
]);

const JOSHUA_TREE_CITIES = new Set([
  'Yucca Valley', 'Twentynine Palms', '29 Palms', 'Joshua Tree',
  'Morongo Valley', 'Pioneertown', 'Landers', 'Wonder Valley', 'Sunfair',
]);

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function getDisplayCounty(city: string, actualCounty: string): string {
  if (COACHELLA_VALLEY_CITIES.has(city)) return 'Coachella Valley';
  if (JOSHUA_TREE_CITIES.has(city)) return 'Joshua Tree Area';
  return actualCounty;
}

/**
 * GET /api/neighborhoods/directory
 *
 * Builds the Region → County → City → Subdivision hierarchy from
 * pre-built City and Subdivision models (NOT from raw listings).
 * This is fast (~200ms) vs the old aggregation approach (~26s).
 */
export async function GET() {
  try {
    await dbConnect();

    // Fetch cities and subdivisions from pre-built models (fast indexed reads)
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

    // Index subdivisions by city for fast lookup
    const subsByCity: Record<string, any[]> = {};
    for (const sub of subdivisions) {
      const cityName = (sub as any).city;
      if (!subsByCity[cityName]) subsByCity[cityName] = [];
      // Filter out placeholder subdivision names
      const name = (sub as any).name;
      if (name && !['Not Applicable', 'N/A', 'NA', 'None', 'NONE', 'Other', 'Unknown', 'Custom', 'not applicable'].includes(name)) {
        subsByCity[cityName].push({
          name,
          slug: (sub as any).slug,
          listings: (sub as any).listingCount || 0,
        });
      }
    }

    // Build hierarchy: Region → County → City → Subdivisions
    const regionMap: Record<string, Record<string, any[]>> = {};

    for (const city of cities) {
      const cityName = (city as any).name;
      const actualCounty = (city as any).county || 'Other';
      const region = (city as any).region || 'Other';
      const displayCounty = getDisplayCounty(cityName, actualCounty);

      if (!regionMap[region]) regionMap[region] = {};
      if (!regionMap[region][displayCounty]) regionMap[region][displayCounty] = [];

      regionMap[region][displayCounty].push({
        name: cityName,
        slug: (city as any).slug,
        listings: (city as any).listingCount || 0,
        subdivisions: (subsByCity[cityName] || []).sort((a: any, b: any) => b.listings - a.listings),
      });
    }

    // Transform to sorted array
    const regionsData = Object.entries(regionMap)
      .map(([regionName, counties]) => {
        const countiesData = Object.entries(counties)
          .map(([countyName, citiesList]) => ({
            name: countyName,
            slug: createSlug(countyName),
            listings: citiesList.reduce((sum: number, c: any) => sum + c.listings, 0),
            cities: citiesList.sort((a: any, b: any) => b.listings - a.listings),
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

    return NextResponse.json({
      success: true,
      data: regionsData,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('[Neighborhoods Directory API Error]:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch neighborhoods directory',
      message: error.message,
    }, { status: 500 });
  }
}
