// Test script to verify index usage on UnifiedListing queries
// Usage: npx tsx src/scripts/test-index-usage.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function testIndexUsage() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    const collection = db.collection("unifiedlistings");

    // Test query (matches zoom 10 Sacramento area from your screenshot)
    const matchStage = {
      standardStatus: "Active",
      propertyType: "A",
      latitude: { $gte: 38.46835857126078, $lte: 38.64305360498793 },
      longitude: { $gte: -121.89580053089017, $lte: -120.8653675348788 },
      listPrice: { $ne: null, $gt: 0 },
    };

    console.log("📊 Test Query:", JSON.stringify(matchStage, null, 2));
    console.log("\n🔍 Running explain...\n");

    // Run explain
    const explain = await collection
      .find(matchStage)
      .limit(600)
      .explain("executionStats");

    // Extract execution details
    const stats = explain.executionStats;
    const winningPlan = explain.queryPlanner?.winningPlan;

    console.log("=" .repeat(60));
    console.log("QUERY EXECUTION ANALYSIS");
    console.log("=".repeat(60));

    console.log("\n📈 Execution Stats:");
    console.log(`  - Execution Time: ${stats?.executionTimeMs || 0}ms`);
    console.log(`  - Total Docs Examined: ${stats?.totalDocsExamined || 0}`);
    console.log(`  - Total Keys Examined: ${stats?.totalKeysExamined || 0}`);
    console.log(`  - Documents Returned: ${stats?.nReturned || 0}`);

    console.log("\n🎯 Query Plan:");
    const stage = stats?.executionStages?.stage || 'unknown';
    const indexName = stats?.executionStages?.indexName || stats?.executionStages?.inputStage?.indexName || 'none';

    console.log(`  - Stage: ${stage}`);
    console.log(`  - Index Used: ${indexName}`);

    if (stage === "COLLSCAN") {
      console.log("\n❌ WARNING: Full collection scan detected!");
      console.log("   This explains the slow performance (7.5 seconds).");
      console.log("   The index is NOT being used.");
    } else if (stage === "IXSCAN" || stage === "FETCH") {
      console.log("\n✅ Index scan detected - Good!");
      if (indexName && indexName !== 'none') {
        console.log(`   Using index: ${indexName}`);
      }
    }

    console.log("\n🔍 Efficiency Analysis:");
    const docsExamined = stats?.totalDocsExamined || 0;
    const docsReturned = stats?.nReturned || 0;
    const efficiency = docsReturned > 0 ? ((docsReturned / docsExamined) * 100).toFixed(2) : "0.00";

    console.log(`  - Documents Examined: ${docsExamined}`);
    console.log(`  - Documents Returned: ${docsReturned}`);
    console.log(`  - Efficiency: ${efficiency}% (higher is better)`);

    if (parseFloat(efficiency) < 50) {
      console.log("\n⚠️  Low efficiency detected!");
      console.log("   The index may not be optimal for this query pattern.");
    }

    console.log("\n📋 Available Indexes:");
    const indexes = await collection.indexes();
    indexes.forEach((index) => {
      const keys = JSON.stringify(index.key);
      const name = index.name;
      const isUsed = indexName === name ? " ← USED" : "";
      console.log(`  - ${name}: ${keys}${isUsed}`);
    });

    console.log("\n💡 Recommendation:");
    if (stage === "COLLSCAN") {
      console.log("  - The query is NOT using any index");
      console.log("  - This causes full collection scans (SLOW!)");
      console.log("  - Indexes exist but MongoDB is not selecting them");
      console.log("  - Possible reasons:");
      console.log("    1. Index selectivity is low");
      console.log("    2. Query pattern doesn't match index prefix");
      console.log("    3. Collection size is small (MongoDB chooses COLLSCAN)");
      console.log("    4. Index statistics need to be updated");
    } else {
      console.log(`  - Query is using index: ${indexName}`);
      console.log(`  - Execution time: ${stats?.executionTimeMs || 0}ms`);
      if ((stats?.executionTimeMs || 0) > 500) {
        console.log("  - Still slow - may need query optimization or different index");
      } else {
        console.log("  - Performance looks good!");
      }
    }

    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

testIndexUsage()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
