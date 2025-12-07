/**
 * Update California Stats Collection
 *
 * Calculates California-wide statistics from all active listings
 * and stores them in the CaliforniaStats collection for fast retrieval.
 *
 * Run this script:
 * - After bulk MLS data imports
 * - On a daily/hourly schedule (cron job)
 * - Manually when needed
 *
 * Usage: npx tsx src/scripts/update-california-stats.ts
 */

import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import CaliforniaStats from "@/models/CaliforniaStats";

async function updateCaliforniaStats() {
  try {
    console.log('🌟 Starting California stats update...');
    await dbConnect();

    console.log('📊 Calculating stats from all active listings...');

    // Aggregation pipeline to calculate stats
    const stats = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: { $in: ["Active", "Active Under Contract", "Pending"] },
          listPrice: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          prices: { $push: "$listPrice" } // Collect all prices for median
        }
      }
    ]);

    if (!stats || stats.length === 0) {
      console.log('⚠️ No listings found');
      return;
    }

    const result = stats[0];

    // Calculate median from all prices
    const sortedPrices = result.prices.sort((a: number, b: number) => a - b);
    const mid = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
      : sortedPrices[mid];

    const californiaStats = {
      count: result.count,
      medianPrice: Math.round(medianPrice),
      avgPrice: Math.round(result.avgPrice),
      minPrice: Math.round(result.minPrice),
      maxPrice: Math.round(result.maxPrice),
      lastUpdated: new Date()
    };

    console.log('📈 Calculated stats:', californiaStats);

    // Upsert into CaliforniaStats collection (only one document should exist)
    await CaliforniaStats.findOneAndUpdate(
      {}, // Match any document (there should only be one)
      californiaStats,
      { upsert: true, new: true }
    );

    console.log('✅ California stats updated successfully!');
    console.log('   Total listings:', californiaStats.count.toLocaleString());
    console.log('   Median price: $' + californiaStats.medianPrice.toLocaleString());
    console.log('   Avg price: $' + californiaStats.avgPrice.toLocaleString());
    console.log('   Price range: $' + californiaStats.minPrice.toLocaleString() + ' - $' + californiaStats.maxPrice.toLocaleString());

  } catch (error) {
    console.error('❌ Error updating California stats:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

updateCaliforniaStats();
