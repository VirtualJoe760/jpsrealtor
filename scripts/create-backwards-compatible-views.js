// Create MongoDB views for backwards compatibility
// This ensures old code referencing deprecated collection names still works
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function createBackwardsCompatibleViews() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    console.log('='.repeat(80));
    console.log('CREATING BACKWARDS COMPATIBLE VIEWS');
    console.log('='.repeat(80));
    console.log('');

    // ==========================================
    // VIEW 1: unifiedlistings → unified_listings
    // ==========================================
    console.log('📋 Step 1: Checking existing "unifiedlistings" collection');

    const collections = await db.listCollections({ name: 'unifiedlistings' }).toArray();

    if (collections.length > 0) {
      const collectionInfo = collections[0];

      if (collectionInfo.type === 'collection') {
        // It's a real collection, not a view - need to rename it
        const oldCount = await db.collection('unifiedlistings').countDocuments({});
        console.log(`   Found existing collection with ${oldCount.toLocaleString()} documents`);
        console.log('   Renaming to "unifiedlistings_deprecated_2025_12_24"...');

        await db.renameCollection('unifiedlistings', 'unifiedlistings_deprecated_2025_12_24');
        console.log('   ✅ Old collection archived\n');
      } else if (collectionInfo.type === 'view') {
        console.log('   Existing view found, dropping it first...');
        await db.dropCollection('unifiedlistings');
        console.log('   ✅ Old view dropped\n');
      }
    } else {
      console.log('   No existing collection or view found\n');
    }

    console.log('📋 Step 2: Creating view "unifiedlistings" → "unified_listings"');

    try {
      // Create view
      await db.createCollection('unifiedlistings', {
        viewOn: 'unified_listings',
        pipeline: [
          { $match: {} } // Pass through all documents
        ]
      });

      console.log('✅ View "unifiedlistings" created successfully');
      console.log('   Now queries to "unifiedlistings" will read from "unified_listings"\n');
    } catch (error) {
      if (error.codeName === 'NamespaceExists') {
        console.log('⚠️  "unifiedlistings" already exists as a view');
        console.log('   Skipping creation\n');
      } else {
        throw error;
      }
    }

    // ==========================================
    // VIEW 2: unifiedclosedlistings → unified_closed_listings
    // ==========================================
    console.log('📋 Step 1: Checking existing "unifiedclosedlistings" collection');

    const closedCollections = await db.listCollections({ name: 'unifiedclosedlistings' }).toArray();

    if (closedCollections.length > 0) {
      const collectionInfo = closedCollections[0];

      if (collectionInfo.type === 'collection') {
        // It's a real collection, not a view - need to rename it
        const oldCount = await db.collection('unifiedclosedlistings').countDocuments({});
        console.log(`   Found existing collection with ${oldCount.toLocaleString()} documents`);
        console.log('   Renaming to "unifiedclosedlistings_deprecated_2025_12_24"...');

        await db.renameCollection('unifiedclosedlistings', 'unifiedclosedlistings_deprecated_2025_12_24');
        console.log('   ✅ Old collection archived\n');
      } else if (collectionInfo.type === 'view') {
        console.log('   Existing view found, dropping it first...');
        await db.dropCollection('unifiedclosedlistings');
        console.log('   ✅ Old view dropped\n');
      }
    } else {
      console.log('   No existing collection or view found\n');
    }

    console.log('📋 Step 2: Creating view "unifiedclosedlistings" → "unified_closed_listings"');

    try {
      // Create view
      await db.createCollection('unifiedclosedlistings', {
        viewOn: 'unified_closed_listings',
        pipeline: [
          { $match: {} } // Pass through all documents
        ]
      });

      console.log('✅ View "unifiedclosedlistings" created successfully');
      console.log('   Now queries to "unifiedclosedlistings" will read from "unified_closed_listings"\n');
    } catch (error) {
      if (error.codeName === 'NamespaceExists') {
        console.log('⚠️  "unifiedclosedlistings" already exists as a view');
        console.log('   Skipping creation\n');
      } else {
        throw error;
      }
    }

    // ==========================================
    // Verify Views Work
    // ==========================================
    console.log('='.repeat(80));
    console.log('VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    // Test view 1
    const viewCount1 = await db.collection('unifiedlistings').countDocuments({});
    const sourceCount1 = await db.collection('unified_listings').countDocuments({});

    console.log('📊 Active Listings:');
    console.log(`   View "unifiedlistings": ${viewCount1.toLocaleString()} documents`);
    console.log(`   Source "unified_listings": ${sourceCount1.toLocaleString()} documents`);

    if (viewCount1 === sourceCount1) {
      console.log('   ✅ MATCH - View working correctly\n');
    } else {
      console.log('   ❌ MISMATCH - View not working correctly\n');
    }

    // Test view 2
    const viewCount2 = await db.collection('unifiedclosedlistings').countDocuments({});
    const sourceCount2 = await db.collection('unified_closed_listings').countDocuments({});

    console.log('📊 Closed Listings:');
    console.log(`   View "unifiedclosedlistings": ${viewCount2.toLocaleString()} documents`);
    console.log(`   Source "unified_closed_listings": ${sourceCount2.toLocaleString()} documents`);

    if (viewCount2 === sourceCount2) {
      console.log('   ✅ MATCH - View working correctly\n');
    } else {
      console.log('   ❌ MISMATCH - View not working correctly\n');
    }

    // Test querying Irvine through the view
    console.log('📍 Testing Irvine query through view:');
    const irvineCountThroughView = await db.collection('unifiedlistings').countDocuments({
      city: { $regex: /^irvine$/i },
      standardStatus: 'Active',
      propertyType: 'A'
    });

    console.log(`   Irvine active residential listings: ${irvineCountThroughView.toLocaleString()}`);

    if (irvineCountThroughView > 0) {
      console.log('   ✅ View successfully returns Irvine data\n');
    } else {
      console.log('   ❌ View not returning Irvine data\n');
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ Backwards compatibility views created successfully');
    console.log('');
    console.log('📝 What this means:');
    console.log('   - Old code using "unifiedlistings" will now work');
    console.log('   - Old code using "unifiedclosedlistings" will now work');
    console.log('   - Views are READ-ONLY (writes must go to source collections)');
    console.log('   - Views automatically reflect current data from source');
    console.log('');
    console.log('⚠️  Note: MongoDB views are read-only');
    console.log('   Any INSERT/UPDATE/DELETE must target the source collection');
    console.log('   (unified_listings or unified_closed_listings)');
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Script completed successfully\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createBackwardsCompatibleViews();
