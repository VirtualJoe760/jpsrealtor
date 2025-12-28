// List all cities from unified_listings collection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function listAllCities() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    console.log('Querying unified_listings for all cities...\n');

    // Get all unique cities with counts (using EXACT API query logic)
    const apiQueryCities = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          propertyType: "A",
          propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
          listPrice: { $exists: true, $ne: null, $gt: 0 },
        }
      },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          avgPrice: { $avg: '$listPrice' },
          minPrice: { $min: '$listPrice' },
          maxPrice: { $max: '$listPrice' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log(`Found ${apiQueryCities.length} cities with active residential listings\n`);
    console.log('='.repeat(80));
    console.log('CITIES FROM UNIFIED_LISTINGS (using API query logic)');
    console.log('='.repeat(80));
    console.log('');

    apiQueryCities.forEach((city, index) => {
      const cityName = city._id || '(NULL)';
      const avgPrice = city.avgPrice ? `$${Math.round(city.avgPrice).toLocaleString()}` : 'N/A';

      console.log(`${(index + 1).toString().padStart(3)}. ${cityName.padEnd(30)} ${city.count.toString().padStart(5)} listings   Avg: ${avgPrice}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${apiQueryCities.length} cities`);
    console.log('='.repeat(80));

    // Also check if "Irvine" exists in ANY format
    console.log('\n\n=== SPECIAL CHECK: Looking for "Irvine" variations ===\n');

    const irvineVariations = await UnifiedListing.aggregate([
      {
        $match: {
          city: { $regex: /irvine/i }
        }
      },
      {
        $group: {
          _id: '$city',
          totalCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$standardStatus', 'Active'] },
                    { $eq: ['$propertyType', 'A'] },
                    { $not: { $in: ['$propertySubType', ['Co-Ownership', 'Timeshare']] } },
                    { $gt: ['$listPrice', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          statuses: { $addToSet: '$standardStatus' },
          propertyTypes: { $addToSet: '$propertyType' },
          propertySubTypes: { $addToSet: '$propertySubType' }
        }
      }
    ]);

    if (irvineVariations.length > 0) {
      console.log('Found Irvine variations:');
      irvineVariations.forEach(v => {
        console.log(`\n  City Name: "${v._id}"`);
        console.log(`  Total Listings: ${v.totalCount}`);
        console.log(`  Active Residential (API criteria): ${v.activeCount}`);
        console.log(`  Statuses: ${v.statuses.join(', ')}`);
        console.log(`  Property Types: ${v.propertyTypes.join(', ')}`);
        console.log(`  Property SubTypes: ${v.propertySubTypes.slice(0, 10).join(', ')}${v.propertySubTypes.length > 10 ? '...' : ''}`);
      });
    } else {
      console.log('❌ No listings found with "irvine" in city name (case-insensitive)');
    }

    // Write results to file
    const fs = require('fs');
    const outputPath = 'F:/web-clients/joseph-sardella/jpsrealtor/scripts/output-cities-from-unified-listings.json';
    fs.writeFileSync(outputPath, JSON.stringify(apiQueryCities, null, 2));
    console.log(`\n✅ Results written to: ${outputPath}`);

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listAllCities();
