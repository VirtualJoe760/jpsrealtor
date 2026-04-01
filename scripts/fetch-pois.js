#!/usr/bin/env node
/**
 * fetch-pois.js
 *
 * Fetches Points of Interest from Google Places API for the Coachella Valley
 * and caches them in MongoDB.
 *
 * Usage: node scripts/fetch-pois.js
 *
 * Categories scraped:
 * - golf_course (golf courses, country clubs)
 * - school (K-12 schools)
 * - park (parks, recreation)
 * - shopping_mall / supermarket (shopping centers, grocery)
 * - restaurant (restaurants)
 *
 * Cost estimate: ~$20-30 for Coachella Valley
 */

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

if (!GOOGLE_API_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI in .env.local");
  process.exit(1);
}

// Coachella Valley bounding box (approximate)
// From Desert Hot Springs (north) to Salton Sea (south)
// From Cabazon (west) to Mecca (east)
const COACHELLA_VALLEY = {
  north: 33.95,
  south: 33.45,
  west: -116.65,
  east: -116.05,
  name: "coachella-valley",
};

// Grid search: break the valley into cells and search each
// At zoom ~14, each cell covers roughly 2km
const GRID_STEP = 0.03; // ~3km per cell

// Categories to search
const CATEGORIES = [
  { type: "golf_course", category: "golf" },
  { type: "school", category: "school" },
  { type: "park", category: "park" },
  { type: "shopping_mall", category: "shopping" },
  { type: "supermarket", category: "shopping" },
  { type: "restaurant", category: "restaurant" },
  { type: "tourist_attraction", category: "attraction" },
  { type: "church", category: "worship" },
  { type: "hospital", category: "healthcare" },
  { type: "gym", category: "fitness" },
];

// POI Schema (inline for script — mirrors src/models/PointOfInterest.ts)
const POISchema = new mongoose.Schema(
  {
    placeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    types: [String],
    category: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    city: String,
    rating: Number,
    userRatingsTotal: Number,
    priceLevel: Number,
    description: String,
    phoneNumber: String,
    website: String,
    hours: [String],
    photoUrl: String,
    photoReference: String,
    photoAttribution: String,
    isOpen: Boolean,
    businessStatus: String,
    fetchedAt: { type: Date, default: Date.now },
    region: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: "points_of_interest" }
);

const POI = mongoose.models.PointOfInterest || mongoose.model("PointOfInterest", POISchema);

// Stats tracking
const stats = {
  nearbySearches: 0,
  detailRequests: 0,
  photosResolved: 0,
  poisSaved: 0,
  duplicatesSkipped: 0,
  errors: 0,
};

// Rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchNearbySearch(lat, lng, type, radius = 3000) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  stats.nearbySearches++;

  if (!res.ok) {
    console.error(`❌ Nearby search failed: ${res.status}`);
    stats.errors++;
    return [];
  }

  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`❌ Nearby search error: ${data.status} - ${data.error_message || ""}`);
    stats.errors++;
    return [];
  }

  return data.results || [];
}

async function fetchPlaceDetails(placeId) {
  const fields = "place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,editorial_summary,formatted_phone_number,website,opening_hours,photos,business_status,types";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  stats.detailRequests++;

  if (!res.ok) {
    console.error(`❌ Details fetch failed for ${placeId}: ${res.status}`);
    stats.errors++;
    return null;
  }

  const data = await res.json();

  if (data.status !== "OK") {
    console.error(`❌ Details error for ${placeId}: ${data.status}`);
    stats.errors++;
    return null;
  }

  return data.result;
}

function getPhotoUrl(photoReference, maxWidth = 800) {
  if (!photoReference) return null;
  stats.photosResolved++;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

function extractCity(address) {
  if (!address) return null;
  // Try to extract city from "123 Main St, Palm Desert, CA 92260"
  const parts = address.split(",");
  if (parts.length >= 3) {
    return parts[parts.length - 2].trim().replace(/\s+CA\s*\d*/, "").trim();
  }
  return null;
}

async function processPlace(place, category) {
  try {
    // Check if already cached
    const existing = await POI.findOne({ placeId: place.place_id });
    if (existing) {
      stats.duplicatesSkipped++;
      return;
    }

    // Fetch full details
    const details = await fetchPlaceDetails(place.place_id);
    if (!details) return;

    // Rate limit between detail requests
    await sleep(100);

    // Build photo URL
    let photoUrl = null;
    let photoReference = null;
    let photoAttribution = null;

    if (details.photos && details.photos.length > 0) {
      photoReference = details.photos[0].photo_reference;
      photoUrl = getPhotoUrl(photoReference);
      photoAttribution = details.photos[0].html_attributions?.[0] || null;
    }

    // Save to DB
    await POI.findOneAndUpdate(
      { placeId: details.place_id },
      {
        placeId: details.place_id,
        name: details.name,
        types: details.types || [],
        category,
        latitude: details.geometry?.location?.lat,
        longitude: details.geometry?.location?.lng,
        address: details.formatted_address,
        city: extractCity(details.formatted_address),
        rating: details.rating,
        userRatingsTotal: details.user_ratings_total,
        priceLevel: details.price_level,
        description: details.editorial_summary?.overview || null,
        phoneNumber: details.formatted_phone_number,
        website: details.website,
        hours: details.opening_hours?.weekday_text || [],
        photoUrl,
        photoReference,
        photoAttribution,
        businessStatus: details.business_status,
        fetchedAt: new Date(),
        region: COACHELLA_VALLEY.name,
      },
      { upsert: true, new: true }
    );

    stats.poisSaved++;
  } catch (err) {
    console.error(`❌ Error processing ${place.name}:`, err.message);
    stats.errors++;
  }
}

async function scrapeCategory(categoryConfig) {
  const { type, category } = categoryConfig;
  console.log(`\n📍 Scraping category: ${type} → ${category}`);

  const seenPlaceIds = new Set();
  let categoryCount = 0;

  // Grid search across Coachella Valley
  for (let lat = COACHELLA_VALLEY.south; lat <= COACHELLA_VALLEY.north; lat += GRID_STEP) {
    for (let lng = COACHELLA_VALLEY.west; lng <= COACHELLA_VALLEY.east; lng += GRID_STEP) {
      const results = await fetchNearbySearch(lat, lng, type);

      for (const place of results) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        await processPlace(place, category);
        categoryCount++;
      }

      // Rate limit between grid cells
      await sleep(200);
    }
  }

  console.log(`✅ ${type}: found ${categoryCount} POIs`);
}

async function main() {
  console.log("🚀 Google Places POI Scraper — Coachella Valley");
  console.log("================================================\n");
  console.log(`📊 Grid: ${GRID_STEP}° steps across ${COACHELLA_VALLEY.name}`);
  console.log(`📋 Categories: ${CATEGORIES.map((c) => c.type).join(", ")}`);
  console.log();

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  // Scrape each category
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat);
  }

  // Print summary
  console.log("\n================================================");
  console.log("📊 SCRAPE COMPLETE");
  console.log("================================================");
  console.log(`  Nearby searches:  ${stats.nearbySearches}`);
  console.log(`  Detail requests:  ${stats.detailRequests}`);
  console.log(`  Photos resolved:  ${stats.photosResolved}`);
  console.log(`  POIs saved:       ${stats.poisSaved}`);
  console.log(`  Duplicates:       ${stats.duplicatesSkipped}`);
  console.log(`  Errors:           ${stats.errors}`);
  console.log();

  // Estimated cost
  const nearbySearchCost = stats.nearbySearches * 0.032;
  const detailsCost = stats.detailRequests * 0.017;
  const totalCost = nearbySearchCost + detailsCost;
  console.log(`💰 Estimated cost:`);
  console.log(`  Nearby Search:    $${nearbySearchCost.toFixed(2)}`);
  console.log(`  Place Details:    $${detailsCost.toFixed(2)}`);
  console.log(`  TOTAL:            $${totalCost.toFixed(2)}`);

  await mongoose.disconnect();
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
