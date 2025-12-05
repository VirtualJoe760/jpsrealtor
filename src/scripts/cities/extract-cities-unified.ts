// src/scripts/cities/extract-cities-unified.ts
// Extract all cities from UNIFIED MLS collection (all 8 MLSs)
// Replaces old extract-cities.ts which only used GPS + CRMLS

import mongoose from "mongoose";
import UnifiedListing from "../../models/unified-listing";
import { City } from "../../models/cities";
import Subdivision from "../../models/subdivisions";
import * as path from "path";
import { config } from "dotenv";
import {
  CALIFORNIA_COUNTY_MAP,
  getRegion as getRegionByCounty,
  isCoachellaValley,
  isHighDesert
} from "../subdivisions/california-counties";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

function getCounty(city: string): string {
  if (CALIFORNIA_COUNTY_MAP[city]) {
    return CALIFORNIA_COUNTY_MAP[city];
  }
  return "Unknown";
}

function getRegion(city: string, county: string): string {
  if (isCoachellaValley(city)) {
    return "Coachella Valley";
  }
  if (isHighDesert(city)) {
    return "High Desert";
  }
  return getRegionByCounty(county);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Validate if coordinates are in ocean or invalid
 * California boundaries check
 */
function isOceanCoordinate(lat: number, lng: number): boolean {
  // California boundaries (approximate)
  const CA_BOUNDS = {
    north: 42.0,
    south: 32.5,
    east: -114.1,
    west: -124.5
  };

  // If coordinates are outside CA, likely invalid
  if (lat < CA_BOUNDS.south || lat > CA_BOUNDS.north ||
      lng < CA_BOUNDS.west || lng > CA_BOUNDS.east) {
    return true;
  }

  // Southern California islands check - allow these zones
  const CHANNEL_ISLANDS = {
    north: 34.1,
    south: 32.9,
    east: -118.3,
    west: -120.5
  };

  if (lat >= CHANNEL_ISLANDS.south && lat <= CHANNEL_ISLANDS.north &&
      lng >= CHANNEL_ISLANDS.west && lng <= CHANNEL_ISLANDS.east) {
    return false; // Valid island coordinates
  }

  // Ocean zones (west of California coast)
  // Rough approximation - anything far west is likely ocean
  if (lng < -124.0) return true;

  // Regional ocean checks (progressive westward)
  if (lat >= 32.5 && lat <= 33.5 && lng < -119.5) return true; // San Diego area ocean
  if (lat >= 33.5 && lat <= 34.5 && lng < -120.0) return true; // LA area ocean (allow islands)
  if (lat >= 34.5 && lat <= 37.0 && lng < -123.0) return true; // Central CA ocean
  if (lat >= 37.0 && lat <= 38.5 && lng < -123.5) return true; // SF Bay area ocean
  if (lat >= 38.5 && lat <= 42.0 && lng < -124.5) return true; // Northern CA ocean

  return false;
}

async function extractCitiesUnified() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment");
    }

    console.log("📊 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // ========================================
    // NEW: Aggregate from UNIFIED collection
    // (All 8 MLSs instead of just GPS + CRMLS)
    // ========================================
    console.log("📊 Aggregating cities from unified_listings collection (all 8 MLSs)...");
    const cityAggregation = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          city: { $exists: true, $nin: [null, ""] },
          listPrice: { $exists: true, $gt: 0 },
          // Ensure valid coordinates
          latitude: { $exists: true, $ne: null },
          longitude: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          medianPrices: { $push: "$listPrice" },
          avgLat: { $avg: "$latitude" },
          avgLng: { $avg: "$longitude" },

          // Property type distribution
          residentialCount: {
            $sum: {
              $cond: [
                { $in: ["$propertyType", ["A", "C", null, ""]] },
                1,
                0
              ]
            }
          },
          leaseCount: {
            $sum: {
              $cond: [{ $eq: ["$propertyType", "B"] }, 1, 0]
            }
          },

          // Track MLS sources
          mlsSources: { $addToSet: "$mlsSource" }
        }
      },
      {
        $project: {
          city: "$_id",
          listingCount: "$count",
          avgPrice: { $round: "$avgPrice" },
          priceRange: {
            min: "$minPrice",
            max: "$maxPrice"
          },
          medianPrice: {
            $arrayElemAt: [
              { $sortArray: { input: "$medianPrices", sortBy: 1 } },
              { $floor: { $divide: [{ $size: "$medianPrices" }, 2] } }
            ]
          },
          coordinates: {
            latitude: "$avgLat",
            longitude: "$avgLng"
          },
          propertyTypes: {
            residential: "$residentialCount",
            lease: "$leaseCount"
          },
          mlsSources: 1
        }
      },
      {
        $sort: { listingCount: -1 }
      }
    ]);

    console.log(`✅ Found ${cityAggregation.length} cities from unified collection (all 8 MLSs)\n`);

    // Validate coordinates and mark ocean cities
    let oceanCities = 0;
    let validCities = 0;

    // Get subdivision counts for each city
    console.log("📊 Counting subdivisions per city...");
    const subdivisionCounts = await Subdivision.aggregate([
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      }
    ]);

    const subdivisionCountMap = new Map(
      subdivisionCounts.map((s) => [s._id, s.count])
    );

    // Prepare city documents with ocean validation
    console.log("💾 Preparing city documents with coordinate validation...");
    const cityDocuments = cityAggregation.map((data: any) => {
      const cityName = data.city;
      const county = getCounty(cityName);
      const region = getRegion(cityName, county);
      const slug = slugify(cityName);

      // Validate coordinates
      const latitude = data.coordinates.latitude;
      const longitude = data.coordinates.longitude;
      const isOcean = isOceanCoordinate(latitude, longitude);

      if (isOcean) {
        oceanCities++;
        console.log(`🌊 Ocean coordinates detected: ${cityName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) - ${data.listingCount} listings`);
      } else {
        validCities++;
      }

      return {
        name: cityName,
        slug,
        normalizedName: cityName.toLowerCase(),
        county,
        region,
        coordinates: data.coordinates,
        listingCount: data.listingCount,
        priceRange: data.priceRange,
        avgPrice: data.avgPrice,
        medianPrice: data.medianPrice,
        propertyTypes: data.propertyTypes,
        subdivisionCount: subdivisionCountMap.get(cityName) || 0,
        mlsSources: data.mlsSources,
        isOcean: isOcean, // NEW: Ocean flag for map filtering
        lastUpdated: new Date()
      };
    });

    console.log(`✅ Prepared ${cityDocuments.length} city documents`);
    console.log(`✅ Valid cities (on land): ${validCities}`);
    console.log(`🌊 Ocean cities (will be filtered from map): ${oceanCities}\n`);

    // Save to database
    console.log("💾 Saving cities to database...");
    let insertedCount = 0;
    let updatedCount = 0;

    for (const cityDoc of cityDocuments) {
      try {
        const result = await City.findOneAndUpdate(
          { slug: cityDoc.slug },
          { $set: cityDoc },
          { upsert: true, new: true }
        );

        if (result) {
          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        }
      } catch (error: any) {
        console.error(`❌ Error saving ${cityDoc.name}:`, error.message);
      }
    }

    console.log(`\n✅ Cities extraction complete!`);
    console.log(`   📊 Total cities: ${cityDocuments.length}`);
    console.log(`   ➕ New cities: ${insertedCount}`);
    console.log(`   🔄 Updated cities: ${updatedCount}`);
    console.log(`   ✅ Valid cities: ${validCities}`);
    console.log(`   🌊 Ocean cities (filtered): ${oceanCities}`);

    // Show top 10 valid cities
    const topCities = cityDocuments
      .filter(c => !c.isOcean)
      .slice(0, 10);

    console.log(`\n🏙️  Top 10 Valid Cities by Listing Count:`);
    topCities.forEach((city, index) => {
      const mlsCount = city.mlsSources.length;
      const mlsList = city.mlsSources.join(", ");
      console.log(`   ${(index + 1).toString().padStart(2)}. ${city.name.padEnd(25)} - ${city.listingCount.toString().padStart(5)} listings from ${mlsCount} MLSs (${mlsList})`);
    });

    // Show ocean cities that were filtered
    if (oceanCities > 0) {
      const oceanCitiesList = cityDocuments
        .filter(c => c.isOcean)
        .slice(0, 10);

      console.log(`\n🌊 Ocean Cities (Filtered from Map):`);
      oceanCitiesList.forEach((city, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ${city.name.padEnd(25)} - ${city.listingCount.toString().padStart(5)} listings (${city.coordinates.latitude.toFixed(4)}, ${city.coordinates.longitude.toFixed(4)})`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the script
extractCitiesUnified();
