// src/scripts/counties/extract-counties-unified.ts
// Extract all counties from Cities model (pre-computed from unified_listings)

import mongoose from "mongoose";
import { City } from "../../models/cities";
import { County } from "../../models/counties";
import * as path from "path";
import { config } from "dotenv";
import {
  getRegion as getRegionByCounty,
} from "../subdivisions/california-counties";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

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

  // Ocean zones (west of California coast)
  if (lng < -124.0) return true;

  // Regional ocean checks (progressive westward)
  if (lat >= 32.5 && lat <= 33.5 && lng < -119.5) return true; // San Diego area ocean
  if (lat >= 33.5 && lat <= 34.5 && lng < -120.0) return true; // LA area ocean
  if (lat >= 34.5 && lat <= 37.0 && lng < -123.0) return true; // Central CA ocean
  if (lat >= 37.0 && lat <= 38.5 && lng < -123.5) return true; // SF Bay area ocean
  if (lat >= 38.5 && lat <= 42.0 && lng < -124.5) return true; // Northern CA ocean

  return false;
}

async function extractCountiesFromCities() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment");
    }

    console.log("📊 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // ========================================
    // Aggregate counties from City model
    // (Cities are already pre-computed from unified_listings)
    // ========================================
    console.log("📊 Aggregating counties from cities collection...");
    const countyAggregation = await City.aggregate([
      {
        $match: {
          listingCount: { $gt: 0 },
          county: { $exists: true, $nin: [null, "", "Unknown"] }
        }
      },
      {
        $group: {
          _id: "$county",
          cityCount: { $sum: 1 },
          totalListings: { $sum: "$listingCount" },
          avgPrice: { $avg: "$avgPrice" },
          minPrice: { $min: "$priceRange.min" },
          maxPrice: { $max: "$priceRange.max" },
          medianPrices: { $push: "$medianPrice" },
          avgLat: { $avg: "$coordinates.latitude" },
          avgLng: { $avg: "$coordinates.longitude" },

          // Property type distribution
          residentialCount: { $sum: "$propertyTypes.residential" },
          leaseCount: { $sum: "$propertyTypes.lease" },

          // Track MLS sources
          mlsSources: { $push: "$mlsSources" }
        }
      },
      {
        $project: {
          county: "$_id",
          cityCount: 1,
          listingCount: "$totalListings",
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
          mlsSources: {
            $reduce: {
              input: "$mlsSources",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] }
            }
          }
        }
      },
      {
        $sort: { listingCount: -1 }
      }
    ]);

    console.log(`✅ Found ${countyAggregation.length} counties from cities collection\n`);

    // Validate coordinates and mark ocean counties
    let oceanCounties = 0;
    let validCounties = 0;

    // Prepare county documents with ocean validation
    console.log("💾 Preparing county documents with coordinate validation...");
    const countyDocuments = countyAggregation.map((data: any) => {
      const countyName = data.county;
      const region = getRegionByCounty(countyName);
      const slug = slugify(countyName);

      // Validate coordinates
      const latitude = data.coordinates.latitude;
      const longitude = data.coordinates.longitude;
      const isOcean = isOceanCoordinate(latitude, longitude);

      if (isOcean) {
        oceanCounties++;
        console.log(`🌊 Ocean coordinates detected: ${countyName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) - ${data.listingCount} listings`);
      } else {
        validCounties++;
      }

      return {
        name: countyName,
        slug,
        normalizedName: countyName.toLowerCase(),
        region,
        coordinates: data.coordinates,
        listingCount: data.listingCount,
        cityCount: data.cityCount,
        priceRange: data.priceRange,
        avgPrice: data.avgPrice,
        medianPrice: data.medianPrice,
        propertyTypes: data.propertyTypes,
        mlsSources: data.mlsSources,
        isOcean: isOcean,
        lastUpdated: new Date()
      };
    });

    console.log(`✅ Prepared ${countyDocuments.length} county documents`);
    console.log(`✅ Valid counties (on land): ${validCounties}`);
    console.log(`🌊 Ocean counties (will be filtered from map): ${oceanCounties}\n`);

    // Pre-compute top 10 cities per county for fast map rendering
    console.log("🏙️  Pre-computing top 10 cities per county...");
    for (const countyDoc of countyDocuments) {
      const topCities = await City.find({
        county: countyDoc.name,
        listingCount: { $gt: 0 },
        isOcean: { $ne: true }
      })
      .select('name listingCount coordinates avgPrice')
      .sort({ listingCount: -1 })
      .limit(10)
      .lean();

      countyDoc.topCities = topCities.map((city: any) => ({
        name: city.name,
        listingCount: city.listingCount,
        coordinates: {
          latitude: city.coordinates?.latitude || 0,
          longitude: city.coordinates?.longitude || 0
        },
        avgPrice: Math.round(city.avgPrice || 0)
      }));
    }
    console.log(`✅ Pre-computed top cities for ${countyDocuments.length} counties\n`);

    // Save to database
    console.log("💾 Saving counties to database...");
    let insertedCount = 0;
    let updatedCount = 0;

    for (const countyDoc of countyDocuments) {
      try {
        const result = await County.findOneAndUpdate(
          { slug: countyDoc.slug },
          { $set: countyDoc },
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
        console.error(`❌ Error saving ${countyDoc.name}:`, error.message);
      }
    }

    console.log(`\n✅ Counties extraction complete!`);
    console.log(`   📊 Total counties: ${countyDocuments.length}`);
    console.log(`   ➕ New counties: ${insertedCount}`);
    console.log(`   🔄 Updated counties: ${updatedCount}`);
    console.log(`   ✅ Valid counties: ${validCounties}`);
    console.log(`   🌊 Ocean counties (filtered): ${oceanCounties}`);

    // Show top 10 valid counties
    const topCounties = countyDocuments
      .filter(c => !c.isOcean)
      .slice(0, 10);

    console.log(`\n🏙️  Top 10 Valid Counties by Listing Count:`);
    topCounties.forEach((county, index) => {
      const mlsCount = county.mlsSources.length;
      const mlsList = county.mlsSources.join(", ");
      console.log(`   ${(index + 1).toString().padStart(2)}. ${county.name.padEnd(25)} - ${county.listingCount.toString().padStart(6)} listings, ${county.cityCount.toString().padStart(3)} cities from ${mlsCount} MLSs (${mlsList})`);
    });

    // Show ocean counties that were filtered
    if (oceanCounties > 0) {
      const oceanCountiesList = countyDocuments
        .filter(c => c.isOcean)
        .slice(0, 10);

      console.log(`\n🌊 Ocean Counties (Filtered from Map):`);
      oceanCountiesList.forEach((county, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ${county.name.padEnd(25)} - ${county.listingCount.toString().padStart(6)} listings (${county.coordinates.latitude.toFixed(4)}, ${county.coordinates.longitude.toFixed(4)})`);
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
extractCountiesFromCities();
