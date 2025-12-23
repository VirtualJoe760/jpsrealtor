// src/lib/chat/utils/entity-recognition.ts
// Database-driven entity recognition - scalable across all locations

import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";

export type EntityType =
  | "subdivision"  // "PDCC", "PGA West", "Trilogy"
  | "listing"      // "82223 Vandenberg", "123 Main St"
  | "city"         // "Palm Desert", "La Quinta"
  | "county"       // "Riverside County"
  | "region"       // "Coachella Valley"
  | "general";     // General queries

export interface EntityRecognitionResult {
  type: EntityType;
  value: string;          // Normalized entity name
  confidence: number;     // 0-1 confidence score
  original: string;       // Original query text
}

/**
 * In-memory cache for database entities
 * Refreshed periodically to avoid stale data
 */
interface EntityCache {
  subdivisions: string[];
  cities: string[];
  lastUpdated: Date;
}

let entityCache: EntityCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Known counties (static - these don't change often)
 */
const KNOWN_COUNTIES = [
  "riverside county",
  "riverside",
  "san diego county",
  "orange county",
  "los angeles county",
  "san bernardino county",
];

/**
 * Known regions (static - these don't change often)
 */
const KNOWN_REGIONS = [
  "coachella valley",
  "desert cities",
  "low desert",
  "inland empire",
];

/**
 * Common abbreviations mapping
 * Maps common abbreviations to their search patterns
 */
const COMMON_ABBREVIATIONS: Record<string, string[]> = {
  "pdcc": ["palm desert country club"],
  "pga": ["pga west"],
  "lqcc": ["la quinta country club"],
  "bdcc": ["bermuda dunes country club"],
  "iwcc": ["indian wells country club"],
  "cc": ["country club"],
  // Add more as needed
};

/**
 * Load entities from database
 * Fetches distinct subdivision names and cities from active listings
 */
async function loadEntitiesFromDatabase(): Promise<EntityCache> {
  console.log("[Entity Recognition] Loading entities from database...");

  try {
    await dbConnect();

    // Get distinct subdivisions (excluding null, empty, and "not applicable")
    const subdivisions = await UnifiedListing.distinct("subdivisionName", {
      standardStatus: "Active",
      subdivisionName: {
        $exists: true,
        $ne: null,
        $nin: ["", "Not Applicable", "N/A", "None", "n/a", "not applicable", "none"]
      }
    });

    // Get distinct cities
    const cities = await UnifiedListing.distinct("city", {
      standardStatus: "Active",
      city: { $exists: true, $ne: null, $nin: ["", "Unknown"] }
    });

    const cache: EntityCache = {
      subdivisions: subdivisions.filter(Boolean).sort(),
      cities: cities.filter(Boolean).sort(),
      lastUpdated: new Date()
    };

    console.log(`[Entity Recognition] Loaded ${cache.subdivisions.length} subdivisions and ${cache.cities.length} cities`);

    return cache;
  } catch (error) {
    console.error("[Entity Recognition] Error loading entities from database:", error);

    // Return empty cache on error
    return {
      subdivisions: [],
      cities: [],
      lastUpdated: new Date()
    };
  }
}

/**
 * Get cached entities or load from database
 */
async function getEntities(): Promise<EntityCache> {
  // Check if cache exists and is fresh
  if (entityCache && Date.now() - entityCache.lastUpdated.getTime() < CACHE_TTL_MS) {
    return entityCache;
  }

  // Load fresh data from database
  entityCache = await loadEntitiesFromDatabase();
  return entityCache;
}

/**
 * Expand query with common abbreviations
 * "show homes in pdcc" => ["show homes in pdcc", "show homes in palm desert country club"]
 */
function expandAbbreviations(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const expansions: string[] = [query];

  for (const [abbrev, fullForms] of Object.entries(COMMON_ABBREVIATIONS)) {
    if (lowerQuery.includes(abbrev)) {
      for (const fullForm of fullForms) {
        expansions.push(query.toLowerCase().replace(abbrev, fullForm));
      }
    }
  }

  return expansions;
}

/**
 * Find best match for a subdivision
 * Uses exact and partial matching
 */
function findSubdivisionMatch(query: string, subdivisions: string[]): { name: string; confidence: number } | null {
  const lowerQuery = query.toLowerCase();
  const queryVariants = expandAbbreviations(query);

  // Try exact match first (highest confidence)
  for (const variant of queryVariants) {
    for (const sub of subdivisions) {
      if (variant.toLowerCase() === sub.toLowerCase()) {
        return { name: sub, confidence: 0.98 };
      }
    }
  }

  // Try contains match (medium-high confidence)
  for (const variant of queryVariants) {
    for (const sub of subdivisions) {
      const lowerSub = sub.toLowerCase();
      if (variant.toLowerCase().includes(lowerSub) || lowerSub.includes(variant.toLowerCase())) {
        return { name: sub, confidence: 0.92 };
      }
    }
  }

  // Try word-by-word match (medium confidence)
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  for (const sub of subdivisions) {
    const subWords = sub.toLowerCase().split(/\s+/);
    const matchedWords = queryWords.filter(qw => subWords.some(sw => sw.includes(qw) || qw.includes(sw)));

    if (matchedWords.length >= 2) {
      return { name: sub, confidence: 0.85 };
    }
  }

  return null;
}

/**
 * Find best match for a city
 * Uses exact and partial matching
 */
function findCityMatch(query: string, cities: string[]): { name: string; confidence: number } | null {
  const lowerQuery = query.toLowerCase();

  // Try exact match first
  for (const city of cities) {
    if (lowerQuery === city.toLowerCase()) {
      return { name: city, confidence: 0.98 };
    }
  }

  // Try contains match
  for (const city of cities) {
    const lowerCity = city.toLowerCase();
    if (lowerQuery.includes(lowerCity)) {
      return { name: city, confidence: 0.92 };
    }
  }

  return null;
}

/**
 * Identify what type of entity the user is asking about
 * DATABASE-DRIVEN: Queries actual subdivisions and cities from database
 *
 * @param query - User's query text
 * @returns Entity type, normalized value, and confidence
 *
 * @example
 * await identifyEntityType("Does PDCC allow short term rentals?")
 * // => { type: "subdivision", value: "Palm Desert Country Club", confidence: 0.95 }
 *
 * await identifyEntityType("What's the HOA fee for 82223 Vandenberg?")
 * // => { type: "listing", value: "82223 Vandenberg", confidence: 0.98 }
 *
 * await identifyEntityType("Tell me about Palm Desert")
 * // => { type: "city", value: "Palm Desert", confidence: 0.90 }
 */
export async function identifyEntityType(query: string): Promise<EntityRecognitionResult> {
  const lowerQuery = query.toLowerCase();

  // STEP 1: Check for address patterns (highest priority)
  // Pattern: "82223 Vandenberg", "123 Main St"
  const addressMatch = lowerQuery.match(/\b(\d+\s+[a-z][a-z0-9\s]*?(?:\s+(?:street|st|drive|dr|avenue|ave|road|rd|lane|ln|way|circle|cir|court|ct|boulevard|blvd))?)\b(?=\s|$|,|\?|!)/i);
  if (addressMatch) {
    return {
      type: "listing",
      value: addressMatch[1].trim(),
      confidence: 0.98,
      original: query
    };
  }

  // STEP 2: Load entities from database (cached)
  const entities = await getEntities();

  // STEP 3: Check for subdivisions (database-driven)
  const subdivisionMatch = findSubdivisionMatch(query, entities.subdivisions);
  if (subdivisionMatch) {
    return {
      type: "subdivision",
      value: subdivisionMatch.name,
      confidence: subdivisionMatch.confidence,
      original: query
    };
  }

  // STEP 4: Check for cities (database-driven)
  const cityMatch = findCityMatch(query, entities.cities);
  if (cityMatch) {
    return {
      type: "city",
      value: cityMatch.name,
      confidence: cityMatch.confidence,
      original: query
    };
  }

  // STEP 5: Check for known counties
  for (const county of KNOWN_COUNTIES) {
    if (lowerQuery.includes(county.toLowerCase())) {
      return {
        type: "county",
        value: county,
        confidence: 0.85,
        original: query
      };
    }
  }

  // STEP 6: Check for known regions
  for (const region of KNOWN_REGIONS) {
    if (lowerQuery.includes(region.toLowerCase())) {
      return {
        type: "region",
        value: region,
        confidence: 0.80,
        original: query
      };
    }
  }

  // STEP 7: Default to general query
  return {
    type: "general",
    value: query,
    confidence: 0.50,
    original: query
  };
}

/**
 * Synchronous version for backward compatibility
 * NOTE: This should be avoided - use async version instead
 * Falls back to general if called synchronously
 */
export function identifyEntityTypeSync(query: string): EntityRecognitionResult {
  console.warn("[Entity Recognition] DEPRECATED: Use async identifyEntityType() instead");

  // Return general - async version should be used
  return {
    type: "general",
    value: query,
    confidence: 0.50,
    original: query
  };
}

/**
 * Extract subdivision name from query
 */
export async function extractSubdivisionName(query: string): Promise<string | null> {
  const result = await identifyEntityType(query);
  return result.type === "subdivision" ? result.value : null;
}

/**
 * Extract listing address from query
 */
export async function extractListingAddress(query: string): Promise<string | null> {
  const result = await identifyEntityType(query);
  return result.type === "listing" ? result.value : null;
}

/**
 * Extract city name from query
 */
export async function extractCityName(query: string): Promise<string | null> {
  const result = await identifyEntityType(query);
  return result.type === "city" ? result.value : null;
}

/**
 * Force refresh the entity cache
 * Useful for admin operations or scheduled refreshes
 */
export async function refreshEntityCache(): Promise<void> {
  console.log("[Entity Recognition] Force refreshing entity cache...");
  entityCache = await loadEntitiesFromDatabase();
}
