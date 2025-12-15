// Test the FULL pipeline to see where the issue is
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import combineFilters
const { combineFilters } = require('./src/lib/queries/filters/index.ts');

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingPipelineTest', unifiedSchema);

async function testFullPipeline() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // EXACT data that would come from API POST
    const apiBody = {
      city: "Palm Desert",
      filters: {
        listedAfter: "2025-12-07",
        limit: 10
      }
    };

    console.log('='.repeat(80));
    console.log('FULL PIPELINE TEST');
    console.log('='.repeat(80));
    console.log('\nStep 1: API receives this body:');
    console.log(JSON.stringify(apiBody, null, 2));

    // Simulate what executeQuery does
    console.log('\nStep 2: executeQuery merges filters:');
    const mergedFilters = {
      ...apiBody.filters,
      limit: apiBody.filters.limit,
      skip: undefined,
      sort: undefined
    };
    console.log(JSON.stringify(mergedFilters, null, 2));

    // Simulate what getActiveListingsByCity does
    console.log('\nStep 3: getActiveListingsByCity calls combineFilters:');
    const combinedQuery = combineFilters({ city: apiBody.city, ...mergedFilters });
    console.log(JSON.stringify(combinedQuery, null, 2));

    // Check the date filter specifically
    if (combinedQuery.onMarketDate) {
      const dateValue = combinedQuery.onMarketDate.$gte;
      console.log('\nStep 4: Date filter analysis:');
      console.log('  Value:', dateValue);
      console.log('  Type:', typeof dateValue);
      console.log('  Is Date object?', dateValue instanceof Date);
      console.log('  Is string?', typeof dateValue === 'string');

      if (dateValue instanceof Date) {
        console.log('  ❌ BUG FOUND: Date is a Date object, not a string!');
        console.log('  Date.toISOString():', dateValue.toISOString());
        console.log('  This will NOT work with MongoDB string comparison!');
      } else if (typeof dateValue === 'string') {
        console.log('  ✅ Date is a string');
        if (dateValue.includes('T')) {
          console.log('  ✅ Has timestamp');
        } else {
          console.log('  ⚠️  No timestamp - might not work for comparison');
        }
      }
    }

    // Execute the actual MongoDB query
    console.log('\nStep 5: Execute MongoDB query:');
    const results = await UnifiedListing.find(combinedQuery)
      .limit(mergedFilters.limit || 100)
      .sort({ onMarketDate: -1 })
      .lean();

    console.log(`Results: ${results.length} listings`);

    if (results.length > 0) {
      console.log('\n✅ SUCCESS! Sample listings:');
      results.slice(0, 3).forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('\n❌ QUERY RETURNED 0 RESULTS');
      console.log('\nDiagnosing...\n');

      // Test without date filter
      const queryNoDate = { ...combinedQuery };
      delete queryNoDate.onMarketDate;
      const resultsNoDate = await UnifiedListing.find(queryNoDate)
        .limit(5)
        .sort({ onMarketDate: -1 })
        .lean();

      console.log(`Without date filter: ${resultsNoDate.length} results`);
      if (resultsNoDate.length > 0) {
        console.log('Most recent listing:');
        console.log(`  Address: ${resultsNoDate[0].unparsedAddress}`);
        console.log(`  On Market: ${resultsNoDate[0].onMarketDate}`);
        console.log(`  Type of onMarketDate in DB:`, typeof resultsNoDate[0].onMarketDate);

        // Try manual comparison
        const dbDate = resultsNoDate[0].onMarketDate;
        const filterDate = combinedQuery.onMarketDate?.$gte;
        console.log(`\nString comparison test:`);
        console.log(`  DB value: "${dbDate}"`);
        console.log(`  Filter value: "${filterDate}"`);
        console.log(`  DB >= Filter? ${dbDate >= filterDate}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testFullPipeline();
