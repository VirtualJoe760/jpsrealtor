/**
 * Test Script: Indian Wells Country Club Sales Analysis
 *
 * This script queries the unified_closed_listings collection to show
 * all sales for Indian Wells Country Club subdivision.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function analyzeIndianWellsSales() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('unified_closed_listings');

    // Query for Indian Wells Country Club
    const subdivisionName = 'Indian Wells Country Club';

    console.log(`🔍 Searching for: "${subdivisionName}"\n`);

    // Get all sales
    const sales = await collection.find({
      subdivisionName: subdivisionName
    }).sort({ closeDate: -1 }).toArray();

    console.log(`📊 Total Sales Found: ${sales.length}\n`);

    if (sales.length === 0) {
      console.log('❌ No sales found for this subdivision.');
      console.log('\n💡 Trying case-insensitive search...\n');

      // Try case-insensitive regex search
      const regexSales = await collection.find({
        subdivisionName: { $regex: /indian wells country club/i }
      }).sort({ closeDate: -1 }).toArray();

      console.log(`📊 Regex Search Results: ${regexSales.length}\n`);

      if (regexSales.length > 0) {
        console.log('Found variations:');
        const variations = [...new Set(regexSales.map(s => s.subdivisionName))];
        variations.forEach(v => console.log(`  - "${v}"`));
      }

      await mongoose.disconnect();
      return;
    }

    // Group by year
    const salesByYear = {};
    sales.forEach(sale => {
      const year = new Date(sale.closeDate).getFullYear();
      if (!salesByYear[year]) {
        salesByYear[year] = [];
      }
      salesByYear[year].push(sale);
    });

    // Display summary by year
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SALES BY YEAR');
    console.log('═══════════════════════════════════════════════════════════\n');

    const years = Object.keys(salesByYear).sort((a, b) => b - a);

    years.forEach(year => {
      const yearSales = salesByYear[year];
      const prices = yearSales.map(s => s.closePrice).filter(p => p > 0);
      const avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0;

      const propertyTypes = yearSales.map(s => s.propertyType).filter(Boolean);
      const propertySubTypes = yearSales.map(s => s.propertySubType).filter(Boolean);

      console.log(`${year}: ${yearSales.length} sales`);
      console.log(`  Avg Price: $${avgPrice.toLocaleString()}`);
      console.log(`  Property Types: ${[...new Set(propertyTypes)].join(', ') || 'N/A'}`);
      console.log(`  Property SubTypes: ${[...new Set(propertySubTypes)].join(', ') || 'N/A'}`);
      console.log('');
    });

    // Display detailed sales
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DETAILED SALES LIST');
    console.log('═══════════════════════════════════════════════════════════\n');

    sales.forEach((sale, index) => {
      const date = new Date(sale.closeDate);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      console.log(`${index + 1}. ${formattedDate}`);
      console.log(`   Price: $${(sale.closePrice || 0).toLocaleString()}`);
      console.log(`   List Price: $${(sale.listPrice || 0).toLocaleString()}`);
      console.log(`   Living Area: ${sale.livingArea || 'N/A'} sqft`);
      console.log(`   Price/SqFt: $${sale.livingArea ? Math.round(sale.closePrice / sale.livingArea) : 'N/A'}`);
      console.log(`   Beds/Baths: ${sale.bedroomsTotal || 'N/A'}/${sale.bathroomsTotalDecimal || 'N/A'}`);
      console.log(`   Property Type: ${sale.propertyType || 'N/A'}`);
      console.log(`   Property SubType: ${sale.propertySubType || 'N/A'}`);
      console.log(`   Address: ${sale.address || 'N/A'}`);
      console.log(`   MLS Source: ${sale.mlsSource || 'N/A'}`);
      console.log('');
    });

    // Filter analysis for residential single-family only
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FILTERED ANALYSIS (Type A + Single Family Residence)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const filteredSales = sales.filter(s =>
      s.propertyType === 'A' &&
      s.propertySubType === 'Single Family Residence' &&
      s.closePrice > 0
    );

    console.log(`Filtered Sales: ${filteredSales.length} of ${sales.length} total\n`);

    const filteredByYear = {};
    filteredSales.forEach(sale => {
      const year = new Date(sale.closeDate).getFullYear();
      if (!filteredByYear[year]) {
        filteredByYear[year] = [];
      }
      filteredByYear[year].push(sale);
    });

    const filteredYears = Object.keys(filteredByYear).sort((a, b) => b - a);

    filteredYears.forEach(year => {
      const yearSales = filteredByYear[year];
      const prices = yearSales.map(s => s.closePrice);
      const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

      console.log(`${year}: ${yearSales.length} sales (Avg: $${avgPrice.toLocaleString()})`);
    });

    console.log('\n✅ Analysis Complete');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the analysis
analyzeIndianWellsSales();
