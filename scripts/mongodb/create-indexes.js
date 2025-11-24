// scripts/mongodb/create-indexes.js
// Creates optimized MongoDB indexes for map query performance

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

/**
 * Index definitions for optimal map query performance
 */
const INDEXES = {
  listings: [
    // Geospatial compound index for bounding box queries
    {
      name: 'geo_active_price',
      keys: {
        standardStatus: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1
      },
      options: { background: true }
    },
    // Property search index
    {
      name: 'property_search',
      keys: {
        standardStatus: 1,
        propertyType: 1,
        bedroomsTotal: 1,
        bathroomsTotalDecimal: 1,
        listPrice: 1
      },
      options: { background: true }
    },
    // City + subdivision lookup
    {
      name: 'city_subdivision',
      keys: {
        standardStatus: 1,
        city: 1,
        subdivisionName: 1
      },
      options: { background: true }
    },
    // Listing key unique index
    {
      name: 'listingKey_unique',
      keys: { listingKey: 1 },
      options: { unique: true, background: true }
    },
    // Living area filter index
    {
      name: 'living_area_filter',
      keys: {
        standardStatus: 1,
        livingArea: 1
      },
      options: { background: true, sparse: true }
    },
    // Pool/Spa feature index
    {
      name: 'pool_spa_features',
      keys: {
        standardStatus: 1,
        poolYn: 1,
        spaYn: 1
      },
      options: { background: true, sparse: true }
    },
    // HOA fee index
    {
      name: 'hoa_fee',
      keys: {
        standardStatus: 1,
        associationFee: 1
      },
      options: { background: true, sparse: true }
    },
    // Days on market index (coming soon feature)
    {
      name: 'days_on_market',
      keys: {
        standardStatus: 1,
        daysOnMarket: 1
      },
      options: { background: true, sparse: true }
    }
  ],
  crmls_listings: [
    // Same indexes for CRMLS collection
    {
      name: 'geo_active_price',
      keys: {
        standardStatus: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1
      },
      options: { background: true }
    },
    {
      name: 'property_search',
      keys: {
        standardStatus: 1,
        propertyType: 1,
        bedroomsTotal: 1,
        bathroomsTotalDecimal: 1,
        listPrice: 1
      },
      options: { background: true }
    },
    {
      name: 'city_subdivision',
      keys: {
        standardStatus: 1,
        city: 1,
        subdivisionName: 1
      },
      options: { background: true }
    },
    {
      name: 'listingKey_unique',
      keys: { listingKey: 1 },
      options: { unique: true, background: true }
    },
    {
      name: 'living_area_filter',
      keys: {
        standardStatus: 1,
        livingArea: 1
      },
      options: { background: true, sparse: true }
    },
    {
      name: 'pool_spa_features',
      keys: {
        standardStatus: 1,
        poolYn: 1,
        spaYn: 1
      },
      options: { background: true, sparse: true }
    },
    {
      name: 'hoa_fee',
      keys: {
        standardStatus: 1,
        associationFee: 1
      },
      options: { background: true, sparse: true }
    },
    {
      name: 'days_on_market',
      keys: {
        standardStatus: 1,
        daysOnMarket: 1
      },
      options: { background: true, sparse: true }
    }
  ]
};

/**
 * Create indexes for a collection
 */
async function createIndexesForCollection(db, collectionName) {
  console.log(`\n📊 Processing collection: ${collectionName}`);

  const collection = db.collection(collectionName);
  const indexes = INDEXES[collectionName];

  if (!indexes) {
    console.log(`   ⚠️  No indexes defined for ${collectionName}`);
    return;
  }

  console.log(`   📝 Creating ${indexes.length} indexes...\n`);

  for (const index of indexes) {
    try {
      console.log(`   ⏳ Creating index: ${index.name}...`);

      const result = await collection.createIndex(index.keys, {
        ...index.options,
        name: index.name
      });

      console.log(`   ✅ ${result} created successfully`);
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        // Index already exists or conflicting index
        console.log(`   ⚠️  Index ${index.name} already exists or conflicts - skipping`);
      } else {
        console.error(`   ❌ Error creating index ${index.name}:`, error.message);
      }
    }
  }

  // List all indexes
  const allIndexes = await collection.indexes();
  console.log(`\n   📋 Total indexes on ${collectionName}: ${allIndexes.length}`);
  allIndexes.forEach(idx => {
    console.log(`      - ${idx.name}`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 MongoDB Index Creation Script\n');
  console.log(`📡 Connecting to MongoDB...`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Create indexes for listings collection
    await createIndexesForCollection(db, 'listings');

    // Create indexes for crmls_listings collection
    await createIndexesForCollection(db, 'crmls_listings');

    console.log('\n✨ Index creation complete!\n');

    // Display index stats
    console.log('📊 Collection Statistics:');

    const listingsStats = await db.collection('listings').stats();
    console.log(`\n   listings:`);
    console.log(`      - Documents: ${listingsStats.count.toLocaleString()}`);
    console.log(`      - Indexes: ${listingsStats.nindexes}`);
    console.log(`      - Total Index Size: ${(listingsStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    const crmlsStats = await db.collection('crmls_listings').stats();
    console.log(`\n   crmls_listings:`);
    console.log(`      - Documents: ${crmlsStats.count.toLocaleString()}`);
    console.log(`      - Indexes: ${crmlsStats.nindexes}`);
    console.log(`      - Total Index Size: ${(crmlsStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✅ All done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed\n');
  }
}

// Run the script
main().catch(console.error);
