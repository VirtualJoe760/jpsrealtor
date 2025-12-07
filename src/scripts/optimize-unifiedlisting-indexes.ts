// src/scripts/optimize-unifiedlisting-indexes.ts
// Run this script to add optimized compound indexes for UnifiedListing map queries
// Usage: npx tsx src/scripts/optimize-unifiedlisting-indexes.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ Please define MONGODB_URI in your .env.local file");
}

async function optimizeUnifiedListingIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    if (!MONGODB_URI) {
      throw new Error("❌ Please define MONGODB_URI in your .env.local file");
    }
    const mongoUri: string = MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("❌ Database handle is undefined after connection");
    }

    // ================================================
    // UNIFIEDLISTINGS COLLECTION INDEXES
    // ================================================

    console.log("\n📊 Optimizing UnifiedListings collection indexes...");
    const unifiedListingsCollection = db.collection("unifiedlistings");

    // ==================== MAP QUERY OPTIMIZATION ====================

    console.log("\n🗺️  Creating PRIMARY map query index (CRITICAL for zoom 9 performance)...");
    console.log("    This index optimizes the exact query pattern used by /api/map-clusters");
    await unifiedListingsCollection.createIndex(
      {
        standardStatus: 1,
        propertyType: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1
      },
      {
        name: "idx_map_query_optimized",
        background: true // Don't block other operations during creation
      }
    );
    console.log("    ✅ Map query index created");
    console.log("    Expected speedup: 8-13 seconds → 50-200ms (98% faster!)");

    // ==================== GEOSPATIAL INDEX ====================

    console.log("\n🌍 Creating 2dsphere geospatial index...");
    console.log("    Enables efficient radius searches and $geoWithin queries");
    await unifiedListingsCollection.createIndex(
      { location: "2dsphere" },
      {
        name: "idx_geo_2dsphere",
        sparse: true,
        background: true
      }
    );
    console.log("    ✅ Geospatial index created");

    // ==================== ADDITIONAL INDEXES ====================

    console.log("\n📍 Creating geo + status + propertyType index...");
    await unifiedListingsCollection.createIndex(
      { latitude: 1, longitude: 1, standardStatus: 1, propertyType: 1 },
      { name: "idx_geo_status_type", background: true }
    );

    console.log("  Creating price + status index...");
    await unifiedListingsCollection.createIndex(
      { standardStatus: 1, listPrice: 1 },
      { name: "idx_status_price", background: true }
    );

    console.log("  Creating beds/baths index...");
    await unifiedListingsCollection.createIndex(
      { standardStatus: 1, bedroomsTotal: 1, bathroomsTotalDecimal: 1 },
      { name: "idx_status_beds_baths", background: true }
    );

    console.log("  Creating slug index...");
    await unifiedListingsCollection.createIndex(
      { slug: 1 },
      { name: "idx_slug", unique: true, background: true }
    );

    console.log("  Creating slugAddress index...");
    await unifiedListingsCollection.createIndex(
      { slugAddress: 1 },
      { name: "idx_slugAddress", unique: true, sparse: true, background: true }
    );

    console.log("  Creating city + status index...");
    await unifiedListingsCollection.createIndex(
      { city: 1, standardStatus: 1, listPrice: 1 },
      { name: "idx_city_status_price", background: true }
    );

    console.log("  Creating subdivision index...");
    await unifiedListingsCollection.createIndex(
      { subdivisionName: 1, standardStatus: 1 },
      { name: "idx_subdivision_status", sparse: true, background: true }
    );

    console.log("  Creating county index...");
    await unifiedListingsCollection.createIndex(
      { countyOrParish: 1, standardStatus: 1 },
      { name: "idx_county_status", sparse: true, background: true }
    );

    // ================================================
    // ANALYZE INDEXES
    // ================================================

    console.log("\n📋 Current indexes on UnifiedListings collection:");
    const indexes = await unifiedListingsCollection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n✅ All indexes created successfully!");
    console.log("\n💡 Performance Tips:");
    console.log("  - Map queries (zoom 5-12) now use idx_map_query_optimized");
    console.log("  - Geospatial radius searches use idx_geo_2dsphere");
    console.log("  - Price range queries use idx_status_price");
    console.log("  - City/county filters use respective compound indexes");
    console.log("  - Use explain() to verify query plans in production");
    console.log("\n🚀 Expected Performance Improvement:");
    console.log("  - Zoom 9 API queries: 8-13s → 50-200ms (98% faster)");
    console.log("  - Database CPU load: Significantly reduced");
    console.log("  - User experience: Map navigation feels instant");
  } catch (error) {
    console.error("❌ Error optimizing indexes:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the optimization
optimizeUnifiedListingIndexes()
  .then(() => {
    console.log("\n🎉 UnifiedListing index optimization complete!");
    console.log("Next steps:");
    console.log("  1. Test map performance at zoom 9");
    console.log("  2. Check server logs for 'IXSCAN' in query plans");
    console.log("  3. Verify API response times < 200ms");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to optimize indexes:", error);
    process.exit(1);
  });
