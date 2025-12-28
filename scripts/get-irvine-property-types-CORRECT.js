// Get Irvine property types from the CORRECT unified_listings collection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function getIrvinePropertyTypes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Query the CORRECT collection: unified_listings (with underscore)
    const collection = mongoose.connection.db.collection('unified_listings');

    // Get property types using the EXACT API query logic
    const propertyTypes = await collection.aggregate([
      {
        $match: {
          city: { $regex: /^irvine$/i },
          standardStatus: "Active",
          propertyType: "A",
          propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
          listPrice: { $exists: true, $ne: null, $gt: 0 },
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
    ]).toArray();

    console.log('='.repeat(80));
    console.log('IRVINE PROPERTY SUBTYPES (Active Residential Listings)');
    console.log('='.repeat(80));
    console.log('');

    console.log(`Found ${propertyTypes.length} different property subtypes:\n`);

    propertyTypes.forEach((type, index) => {
      const subType = type._id || '(NULL/EMPTY)';
      const avgPrice = type.avgPrice ? `$${Math.round(type.avgPrice).toLocaleString()}` : 'N/A';
      const minPrice = type.minPrice ? `$${Math.round(type.minPrice).toLocaleString()}` : 'N/A';
      const maxPrice = type.maxPrice ? `$${Math.round(type.maxPrice).toLocaleString()}` : 'N/A';
      const avgSqft = type.avgSqft ? `${Math.round(type.avgSqft).toLocaleString()} sqft` : 'N/A';
      const avgPricePerSqft = type.avgPricePerSqft ? `$${Math.round(type.avgPricePerSqft)}` : 'N/A';

      console.log(`${(index + 1).toString().padStart(2)}. "${subType}"`);
      console.log(`    Count: ${type.count} listings`);
      console.log(`    Avg Price: ${avgPrice}`);
      console.log(`    Price Range: ${minPrice} - ${maxPrice}`);
      console.log(`    Avg Size: ${avgSqft}`);
      console.log(`    Avg $/sqft: ${avgPricePerSqft}`);
      console.log('');
    });

    // Get total count
    const totalCount = propertyTypes.reduce((sum, type) => sum + type.count, 0);
    console.log('='.repeat(80));
    console.log(`TOTAL: ${totalCount} active residential listings in Irvine`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getIrvinePropertyTypes();
