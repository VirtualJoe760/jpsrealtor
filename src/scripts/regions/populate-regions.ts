// src/scripts/regions/populate-regions.ts
// Populate regions collection by aggregating county data

import { config } from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { County } from '../../models/counties';
import { Region } from '../../models/regions';

// Load environment variables
const envPath = path.join(__dirname, '../../../.env.local');
config({ path: envPath });

// Helper function to map detailed regions to main regions
const getMainRegion = (region: string): string => {
  if (region.includes('Northern') || region === 'Northern California') {
    return 'Northern California';
  }
  if (region.includes('Bay Area') || region.includes('Sacramento') ||
      region.includes('Central Valley') || region.includes('Central Coast') ||
      region.includes('Sierra')) {
    return 'Central California';
  }
  // Everything else is Southern California (LA, OC, SD, Inland Empire, etc.)
  return 'Southern California';
};

// Generate slug from name
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

async function populateRegions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Fetch all counties (excluding ocean counties)
    console.log('📊 Fetching counties from database...');
    const counties = await County.find({
      isOcean: { $ne: true }
    })
    .select('name region listingCount cityCount coordinates avgPrice priceRange mlsSources')
    .lean();

    console.log(`📍 Found ${counties.length} counties`);

    // Group counties by main region
    const regionMap = new Map<string, {
      listingCount: number;
      countyCount: number;
      cityCount: number;
      avgPrices: number[];
      minPrice: number;
      maxPrice: number;
      latitudes: number[];
      longitudes: number[];
      mlsSources: Set<string>;
      topCounties: Array<{
        name: string;
        slug: string;
        listingCount: number;
        coordinates: { latitude: number; longitude: number };
        avgPrice: number;
      }>;
    }>();

    counties.forEach((county: any) => {
      const mainRegion = getMainRegion(county.region);

      if (!regionMap.has(mainRegion)) {
        regionMap.set(mainRegion, {
          listingCount: 0,
          countyCount: 0,
          cityCount: 0,
          avgPrices: [],
          minPrice: Infinity,
          maxPrice: 0,
          latitudes: [],
          longitudes: [],
          mlsSources: new Set(),
          topCounties: [],
        });
      }

      const region = regionMap.get(mainRegion)!;
      region.listingCount += county.listingCount || 0;
      region.countyCount += 1;
      region.cityCount += county.cityCount || 0;
      if (county.avgPrice) region.avgPrices.push(county.avgPrice);
      if (county.priceRange) {
        region.minPrice = Math.min(region.minPrice, county.priceRange.min);
        region.maxPrice = Math.max(region.maxPrice, county.priceRange.max);
      }
      if (county.coordinates) {
        region.latitudes.push(county.coordinates.latitude);
        region.longitudes.push(county.coordinates.longitude);
      }
      if (county.mlsSources) {
        county.mlsSources.forEach((src: string) => region.mlsSources.add(src));
      }

      // Add to top counties (we'll sort and limit later)
      if (county.listingCount > 0) {
        region.topCounties.push({
          name: county.name,
          slug: slugify(county.name),
          listingCount: county.listingCount,
          coordinates: county.coordinates,
          avgPrice: county.avgPrice,
        });
      }
    });

    console.log(`✨ Aggregated into ${regionMap.size} regions`);

    // Create region documents
    const regionDocs = [];
    for (const [name, data] of regionMap.entries()) {
      // Calculate average coordinates (geographic center)
      const avgLat = data.latitudes.reduce((a, b) => a + b, 0) / data.latitudes.length;
      const avgLng = data.longitudes.reduce((a, b) => a + b, 0) / data.longitudes.length;

      // Calculate average price
      const avgPrice = data.avgPrices.reduce((a, b) => a + b, 0) / data.avgPrices.length;

      // Sort top counties by listing count and take top 10
      const topCounties = data.topCounties
        .sort((a, b) => b.listingCount - a.listingCount)
        .slice(0, 10);

      const regionDoc = {
        name,
        slug: slugify(name),
        normalizedName: name.toLowerCase(),
        coordinates: {
          latitude: avgLat,
          longitude: avgLng,
        },
        listingCount: data.listingCount,
        countyCount: data.countyCount,
        cityCount: data.cityCount,
        priceRange: {
          min: data.minPrice === Infinity ? 0 : data.minPrice,
          max: data.maxPrice,
        },
        avgPrice: Math.round(avgPrice),
        mlsSources: Array.from(data.mlsSources),
        topCounties,
        lastUpdated: new Date(),
      };

      regionDocs.push(regionDoc);

      console.log(`\n📍 ${name}:`);
      console.log(`   Counties: ${data.countyCount}`);
      console.log(`   Cities: ${data.cityCount}`);
      console.log(`   Listings: ${data.listingCount.toLocaleString()}`);
      console.log(`   Avg Price: $${Math.round(avgPrice).toLocaleString()}`);
      console.log(`   Center: ${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}`);
      console.log(`   Top Counties: ${topCounties.slice(0, 5).map(c => c.name).join(', ')}`);
    }

    // Clear existing regions and insert new ones
    console.log('\n🗑️  Clearing existing regions...');
    await Region.deleteMany({});

    console.log('💾 Inserting new regions...');
    await Region.insertMany(regionDocs);

    console.log(`\n✅ Successfully populated ${regionDocs.length} regions!`);

    // Disconnect
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error populating regions:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateRegions();
}

export { populateRegions };
