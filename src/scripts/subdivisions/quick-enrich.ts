// src/scripts/subdivisions/quick-enrich.ts
// Quick enrichment without database queries - just add descriptions and features

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

interface MergedSubdivision {
  name: string;
  city: string;
  region: string;
  listingCount: number;
  avgPrice: number;
  propertyTypes?: {
    residential?: number;
    lease?: number;
    multiFamily?: number;
  };
  seniorCommunity?: boolean;
  communityFeatures?: string;
  description?: string;
  features?: string[];
  keywords?: string[];
  hasManualData: boolean;
  [key: string]: any;
}

// Helper: Generate description
function generateDescription(sub: MergedSubdivision): string {
  const isNonHOA = sub.name.startsWith("Non-HOA ");
  const priceStr = formatPrice(sub.avgPrice);
  const listingCountStr = sub.listingCount === 1 ? "listing" : "listings";

  if (isNonHOA) {
    return `${sub.name} encompasses the diverse properties in ${sub.city}, ${sub.region}, that are not part of a homeowners association. With ${sub.listingCount} active ${listingCountStr} averaging ${priceStr}, this area offers flexibility and independence for homeowners seeking properties without HOA restrictions. These homes provide a range of architectural styles and lot sizes, perfect for those who value autonomy in their property decisions.`;
  }

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

  const amenityStr = amenities.length > 0 ? ` featuring ${amenities.join(", ")},` : "";
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

// Helper: Generate features
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

  if (sub.avgPrice > 1000000) {
    features.push("Luxury homes");
  }

  if (sub.region === "Coachella Valley") {
    features.push("Desert lifestyle");
  }

  return features.slice(0, 5);
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

// Main function
async function quickEnrich() {
  console.log("⚡ Quick enrichment (no database queries)...\n");

  // Read merged subdivisions
  const mergedFilePath = path.join(__dirname, "../../../local-logs/merged-subdivisions.json");
  console.log("📖 Reading merged subdivisions from:", mergedFilePath);

  if (!fs.existsSync(mergedFilePath)) {
    console.error("❌ Merged subdivisions file not found");
    process.exit(1);
  }

  const subdivisions: MergedSubdivision[] = JSON.parse(fs.readFileSync(mergedFilePath, "utf-8"));
  console.log(`✅ Loaded ${subdivisions.length} subdivisions\n`);

  let descriptionCount = 0;
  let featureCount = 0;
  let keywordCount = 0;

  console.log("🔄 Adding descriptions, features, and keywords...\n");

  for (const sub of subdivisions) {
    // Skip if already has manual data
    if (sub.hasManualData && sub.description && sub.features && sub.keywords) {
      continue;
    }

    // Add description if missing
    if (!sub.description) {
      sub.description = generateDescription(sub);
      descriptionCount++;
    }

    // Add features if missing or empty
    if (!sub.features || sub.features.length === 0) {
      sub.features = generateFeatures(sub);
      if (sub.features.length > 0) {
        featureCount++;
      }
    }

    // Add keywords if missing or empty
    if (!sub.keywords || sub.keywords.length === 0) {
      sub.keywords = generateKeywords(sub);
      keywordCount++;
    }

    // Update lastUpdated
    sub.lastUpdated = new Date().toISOString();
  }

  console.log(`📊 Enrichment Statistics:`);
  console.log(`   Total Subdivisions: ${subdivisions.length}`);
  console.log(`   📝 Descriptions Added: ${descriptionCount}`);
  console.log(`   ✨ Features Added: ${featureCount}`);
  console.log(`   🔑 Keywords Added: ${keywordCount}`);
  console.log(`   ✅ Complete: ${subdivisions.filter(s => s.description && s.features && s.keywords).length}\n`);

  // Write enriched data
  const outputPath = path.join(__dirname, "../../../local-logs/enriched-subdivisions.json");
  fs.writeFileSync(outputPath, JSON.stringify(subdivisions, null, 2));
  console.log(`✅ Enriched data written to: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB\n`);

  console.log("✅ Quick enrichment complete!\n");
  console.log("📸 Note: Photos will be assigned separately from database.\n");
}

// Run
quickEnrich().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
