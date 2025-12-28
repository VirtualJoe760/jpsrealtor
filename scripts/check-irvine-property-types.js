// Script to check all property subtypes in Irvine
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkIrvinePropertyTypes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define minimal schema to query the collection
    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    // ==========================================
    // STEP 1: Find all city name variations
    // ==========================================
    console.log('=== STEP 1: Finding all cities with "Irvine" in the name ===\n');

    const cityVariations = await UnifiedListing.aggregate([
      { $match: { city: { $regex: /irvine/i } } },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $in: ['$standardStatus', ['Active', 'Active Under Contract']] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (cityVariations.length === 0) {
      console.log('❌ No cities found with "Irvine" in the name.\n');
      console.log('Let me check what cities ARE in the database...\n');

      const allCities = await UnifiedListing.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      console.log('Top 20 cities in the database:');
      allCities.forEach(city => {
        console.log(`  "${city._id}": ${city.count} listings`);
      });

      await mongoose.connection.close();
      return;
    }

    console.log('Found cities with "Irvine":');
    cityVariations.forEach(city => {
      console.log(`  "${city._id}": ${city.count} total listings (${city.activeCount} active)`);
    });

    // Use the most common variation
    const primaryCity = cityVariations[0]._id;
    console.log(`\n✅ Using city name: "${primaryCity}"\n`);

    // ==========================================
    // STEP 2: Property SubType Breakdown
    // ==========================================
    console.log('=== STEP 2: Property SubType Breakdown (Active Listings) ===\n');

    const propertyTypes = await UnifiedListing.aggregate([
      {
        $match: {
          city: primaryCity,
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: '$propertySubType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$listPrice' },
          minPrice: { $min: '$listPrice' },
          maxPrice: { $max: '$listPrice' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (propertyTypes.length === 0) {
      console.log('❌ No active listings found for this city.\n');
    } else {
      console.log(`Found ${propertyTypes.length} different property subtypes:\n`);

      propertyTypes.forEach((type, index) => {
        const subType = type._id || '(NULL/EMPTY)';
        const avgPrice = type.avgPrice ? `$${Math.round(type.avgPrice).toLocaleString()}` : 'N/A';
        const minPrice = type.minPrice ? `$${Math.round(type.minPrice).toLocaleString()}` : 'N/A';
        const maxPrice = type.maxPrice ? `$${Math.round(type.maxPrice).toLocaleString()}` : 'N/A';

        console.log(`${index + 1}. "${subType}"`);
        console.log(`   Count: ${type.count}`);
        console.log(`   Avg Price: ${avgPrice}`);
        console.log(`   Range: ${minPrice} - ${maxPrice}`);
        console.log('');
      });
    }

    // ==========================================
    // STEP 3: MLS Source Breakdown
    // ==========================================
    console.log('=== STEP 3: MLS Source Breakdown ===\n');

    const mlsSources = await UnifiedListing.aggregate([
      {
        $match: {
          city: primaryCity,
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: '$mlsSource',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    mlsSources.forEach(source => {
      const mlsName = source._id || '(NULL/EMPTY)';
      console.log(`  ${mlsName}: ${source.count} listings`);
    });

    // ==========================================
    // STEP 4: Property SubType by MLS Source
    // ==========================================
    console.log('\n=== STEP 4: Property SubType by MLS Source ===\n');

    const typesBySource = await UnifiedListing.aggregate([
      {
        $match: {
          city: primaryCity,
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: {
            mlsSource: '$mlsSource',
            propertySubType: '$propertySubType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.mlsSource': 1, count: -1 } }
    ]);

    let currentSource = null;
    typesBySource.forEach(item => {
      const source = item._id.mlsSource || '(NULL/EMPTY)';
      const subType = item._id.propertySubType || '(NULL/EMPTY)';

      if (source !== currentSource) {
        console.log(`\n${source}:`);
        currentSource = source;
      }
      console.log(`  - "${subType}": ${item.count}`);
    });

    // ==========================================
    // STEP 5: Sample Listings
    // ==========================================
    console.log('\n=== STEP 5: Sample Listings (First 3) ===\n');

    const samples = await UnifiedListing.find({
      city: primaryCity,
      standardStatus: { $in: ['Active', 'Active Under Contract'] }
    })
    .limit(3)
    .select('listingKey mlsSource propertyType propertySubType listPrice city standardStatus')
    .lean();

    samples.forEach((listing, index) => {
      console.log(`Sample ${index + 1}:`);
      console.log(`  Listing Key: ${listing.listingKey}`);
      console.log(`  MLS Source: ${listing.mlsSource || 'N/A'}`);
      console.log(`  Property Type: ${listing.propertyType || 'N/A'}`);
      console.log(`  Property SubType: ${listing.propertySubType || 'N/A'}`);
      console.log(`  Price: $${listing.listPrice?.toLocaleString() || 'N/A'}`);
      console.log(`  Status: ${listing.standardStatus || 'N/A'}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkIrvinePropertyTypes();
