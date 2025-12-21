/**
 * Check date range of GPS PDCC sales in MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkGPSDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('unified_closed_listings');

    // Get latest GPS PDCC sales
    const latest = await collection.find({
      mlsSource: 'GPS',
      subdivisionName: 'Palm Desert Country Club'
    }).sort({ closeDate: -1 }).limit(10).toArray();

    console.log('Latest 10 GPS PDCC sales:');
    latest.forEach(sale => {
      const date = new Date(sale.closeDate).toLocaleDateString();
      const price = sale.closePrice ? `$${sale.closePrice.toLocaleString()}` : 'N/A';
      const type = sale.propertyType || 'N/A';
      console.log(`  ${date} - ${price} - Type ${type}`);
    });

    // Get oldest GPS PDCC sale
    const oldest = await collection.find({
      mlsSource: 'GPS',
      subdivisionName: 'Palm Desert Country Club'
    }).sort({ closeDate: 1 }).limit(1).toArray();

    if (oldest.length > 0) {
      const oldestDate = new Date(oldest[0].closeDate).toLocaleDateString();
      console.log(`\nOldest GPS PDCC sale: ${oldestDate}`);
    }

    // Check how many are in past 5 years
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const recent = await collection.countDocuments({
      mlsSource: 'GPS',
      subdivisionName: 'Palm Desert Country Club',
      closeDate: { $gte: fiveYearsAgo }
    });

    console.log(`\nGPS PDCC sales in past 5 years: ${recent}`);
    console.log(`GPS PDCC sales (all time): ${latest.length > 0 ? await collection.countDocuments({ mlsSource: 'GPS', subdivisionName: 'Palm Desert Country Club' }) : 0}`);

    await mongoose.disconnect();
    console.log('\n✅ Check Complete');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkGPSDates();
