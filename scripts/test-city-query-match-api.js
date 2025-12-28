// Test city queries using EXACT API logic
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testCityQueries() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    // Test multiple cities
    const citiesToTest = [
      'Irvine',
      'Palm Desert',
      'La Quinta',
      'Beverly Hills',
      'Los Angeles'
    ];

    for (const cityName of citiesToTest) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`TESTING: ${cityName}`);
      console.log('='.repeat(60));

      // EXACT API QUERY (from cities/[cityId]/listings/route.ts lines 76-82)
      const apiQuery = {
        city: { $regex: new RegExp(`^${cityName}$`, "i") },
        standardStatus: "Active",  // Only show active listings
        propertyType: "A",  // Residential only (excludes B=Rentals, C=Multifamily, D=Land)
        propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
        listPrice: { $exists: true, $ne: null, $gt: 0 },
      };

      // MY OLD WRONG QUERY
      const myOldQuery = {
        city: { $regex: new RegExp(`^${cityName}$`, "i") },
        standardStatus: { $in: ['Active', 'Active Under Contract'] }
      };

      const apiCount = await UnifiedListing.countDocuments(apiQuery);
      const oldCount = await UnifiedListing.countDocuments(myOldQuery);

      console.log(`\nAPI Query Results: ${apiCount} listings`);
      console.log(`My Old Query Results: ${oldCount} listings`);
      console.log(`Difference: ${oldCount - apiCount} listings`);

      if (apiCount > 0) {
        // Get property type breakdown
        const propertyTypes = await UnifiedListing.aggregate([
          { $match: apiQuery },
          {
            $group: {
              _id: '$propertySubType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]);

        console.log(`\nProperty SubTypes (${propertyTypes.length} types):`);
        propertyTypes.forEach((type, i) => {
          console.log(`  ${i + 1}. "${type._id || '(NULL)'}": ${type.count} listings`);
        });
      } else {
        console.log('\n❌ No listings found with API query');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCityQueries();
