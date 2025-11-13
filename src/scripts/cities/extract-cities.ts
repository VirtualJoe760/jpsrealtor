// src/scripts/cities/extract-cities.ts
// Extract all cities from GPS and CRMLS listings and aggregate their data

import mongoose from "mongoose";
import { Listing } from "../../models/listings";
import { CRMLSListing } from "../../models/crmls-listings";
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

async function extractCities() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment");
    }

    console.log("📊 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Aggregate GPS MLS cities
    console.log("📊 Aggregating GPS MLS cities...");
    const gpsCities = await Listing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          city: { $exists: true, $nin: [null, ""] },
          listPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          medianPrice: { $push: "$listPrice" },
          avgLat: { $avg: "$latitude" },
          avgLng: { $avg: "$longitude" },
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
        },
      },
      {
        $project: {
          city: "$_id",
          listingCount: "$count",
          avgPrice: { $round: "$avgPrice" },
          priceRange: {
            min: "$minPrice",
            max: "$maxPrice",
          },
          medianPrice: {
            $arrayElemAt: [
              { $sortArray: { input: "$medianPrice", sortBy: 1 } },
              { $floor: { $divide: [{ $size: "$medianPrice" }, 2] } }
            ]
          },
          coordinates: {
            latitude: "$avgLat",
            longitude: "$avgLng",
          },
          propertyTypes: {
            residential: "$residentialCount",
            lease: "$leaseCount",
          },
        },
      },
    ]);

    console.log(`✅ Found ${gpsCities.length} cities in GPS MLS\n`);

    // Aggregate CRMLS cities
    console.log("📊 Aggregating CRMLS cities...");
    const crmlsCities = await CRMLSListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          city: { $exists: true, $nin: [null, ""] },
          listPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          medianPrice: { $push: "$listPrice" },
          avgLat: { $avg: "$latitude" },
          avgLng: { $avg: "$longitude" },
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
        },
      },
      {
        $project: {
          city: "$_id",
          listingCount: "$count",
          avgPrice: { $round: "$avgPrice" },
          priceRange: {
            min: "$minPrice",
            max: "$maxPrice",
          },
          medianPrice: {
            $arrayElemAt: [
              { $sortArray: { input: "$medianPrice", sortBy: 1 } },
              { $floor: { $divide: [{ $size: "$medianPrice" }, 2] } }
            ]
          },
          coordinates: {
            latitude: "$avgLat",
            longitude: "$avgLng",
          },
          propertyTypes: {
            residential: "$residentialCount",
            lease: "$leaseCount",
          },
        },
      },
    ]);

    console.log(`✅ Found ${crmlsCities.length} cities in CRMLS\n`);

    // Merge cities from both sources
    console.log("🔄 Merging cities from both MLS sources...");
    const cityMap = new Map<string, any>();

    // Process GPS cities
    for (const city of gpsCities) {
      const cityName = city.city;
      cityMap.set(cityName, {
        ...city,
        mlsSources: ["GPS"],
      });
    }

    // Merge CRMLS cities
    for (const city of crmlsCities) {
      const cityName = city.city;
      if (cityMap.has(cityName)) {
        const existing = cityMap.get(cityName);
        existing.listingCount += city.listingCount;
        existing.avgPrice = Math.round((existing.avgPrice + city.avgPrice) / 2);
        existing.priceRange.min = Math.min(existing.priceRange.min, city.priceRange.min);
        existing.priceRange.max = Math.max(existing.priceRange.max, city.priceRange.max);
        existing.propertyTypes.residential += city.propertyTypes.residential;
        existing.propertyTypes.lease += city.propertyTypes.lease;
        existing.mlsSources.push("CRMLS");
      } else {
        cityMap.set(cityName, {
          ...city,
          mlsSources: ["CRMLS"],
        });
      }
    }

    console.log(`✅ Merged into ${cityMap.size} unique cities\n`);

    // Get subdivision counts for each city
    console.log("📊 Counting subdivisions per city...");
    const subdivisionCounts = await Subdivision.aggregate([
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
        },
      },
    ]);

    const subdivisionCountMap = new Map(
      subdivisionCounts.map((s) => [s._id, s.count])
    );

    // Prepare city documents
    console.log("💾 Preparing city documents...");
    const cityDocuments = Array.from(cityMap.entries()).map(([cityName, data]) => {
      const county = getCounty(cityName);
      const region = getRegion(cityName, county);
      const slug = slugify(cityName);

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
        lastUpdated: new Date(),
      };
    });

    // Sort by listing count
    cityDocuments.sort((a, b) => b.listingCount - a.listingCount);

    console.log(`✅ Prepared ${cityDocuments.length} city documents\n`);

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
    console.log(`\n🏙️  Top 10 cities by listing count:`);

    cityDocuments.slice(0, 10).forEach((city, index) => {
      console.log(`   ${index + 1}. ${city.name} - ${city.listingCount} listings (${city.subdivisionCount} subdivisions)`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the script
extractCities();
