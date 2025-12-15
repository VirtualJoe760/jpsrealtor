import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import UnifiedListing from '@/models/unified-listing';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

interface SubdivisionData {
  name: string;
  slug: string;
  listings: number;
}

interface CityData {
  name: string;
  slug: string;
  listings: number;
  subdivisions: SubdivisionData[];
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

// Special city-to-region mappings for Coachella Valley and Joshua Tree area
// Coachella Valley cities with population data
const COACHELLA_VALLEY_CITIES_DATA: Record<string, number> = {
  'Palm Springs': 48518,
  'Palm Desert': 53369,
  'La Quinta': 41667,
  'Indio': 91761,
  'Rancho Mirage': 18228,
  'Indian Wells': 5357,
  'Cathedral City': 55011,
  'Desert Hot Springs': 29857,
  'Coachella': 46324,
  'Thousand Palms': 7293,
  'Bermuda Dunes': 7536,
  'Thermal': 2865,
  'Mecca': 0,
  'Sky Valley': 0,
  'North Shore': 0,
  'Desert Center': 0,
  'North Palm Springs': 0,
  'Oasis': 0,
  'Cabazon': 0,
  'Whitewater': 0
};

const COACHELLA_VALLEY_CITIES = Object.keys(COACHELLA_VALLEY_CITIES_DATA);

// Joshua Tree Area cities with population data
const JOSHUA_TREE_AREA_CITIES_DATA: Record<string, number> = {
  'Yucca Valley': 21738,
  'Twentynine Palms': 26748,
  '29 Palms': 26748,
  'Joshua Tree': 7414,
  'Morongo Valley': 0,
  'Pioneertown': 0,
  'Landers': 0,
  'Wonder Valley': 0,
  'Sunfair': 0
};

const JOSHUA_TREE_AREA_CITIES = Object.keys(JOSHUA_TREE_AREA_CITIES_DATA);

// County descriptions
const COUNTY_DESCRIPTIONS: Record<string, string> = {
  'Coachella Valley': 'Desert paradise known for world-class golf, luxury resorts, music festivals, and stunning mountain views. From Palm Springs to Indio, the Coachella Valley offers year-round sunshine and desert living at its finest.',
  'Joshua Tree Area': 'Rugged desert beauty with wide-open spaces, stunning rock formations, and clear starry nights. From Joshua Tree National Park to thriving desert communities, this region offers affordable living and outdoor adventure.'
};

// Function to determine "county" based on actual county and city
// This allows us to split counties like Riverside into "Riverside" and "Coachella Valley"
function getCountyNameForCity(county: string, city: string): string {
  // Special county groupings for specific cities
  if (county === 'Riverside' && COACHELLA_VALLEY_CITIES.includes(city)) {
    return 'Coachella Valley';
  }
  if (county === 'San Bernardino' && JOSHUA_TREE_AREA_CITIES.includes(city)) {
    return 'Joshua Tree Area';
  }

  // Default: use actual county name
  return county;
}

// Map counties to regions (default mappings)
const COUNTY_TO_REGION: Record<string, string> = {
  // Southern California
  'Los Angeles': 'Southern California',
  'Orange': 'Southern California',
  'Riverside': 'Southern California', // Non-Coachella Valley cities
  'San Bernardino': 'Southern California', // Non-Joshua Tree cities
  'San Diego': 'Southern California',
  'Ventura': 'Southern California',
  'Imperial': 'Southern California',
  'Santa Barbara': 'Southern California',

  // Central California
  'Kern': 'Central California',
  'San Luis Obispo': 'Central California',
  'Fresno': 'Central California',
  'Madera': 'Central California',
  'Merced': 'Central California',
  'Tulare': 'Central California',
  'Kings': 'Central California',
  'Monterey': 'Central California',
  'San Benito': 'Central California',
  'Santa Cruz': 'Central California',

  // Northern California
  'Alameda': 'Northern California',
  'Contra Costa': 'Northern California',
  'Marin': 'Northern California',
  'Napa': 'Northern California',
  'San Francisco': 'Northern California',
  'San Mateo': 'Northern California',
  'Santa Clara': 'Northern California',
  'Solano': 'Northern California',
  'Sonoma': 'Northern California',
  'Sacramento': 'Northern California',
  'Placer': 'Northern California',
  'El Dorado': 'Northern California',
  'Yolo': 'Northern California',
  'Butte': 'Northern California',
  'Shasta': 'Northern California',
  'Tehama': 'Northern California',
  'Lake': 'Northern California',
  'Mendocino': 'Northern California',
  'Humboldt': 'Northern California',
  'Del Norte': 'Northern California',
  'Siskiyou': 'Northern California',
  'Modoc': 'Northern California',
  'Lassen': 'Northern California',
  'Plumas': 'Northern California',
  'Sierra': 'Northern California',
  'Nevada': 'Northern California',
  'Yuba': 'Northern California',
  'Sutter': 'Northern California',
  'Colusa': 'Northern California',
  'Glenn': 'Northern California',
  'Trinity': 'Northern California',
  'Mariposa': 'Northern California',
  'Tuolumne': 'Northern California',
  'Calaveras': 'Northern California',
  'Amador': 'Northern California',
  'Alpine': 'Northern California',
  'Mono': 'Northern California',
  'Inyo': 'Northern California',
  'Stanislaus': 'Northern California',
  'San Joaquin': 'Northern California',
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function GET() {
  try {
    await connectToDatabase();

    // Get all active listings with city, county, and subdivision data
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
          _id: {
            county: '$countyOrParish',
            city: '$city',
            subdivision: '$subdivisionName'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            county: '$_id.county',
            city: '$_id.city'
          },
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
                {
                  name: '$_id.subdivision',
                  count: '$count'
                },
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
            $push: {
              name: '$_id.city',
              count: '$cityCount',
              subdivisions: '$subdivisions'
            }
          }
        }
      },
      {
        $sort: { countyCount: -1 }
      }
    ]);

    // Transform the data into a structure grouped by region -> county -> city
    // We split counties like Riverside into "Riverside" and "Coachella Valley" based on cities
    interface CityWithCounty {
      actualCounty: string; // The real county name from database
      displayCounty: string; // The county name we'll display (may be "Coachella Valley" or "Joshua Tree Area")
      city: string;
      region: string;
      listings: number;
      subdivisions: any[];
    }

    const citiesWithCounties: CityWithCounty[] = [];

    listings.forEach((countyGroup: any) => {
      countyGroup.cities.forEach((cityData: any) => {
        const actualCounty = countyGroup._id;
        const displayCounty = getCountyNameForCity(actualCounty, cityData.name);
        const region = COUNTY_TO_REGION[actualCounty] || 'Other';

        const subdivisions = (cityData.subdivisions || [])
          .filter((sub: any) => {
            if (!sub || !sub.name) return false;
            const name = sub.name.toString();
            // Filter out generic/placeholder names
            if (name.toLowerCase().startsWith('other')) return false;
            if (name.toLowerCase() === 'unknown') return false;
            if (name.toLowerCase() === 'custom') return false;
            return true;
          })
          .sort((a: any, b: any) => b.count - a.count)
          .map((subData: any) => ({
            name: subData.name,
            slug: createSlug(subData.name),
            listings: subData.count
          }));

        citiesWithCounties.push({
          actualCounty,
          displayCounty,
          city: cityData.name,
          region,
          listings: cityData.count,
          subdivisions
        });
      });
    });

    // Now group by region -> displayCounty -> city
    const regionsMap = new Map<string, RegionData>();

    citiesWithCounties.forEach(cityWithCounty => {
      const { region, displayCounty, city, listings, subdivisions } = cityWithCounty;

      // Get or create region
      if (!regionsMap.has(region)) {
        regionsMap.set(region, {
          name: region,
          slug: createSlug(region),
          listings: 0,
          counties: []
        });
      }
      const regionData = regionsMap.get(region)!;

      // Get or create county within region (using displayCounty)
      let countyData = regionData.counties.find(c => c.name === displayCounty);
      if (!countyData) {
        countyData = {
          name: displayCounty,
          slug: createSlug(displayCounty) + '-county',
          listings: 0,
          cities: [],
          ...(COUNTY_DESCRIPTIONS[displayCounty] ? { description: COUNTY_DESCRIPTIONS[displayCounty] } : {})
        };
        regionData.counties.push(countyData);
      }

      // Get population data for special counties
      let population: number | undefined;
      if (displayCounty === 'Coachella Valley' && COACHELLA_VALLEY_CITIES_DATA[city]) {
        population = COACHELLA_VALLEY_CITIES_DATA[city];
      } else if (displayCounty === 'Joshua Tree Area' && JOSHUA_TREE_AREA_CITIES_DATA[city]) {
        population = JOSHUA_TREE_AREA_CITIES_DATA[city];
      }

      // Add city to county
      countyData.cities.push({
        name: city,
        slug: createSlug(city),
        listings,
        subdivisions,
        ...(population && population > 0 ? { population } : {})
      });

      // Update listing counts
      countyData.listings += listings;
      regionData.listings += listings;
    });

    // Convert map to array and sort by listing count
    const regionsData = Array.from(regionsMap.values())
      .map(region => ({
        ...region,
        counties: region.counties
          .map(county => ({
            ...county,
            cities: county.cities.sort((a, b) => b.listings - a.listings)
          }))
          .sort((a, b) => b.listings - a.listings)
      }))
      .sort((a, b) => b.listings - a.listings);

    return NextResponse.json({
      success: true,
      data: regionsData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Neighborhoods Directory API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch neighborhoods directory',
        message: error.message
      },
      { status: 500 }
    );
  }
}
