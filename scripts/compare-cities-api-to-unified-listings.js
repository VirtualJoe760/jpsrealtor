// Compare Cities API to unified_listings collection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function compareCitiesData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    const City = mongoose.models.City || mongoose.model('City', new mongoose.Schema({}, {
      collection: 'cities',
      strict: false
    }));

    console.log('Step 1: Getting cities from Cities collection...\n');

    // Get all cities from the Cities collection
    const citiesFromAPI = await City.find({})
      .select('name slug normalizedName listingCount')
      .sort({ listingCount: -1 })
      .lean();

    console.log(`Found ${citiesFromAPI.length} cities in Cities collection`);

    console.log('\nStep 2: Getting cities from unified_listings...\n');

    // Get all cities from unified_listings (using API query logic)
    const citiesFromListings = await UnifiedListing.aggregate([
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
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log(`Found ${citiesFromListings.length} cities in unified_listings`);

    console.log('\n' + '='.repeat(100));
    console.log('COMPARISON: Cities API vs unified_listings');
    console.log('='.repeat(100));

    // Create maps for easy lookup
    const apiCityMap = new Map();
    citiesFromAPI.forEach(city => {
      apiCityMap.set(city.normalizedName.toLowerCase(), city);
      // Also try slug
      apiCityMap.set(city.slug.toLowerCase(), city);
      // Also try name
      apiCityMap.set(city.name.toLowerCase(), city);
    });

    const listingsCityMap = new Map();
    citiesFromListings.forEach(city => {
      if (city._id) {
        listingsCityMap.set(city._id.toLowerCase(), city.count);
      }
    });

    // Arrays for categorization
    const matches = [];
    const mismatches = [];
    const missingFromAPI = [];
    const missingFromListings = [];

    console.log('\n📊 DETAILED COMPARISON:\n');

    // Check cities from API against listings
    citiesFromAPI.forEach(city => {
      const cityNameLower = city.name.toLowerCase();
      const normalizedLower = city.normalizedName.toLowerCase();
      const slugLower = city.slug.toLowerCase();

      // Try all possible matches
      let listingCount = listingsCityMap.get(cityNameLower) ||
                         listingsCityMap.get(normalizedLower) ||
                         listingsCityMap.get(slugLower);

      if (listingCount !== undefined) {
        const diff = Math.abs(city.listingCount - listingCount);
        const percentDiff = city.listingCount > 0 ? ((diff / city.listingCount) * 100).toFixed(1) : 0;

        if (diff === 0) {
          matches.push({
            name: city.name,
            apiCount: city.listingCount,
            actualCount: listingCount
          });
        } else {
          mismatches.push({
            name: city.name,
            apiCount: city.listingCount,
            actualCount: listingCount,
            diff: diff,
            percentDiff: percentDiff
          });
        }
      } else {
        missingFromListings.push({
          name: city.name,
          slug: city.slug,
          apiCount: city.listingCount
        });
      }
    });

    // Check cities from listings against API
    citiesFromListings.forEach(city => {
      if (!city._id) return;

      const cityNameLower = city._id.toLowerCase();
      const found = apiCityMap.has(cityNameLower);

      if (!found) {
        missingFromAPI.push({
          name: city._id,
          actualCount: city.count
        });
      }
    });

    // Display results
    console.log('✅ PERFECT MATCHES (API count = Actual count):');
    console.log(`   Found ${matches.length} cities with exact counts\n`);
    if (matches.length > 0 && matches.length <= 10) {
      matches.forEach(m => {
        console.log(`   ${m.name}: ${m.apiCount} listings`);
      });
    }

    console.log('\n⚠️  MISMATCHES (API count ≠ Actual count):');
    console.log(`   Found ${mismatches.length} cities with different counts\n`);
    if (mismatches.length > 0) {
      mismatches.slice(0, 20).forEach(m => {
        console.log(`   ${m.name.padEnd(30)} API: ${m.apiCount.toString().padStart(4)}  |  Actual: ${m.actualCount.toString().padStart(4)}  |  Diff: ${m.diff.toString().padStart(4)} (${m.percentDiff}%)`);
      });
      if (mismatches.length > 20) {
        console.log(`   ... and ${mismatches.length - 20} more`);
      }
    }

    console.log('\n❌ MISSING FROM LISTINGS (in Cities API but not in unified_listings):');
    console.log(`   Found ${missingFromListings.length} cities\n`);
    if (missingFromListings.length > 0) {
      missingFromListings.slice(0, 20).forEach(m => {
        console.log(`   ${m.name.padEnd(30)} (slug: ${m.slug.padEnd(25)})  API shows: ${m.apiCount} listings`);
      });
      if (missingFromListings.length > 20) {
        console.log(`   ... and ${missingFromListings.length - 20} more`);
      }
    }

    console.log('\n❌ MISSING FROM API (in unified_listings but not in Cities collection):');
    console.log(`   Found ${missingFromAPI.length} cities\n`);
    if (missingFromAPI.length > 0) {
      missingFromAPI.slice(0, 20).forEach(m => {
        console.log(`   ${m.name.padEnd(30)} Actual: ${m.actualCount} listings`);
      });
      if (missingFromAPI.length > 20) {
        console.log(`   ... and ${missingFromAPI.length - 20} more`);
      }
    }

    // Check specifically for Irvine
    console.log('\n' + '='.repeat(100));
    console.log('🔍 SPECIAL CHECK: IRVINE');
    console.log('='.repeat(100));

    const irvineInAPI = citiesFromAPI.find(c =>
      c.name.toLowerCase().includes('irvine') ||
      c.slug.toLowerCase().includes('irvine') ||
      c.normalizedName.toLowerCase().includes('irvine')
    );

    const irvineInListings = citiesFromListings.find(c =>
      c._id && c._id.toLowerCase().includes('irvine')
    );

    console.log('\nIn Cities API:', irvineInAPI ? `✅ Found: ${irvineInAPI.name} (${irvineInAPI.listingCount} listings)` : '❌ Not found');
    console.log('In unified_listings:', irvineInListings ? `✅ Found: ${irvineInListings._id} (${irvineInListings.count} listings)` : '❌ Not found');

    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('📈 SUMMARY');
    console.log('='.repeat(100));
    console.log(`Cities in API:              ${citiesFromAPI.length}`);
    console.log(`Cities in unified_listings: ${citiesFromListings.length}`);
    console.log(`Perfect Matches:            ${matches.length}`);
    console.log(`Mismatches:                 ${mismatches.length}`);
    console.log(`Missing from Listings:      ${missingFromListings.length}`);
    console.log(`Missing from API:           ${missingFromAPI.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compareCitiesData();
