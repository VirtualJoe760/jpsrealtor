// src/lib/chat/utils/entity-recognition.ts
// Entity recognition: Detect what type of entity the user is asking about

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
 * Known subdivisions in our database
 * TODO: Load this dynamically from database in future
 */
const KNOWN_SUBDIVISIONS = [
  // Abbreviations and full names
  { abbrev: "pdcc", full: "Palm Desert Country Club" },
  { abbrev: "pga west", full: "PGA West" },
  { abbrev: "pga", full: "PGA West" },
  { abbrev: "trilogy", full: "Trilogy at La Quinta" },
  { abbrev: "indian wells cc", full: "Indian Wells Country Club" },
  { abbrev: "vintage", full: "The Vintage Club" },
  { abbrev: "vintage club", full: "The Vintage Club" },
  { abbrev: "hideaway", full: "Hideaway" },
  { abbrev: "mesa", full: "The Mesa" },
  { abbrev: "quarry", full: "The Quarry at La Quinta" },
  { abbrev: "citrus", full: "Citrus" },
  { abbrev: "madison", full: "Madison Club" },
  { abbrev: "eldorado", full: "Eldorado Country Club" },
  { abbrev: "bighorn", full: "Bighorn Golf Club" },
  { abbrev: "toscana", full: "Toscana Country Club" },
  { abbrev: "la quinta cc", full: "La Quinta Country Club" },
  { abbrev: "lqcc", full: "La Quinta Country Club" },
  { abbrev: "mountain view cc", full: "Mountain View Country Club" },
  { abbrev: "ironwood", full: "Ironwood Country Club" },
  { abbrev: "desert falls", full: "Desert Falls Country Club" },
  { abbrev: "westin", full: "The Westin Mission Hills" },
  { abbrev: "mission hills cc", full: "Mission Hills Country Club" },
];

/**
 * Known cities in our service area
 */
const KNOWN_CITIES = [
  "palm desert",
  "la quinta",
  "indian wells",
  "rancho mirage",
  "palm springs",
  "cathedral city",
  "desert hot springs",
  "coachella",
  "indio",
  "thousand palms",
  "bermuda dunes",
  "thermal",
  "mecca",
];

/**
 * Known counties
 */
const KNOWN_COUNTIES = [
  "riverside county",
  "riverside",
];

/**
 * Known regions
 */
const KNOWN_REGIONS = [
  "coachella valley",
  "desert cities",
  "low desert",
];

/**
 * Address pattern: Matches "123 Main St", "82223 Vandenberg", etc.
 * Pattern: starts with digits, followed by street name
 */
const ADDRESS_PATTERN = /^\d+\s+[a-z]/i;

/**
 * Identify what type of entity the user is asking about
 *
 * @param query - User's query text
 * @returns Entity type, normalized value, and confidence
 *
 * @example
 * identifyEntityType("Does PDCC allow short term rentals?")
 * // => { type: "subdivision", value: "Palm Desert Country Club", confidence: 0.95 }
 *
 * identifyEntityType("What's the HOA fee for 82223 Vandenberg?")
 * // => { type: "listing", value: "82223 Vandenberg", confidence: 0.98 }
 *
 * identifyEntityType("Tell me about Palm Desert")
 * // => { type: "city", value: "Palm Desert", confidence: 0.90 }
 */
export function identifyEntityType(query: string): EntityRecognitionResult {
  const lowerQuery = query.toLowerCase();

  // STEP 1: Check for address patterns (highest priority)
  // Pattern: "82223 Vandenberg", "123 Main St"
  // Match: number + street name + optional suffix (stop at suffix)
  const addressMatch = lowerQuery.match(/\b(\d+\s+[a-z][a-z0-9\s]*?(?:\s+(?:street|st|drive|dr|avenue|ave|road|rd|lane|ln|way|circle|cir|court|ct|boulevard|blvd))?)\b(?=\s|$|,|\?|!)/i);
  if (addressMatch) {
    return {
      type: "listing",
      value: addressMatch[1].trim(),
      confidence: 0.98,
      original: query
    };
  }

  // STEP 2: Check for known subdivisions (fuzzy matching)
  for (const sub of KNOWN_SUBDIVISIONS) {
    // Check abbreviation
    if (lowerQuery.includes(sub.abbrev.toLowerCase())) {
      return {
        type: "subdivision",
        value: sub.full,
        confidence: 0.95,
        original: query
      };
    }

    // Check full name (case-insensitive)
    if (lowerQuery.includes(sub.full.toLowerCase())) {
      return {
        type: "subdivision",
        value: sub.full,
        confidence: 0.98,
        original: query
      };
    }
  }

  // STEP 3: Check for known cities
  for (const city of KNOWN_CITIES) {
    if (lowerQuery.includes(city.toLowerCase())) {
      return {
        type: "city",
        value: city,
        confidence: 0.90,
        original: query
      };
    }
  }

  // STEP 4: Check for known counties
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

  // STEP 5: Check for known regions
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

  // STEP 6: Default to general query
  return {
    type: "general",
    value: query,
    confidence: 0.50,
    original: query
  };
}

/**
 * Extract subdivision name from query
 * Used when we know it's a subdivision query but need the normalized name
 */
export function extractSubdivisionName(query: string): string | null {
  const result = identifyEntityType(query);
  return result.type === "subdivision" ? result.value : null;
}

/**
 * Extract listing address from query
 * Used when we know it's a listing query but need the normalized address
 */
export function extractListingAddress(query: string): string | null {
  const result = identifyEntityType(query);
  return result.type === "listing" ? result.value : null;
}

/**
 * Extract city name from query
 * Used when we know it's a city query but need the normalized name
 */
export function extractCityName(query: string): string | null {
  const result = identifyEntityType(query);
  return result.type === "city" ? result.value : null;
}
