// Test database queries for market stats
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testQueries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check collection names
    const collections = await db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(c => console.log('  -', c.name));

    // Test GPS listings
    const gpsCount = await db.collection('listings').countDocuments();
    console.log('\nGPS Listings total:', gpsCount);

    // Test CRMLS listings
    const crmlsCount = await db.collection('crmlsListings').countDocuments();
    console.log('CRMLS Listings total:', crmlsCount);

    // Test GPS closed
    const gpsClosedCount = await db.collection('gpsClosedListings').countDocuments();
    console.log('GPS Closed Listings total:', gpsClosedCount);

    // Test CRMLS closed
    const crmlsClosedCount = await db.collection('crmlsClosedListings').countDocuments();
    console.log('CRMLS Closed Listings total:', crmlsClosedCount);

    // Check for recent listings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('\n--- Testing with past 30 days ---');
    console.log('Date threshold:', thirtyDaysAgo);

    // GPS new listings (past 30 days)
    const gpsNew = await db.collection('listings').find({
      onMarketDate: { $gte: thirtyDaysAgo },
      standardStatus: 'Active'
    }).limit(5).toArray();
    console.log('\nGPS New (30d):', gpsNew.length, 'found');
    if (gpsNew.length > 0) {
      console.log('Sample:', {
        listPrice: gpsNew[0].listPrice,
        onMarketDate: gpsNew[0].onMarketDate,
        standardStatus: gpsNew[0].standardStatus
      });
    }

    // CRMLS new listings (past 30 days)
    const crmlsNew = await db.collection('crmlsListings').find({
      onMarketDate: { $gte: thirtyDaysAgo },
      standardStatus: 'Active'
    }).limit(5).toArray();
    console.log('\nCRMLS New (30d):', crmlsNew.length, 'found');
    if (crmlsNew.length > 0) {
      console.log('Sample:', {
        listPrice: crmlsNew[0].listPrice,
        onMarketDate: crmlsNew[0].onMarketDate,
        standardStatus: crmlsNew[0].standardStatus
      });
    }

    // GPS closed (past 30 days)
    const gpsClosed = await db.collection('gpsClosedListings').find({
      closeDate: { $gte: thirtyDaysAgo }
    }).limit(5).toArray();
    console.log('\nGPS Closed (30d):', gpsClosed.length, 'found');
    if (gpsClosed.length > 0) {
      console.log('Sample:', {
        closePrice: gpsClosed[0].closePrice,
        closeDate: gpsClosed[0].closeDate
      });
    }

    // CRMLS closed (past 30 days)
    const crmlsClosed = await db.collection('crmlsClosedListings').find({
      closeDate: { $gte: thirtyDaysAgo }
    }).limit(5).toArray();
    console.log('\nCRMLS Closed (30d):', crmlsClosed.length, 'found');
    if (crmlsClosed.length > 0) {
      console.log('Sample:', {
        closePrice: crmlsClosed[0].closePrice,
        closeDate: crmlsClosed[0].closeDate
      });
    }

    // Check what fields exist in a sample listing
    const sampleListing = await db.collection('listings').findOne({});
    console.log('\n--- Sample GPS Listing Fields ---');
    console.log('Has onMarketDate?', 'onMarketDate' in sampleListing);
    console.log('Has standardStatus?', 'standardStatus' in sampleListing);
    console.log('standardStatus value:', sampleListing.standardStatus);
    console.log('onMarketDate value:', sampleListing.onMarketDate);

    const sampleClosed = await db.collection('gpsClosedListings').findOne({});
    if (sampleClosed) {
      console.log('\n--- Sample GPS Closed Listing Fields ---');
      console.log('Has closeDate?', 'closeDate' in sampleClosed);
      console.log('Has closePrice?', 'closePrice' in sampleClosed);
      console.log('closeDate value:', sampleClosed.closeDate);
      console.log('closePrice value:', sampleClosed.closePrice);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testQueries();
