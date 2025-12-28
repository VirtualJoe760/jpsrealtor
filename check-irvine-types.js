// Check Irvine property types and MLS sources
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkIrvineData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define minimal schema to query the collection
    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    // First check total count
    const totalCount = await UnifiedListing.countDocuments({
      city: { $regex: /^irvine$/i }
    });
    console.log(`\nTotal Irvine listings: ${totalCount}`);

    // Check case variations
    const cityVariations = await UnifiedListing.aggregate([
      { $match: { city: { $regex: /irvine/i } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n=== City name variations containing "irvine" ===');
    cityVariations.forEach(item => {
      console.log(`"${item._id}": ${item.count}`);
    });

    // Get all Irvine listings with property subtype and MLS source
    const listings = await UnifiedListing.aggregate([
      {
        $match: {
          city: { $regex: /^irvine$/i },
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: {
            propertySubType: '$propertySubType',
            mlsSource: '$mlsSource'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 30
      }
    ]);

    console.log('\n=== Top 30 Irvine Property Types by MLS Source ===');
    listings.forEach(item => {
      console.log(`${item._id.mlsSource || 'NO_SOURCE'} - ${item._id.propertySubType || 'NO_SUBTYPE'}: ${item.count}`);
    });

    // Get MLS source breakdown
    const mlsSources = await UnifiedListing.aggregate([
      {
        $match: {
          city: { $regex: /^irvine$/i },
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: '$mlsSource',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n=== MLS Source Breakdown ===');
    mlsSources.forEach(item => {
      console.log(`${item._id || 'NO_SOURCE'}: ${item.count}`);
    });

    // Get property subtype breakdown (all listings)
    const propertyTypes = await UnifiedListing.aggregate([
      {
        $match: {
          city: { $regex: /^irvine$/i },
          standardStatus: { $in: ['Active', 'Active Under Contract'] }
        }
      },
      {
        $group: {
          _id: '$propertySubType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n=== Property SubType Breakdown (All Listings) ===');
    propertyTypes.forEach(item => {
      console.log(`${item._id || 'NO_SUBTYPE'}: ${item.count}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIrvineData();
