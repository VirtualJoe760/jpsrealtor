/**
 * Create Database Indexes
 *
 * Creates recommended MongoDB indexes for optimal query performance.
 * Based on DATABASE_INDEXES.md recommendations.
 *
 * Usage:
 * ```bash
 * npx tsx src/scripts/database/create-indexes.ts
 * ```
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../..', '.env.local') });

import mongoose from 'mongoose';
import UnifiedListing from '@/models/unified-listing';

interface IndexDefinition {
  name: string;
  keys: Record<string, 1 | -1 | '2dsphere' | 'text'>;
  options?: Record<string, any>;
}

/**
 * Index definitions for unified_listings
 */
const UNIFIED_LISTINGS_INDEXES: IndexDefinition[] = [
  // Location indexes (most important)
  {
    name: 'city_listPrice',
    keys: { city: 1, listPrice: 1 },
  },
  {
    name: 'city_propertyType_listPrice',
    keys: { city: 1, propertyType: 1, listPrice: 1 },
  },
  {
    name: 'subdivisionName_listPrice',
    keys: { subdivisionName: 1, listPrice: 1 },
  },
  {
    name: 'subdivisionName_standardStatus_listPrice',
    keys: { subdivisionName: 1, standardStatus: 1, listPrice: 1 },
  },
  {
    name: 'postalCode_listPrice',
    keys: { postalCode: 1, listPrice: 1 },
  },
  {
    name: 'countyOrParish_listPrice',
    keys: { countyOrParish: 1, listPrice: 1 },
  },
  {
    name: 'mlsSource_city',
    keys: { mlsSource: 1, city: 1 },
  },

  // Property filter indexes
  {
    name: 'beds_baths_listPrice',
    keys: { beds: 1, baths: 1, listPrice: 1 },
  },
  {
    name: 'city_beds_listPrice',
    keys: { city: 1, beds: 1, listPrice: 1 },
  },
  {
    name: 'listPrice_livingArea',
    keys: { listPrice: 1, livingArea: 1 },
  },
  {
    name: 'livingArea_listPrice',
    keys: { livingArea: 1, listPrice: 1 },
  },
  {
    name: 'yearBuilt_city',
    keys: { yearBuilt: 1, city: 1 },
  },
  {
    name: 'propertyType_propertySubType',
    keys: { propertyType: 1, propertySubType: 1 },
  },
  {
    name: 'propertySubType_city_listPrice',
    keys: { propertySubType: 1, city: 1, listPrice: 1 },
  },

  // Amenity indexes
  {
    name: 'poolYn_city_listPrice',
    keys: { poolYn: 1, city: 1, listPrice: 1 },
  },
  {
    name: 'spaYn_city',
    keys: { spaYn: 1, city: 1 },
  },
  {
    name: 'viewYn_city_listPrice',
    keys: { viewYn: 1, city: 1, listPrice: 1 },
  },
  {
    name: 'gatedCommunity_city',
    keys: { gatedCommunity: 1, city: 1 },
  },
  {
    name: 'seniorCommunityYn_city',
    keys: { seniorCommunityYn: 1, city: 1 },
  },
  {
    name: 'garageSpaces_city',
    keys: { garageSpaces: 1, city: 1 },
  },

  // Time-based indexes
  {
    name: 'daysOnMarket_city',
    keys: { daysOnMarket: 1, city: 1 },
  },
  {
    name: 'daysOnMarket_listPrice',
    keys: { daysOnMarket: 1, listPrice: 1 },
  },
  {
    name: 'listingContractDate_desc_city',
    keys: { listingContractDate: -1, city: 1 },
  },
  {
    name: 'listingContractDate_desc',
    keys: { listingContractDate: -1 },
  },
  {
    name: 'status_city_listingContractDate',
    keys: { status: 1, city: 1, listingContractDate: -1 },
  },

  // Geospatial index (already defined in schema, but included for completeness)
  {
    name: 'coordinates_2dsphere',
    keys: { coordinates: '2dsphere' },
  },

  // Cities: onMarketDate for newest-first sorting
  {
    name: 'city_onMarketDate_desc',
    keys: { city: 1, onMarketDate: -1 },
  },
];

/**
 * Index definitions for unified_closed_listings (if model exists)
 */
const CLOSED_LISTINGS_INDEXES: IndexDefinition[] = [
  // Historical analysis indexes
  {
    name: 'closeDate_desc_city',
    keys: { closeDate: -1, city: 1 },
  },
  {
    name: 'city_closeDate_closePrice',
    keys: { city: 1, closeDate: -1, closePrice: 1 },
  },
  {
    name: 'subdivisionName_closeDate_desc',
    keys: { subdivisionName: 1, closeDate: -1 },
  },
  {
    name: 'closePrice_closeDate',
    keys: { closePrice: 1, closeDate: -1 },
  },
  {
    name: 'propertyType_city_closeDate',
    keys: { propertyType: 1, city: 1, closeDate: -1 },
  },

  // Appreciation analysis indexes
  {
    name: 'city_propertySubType_closeDate',
    keys: { city: 1, propertySubType: 1, closeDate: -1 },
  },
  {
    name: 'subdivisionName_closeDate_closePrice',
    keys: { subdivisionName: 1, closeDate: -1, closePrice: 1 },
  },
  {
    name: 'beds_baths_city_closeDate',
    keys: { beds: 1, baths: 1, city: 1, closeDate: -1 },
  },
];

/**
 * Create indexes for a collection
 */
async function createIndexesForCollection(
  collectionName: string,
  indexes: IndexDefinition[]
): Promise<{ created: number; failed: number; errors: string[] }> {
  const stats = { created: 0, failed: 0, errors: [] as string[] };

  console.log(`\n📊 Creating indexes for ${collectionName}...`);

  const collection = mongoose.connection.collection(collectionName);

  for (const index of indexes) {
    try {
      console.log(`   Creating: ${index.name}...`);

      await collection.createIndex(index.keys, {
        name: index.name,
        ...index.options,
      });

      console.log(`   ✅ Created: ${index.name}`);
      stats.created++;
    } catch (error: any) {
      // Index already exists (code 85) is not an error
      if (error.code === 85) {
        console.log(`   ℹ️  Already exists: ${index.name}`);
        stats.created++;
      } else {
        console.error(`   ❌ Failed: ${index.name} - ${error.message}`);
        stats.failed++;
        stats.errors.push(`${index.name}: ${error.message}`);
      }
    }
  }

  return stats;
}

/**
 * List existing indexes
 */
async function listExistingIndexes(collectionName: string): Promise<void> {
  try {
    const collection = mongoose.connection.collection(collectionName);
    const indexes = await collection.indexes();

    console.log(`\n📋 Existing indexes for ${collectionName}:`);
    indexes.forEach((index) => {
      console.log(`   - ${index.name}`);
    });
  } catch (error) {
    console.log(`   Collection ${collectionName} not found or no indexes`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list');
  const dryRun = args.includes('--dry-run');

  console.log('🗄️  Database Index Management');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : listOnly ? 'LIST ONLY' : 'CREATE'}`);
  console.log('');

  // Connect to MongoDB
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate');
    console.log('✅ Connected to MongoDB');
  }

  if (listOnly) {
    // List existing indexes
    await listExistingIndexes('unified_listings');
    await listExistingIndexes('unified_closed_listings');
    return;
  }

  if (dryRun) {
    console.log('📝 DRY RUN - Would create the following indexes:\n');
    console.log('unified_listings:');
    UNIFIED_LISTINGS_INDEXES.forEach((index) => {
      console.log(`   - ${index.name}`);
    });
    console.log('\nunified_closed_listings:');
    CLOSED_LISTINGS_INDEXES.forEach((index) => {
      console.log(`   - ${index.name}`);
    });
    return;
  }

  // Create indexes
  const unifiedListingsStats = await createIndexesForCollection(
    'unified_listings',
    UNIFIED_LISTINGS_INDEXES
  );

  const closedListingsStats = await createIndexesForCollection(
    'unified_closed_listings',
    CLOSED_LISTINGS_INDEXES
  );

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Index Creation Complete!');
  console.log('='.repeat(60));

  console.log('\nunified_listings:');
  console.log(`   ✅ Created: ${unifiedListingsStats.created}`);
  console.log(`   ❌ Failed: ${unifiedListingsStats.failed}`);

  console.log('\nunified_closed_listings:');
  console.log(`   ✅ Created: ${closedListingsStats.created}`);
  console.log(`   ❌ Failed: ${closedListingsStats.failed}`);

  if (unifiedListingsStats.errors.length > 0 || closedListingsStats.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    [...unifiedListingsStats.errors, ...closedListingsStats.errors].forEach((error) => {
      console.log(`   - ${error}`);
    });
  }

  console.log('\n💡 Next steps:');
  console.log('   1. Monitor query performance: db.unified_listings.explain()');
  console.log('   2. Check index usage: db.unified_listings.aggregate([{$indexStats:{}}])');
  console.log('   3. Test queries with new indexes');
}

// Run
main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
  });
