#!/usr/bin/env node
/**
 * build-subdivision-catalog.js
 *
 * Phase 1: Builds a catalog of subdivision official websites using Google Places API.
 * For each subdivision in our JSON files, searches Google Places to find the official
 * website URL and Google editorial description.
 *
 * Usage: node scripts/build-subdivision-catalog.js
 *        node scripts/build-subdivision-catalog.js --city "Indian Wells"
 *        node scripts/build-subdivision-catalog.js --dry-run
 *
 * Output: local-logs/subdivision-website-catalog.json
 *
 * Cost estimate: ~$0.032 per text search + $0.017 per detail request
 *                ~260 subdivisions = ~$13 total
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local");
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const cityFilter = args.includes("--city") ? args[args.indexOf("--city") + 1] : null;
const dryRun = args.includes("--dry-run");
const resumeMode = args.includes("--resume");

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 250; // ms
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Coachella Valley bounding box for location bias
const COACHELLA_VALLEY_CENTER = { lat: 33.72, lng: -116.37 };
const SEARCH_RADIUS = 30000; // 30km

/**
 * Load all subdivision JSON files (skip og- backups)
 */
function loadAllSubdivisions() {
  const dir = path.join(__dirname, "../src/app/constants/subdivisions");
  const files = fs.readdirSync(dir).filter(
    (f) => f.endsWith(".json") && !f.startsWith("og-")
  );

  const all = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    // Extract city from filename: "indian-wells-neighborhoods.json" -> "Indian Wells"
    const cityFromFile = file
      .replace("-neighborhoods.json", "")
      .replace("_neighborhoods.json", "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    for (const sub of data) {
      all.push({
        name: sub.name,
        slug: sub.slug,
        city: cityFromFile,
        currentDescription: sub.description || null,
        features: sub.features || [],
      });
    }
  }

  return all;
}

/**
 * Search Google Places Text Search for a subdivision
 */
async function searchGooglePlaces(subdivisionName, city) {
  const query = `${subdivisionName} ${city} California`;
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("location", `${COACHELLA_VALLEY_CENTER.lat},${COACHELLA_VALLEY_CENTER.lng}`);
  url.searchParams.set("radius", String(SEARCH_RADIUS));

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    return null;
  }

  // Return the top result
  return data.results[0];
}

/**
 * Get place details (website, editorial summary, etc.)
 */
async function getPlaceDetails(placeId) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,website,editorial_summary,formatted_address,types,rating,user_ratings_total,url");
  url.searchParams.set("key", GOOGLE_API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    return null;
  }

  return data.result;
}

/**
 * Main execution
 */
async function main() {
  console.log("🏘️  Subdivision Website Catalog Builder");
  console.log("========================================\n");

  // Load subdivisions
  let subdivisions = loadAllSubdivisions();
  console.log(`📋 Loaded ${subdivisions.length} subdivisions from JSON files\n`);

  if (cityFilter) {
    subdivisions = subdivisions.filter(
      (s) => s.city.toLowerCase() === cityFilter.toLowerCase()
    );
    console.log(`🔍 Filtered to ${subdivisions.length} subdivisions in ${cityFilter}\n`);
  }

  if (dryRun) {
    console.log("🏃 DRY RUN — listing subdivisions without making API calls:\n");
    for (const sub of subdivisions) {
      console.log(`  ${sub.city} / ${sub.name} (${sub.slug})`);
    }
    console.log(`\n✅ Would process ${subdivisions.length} subdivisions`);
    console.log(`💰 Estimated cost: ~$${(subdivisions.length * 0.049).toFixed(2)}`);
    return;
  }

  // Load existing catalog if resuming
  const outputPath = path.join(__dirname, "../local-logs/subdivision-website-catalog.json");
  let catalog = [];
  const processedSlugs = new Set();

  if (resumeMode && fs.existsSync(outputPath)) {
    catalog = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    for (const entry of catalog) {
      processedSlugs.add(entry.slug);
    }
    console.log(`📂 Resuming — ${catalog.length} already processed\n`);
  }

  // Process each subdivision
  let searched = 0;
  let found = 0;
  let withWebsite = 0;
  let errors = 0;

  for (let i = 0; i < subdivisions.length; i++) {
    const sub = subdivisions[i];

    // Skip if already processed (resume mode)
    if (processedSlugs.has(sub.slug)) {
      continue;
    }

    const progress = `[${i + 1}/${subdivisions.length}]`;
    process.stdout.write(`${progress} ${sub.city} / ${sub.name}... `);

    try {
      // Step 1: Text search
      const searchResult = await searchGooglePlaces(sub.name, sub.city);
      searched++;
      await sleep(DELAY_BETWEEN_REQUESTS);

      if (!searchResult) {
        console.log("❌ No results");
        catalog.push({
          name: sub.name,
          slug: sub.slug,
          city: sub.city,
          currentDescription: sub.currentDescription,
          features: sub.features,
          googlePlaceId: null,
          officialUrl: null,
          googleDescription: null,
          googleRating: null,
          googleAddress: null,
          confidence: "none",
        });
        continue;
      }

      // Step 2: Get details
      const details = await getPlaceDetails(searchResult.place_id);
      await sleep(DELAY_BETWEEN_REQUESTS);
      found++;

      const entry = {
        name: sub.name,
        slug: sub.slug,
        city: sub.city,
        currentDescription: sub.currentDescription,
        features: sub.features,
        googlePlaceId: searchResult.place_id,
        googleName: details?.name || searchResult.name,
        officialUrl: details?.website || null,
        googleMapsUrl: details?.url || null,
        googleDescription: details?.editorial_summary?.overview || null,
        googleRating: details?.rating || null,
        googleRatingsTotal: details?.user_ratings_total || null,
        googleAddress: details?.formatted_address || searchResult.formatted_address || null,
        googleTypes: details?.types || searchResult.types || [],
        confidence: details?.website ? "high" : details?.editorial_summary ? "medium" : "low",
      };

      if (entry.officialUrl) {
        withWebsite++;
        console.log(`✅ ${entry.officialUrl}`);
      } else if (entry.googleDescription) {
        console.log(`📝 No website, but has Google description`);
      } else {
        console.log(`⚠️  Found place but no website or description`);
      }

      catalog.push(entry);
    } catch (err) {
      console.log(`💥 Error: ${err.message}`);
      errors++;
      catalog.push({
        name: sub.name,
        slug: sub.slug,
        city: sub.city,
        currentDescription: sub.currentDescription,
        features: sub.features,
        googlePlaceId: null,
        officialUrl: null,
        googleDescription: null,
        confidence: "error",
        error: err.message,
      });
    }

    // Save progress every 10 items
    if (catalog.length % 10 === 0) {
      fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
    }
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

  // Summary
  console.log("\n========================================");
  console.log("📊 Summary:");
  console.log(`   Total subdivisions: ${subdivisions.length}`);
  console.log(`   Google searches: ${searched}`);
  console.log(`   Places found: ${found}`);
  console.log(`   With official website: ${withWebsite}`);
  console.log(`   Without website: ${found - withWebsite}`);
  console.log(`   No results: ${searched - found}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📄 Catalog saved to: ${outputPath}`);

  // Confidence breakdown
  const high = catalog.filter((c) => c.confidence === "high").length;
  const medium = catalog.filter((c) => c.confidence === "medium").length;
  const low = catalog.filter((c) => c.confidence === "low").length;
  const none = catalog.filter((c) => c.confidence === "none" || c.confidence === "error").length;

  console.log(`\n🎯 Confidence breakdown:`);
  console.log(`   High (has website): ${high}`);
  console.log(`   Medium (Google description only): ${medium}`);
  console.log(`   Low (place found, no details): ${low}`);
  console.log(`   None/Error: ${none}`);
}

main().catch(console.error);
