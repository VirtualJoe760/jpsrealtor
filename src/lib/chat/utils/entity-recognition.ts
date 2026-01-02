// src/lib/chat/utils/entity-recognition.ts
// Database-driven entity recognition - scalable across all locations
// Uses indexed LocationIndex model for fast lookups (<50ms vs 10-15s)

import dbConnect from "@/lib/mongodb";
import LocationIndex from "@/models/LocationIndex";

export type EntityType =
  | "subdivision"        // "PDCC", "PGA West", "Trilogy"
  | "subdivision-group"  // "BDCC" (matches multiple: BDCC Bellissimo, BDCC Castle, etc.)
  | "listing"            // "82223 Vandenberg", "123 Main St"
  | "city"               // "Palm Desert", "La Quinta"
  | "county"             // "Riverside County"
  | "region"             // "Coachella Valley"
  | "general";           // General queries

export interface EntityRecognitionResult {
  type: EntityType;
  value: string;          // Normalized entity name (or pattern for subdivision-group)
  confidence: number;     // 0-1 confidence score
  original: string;       // Original query text
  // For subdivision-group type: all matching subdivision names
  subdivisions?: string[];
}

/**
 * NO MORE IN-MEMORY CACHE!
 * LocationIndex uses database indexes for fast lookups (<50ms)
 * No cache needed - works perfectly on Vercel serverless cold starts
 */

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
 * Find location in LocationIndex with aliases support
 * FAST: Uses indexed queries (<50ms) instead of distinct() (10-15s)
 */
async function findInLocationIndex(query: string, type?: 'city' | 'subdivision'): Promise<any> {
  await dbConnect();

  const normalized = query.toLowerCase().trim();

  // Build query filter
  const filter: any = {
    $or: [
      { normalizedName: normalized },
      { slug: normalized },
      { aliases: normalized }
    ]
  };

  // Add type filter if specified
  if (type) {
    filter.type = type;
  }

  // Try exact match first (fastest - uses index)
  let match: any = await (LocationIndex as any).findOne(filter, null, { lean: true });

  // If no exact match, try fuzzy search
  if (!match) {
    const fuzzyFilter: any = {
      $or: [
        { normalizedName: { $regex: `^${normalized}`, $options: 'i' } },
        { name: { $regex: `^${normalized}`, $options: 'i' } }
      ]
    };

    if (type) {
      fuzzyFilter.type = type;
    }

    // For fuzzy search with sort, we need to use .lean() chaining
    const results = await (LocationIndex as any).find(fuzzyFilter, null, { lean: true })
      .sort({ listingCount: -1 })  // Prefer high-count locations
      .limit(1);

    match = results[0] || null;
  }

  return match;
}

/**
 * Get all locations of a specific type from LocationIndex
 * Used for matching and comparison
 */
async function getLocationsByType(type: 'city' | 'subdivision'): Promise<string[]> {
  await dbConnect();

  const locations: any[] = await (LocationIndex as any).find({ type }, 'name', { lean: true });

  return locations.map((loc: any) => loc.name);
}

/**
 * Expand query with common abbreviations
 * Works BOTH ways:
 * - "pdcc" => ["pdcc", "palm desert country club"]
 * - "palm desert country club" => ["palm desert country club", "pdcc"]
 */
function expandAbbreviations(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const expansions: string[] = [query];

  for (const [abbrev, fullForms] of Object.entries(COMMON_ABBREVIATIONS)) {
    // Direction 1: If query contains abbreviation, expand to full form
    if (lowerQuery.includes(abbrev)) {
      for (const fullForm of fullForms) {
        expansions.push(query.toLowerCase().replace(abbrev, fullForm));
      }
    }

    // Direction 2: If query contains full form, add abbreviation variant
    for (const fullForm of fullForms) {
      if (lowerQuery.includes(fullForm)) {
        expansions.push(query.toLowerCase().replace(fullForm, abbrev));
      }
    }
  }

  return expansions;
}

/**
 * Find best match for a subdivision
 * Uses exact and partial matching, preferring longer/better matches
 * Can detect subdivision groups (e.g., "BDCC" matching multiple "BDCC *" subdivisions)
 */
function findSubdivisionMatch(query: string, subdivisions: string[]): {
  name: string;
  confidence: number;
  isGroup?: boolean;
  groupMembers?: string[]
} | null {
  const lowerQuery = query.toLowerCase();
  const queryVariants = expandAbbreviations(query);

  // STEP 0: Check for subdivision groups (e.g., "BDCC" or "Bermuda Dunes Country Club")
  // Look for multiple subdivisions that start with the same pattern
  for (const variant of queryVariants) {
    const lowerVariant = variant.toLowerCase().trim();

    // Find all subdivisions that start with this pattern
    const groupMatches = subdivisions.filter(sub => {
      const lowerSub = sub.toLowerCase();
      // Match if subdivision starts with the pattern
      return lowerSub.startsWith(lowerVariant) ||
             // Or if pattern is an abbreviation at start (e.g., "BDCC " matches "BDCC Bellissimo")
             lowerSub.startsWith(lowerVariant + " ");
    });

    // If we found 2+ subdivisions with this prefix, it's a group!
    if (groupMatches.length >= 2) {
      console.log(`[Entity Recognition] 🎯 Detected subdivision group: "${variant}" matches ${groupMatches.length} subdivisions:`, groupMatches);
      return {
        name: variant,  // Return the pattern (e.g., "bdcc" or "bermuda dunes country club")
        confidence: 0.95,
        isGroup: true,
        groupMembers: groupMatches
      };
    }
  }

  // STEP 1: Try exact match (highest confidence for single subdivisions)
  for (const variant of queryVariants) {
    for (const sub of subdivisions) {
      if (variant.toLowerCase() === sub.toLowerCase()) {
        return { name: sub, confidence: 0.98 };
      }
    }
  }

  // Collect all potential matches with scores
  const matches: Array<{ name: string; confidence: number; score: number }> = [];

  // Try contains match (medium-high confidence)
  for (const variant of queryVariants) {
    const lowerVariant = variant.toLowerCase();

    for (const sub of subdivisions) {
      const lowerSub = sub.toLowerCase();

      // Check if subdivision is contained in query (prefer longer subdivision names)
      if (lowerVariant.includes(lowerSub)) {
        // Score based on how much of the query the subdivision covers
        const score = lowerSub.length / lowerVariant.length;
        matches.push({ name: sub, confidence: 0.92, score });
      }
      // Check if query is contained in subdivision
      else if (lowerSub.includes(lowerVariant)) {
        const score = lowerVariant.length / lowerSub.length;
        matches.push({ name: sub, confidence: 0.90, score });
      }
    }
  }

  // Return best match (highest score)
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return { name: matches[0].name, confidence: matches[0].confidence };
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

  // STEP 2: Try direct LocationIndex lookup (FAST - uses indexes)
  console.log("[Entity Recognition] Query:", query);

  // Try to find exact match in LocationIndex
  const locationMatch = await findInLocationIndex(query);

  if (locationMatch) {
    console.log(`[Entity Recognition] ✅ Found ${locationMatch.type}: ${locationMatch.name} (${locationMatch.listingCount} listings)`);

    return {
      type: locationMatch.type as EntityType,
      value: locationMatch.name,
      confidence: 0.95,
      original: query
    };
  }

  // STEP 3: No exact match - load entities for fuzzy matching
  // This is still much faster than before (only loads when needed)
  console.log("[Entity Recognition] No exact match, trying fuzzy matching...");

  const cities = await getLocationsByType('city');
  const subdivisions = await getLocationsByType('subdivision');

  const cityMatch = findCityMatch(query, cities);
  const subdivisionMatch = findSubdivisionMatch(query, subdivisions);

  // Priority 1: Exact matches (0.98 confidence) - city or subdivision
  if (cityMatch && cityMatch.confidence === 0.98) {
    // Exact city match (whole query = city name)
    return {
      type: "city",
      value: cityMatch.name,
      confidence: cityMatch.confidence,
      original: query
    };
  }

  if (subdivisionMatch && subdivisionMatch.confidence === 0.98) {
    // Exact subdivision match (whole query = subdivision name)
    return {
      type: "subdivision",
      value: subdivisionMatch.name,
      confidence: subdivisionMatch.confidence,
      original: query
    };
  }

  // Priority 2: Subdivision groups (multiple subdivisions with same prefix)
  if (subdivisionMatch && subdivisionMatch.isGroup && subdivisionMatch.groupMembers) {
    return {
      type: "subdivision-group",
      value: subdivisionMatch.name,  // The pattern (e.g., "BDCC")
      confidence: subdivisionMatch.confidence,
      original: query,
      subdivisions: subdivisionMatch.groupMembers  // All matching subdivisions
    };
  }

  // Priority 3: Contains matches - prefer BETTER confidence scores
  // This handles cases like "beverly hills" where:
  //   - City match: "Beverly Hills" (confidence 0.92 - contains match)
  //   - Subdivision match: "Little Beverly Hills" (confidence 0.85 - word match)
  // We want the city match because it's higher confidence
  if (cityMatch && subdivisionMatch) {
    // Both found - use the one with higher confidence
    if (cityMatch.confidence > subdivisionMatch.confidence) {
      // City has better confidence
      return {
        type: "city",
        value: cityMatch.name,
        confidence: cityMatch.confidence,
        original: query
      };
    } else if (subdivisionMatch.confidence > cityMatch.confidence) {
      // Subdivision has better confidence
      return {
        type: "subdivision",
        value: subdivisionMatch.name,
        confidence: subdivisionMatch.confidence,
        original: query
      };
    } else {
      // Equal confidence - prefer longer/more specific match
      // Example: "little beverly hills" → "Little Beverly Hills" (subdivision) over "Beverly Hills" (city)
      const cityNameLength = cityMatch.name.length;
      const subdivisionNameLength = subdivisionMatch.name.length;

      if (subdivisionNameLength > cityNameLength) {
        // Subdivision is more specific
        return {
          type: "subdivision",
          value: subdivisionMatch.name,
          confidence: subdivisionMatch.confidence,
          original: query
        };
      } else {
        // City is same length or longer - prefer city
        return {
          type: "city",
          value: cityMatch.name,
          confidence: cityMatch.confidence,
          original: query
        };
      }
    }
  }

  // Priority 4: Single match (subdivision or city)
  if (subdivisionMatch) {
    return {
      type: "subdivision",
      value: subdivisionMatch.name,
      confidence: subdivisionMatch.confidence,
      original: query
    };
  }

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
 * NO LONGER NEEDED - LocationIndex is always fresh from database
 * Kept for backward compatibility
 */
export async function refreshEntityCache(): Promise<void> {
  console.log("[Entity Recognition] refreshEntityCache() called - no-op (LocationIndex is always fresh)");
  // No-op - LocationIndex queries are always fresh from database
}
