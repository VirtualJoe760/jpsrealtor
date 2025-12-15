/**
 * Test MLS Data Fields
 * Check what fields are actually populated in unified_listings
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n🔍 CHECKING MLS DATA FIELDS');
    console.log('='.repeat(60));

    // Get one sample listing
    const sample = await db.collection('unified_listings').findOne(
      { city: 'Palm Desert' },
      {
        projection: {
          listingId: 1,
          daysOnMarketCumulative: 1,
          taxAnnualAmount: 1,
          onMarketDate: 1,
          listingDate: 1,
          listPrice: 1,
          city: 1,
          _id: 0
        }
      }
    );

    console.log('\nSample Listing from Palm Desert:');
    console.log(JSON.stringify(sample, null, 2));

    // Count how many have these fields populated
    const total = await db.collection('unified_listings').countDocuments({ city: 'Palm Desert' });

    const withDaysOnMarket = await db.collection('unified_listings').countDocuments({
      city: 'Palm Desert',
      daysOnMarketCumulative: { $exists: true, $gt: 0 }
    });

    const withTax = await db.collection('unified_listings').countDocuments({
      city: 'Palm Desert',
      taxAnnualAmount: { $exists: true, $gt: 0 }
    });

    const withOnMarketDate = await db.collection('unified_listings').countDocuments({
      city: 'Palm Desert',
      onMarketDate: { $exists: true, $ne: null }
    });

    const withListingDate = await db.collection('unified_listings').countDocuments({
      city: 'Palm Desert',
      listingDate: { $exists: true, $ne: null }
    });

    console.log('\n📊 FIELD POPULATION STATS (Palm Desert)');
    console.log('='.repeat(60));
    console.log(`Total Listings: ${total}`);
    console.log(`\nDays on Market Fields:`);
    console.log(`  daysOnMarketCumulative > 0: ${withDaysOnMarket} (${(withDaysOnMarket/total*100).toFixed(1)}%)`);
    console.log(`  onMarketDate exists: ${withOnMarketDate} (${(withOnMarketDate/total*100).toFixed(1)}%)`);
    console.log(`  listingDate exists: ${withListingDate} (${(withListingDate/total*100).toFixed(1)}%)`);
    console.log(`\nProperty Tax Fields:`);
    console.log(`  taxAnnualAmount > 0: ${withTax} (${(withTax/total*100).toFixed(1)}%)`);

    // Sample properties with dates to calculate DOM
    const withDates = await db.collection('unified_listings').find(
      {
        city: 'Palm Desert',
        onMarketDate: { $exists: true, $ne: null }
      },
      {
        projection: { listingId: 1, onMarketDate: 1, listingDate: 1, daysOnMarketCumulative: 1, _id: 0 },
        limit: 5
      }
    ).toArray();

    console.log('\n📅 SAMPLE LISTINGS WITH DATES:');
    console.log('='.repeat(60));
    withDates.forEach((listing, i) => {
      console.log(`\n${i + 1}. Listing ${listing.listingId}:`);
      console.log(`   onMarketDate: ${listing.onMarketDate}`);
      console.log(`   listingDate: ${listing.listingDate}`);
      console.log(`   daysOnMarketCumulative: ${listing.daysOnMarketCumulative}`);

      if (listing.onMarketDate) {
        const marketDate = new Date(listing.onMarketDate);
        const now = new Date();
        const daysDiff = Math.floor((now - marketDate) / (1000 * 60 * 60 * 24));
        console.log(`   → Calculated DOM: ${daysDiff} days`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
