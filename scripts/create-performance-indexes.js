// scripts/create-performance-indexes.js
// Creates compound indexes for bed/bath filtering to improve search performance
// Run with: node scripts/create-performance-indexes.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function createPerformanceIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    // Use the actual collection name, not the view
    const collection = db.collection('unified_listings');

    console.log('\n📊 Creating performance indexes for bed/bath filtering...');

    // Get existing indexes to avoid duplicates
    const existingIndexes = await collection.indexes();
    console.log(`\nExisting indexes: ${existingIndexes.length}`);
    existingIndexes.forEach(idx => {
      console.log(`  - ${JSON.stringify(idx.key)}`);
    });

    // Define new indexes
    const newIndexes = [
      // City-based indexes for bed/bath filtering
      { city: 1, standardStatus: 1, propertyType: 1, bedsTotal: 1 },
      { city: 1, standardStatus: 1, propertyType: 1, bedroomsTotal: 1 },
      { city: 1, standardStatus: 1, propertyType: 1, bathsTotal: 1 },
      { city: 1, standardStatus: 1, propertyType: 1, bathroomsTotalInteger: 1 },

      // Subdivision-based indexes for bed/bath filtering
      { subdivisionName: 1, standardStatus: 1, propertyType: 1, bedsTotal: 1 },
      { subdivisionName: 1, standardStatus: 1, propertyType: 1, bedroomsTotal: 1 },
      { subdivisionName: 1, standardStatus: 1, propertyType: 1, bathsTotal: 1 },
      { subdivisionName: 1, standardStatus: 1, propertyType: 1, bathroomsTotalInteger: 1 },
    ];

    console.log('\n🔨 Creating new indexes...');

    for (const indexSpec of newIndexes) {
      const indexName = Object.keys(indexSpec).join('_');

      // Check if index already exists
      const exists = existingIndexes.some(idx => {
        return JSON.stringify(idx.key) === JSON.stringify(indexSpec);
      });

      if (exists) {
        console.log(`⏭️  Index ${indexName} already exists, skipping...`);
        continue;
      }

      try {
        console.log(`📝 Creating index: ${JSON.stringify(indexSpec)}`);
        const startTime = Date.now();

        await collection.createIndex(indexSpec, { background: true });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Created index in ${duration}s`);
      } catch (error) {
        console.error(`❌ Error creating index ${indexName}:`, error.message);
      }
    }

    // Show final index list
    const finalIndexes = await collection.indexes();
    console.log(`\n📊 Final index count: ${finalIndexes.length}`);

    console.log('\n✅ Index creation complete!');
    console.log('\n💡 These indexes will significantly improve performance for queries like:');
    console.log('   - "4 beds in Indian Wells"');
    console.log('   - "3 baths in Palm Desert Country Club"');
    console.log('   - Bedroom/bathroom filtering in city and subdivision searches');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createPerformanceIndexes();
