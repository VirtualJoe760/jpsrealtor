// src/scripts/subdivisions/enrich-subdivisions.ts
// Enrich subdivisions with photos and descriptions

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import mongoose from "mongoose";
import { Listing } from "../../models/listings";
import { CRMLSListing } from "../../models/crmls-listings";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

// Interfaces
interface MergedSubdivision {
  name: string;
  slug: string;
  normalizedName: string;
  city: string;
  county: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  listingCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  avgPrice: number;
  medianPrice?: number;
  propertyTypes?: {
    residential?: number;
    lease?: number;
    multiFamily?: number;
  };
  seniorCommunity?: boolean;
  communityFeatures?: string;
  mlsSources: string[];
  hasManualData: boolean;
  lastUpdated: string;
  description?: string;
  photo?: string;
  features?: string[];
  keywords?: string[];
  manualDataSource?: string;
}

// Helper: Generate description based on subdivision data
function generateDescription(sub: MergedSubdivision): string {
  const isNonHOA = sub.name.startsWith("Non-HOA ");
  const priceStr = formatPrice(sub.avgPrice);
  const listingCountStr = sub.listingCount === 1 ? "listing" : "listings";

  if (isNonHOA) {
    // Non-HOA description
    return `${sub.name} encompasses the diverse properties in ${sub.city}, ${sub.region}, that are not part of a homeowners association. With ${sub.listingCount} active ${listingCountStr} averaging ${priceStr}, this area offers flexibility and independence for homeowners seeking properties without HOA restrictions. These homes provide a range of architectural styles and lot sizes, perfect for those who value autonomy in their property decisions.`;
  }

  // Regular subdivision description
  const amenities: string[] = [];

  if (sub.seniorCommunity) {
    amenities.push("a 55+ active adult community");
  }

  if (sub.communityFeatures) {
    const features = sub.communityFeatures.toLowerCase();
    if (features.includes("golf")) amenities.push("golf amenities");
    if (features.includes("pool")) amenities.push("community pools");
    if (features.includes("tennis") || features.includes("pickle")) amenities.push("racquet sports");
    if (features.includes("fitness") || features.includes("gym")) amenities.push("fitness facilities");
  }

  const amenityStr = amenities.length > 0
    ? ` featuring ${amenities.join(", ")},`
    : "";

  const propertyTypeStr = getPropertyTypeDescription(sub.propertyTypes);

  return `${sub.name} is ${propertyTypeStr} in ${sub.city}, ${sub.region},${amenityStr} offering residents an exceptional living experience. With ${sub.listingCount} active ${listingCountStr} averaging ${priceStr}, this community provides a blend of comfort, convenience, and quality lifestyle amenities in one of Southern California's most desirable locations.`;
}

// Helper: Get property type description
function getPropertyTypeDescription(propertyTypes?: { residential?: number; lease?: number; multiFamily?: number }): string {
  if (!propertyTypes) return "a residential community";

  const total = (propertyTypes.residential || 0) + (propertyTypes.lease || 0) + (propertyTypes.multiFamily || 0);
  const resPct = ((propertyTypes.residential || 0) / total) * 100;
  const leasePct = ((propertyTypes.lease || 0) / total) * 100;
  const multiFamPct = ((propertyTypes.multiFamily || 0) / total) * 100;

  if (resPct > 80) return "a residential community";
  if (leasePct > 60) return "a rental community";
  if (multiFamPct > 50) return "a multi-family community";

  return "a mixed-use community";
}

// Helper: Format price
function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  } else {
    return `$${(price / 1000).toFixed(0)}k`;
  }
}

// Helper: Generate features based on subdivision data
function generateFeatures(sub: MergedSubdivision): string[] {
  const features: string[] = [];

  if (sub.seniorCommunity) {
    features.push("55+ community");
  }

  if (sub.communityFeatures) {
    const communityFeats = sub.communityFeatures.toLowerCase();
    if (communityFeats.includes("golf")) features.push("Golf course");
    if (communityFeats.includes("pool")) features.push("Community pools");
    if (communityFeats.includes("tennis")) features.push("Tennis courts");
    if (communityFeats.includes("pickle")) features.push("Pickleball courts");
    if (communityFeats.includes("fitness") || communityFeats.includes("gym")) features.push("Fitness center");
    if (communityFeats.includes("clubhouse")) features.push("Clubhouse");
    if (communityFeats.includes("gated") || communityFeats.includes("guard")) features.push("Gated community");
  }

  // Add price-based features
  if (sub.avgPrice > 1000000) {
    features.push("Luxury homes");
  }

  // Add location-based features
  if (sub.region === "Coachella Valley") {
    features.push("Desert lifestyle");
  }

  return features.slice(0, 5); // Limit to 5 features
}

// Helper: Generate keywords
function generateKeywords(sub: MergedSubdivision): string[] {
  return [
    `${sub.name} homes for sale`,
    `Living in ${sub.name} ${sub.city}`,
    `${sub.name} real estate`,
    `Homes in ${sub.city} ${sub.county} County`,
    `${sub.region} communities`,
  ];
}

// Helper: Normalize subdivision name for matching
function normalizeForMatching(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Main enrichment function
async function enrichSubdivisions() {
  console.log("🎨 Starting subdivision enrichment...\n");

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not defined in environment");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  // Read merged subdivisions
  const mergedFilePath = path.join(__dirname, "../../../local-logs/merged-subdivisions.json");
  console.log("📖 Reading merged subdivisions from:", mergedFilePath);

  if (!fs.existsSync(mergedFilePath)) {
    console.error("❌ Merged subdivisions file not found:", mergedFilePath);
    process.exit(1);
  }

  const subdivisions: MergedSubdivision[] = JSON.parse(fs.readFileSync(mergedFilePath, "utf-8"));
  console.log(`✅ Loaded ${subdivisions.length} subdivisions\n`);

  // Enrich each subdivision
  console.log("🔍 Enriching subdivisions with photos and descriptions...\n");

  let photoCount = 0;
  let descriptionCount = 0;

  for (let i = 0; i < subdivisions.length; i++) {
    const sub = subdivisions[i];
    const progress = `[${i + 1}/${subdivisions.length}]`;

    // Skip if already has manual data
    if (sub.hasManualData && sub.photo && sub.description) {
      console.log(`${progress} ⏭️  Skipping ${sub.name} (${sub.city}) - already has manual data`);
      continue;
    }

    console.log(`${progress} 🔍 Processing ${sub.name} (${sub.city})...`);

    // Find a photo from listings if needed
    if (!sub.photo) {
      try {
        // Try GPS listings first
        let listing = null;

        if (sub.mlsSources.includes("GPS")) {
          listing = await Listing.findOne({
            subdivisionName: { $regex: new RegExp(`^${sub.name}$`, "i") },
            city: sub.city,
            standardStatus: "Active",
            primaryPhotoUrl: { $exists: true, $ne: null, $ne: "" },
          })
            .sort({ listPrice: -1 }) // Get highest priced listing
            .lean();
        }

        // Try CRMLS listings if not found
        if (!listing && sub.mlsSources.includes("CRMLS")) {
          listing = await CRMLSListing.findOne({
            subdivisionName: { $regex: new RegExp(`^${sub.name}$`, "i") },
            city: sub.city,
            standardStatus: "Active",
            primaryPhotoUrl: { $exists: true, $ne: null, $ne: "" },
          })
            .sort({ listPrice: -1 })
            .lean();
        }

        if (listing && listing.primaryPhotoUrl) {
          sub.photo = listing.primaryPhotoUrl;
          photoCount++;
          console.log(`   📸 Assigned photo from listing`);
        } else {
          console.log(`   ⚠️  No photo found in listings`);
        }
      } catch (error) {
        console.error(`   ❌ Error fetching photo:`, error);
      }
    }

    // Generate description if needed
    if (!sub.description) {
      sub.description = generateDescription(sub);
      descriptionCount++;
      console.log(`   📝 Generated description`);
    }

    // Generate features if needed
    if (!sub.features || sub.features.length === 0) {
      sub.features = generateFeatures(sub);
      if (sub.features.length > 0) {
        console.log(`   ✨ Generated ${sub.features.length} features`);
      }
    }

    // Generate keywords if needed
    if (!sub.keywords || sub.keywords.length === 0) {
      sub.keywords = generateKeywords(sub);
      console.log(`   🔑 Generated keywords`);
    }

    // Update lastUpdated
    sub.lastUpdated = new Date().toISOString();
  }

  console.log(`\n📊 Enrichment Statistics:`);
  console.log(`   Total Subdivisions: ${subdivisions.length}`);
  console.log(`   📸 Photos Added: ${photoCount}`);
  console.log(`   📝 Descriptions Generated: ${descriptionCount}`);
  console.log(`   ✅ Complete: ${subdivisions.filter(s => s.photo && s.description).length}`);
  console.log(`   ⚠️  Missing Photos: ${subdivisions.filter(s => !s.photo).length}`);
  console.log(`   ⚠️  Missing Descriptions: ${subdivisions.filter(s => !s.description).length}\n`);

  // Write enriched data
  const outputPath = path.join(__dirname, "../../../local-logs/enriched-subdivisions.json");
  fs.writeFileSync(outputPath, JSON.stringify(subdivisions, null, 2));
  console.log(`✅ Enriched data written to: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB\n`);

  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log("✅ Enrichment complete!\n");
}

// Run enrichment
enrichSubdivisions().catch((error) => {
  console.error("❌ Error during enrichment:", error);
  process.exit(1);
});
