/**
 * Check MLS Sources in Palm Desert Country Club Data
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkMLSSources() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('unified_closed_listings');

    // Get all PDCC sales from past 5 years
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const sales = await collection.find({
      subdivisionName: 'Palm Desert Country Club',
      closeDate: { $gte: fiveYearsAgo }
    }).toArray();

    console.log(`Total PDCC Sales (Past 5 Years): ${sales.length}\n`);

    // Check mlsSource field
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MLS SOURCE FIELD ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const mlsSources = {};
    const missingSource = [];

    sales.forEach(sale => {
      if (sale.mlsSource) {
        mlsSources[sale.mlsSource] = (mlsSources[sale.mlsSource] || 0) + 1;
      } else {
        missingSource.push(sale);
      }
    });

    console.log('MLS Sources Found:');
    Object.entries(mlsSources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`  ${source}: ${count} sales`);
      });

    console.log(`\nMissing mlsSource: ${missingSource.length} sales`);

    // Sample a few records to see field structure
    if (missingSource.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('SAMPLE RECORDS WITHOUT mlsSource');
      console.log('═══════════════════════════════════════════════════════════\n');

      const sample = missingSource.slice(0, 3);
      sample.forEach((sale, index) => {
        console.log(`Sample ${index + 1}:`);
        console.log(`  ListingKey: ${sale.listingKey}`);
        console.log(`  CloseDate: ${sale.closeDate}`);
        console.log(`  ClosePrice: ${sale.closePrice}`);
        console.log(`  SubdivisionName: ${sale.subdivisionName}`);
        console.log(`  PropertyType: ${sale.propertyType}`);
        console.log(`  PropertySubType: ${sale.propertySubType}`);
        console.log(`  mlsSource: ${sale.mlsSource}`);
        console.log(`  MlsId: ${sale.MlsId}`);
        console.log(`  OriginatingSystemName: ${sale.OriginatingSystemName}`);
        console.log(`  All fields:`, Object.keys(sale).join(', '));
        console.log('');
      });
    }

    // Check if there's an alternate field
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CHECKING ALTERNATE MLS FIELD NAMES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const firstSale = sales[0];
    const possibleMLSFields = Object.keys(firstSale).filter(key =>
      key.toLowerCase().includes('mls') ||
      key.toLowerCase().includes('source') ||
      key.toLowerCase().includes('originating')
    );

    console.log('Possible MLS-related fields:', possibleMLSFields.join(', '));

    await mongoose.disconnect();
    console.log('\n✅ Analysis Complete');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMLSSources();
