// src/lib/ai/nlp-to-mls.ts
// Natural Language Processing to MLS Filters Parser
// Converts conversational queries into structured MLS search parameters

export interface ParsedMLSQuery {
  // Location
  city?: string;
  cities?: string[];
  subdivision?: string;
  county?: string;
  near?: {
    lat: number;
    lng: number;
    radiusMiles: number;
  };

  // Price
  minPrice?: number;
  maxPrice?: number;

  // Property specs
  beds?: number;
  minBeds?: number;
  baths?: number;
  minBaths?: number;
  minLivingArea?: number;
  maxLivingArea?: number;

  // Property type
  propertyType?: string; // "A" = Residential, "B" = Lease, "C" = Multi-family
  propertySubType?: string[];

  // Amenities
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  garage?: boolean;

  // Financial
  maxHOA?: number;
  noHOA?: boolean;
  landLease?: boolean; // true = include, false = exclude

  // Sorting
  sort?: "price_low" | "price_high" | "newest" | "biggest" | "closest";

  // Metadata
  mlsSource?: "GPS" | "CRMLS" | "ALL";
  limit?: number;

  // Refinement context
  isRefinement?: boolean;
  refinementType?: "cheaper" | "bigger" | "closer" | "more_beds" | "add_amenity" | "remove_filter";

  // Preference-based AI intent
  intent?: "preference_recommendation" | "similar_listing" | "refinement" | "new_search";
  targetListingIndex?: number; // For "show me more like the first one"
  similarityMode?: "exact_match" | "flexible" | "budget_conscious";
}

/**
 * Known cities in Coachella Valley and surrounding areas
 */
const KNOWN_CITIES = [
  "Palm Springs",
  "Palm Desert",
  "Indian Wells",
  "Rancho Mirage",
  "La Quinta",
  "Cathedral City",
  "Indio",
  "Coachella",
  "Desert Hot Springs",
  "Thousand Palms",
  "Bermuda Dunes",
  "Temecula",
  "Murrieta",
  "Menifee",
  "San Jacinto",
  "Hemet",
  "Banning",
  "Beaumont"
];

/**
 * Property type mappings
 */
const PROPERTY_TYPE_MAP: Record<string, string> = {
  "house": "A",
  "single family": "A",
  "home": "A",
  "residential": "A",
  "rental": "B",
  "lease": "B",
  "multi-family": "C",
  "multifamily": "C",
  "duplex": "C",
  "triplex": "C",
  "fourplex": "C",
  "apartment": "C"
};

/**
 * Property subtype keywords
 */
const PROPERTY_SUBTYPE_KEYWORDS: Record<string, string> = {
  "condo": "Condominium",
  "condos": "Condominium",
  "condominium": "Condominium",
  "townhouse": "Townhouse",
  "townhome": "Townhouse",
  "manufactured": "Manufactured",
  "mobile home": "Manufactured",
  "single story": "Single Story",
  "two story": "Two Story",
  "ranch": "Ranch",
  "villa": "Villa"
};

/**
 * Refinement keywords
 */
const REFINEMENT_KEYWORDS = {
  cheaper: ["cheaper", "lower price", "less expensive", "more affordable", "under"],
  bigger: ["bigger", "larger", "more space", "more sqft", "more square feet"],
  closer: ["closer", "nearer", "nearby", "close to"],
  more_beds: ["more bedrooms", "extra bedroom", "more beds"],
  add_amenity: ["with pool", "add pool", "with spa", "add spa", "with view", "with garage"],
  remove_filter: ["remove", "without", "exclude", "no"]
};

/**
 * Preference-based intent keywords
 */
const PREFERENCE_INTENT_KEYWORDS = {
  similarity: [
    "more like this", "like the first", "like the second", "like the third",
    "similar to", "similar homes", "something like", "more like that",
    "like that one", "like this one", "comparable to"
  ],
  recommendation: [
    "what do you recommend", "what would you recommend", "help me pick",
    "what do you think", "what should i", "which one", "your recommendation",
    "best match", "best for me", "what's best", "show me what you think"
  ],
  more: [
    "show me more", "more homes", "more properties", "more options",
    "more listings", "see more", "other options"
  ]
};

/**
 * Detect preference-based intent from user query
 * Returns intent type and target listing index if applicable
 */
function detectPreferenceIntent(text: string): {
  intent?: "preference_recommendation" | "similar_listing" | "more_results";
  targetListingIndex?: number;
  similarityMode?: "exact_match" | "flexible" | "budget_conscious";
} {
  const lowerText = text.toLowerCase();

  // Check for similarity queries
  for (const phrase of PREFERENCE_INTENT_KEYWORDS.similarity) {
    if (lowerText.includes(phrase)) {
      // Try to extract listing index
      let targetIndex = 0; // Default to first

      if (lowerText.includes("first") || lowerText.includes("1st")) {
        targetIndex = 0;
      } else if (lowerText.includes("second") || lowerText.includes("2nd")) {
        targetIndex = 1;
      } else if (lowerText.includes("third") || lowerText.includes("3rd")) {
        targetIndex = 2;
      } else if (lowerText.includes("fourth") || lowerText.includes("4th")) {
        targetIndex = 3;
      } else if (lowerText.includes("fifth") || lowerText.includes("5th")) {
        targetIndex = 4;
      } else if (lowerText.includes("last")) {
        targetIndex = -1; // Special case: last listing
      }

      // Detect similarity mode
      let mode: "exact_match" | "flexible" | "budget_conscious" = "flexible";
      if (lowerText.includes("exact") || lowerText.includes("same")) {
        mode = "exact_match";
      } else if (lowerText.includes("cheaper") || lowerText.includes("budget")) {
        mode = "budget_conscious";
      }

      return {
        intent: "similar_listing",
        targetListingIndex: targetIndex,
        similarityMode: mode
      };
    }
  }

  // Check for recommendation queries
  for (const phrase of PREFERENCE_INTENT_KEYWORDS.recommendation) {
    if (lowerText.includes(phrase)) {
      return {
        intent: "preference_recommendation"
      };
    }
  }

  // Check for "show me more" queries
  for (const phrase of PREFERENCE_INTENT_KEYWORDS.more) {
    if (lowerText.includes(phrase)) {
      return {
        intent: "more_results"
      };
    }
  }

  return {};
}

/**
 * Parse natural language query into structured MLS filters
 */
export function parseNaturalLanguageQuery(
  text: string,
  previousQuery?: ParsedMLSQuery
): ParsedMLSQuery {
  const lowerText = text.toLowerCase();
  const query: ParsedMLSQuery = { mlsSource: "ALL", limit: 100 };

  // Detect preference-based intent first
  const preferenceIntent = detectPreferenceIntent(lowerText);
  if (preferenceIntent.intent) {
    query.intent = preferenceIntent.intent;
    query.targetListingIndex = preferenceIntent.targetListingIndex;
    query.similarityMode = preferenceIntent.similarityMode;

    // For similarity and recommendation queries, return early with minimal parsing
    if (preferenceIntent.intent === "similar_listing" || preferenceIntent.intent === "preference_recommendation") {
      return query;
    }
  }

  // Check if this is a refinement query
  const isRefinement = detectRefinement(lowerText);
  if (isRefinement && previousQuery) {
    query.isRefinement = true;
    query.refinementType = isRefinement;
    query.intent = "refinement";
    return applyRefinement(previousQuery, query, lowerText);
  }

  // Default intent for new searches
  if (!query.intent) {
    query.intent = "new_search";
  }

  // Extract cities
  const cities = extractCities(lowerText);
  if (cities.length === 1) {
    query.city = cities[0];
  } else if (cities.length > 1) {
    query.cities = cities;
  }

  // Extract price range
  const priceRange = extractPriceRange(lowerText);
  if (priceRange.min !== undefined) query.minPrice = priceRange.min;
  if (priceRange.max !== undefined) query.maxPrice = priceRange.max;

  // Extract beds/baths
  const beds = extractBeds(lowerText);
  if (beds !== undefined) {
    query.beds = beds;
    query.minBeds = beds;
  }

  const baths = extractBaths(lowerText);
  if (baths !== undefined) {
    query.baths = baths;
    query.minBaths = baths;
  }

  // Extract square footage
  const sqft = extractSquareFootage(lowerText);
  if (sqft.min !== undefined) query.minLivingArea = sqft.min;
  if (sqft.max !== undefined) query.maxLivingArea = sqft.max;

  // Extract property type
  const propertyType = extractPropertyType(lowerText);
  if (propertyType) query.propertyType = propertyType;

  // Extract property subtype
  const subtypes = extractPropertySubtypes(lowerText);
  if (subtypes.length > 0) query.propertySubType = subtypes;

  // Extract amenities
  if (lowerText.includes("pool")) query.pool = true;
  if (lowerText.includes("spa") || lowerText.includes("hot tub")) query.spa = true;
  if (lowerText.includes("view") || lowerText.includes("mountain view")) query.view = true;
  if (lowerText.includes("garage")) query.garage = true;

  // Extract HOA preferences
  const hoaPrefs = extractHOAPreferences(lowerText);
  if (hoaPrefs.noHOA) query.noHOA = true;
  if (hoaPrefs.maxHOA !== undefined) query.maxHOA = hoaPrefs.maxHOA;

  // Extract land lease preference
  if (lowerText.includes("no land lease") || lowerText.includes("avoid land lease") || lowerText.includes("fee simple")) {
    query.landLease = false;
  } else if (lowerText.includes("land lease ok") || lowerText.includes("include land lease")) {
    query.landLease = true;
  }

  // Extract sorting preference
  const sort = extractSortPreference(lowerText);
  if (sort) query.sort = sort;

  return query;
}

/**
 * Detect if query is a refinement
 */
function detectRefinement(text: string): ParsedMLSQuery["refinementType"] | null {
  for (const [type, keywords] of Object.entries(REFINEMENT_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return type as ParsedMLSQuery["refinementType"];
    }
  }
  return null;
}

/**
 * Apply refinement to previous query
 */
function applyRefinement(
  previous: ParsedMLSQuery,
  refinement: ParsedMLSQuery,
  text: string
): ParsedMLSQuery {
  const refined = { ...previous, ...refinement };

  switch (refinement.refinementType) {
    case "cheaper":
      if (previous.maxPrice) {
        refined.maxPrice = Math.round(previous.maxPrice * 0.8); // 20% cheaper
      } else if (previous.minPrice) {
        refined.maxPrice = previous.minPrice;
        delete refined.minPrice;
      }
      break;

    case "bigger":
      if (previous.minLivingArea) {
        refined.minLivingArea = Math.round(previous.minLivingArea * 1.2); // 20% bigger
      } else {
        refined.minLivingArea = 2000; // Default minimum
      }
      break;

    case "closer":
      // Would need geocoding - for now, just note the refinement
      break;

    case "more_beds":
      refined.beds = (previous.beds || 2) + 1;
      refined.minBeds = refined.beds;
      break;

    case "add_amenity":
      if (text.includes("pool")) refined.pool = true;
      if (text.includes("spa")) refined.spa = true;
      if (text.includes("view")) refined.view = true;
      if (text.includes("garage")) refined.garage = true;
      break;

    case "remove_filter":
      // Parse what to remove
      if (text.includes("pool")) delete refined.pool;
      if (text.includes("spa")) delete refined.spa;
      if (text.includes("hoa")) {
        delete refined.maxHOA;
        delete refined.noHOA;
      }
      break;
  }

  return refined;
}

/**
 * Extract cities from text
 */
function extractCities(text: string): string[] {
  return KNOWN_CITIES.filter(city => {
    const cityLower = city.toLowerCase();
    return text.includes(cityLower);
  });
}

/**
 * Extract price range from text
 */
function extractPriceRange(text: string): { min?: number; max?: number } {
  const range: { min?: number; max?: number } = {};

  // Pattern: "under $X" or "below $X"
  const underMatch = text.match(/(?:under|below|max|up to)\s*\$?([\d,]+)k?/i);
  if (underMatch) {
    let price = parseFloat(underMatch[1].replace(/,/g, ""));
    if (text.includes("k") || price < 10000) {
      price *= 1000;
    }
    range.max = price;
  }

  // Pattern: "over $X" or "above $X"
  const overMatch = text.match(/(?:over|above|min|at least)\s*\$?([\d,]+)k?/i);
  if (overMatch) {
    let price = parseFloat(overMatch[1].replace(/,/g, ""));
    if (text.includes("k") || price < 10000) {
      price *= 1000;
    }
    range.min = price;
  }

  // Pattern: "$X to $Y" or "$X-$Y"
  const rangeMatch = text.match(/\$?([\d,]+)k?\s*(?:to|-)\s*\$?([\d,]+)k?/i);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ""));
    let max = parseFloat(rangeMatch[2].replace(/,/g, ""));
    if (text.includes("k") || min < 10000) {
      min *= 1000;
      max *= 1000;
    }
    range.min = min;
    range.max = max;
  }

  return range;
}

/**
 * Extract bedroom count
 */
function extractBeds(text: string): number | undefined {
  // Pattern: "3 bed", "3 bedroom", "3-bed", "3br"
  const match = text.match(/(\d+)\s*(?:bed(?:room)?s?|br)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Pattern: "three bedroom"
  const wordNumbers: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8
  };

  for (const [word, num] of Object.entries(wordNumbers)) {
    if (text.includes(`${word} bed`)) {
      return num;
    }
  }

  return undefined;
}

/**
 * Extract bathroom count
 */
function extractBaths(text: string): number | undefined {
  // Pattern: "2 bath", "2.5 bath", "2 bathroom"
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|ba)/i);
  if (match) {
    return parseFloat(match[1]);
  }

  return undefined;
}

/**
 * Extract square footage
 */
function extractSquareFootage(text: string): { min?: number; max?: number } {
  const range: { min?: number; max?: number } = {};

  // Pattern: "over 2000 sqft"
  const overMatch = text.match(/(?:over|above|at least)\s*([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)/i);
  if (overMatch) {
    range.min = parseInt(overMatch[1].replace(/,/g, ""), 10);
  }

  // Pattern: "under 3000 sqft"
  const underMatch = text.match(/(?:under|below|max)\s*([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)/i);
  if (underMatch) {
    range.max = parseInt(underMatch[1].replace(/,/g, ""), 10);
  }

  return range;
}

/**
 * Extract property type
 */
function extractPropertyType(text: string): string | undefined {
  for (const [keyword, code] of Object.entries(PROPERTY_TYPE_MAP)) {
    if (text.includes(keyword)) {
      return code;
    }
  }
  return undefined;
}

/**
 * Extract property subtypes
 */
function extractPropertySubtypes(text: string): string[] {
  const subtypes: string[] = [];

  for (const [keyword, subtype] of Object.entries(PROPERTY_SUBTYPE_KEYWORDS)) {
    if (text.includes(keyword)) {
      subtypes.push(subtype);
    }
  }

  return subtypes;
}

/**
 * Extract HOA preferences
 */
function extractHOAPreferences(text: string): { noHOA?: boolean; maxHOA?: number } {
  const prefs: { noHOA?: boolean; maxHOA?: number } = {};

  // No HOA
  if (text.includes("no hoa") || text.includes("without hoa") || text.includes("avoid hoa")) {
    prefs.noHOA = true;
  }

  // Max HOA amount
  const maxMatch = text.match(/hoa\s*(?:under|below|max|up to)\s*\$?([\d,]+)/i);
  if (maxMatch) {
    prefs.maxHOA = parseInt(maxMatch[1].replace(/,/g, ""), 10);
  }

  return prefs;
}

/**
 * Extract sorting preference
 */
function extractSortPreference(text: string): ParsedMLSQuery["sort"] | undefined {
  if (text.includes("cheapest") || text.includes("lowest price")) {
    return "price_low";
  }
  if (text.includes("most expensive") || text.includes("highest price")) {
    return "price_high";
  }
  if (text.includes("newest") || text.includes("recently listed")) {
    return "newest";
  }
  if (text.includes("biggest") || text.includes("largest")) {
    return "biggest";
  }
  if (text.includes("closest") || text.includes("nearest")) {
    return "closest";
  }

  return undefined;
}

/**
 * Convert ParsedMLSQuery to MapFilters for /api/map/query
 */
export function mlsQueryToMapFilters(query: ParsedMLSQuery): any {
  const filters: any = {};

  // Price
  if (query.minPrice !== undefined) filters.minPrice = query.minPrice;
  if (query.maxPrice !== undefined) filters.maxPrice = query.maxPrice;

  // Beds/Baths
  if (query.beds !== undefined) filters.beds = query.beds;
  if (query.minBeds !== undefined) filters.beds = query.minBeds;
  if (query.baths !== undefined) filters.baths = query.baths;
  if (query.minBaths !== undefined) filters.baths = query.minBaths;

  // Property type
  if (query.propertyType) filters.propertyType = query.propertyType;
  if (query.propertySubType && query.propertySubType.length > 0) {
    filters.propertySubType = query.propertySubType[0]; // API takes single value
  }

  // Amenities
  if (query.pool) filters.poolYn = true;
  if (query.spa) filters.spaYn = true;

  // HOA
  if (query.noHOA) filters.noHOA = true;
  if (query.maxHOA !== undefined) filters.maxHOA = query.maxHOA;

  // Living area
  if (query.minLivingArea !== undefined) filters.minLivingArea = query.minLivingArea;

  // MLS source
  if (query.mlsSource) filters.mlsSource = query.mlsSource;

  return filters;
}

/**
 * Format ParsedMLSQuery as human-readable summary
 */
export function formatQuerySummary(query: ParsedMLSQuery): string {
  const parts: string[] = [];

  if (query.beds) parts.push(`${query.beds}+ beds`);
  if (query.baths) parts.push(`${query.baths}+ baths`);

  if (query.minPrice && query.maxPrice) {
    parts.push(`$${(query.minPrice / 1000).toFixed(0)}K-$${(query.maxPrice / 1000).toFixed(0)}K`);
  } else if (query.maxPrice) {
    parts.push(`under $${(query.maxPrice / 1000).toFixed(0)}K`);
  } else if (query.minPrice) {
    parts.push(`over $${(query.minPrice / 1000).toFixed(0)}K`);
  }

  if (query.pool) parts.push("pool");
  if (query.spa) parts.push("spa");
  if (query.noHOA) parts.push("no HOA");
  if (query.maxHOA) parts.push(`HOA under $${query.maxHOA}`);

  if (query.city) parts.push(`in ${query.city}`);
  if (query.cities && query.cities.length > 0) parts.push(`in ${query.cities.join(", ")}`);

  return parts.join(" • ");
}
