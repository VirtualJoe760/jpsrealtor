// Script to check all property subtypes in Palm Desert
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkPropertyTypes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    const cityName = 'Palm Desert';

    // ==========================================
    // Property SubType Breakdown
    // ==========================================
    console.log(`=== Property SubType Breakdown for ${cityName} (Active Listings) ===\n`);

    const propertyTypes = await UnifiedListing.aggregate([
      {
        $match: {
          city: cityName,
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: '$propertySubType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$listPrice' },
          minPrice: { $min: '$listPrice' },
          maxPrice: { $max: '$listPrice' },
          avgSqft: {
            $avg: {
              $cond: [{ $gt: ['$livingArea', 0] }, '$livingArea', null]
            }
          },
          avgPricePerSqft: {
            $avg: {
              $cond: [
                { $and: [{ $gt: ['$livingArea', 0] }, { $gt: ['$listPrice', 0] }] },
                { $divide: ['$listPrice', '$livingArea'] },
                null
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log(`Found ${propertyTypes.length} different property subtypes:\n`);

    propertyTypes.forEach((type, index) => {
      const subType = type._id || '(NULL/EMPTY)';
      const avgPrice = type.avgPrice ? `$${Math.round(type.avgPrice).toLocaleString()}` : 'N/A';
      const minPrice = type.minPrice ? `$${Math.round(type.minPrice).toLocaleString()}` : 'N/A';
      const maxPrice = type.maxPrice ? `$${Math.round(type.maxPrice).toLocaleString()}` : 'N/A';
      const avgSqft = type.avgSqft ? `${Math.round(type.avgSqft).toLocaleString()} sqft` : 'N/A';
      const avgPricePerSqft = type.avgPricePerSqft ? `$${Math.round(type.avgPricePerSqft)}` : 'N/A';

      console.log(`${index + 1}. "${subType}"`);
      console.log(`   Count: ${type.count} listings`);
      console.log(`   Avg Price: ${avgPrice}`);
      console.log(`   Price Range: ${minPrice} - ${maxPrice}`);
      console.log(`   Avg Size: ${avgSqft}`);
      console.log(`   Avg $/sqft: ${avgPricePerSqft}`);
      console.log('');
    });

    // ==========================================
    // MLS Source Breakdown
    // ==========================================
    console.log('=== MLS Source Breakdown ===\n');

    const mlsSources = await UnifiedListing.aggregate([
      {
        $match: {
          city: cityName,
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
      const pct = ((source.count / propertyTypes.reduce((sum, t) => sum + t.count, 0)) * 100).toFixed(1);
      console.log(`  ${mlsName}: ${source.count} listings (${pct}%)`);
    });

    // ==========================================
    // Property SubType by MLS Source
    // ==========================================
    console.log('\n=== Property SubType by MLS Source ===\n');

    const typesBySource = await UnifiedListing.aggregate([
      {
        $match: {
          city: cityName,
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

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPropertyTypes();
