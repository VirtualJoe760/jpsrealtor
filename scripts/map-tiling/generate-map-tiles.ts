// scripts/map-tiling/generate-map-tiles.ts
// Generates static map tiles from MongoDB listings using Supercluster

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import Supercluster from 'supercluster';
import { lngLatToTile, tileToBounds } from '../../src/app/utils/tileMath/tileMath';

// Types
interface Listing {
  listingKey?: string;
  listingId?: string;
  latitude: number;
  longitude: number;
  listPrice?: number;
  city?: string;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  slug?: string;
  mlsSource?: string;
  propertyType?: string;
  propertySubType?: string;
  livingArea?: number;
  poolYn?: boolean;
  spaYn?: boolean;
  associationFee?: number;
  unparsedAddress?: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    listingKey: string;
    listingId?: string;
    listPrice?: number;
    city?: string;
    beds?: number;
    baths?: number;
    slug?: string;
    mlsSource: string;
    propertyType?: string;
    propertySubType?: string;
    livingArea?: number;
    poolYn?: boolean;
    spaYn?: boolean;
    associationFee?: number;
    unparsedAddress?: string;
  };
}

// Configuration
const ZOOM_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'tiles');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not found in environment variables');
}

async function generateTiles() {
  console.log('🚀 Starting tile generation...\n');

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db();

  try {
    // Fetch all active listings with coordinates from both collections
    console.log('📦 Fetching listings from GPS MLS...');
    const gpsListings = await db.collection('listings').find({
      standardStatus: 'Active',
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).toArray();

    // Add mlsSource to GPS listings
    const gpsWithSource = gpsListings.map(listing => ({
      ...listing,
      mlsSource: 'GPS'
    }));

    console.log('📦 Fetching listings from CRMLS...');
    const crmlsListings = await db.collection('crmls_listings').find({
      standardStatus: 'Active',
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).toArray();

    // Add mlsSource to CRMLS listings
    const crmlsWithSource = crmlsListings.map(listing => ({
      ...listing,
      mlsSource: 'CRMLS'
    }));

    const allListings = [...gpsWithSource, ...crmlsWithSource] as unknown as Listing[];
    console.log(`✅ Loaded ${allListings.length} total active listings (GPS: ${gpsListings.length}, CRMLS: ${crmlsListings.length})\n`);

    // Transform to GeoJSON features
    console.log('🔄 Transforming to GeoJSON...');
    const features: GeoJSONFeature[] = allListings.map((listing) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [listing.longitude, listing.latitude]
      },
      properties: {
        listingKey: listing.listingKey || listing.listingId || '',
        listingId: listing.listingId,
        listPrice: listing.listPrice,
        city: listing.city,
        beds: listing.bedroomsTotal,
        baths: listing.bathroomsTotalDecimal,
        slug: listing.slug,
        mlsSource: listing.mlsSource || 'GPS', // Default to GPS for safety
        propertyType: listing.propertyType,
        propertySubType: listing.propertySubType,
        livingArea: listing.livingArea,
        poolYn: listing.poolYn,
        spaYn: listing.spaYn,
        associationFee: listing.associationFee,
        unparsedAddress: listing.unparsedAddress
      }
    }));

    console.log(`✅ Created ${features.length} GeoJSON features\n`);

    // Initialize Supercluster
    console.log('🌐 Initializing Supercluster...');
    const index = new Supercluster({
      radius: 60,
      maxZoom: 15,
      minZoom: 0,
      minPoints: 2
    });

    index.load(features);
    console.log('✅ Supercluster loaded\n');

    // Clear existing tiles
    console.log('🗑️  Clearing existing tiles...');
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✅ Tiles directory cleared\n');

    // Generate tiles for each zoom level
    let totalTiles = 0;
    let totalFeatures = 0;

    for (const zoom of ZOOM_LEVELS) {
      console.log(`📍 Processing zoom level ${zoom}...`);

      // Calculate world bounds in tile coordinates
      const worldMin = lngLatToTile(-180, 85, zoom);
      const worldMax = lngLatToTile(180, -85, zoom);

      let zoomTiles = 0;
      let zoomFeatures = 0;

      // Iterate through all tiles at this zoom level
      for (let x = worldMin.x; x <= worldMax.x; x++) {
        for (let y = worldMin.y; y <= worldMax.y; y++) {
          // Get bounding box for this tile
          const bbox = tileToBounds(x, y, zoom);

          // Get clusters/features for this tile
          const clusters = index.getClusters(bbox, zoom);

          // Skip empty tiles
          if (clusters.length === 0) continue;

          // Create directory structure
          const tileDir = path.join(OUTPUT_DIR, String(zoom), String(x));
          fs.mkdirSync(tileDir, { recursive: true });

          // Write tile file
          const tilePath = path.join(tileDir, `${y}.json`);
          fs.writeFileSync(tilePath, JSON.stringify(clusters));

          zoomTiles++;
          zoomFeatures += clusters.length;
        }
      }

      totalTiles += zoomTiles;
      totalFeatures += zoomFeatures;

      console.log(`   ✅ Generated ${zoomTiles} tiles with ${zoomFeatures} features\n`);
    }

    console.log(`\n🎉 Tile generation complete!`);
    console.log(`   📊 Total tiles: ${totalTiles}`);
    console.log(`   📍 Total features: ${totalFeatures}`);
    console.log(`   💾 Output: ${OUTPUT_DIR}\n`);

  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the generator
generateTiles().catch((error) => {
  console.error('❌ Error generating tiles:', error);
  process.exit(1);
});
