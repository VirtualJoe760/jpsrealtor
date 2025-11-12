// src/scripts/subdivisions/extract-subdivisions.ts
// Extract all unique subdivisions from GPS and CRMLS listings

import mongoose from "mongoose";
import { Listing } from "../../models/listings";
import { CRMLSListing } from "../../models/crmls-listings";
import Subdivision from "../../models/subdivisions";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import {
  CALIFORNIA_COUNTY_MAP,
  getRegion as getRegionByCounty,
  isCoachellaValley,
  isHighDesert
} from "./california-counties";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

// List of values that indicate no subdivision/non-HOA property
const NON_SUBDIVISION_VALUES = [
  "not applicable",
  "n/a",
  "na",
  "none",
  "no subdivision",
  "not in subdivision",
  ""
];

function isNonSubdivision(subdivisionName: string | null | undefined): boolean {
  if (!subdivisionName) return true;
  const normalized = subdivisionName.trim().toLowerCase();
  return NON_SUBDIVISION_VALUES.includes(normalized);
}

// Original county mapping (kept as fallback for non-CA cities)
const LEGACY_COUNTY_MAP: Record<string, string> = {
  // Riverside County - Coachella Valley
  "Palm Springs": "Riverside",
  "Palm Desert": "Riverside",
  "La Quinta": "Riverside",
  "Indio": "Riverside",
  "Rancho Mirage": "Riverside",
  "Indian Wells": "Riverside",
  "Cathedral City": "Riverside",
  "Desert Hot Springs": "Riverside",
  "Coachella": "Riverside",
  "Thousand Palms": "Riverside",
  "Bermuda Dunes": "Riverside",
  "Thermal": "Riverside",
  "Mecca": "Riverside",

  // San Diego County
  "San Diego": "San Diego",
  "Chula Vista": "San Diego",
  "Oceanside": "San Diego",
  "Escondido": "San Diego",
  "Carlsbad": "San Diego",
  "El Cajon": "San Diego",
  "Vista": "San Diego",
  "San Marcos": "San Diego",
  "Encinitas": "San Diego",
  "National City": "San Diego",
  "La Mesa": "San Diego",
  "Santee": "San Diego",
  "Poway": "San Diego",
  "Coronado": "San Diego",
  "Imperial Beach": "San Diego",
  "Lemon Grove": "San Diego",
  "Solana Beach": "San Diego",
  "Del Mar": "San Diego",

  // Orange County
  "Anaheim": "Orange",
  "Santa Ana": "Orange",
  "Irvine": "Orange",
  "Huntington Beach": "Orange",
  "Garden Grove": "Orange",
  "Orange": "Orange",
  "Fullerton": "Orange",
  "Costa Mesa": "Orange",
  "Mission Viejo": "Orange",
  "Westminster": "Orange",
  "Newport Beach": "Orange",
  "Buena Park": "Orange",
  "Lake Forest": "Orange",
  "Tustin": "Orange",
  "Yorba Linda": "Orange",
  "San Clemente": "Orange",
  "Laguna Niguel": "Orange",
  "La Habra": "Orange",
  "Fountain Valley": "Orange",
  "Placentia": "Orange",
  "Rancho Santa Margarita": "Orange",
  "Aliso Viejo": "Orange",
  "Cypress": "Orange",
  "Brea": "Orange",
  "Stanton": "Orange",
  "San Juan Capistrano": "Orange",
  "Dana Point": "Orange",
  "Laguna Beach": "Orange",
  "Laguna Hills": "Orange",
  "Seal Beach": "Orange",
  "Laguna Woods": "Orange",
  "La Palma": "Orange",
  "Villa Park": "Orange",
  "Los Alamitos": "Orange",

  // Los Angeles County
  "Los Angeles": "Los Angeles",
  "Long Beach": "Los Angeles",
  "Glendale": "Los Angeles",
  "Santa Clarita": "Los Angeles",
  "Pasadena": "Los Angeles",
  "Torrance": "Los Angeles",
  "Pomona": "Los Angeles",
  "West Covina": "Los Angeles",
  "Norwalk": "Los Angeles",
  "Downey": "Los Angeles",
  "Inglewood": "Los Angeles",
  "Burbank": "Los Angeles",
  "Compton": "Los Angeles",
  "Lancaster": "Los Angeles",
  "Palmdale": "Los Angeles",
  "El Monte": "Los Angeles",
  "Carson": "Los Angeles",
  "Hawthorne": "Los Angeles",
  "Alhambra": "Los Angeles",
  "Whittier": "Los Angeles",
  "Lakewood": "Los Angeles",
  "Redondo Beach": "Los Angeles",
  "Santa Monica": "Los Angeles",
  "Westminster": "Los Angeles",
  "Arcadia": "Los Angeles",
  "Montebello": "Los Angeles",
  "Monterey Park": "Los Angeles",
  "Gardena": "Los Angeles",
  "Paramount": "Los Angeles",
  "Manhattan Beach": "Los Angeles",
  "Beverly Hills": "Los Angeles",
  "Culver City": "Los Angeles",
  "Bellflower": "Los Angeles",
  "South Gate": "Los Angeles",
  "Glendora": "Los Angeles",
  "Baldwin Park": "Los Angeles",
  "Pico Rivera": "Los Angeles",
  "Rosemead": "Los Angeles",
  "Bell Gardens": "Los Angeles",

  // San Bernardino County
  "San Bernardino": "San Bernardino",
  "Fontana": "San Bernardino",
  "Rancho Cucamonga": "San Bernardino",
  "Ontario": "San Bernardino",
  "Victorville": "San Bernardino",
  "Hesperia": "San Bernardino",
  "Chino": "San Bernardino",
  "Chino Hills": "San Bernardino",
  "Upland": "San Bernardino",
  "Rialto": "San Bernardino",
  "Yucaipa": "San Bernardino",
  "Redlands": "San Bernardino",
  "Apple Valley": "San Bernardino",
  "Highland": "San Bernardino",
  "Colton": "San Bernardino",
  "Montclair": "San Bernardino",
  "Adelanto": "San Bernardino",
  "Twentynine Palms": "San Bernardino",
  "Yucca Valley": "San Bernardino",
  "Joshua Tree": "San Bernardino",
  "Big Bear Lake": "San Bernardino",
  "Big Bear City": "San Bernardino",
  "Barstow": "San Bernardino",
  "Needles": "San Bernardino",
};

function getCounty(city: string): string {
  // Try California comprehensive mapping first
  if (CALIFORNIA_COUNTY_MAP[city]) {
    return CALIFORNIA_COUNTY_MAP[city];
  }
  // Fall back to legacy mapping
  if (LEGACY_COUNTY_MAP[city]) {
    return LEGACY_COUNTY_MAP[city];
  }
  return "Unknown";
}

function getRegion(city: string, county: string): string {
  // Special handling for Coachella Valley
  if (isCoachellaValley(city)) {
    return "Coachella Valley";
  }
  // Special handling for High Desert
  if (isHighDesert(city)) {
    return "High Desert";
  }
  // Use county-based region mapping
  return getRegionByCounty(county);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface SubdivisionData {
  name: string;
  city: string;
  listings: Array<{
    price: number;
    lat?: number;
    lng?: number;
    mlsSource: string;
    propertyType?: string;
    seniorCommunity?: boolean;
    communityFeatures?: string;
  }>;
}

async function extractSubdivisions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Aggregation to get subdivisions from GPS MLS
    console.log("\n📊 Aggregating GPS MLS subdivisions...");
    const gpsSubdivisions = await Listing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          city: { $exists: true, $ne: null, $ne: "" },
          listPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $addFields: {
          // Normalize subdivision name - convert empty/null/"Not Applicable" to "Non-HOA {City}"
          normalizedSubdivision: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$subdivisionName", null] },
                  { $eq: ["$subdivisionName", ""] },
                  { $regexMatch: { input: "$subdivisionName", regex: /^(not applicable|n\/?a|none|not in subdivision)$/i } }
                ]
              },
              then: { $concat: ["Non-HOA ", "$city"] },
              else: "$subdivisionName"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            subdivision: "$normalizedSubdivision",
            city: "$city",
          },
          listings: {
            $push: {
              price: "$listPrice",
              lat: "$latitude",
              lng: "$longitude",
              mlsSource: "GPS",
              propertyType: "$propertyType",
              seniorCommunity: "$seniorCommunityYn",
              communityFeatures: "$communityFeatures",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 1 } } }, // At least 1 listing
      { $sort: { count: -1 } },
    ]);

    console.log(`✅ Found ${gpsSubdivisions.length} GPS subdivisions`);

    // Aggregation to get subdivisions from CRMLS
    console.log("\n📊 Aggregating CRMLS subdivisions...");
    const crmlsSubdivisions = await CRMLSListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          city: { $exists: true, $ne: null, $ne: "" },
          listPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $addFields: {
          // Normalize subdivision name - convert empty/null/"Not Applicable" to "Non-HOA {City}"
          normalizedSubdivision: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$subdivisionName", null] },
                  { $eq: ["$subdivisionName", ""] },
                  { $regexMatch: { input: "$subdivisionName", regex: /^(not applicable|n\/?a|none|not in subdivision)$/i } }
                ]
              },
              then: { $concat: ["Non-HOA ", "$city"] },
              else: "$subdivisionName"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            subdivision: "$normalizedSubdivision",
            city: "$city",
          },
          listings: {
            $push: {
              price: "$listPrice",
              lat: "$latitude",
              lng: "$longitude",
              mlsSource: "CRMLS",
              propertyType: "$propertyType",
              seniorCommunity: "$seniorCommunityYn",
              communityFeatures: "$communityFeatures",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`✅ Found ${crmlsSubdivisions.length} CRMLS subdivisions`);

    // Merge subdivisions from both sources
    console.log("\n🔀 Merging subdivisions...");
    const subdivisionMap = new Map<string, SubdivisionData>();

    // Process GPS subdivisions
    for (const sub of gpsSubdivisions) {
      // Skip if subdivision name or city is missing
      if (!sub._id.subdivision || !sub._id.city) {
        console.warn(`⚠️ Skipping GPS subdivision with missing data:`, sub._id);
        continue;
      }
      const key = `${sub._id.subdivision}-${sub._id.city}`.toLowerCase();
      subdivisionMap.set(key, {
        name: sub._id.subdivision,
        city: sub._id.city,
        listings: sub.listings,
      });
    }

    // Merge CRMLS subdivisions
    for (const sub of crmlsSubdivisions) {
      // Skip if subdivision name or city is missing
      if (!sub._id.subdivision || !sub._id.city) {
        console.warn(`⚠️ Skipping CRMLS subdivision with missing data:`, sub._id);
        continue;
      }
      const key = `${sub._id.subdivision}-${sub._id.city}`.toLowerCase();
      const existing = subdivisionMap.get(key);

      if (existing) {
        // Merge listings from both sources
        existing.listings.push(...sub.listings);
      } else {
        // New subdivision
        subdivisionMap.set(key, {
          name: sub._id.subdivision,
          city: sub._id.city,
          listings: sub.listings,
        });
      }
    }

    console.log(`✅ Total unique subdivisions: ${subdivisionMap.size}`);

    // Convert to array and calculate stats
    console.log("\n📈 Calculating statistics...");
    const subdivisions = Array.from(subdivisionMap.values()).map((sub) => {
      const prices = sub.listings.map((l) => l.price).filter((p) => p > 0);
      const sortedPrices = prices.sort((a, b) => a - b);

      const coords = sub.listings
        .filter((l) => l.lat && l.lng)
        .map((l) => ({ lat: l.lat!, lng: l.lng! }));

      const avgLat = coords.length > 0
        ? coords.reduce((sum, c) => sum + c.lat, 0) / coords.length
        : undefined;
      const avgLng = coords.length > 0
        ? coords.reduce((sum, c) => sum + c.lng, 0) / coords.length
        : undefined;

      // Property type counts
      const propertyTypes = sub.listings.reduce(
        (acc, l) => {
          if (l.propertyType === "A") acc.residential++;
          else if (l.propertyType === "B") acc.lease++;
          else if (l.propertyType === "C") acc.multiFamily++;
          return acc;
        },
        { residential: 0, lease: 0, multiFamily: 0 }
      );

      // Senior community check
      const seniorCount = sub.listings.filter((l) => l.seniorCommunity).length;
      const isSeniorCommunity = seniorCount > sub.listings.length * 0.5;

      // Get unique MLS sources
      const mlsSources = [...new Set(sub.listings.map((l) => l.mlsSource))];

      // Community features (take first non-empty)
      const communityFeatures = sub.listings
        .map((l) => l.communityFeatures)
        .find((f) => f);

      const county = getCounty(sub.city);
      const region = getRegion(sub.city, county);

      return {
        name: sub.name,
        slug: slugify(`${sub.name}-${sub.city}`),
        normalizedName: (sub.name || "").toLowerCase(),
        city: sub.city,
        county,
        region,
        coordinates: avgLat && avgLng ? { latitude: avgLat, longitude: avgLng } : undefined,
        listingCount: sub.listings.length,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
        },
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
        propertyTypes,
        seniorCommunity: isSeniorCommunity,
        communityFeatures,
        mlsSources,
        hasManualData: false,
        lastUpdated: new Date(),
      };
    });

    // Sort by listing count
    subdivisions.sort((a, b) => b.listingCount - a.listingCount);

    // Save to JSON file for review
    const outputPath = path.join(__dirname, "../../../local-logs/extracted-subdivisions.json");
    fs.writeFileSync(outputPath, JSON.stringify(subdivisions, null, 2));
    console.log(`\n💾 Saved ${subdivisions.length} subdivisions to ${outputPath}`);

    // Print summary by region
    console.log("\n📊 Summary by Region:");
    const regionCounts = subdivisions.reduce((acc, sub) => {
      acc[sub.region] = (acc[sub.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        console.log(`  ${region}: ${count} subdivisions`);
      });

    // Print top 20 by listing count
    console.log("\n🏆 Top 20 Subdivisions by Listing Count:");
    subdivisions.slice(0, 20).forEach((sub, i) => {
      console.log(
        `  ${i + 1}. ${sub.name}, ${sub.city} (${sub.region}) - ${sub.listingCount} listings, Avg: $${sub.avgPrice.toLocaleString()}`
      );
    });

    console.log("\n✅ Extraction complete!");
    console.log("\n📝 Next steps:");
    console.log("  1. Review the extracted data in local-logs/extracted-subdivisions.json");
    console.log("  2. Run the merge script to combine with your existing JSON data");
    console.log("  3. Generate descriptions for subdivisions missing them");
    console.log("  4. Upload to MongoDB subdivisions collection");

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error extracting subdivisions:", error);
    process.exit(1);
  }
}

// Run the script
extractSubdivisions();
