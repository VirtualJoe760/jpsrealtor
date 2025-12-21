/**
 * Test Script: Palm Desert Country Club Sales Analysis
 *
 * This script queries the unified_closed_listings collection to show
 * all sales for Palm Desert Country Club subdivision in the past 5 years.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function analyzePDCCSales() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('unified_closed_listings');

    // Query for Palm Desert Country Club
    const subdivisionName = 'Palm Desert Country Club';

    console.log(`🔍 Searching for: "${subdivisionName}"\n`);

    // Calculate 5 years ago from today
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

    console.log(`📅 Date Range: ${fiveYearsAgo.toLocaleDateString()} to ${now.toLocaleDateString()}\n`);

    // Get all sales in the past 5 years
    const allSales = await collection.find({
      subdivisionName: subdivisionName,
      closeDate: { $gte: fiveYearsAgo }
    }).sort({ closeDate: -1 }).toArray();

    console.log(`📊 Total Sales Found (Past 5 Years): ${allSales.length}\n`);

    if (allSales.length === 0) {
      console.log('❌ No sales found for this subdivision.');
      console.log('\n💡 Trying case-insensitive search...\n');

      // Try case-insensitive regex search
      const regexSales = await collection.find({
        subdivisionName: { $regex: /palm desert country club/i },
        closeDate: { $gte: fiveYearsAgo }
      }).sort({ closeDate: -1 }).toArray();

      console.log(`📊 Regex Search Results (Past 5 Years): ${regexSales.length}\n`);

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
    allSales.forEach(sale => {
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

    // Breakdown by property type
    console.log('═══════════════════════════════════════════════════════════');
    console.log('BREAKDOWN BY PROPERTY TYPE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const byType = {};
    allSales.forEach(sale => {
      const type = sale.propertyType || 'Unknown';
      const subType = sale.propertySubType || 'Unknown';
      const key = `${type} - ${subType}`;

      if (!byType[key]) {
        byType[key] = [];
      }
      byType[key].push(sale);
    });

    Object.entries(byType).sort((a, b) => b[1].length - a[1].length).forEach(([key, sales]) => {
      const prices = sales.map(s => s.closePrice).filter(p => p > 0);
      const avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0;

      console.log(`${key}: ${sales.length} sales (Avg: $${avgPrice.toLocaleString()})`);
    });

    // Filter for Type A residential sales only
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TYPE A RESIDENTIAL SALES (>$50k)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const typeASales = allSales.filter(s =>
      s.propertyType === 'A' &&
      s.closePrice > 50000
    );

    console.log(`Total Type A Residential (>$50k): ${typeASales.length}\n`);

    const typeAByYear = {};
    typeASales.forEach(sale => {
      const year = new Date(sale.closeDate).getFullYear();
      if (!typeAByYear[year]) {
        typeAByYear[year] = [];
      }
      typeAByYear[year].push(sale);
    });

    Object.keys(typeAByYear).sort((a, b) => b - a).forEach(year => {
      const yearSales = typeAByYear[year];
      const prices = yearSales.map(s => s.closePrice);
      const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
      const subTypes = [...new Set(yearSales.map(s => s.propertySubType))];

      console.log(`${year}: ${yearSales.length} sales (Avg: $${avgPrice.toLocaleString()})`);
      console.log(`  SubTypes: ${subTypes.join(', ')}`);
    });

    // Show price ranges
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PRICE RANGES (Type A, >$50k)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const prices = typeASales.map(s => s.closePrice).sort((a, b) => a - b);
    if (prices.length > 0) {
      console.log(`Minimum: $${prices[0].toLocaleString()}`);
      console.log(`Maximum: $${prices[prices.length - 1].toLocaleString()}`);
      console.log(`Median: $${prices[Math.floor(prices.length / 2)].toLocaleString()}`);
      console.log(`Average: $${Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length).toLocaleString()}`);
    }

    console.log('\n✅ Analysis Complete');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the analysis
analyzePDCCSales();
