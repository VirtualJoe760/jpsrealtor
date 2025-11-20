// src/lib/location-matcher.ts
// Intelligent location matching - determines if user is asking about county, city, or subdivision

import { soCalCounties } from "@/app/constants/counties";

export interface LocationMatch {
  type: 'county' | 'city' | 'subdivision';
  name: string;
  confidence: number;
  data?: any;
  city?: string; // For subdivisions - which city they're in
}

export interface DisambiguationResult {
  needsDisambiguation: boolean;
  matches: Array<{
    name: string;
    city: string;
    slug: string;
    listingCount?: number;
    type: 'subdivision' | 'city' | 'county';
  }>;
  singleMatch?: LocationMatch;
}

/**
 * Intelligently match a location query to county, city, or subdivision
 * Uses process of elimination to find the best match
 * Priority: Subdivisions (most specific) → Cities → Counties (least specific)
 */
export async function matchLocation(query: string): Promise<LocationMatch | null> {
  const normalizedQuery = query.toLowerCase().trim();

  console.log('🔍 Matching location query:', query);

  // Step 1: Check subdivisions FIRST (most specific)
  // This ensures "Palm Desert Country Club" matches the subdivision, not the city "Palm Desert"
  const subdivisionMatch = await matchSubdivision(normalizedQuery);
  if (subdivisionMatch) {
    console.log('✅ Matched to SUBDIVISION:', subdivisionMatch.name);
    return subdivisionMatch;
  }

  // Step 2: Check cities (mid level)
  const cityMatch = matchCity(normalizedQuery);
  if (cityMatch) {
    console.log('✅ Matched to CITY:', cityMatch.name);
    return cityMatch;
  }

  // Step 3: Check counties last (least specific)
  const countyMatch = matchCounty(normalizedQuery);
  if (countyMatch) {
    console.log('✅ Matched to COUNTY:', countyMatch.name);
    return countyMatch;
  }

  console.warn('⚠️ No location match found for:', query);
  return null;
}

/**
 * Match against county names
 */
function matchCounty(query: string): LocationMatch | null {
  for (const county of soCalCounties) {
    const countyName = county.name.toLowerCase();

    // Exact match
    if (query === countyName) {
      return {
        type: 'county',
        name: county.name,
        confidence: 1.0,
        data: county
      };
    }

    // Partial match (e.g., "riverside" matches "Riverside County")
    if (countyName.includes(query) || query.includes(countyName.replace(' county', ''))) {
      return {
        type: 'county',
        name: county.name,
        confidence: 0.8,
        data: county
      };
    }
  }

  return null;
}

/**
 * Match against city names
 */
function matchCity(query: string): LocationMatch | null {
  for (const county of soCalCounties) {
    for (const city of county.cities) {
      const cityName = city.name.toLowerCase();

      // Exact match
      if (query === cityName) {
        return {
          type: 'city',
          name: city.name,
          confidence: 1.0,
          data: { city, county }
        };
      }

      // Partial match
      if (cityName.includes(query) || query.includes(cityName)) {
        return {
          type: 'city',
          name: city.name,
          confidence: 0.8,
          data: { city, county }
        };
      }
    }
  }

  return null;
}

/**
 * Match against subdivision names from database
 * This queries the API to find subdivisions
 * Returns best match with confidence, or null if no good matches
 */
async function matchSubdivision(query: string): Promise<LocationMatch | null> {
  try {
    // Search subdivisions API with the query
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    // Try multiple search variations to handle spacing issues and word variations
    // e.g., "big horn country club" → try "bighorn", "big horn", "bighorn golf club"
    const baseQuery = query.toLowerCase().trim();
    const searchVariations = [
      query,  // Original
      baseQuery.replace(/\s+/g, ''), // Remove all spaces: "big horn" → "bighorn"
      baseQuery.replace(/\s+/g, ' '), // Normalize spaces
      // Try without "country club" or "golf club" suffix
      baseQuery.replace(/\b(country club|golf club|estates|community|the)\b/g, '').trim(),
      // Try with spaces removed from base name only
      baseQuery.replace(/\b(country club|golf club|estates|community|the)\b/g, '').replace(/\s+/g, '').trim(),
    ];

    let allSubdivisions: any[] = [];

    // Search with all variations and combine results
    for (const searchQuery of [...new Set(searchVariations)]) {
      const response = await fetch(`${baseUrl}/api/subdivisions?search=${encodeURIComponent(searchQuery)}&limit=10`);

      if (response.ok) {
        const data = await response.json();
        if (data.subdivisions && data.subdivisions.length > 0) {
          allSubdivisions.push(...data.subdivisions);
        }
      }
    }

    // Remove duplicates by ID
    const uniqueSubdivisions = Array.from(
      new Map(allSubdivisions.map(sub => [sub._id || sub.slug, sub])).values()
    );

    if (uniqueSubdivisions.length === 0) {
      return null;
    }

    // Score all matches and find best one
    const scoredMatches = uniqueSubdivisions.map((subdivision: any) => {
      const subdivisionName = subdivision.name.toLowerCase();
      const queryLower = query.toLowerCase();

      // Remove common words for better matching
      const cleanQuery = queryLower
        .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
        .trim();
      const cleanSubdivision = subdivisionName
        .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
        .trim();

      let confidence = 0;

      // Exact match (after cleaning)
      if (cleanSubdivision === cleanQuery) {
        confidence = 1.0;
      }
      // Exact match (original)
      else if (subdivisionName === queryLower) {
        confidence = 0.95;
      }
      // Subdivision name starts with query
      else if (subdivisionName.startsWith(queryLower)) {
        confidence = 0.9;
      }
      // Query starts with subdivision name
      else if (queryLower.startsWith(subdivisionName)) {
        confidence = 0.85;
      }
      // Clean versions match
      else if (cleanSubdivision.includes(cleanQuery) || cleanQuery.includes(cleanSubdivision)) {
        confidence = 0.8;
      }
      // Subdivision contains query
      else if (subdivisionName.includes(queryLower)) {
        confidence = 0.7;
      }
      // Query contains subdivision
      else if (queryLower.includes(subdivisionName)) {
        confidence = 0.65;
      }
      // Word overlap (count matching words)
      else {
        const queryWords = cleanQuery.split(/\s+/);
        const subdivisionWords = cleanSubdivision.split(/\s+/);
        const matchingWords = queryWords.filter(word =>
          subdivisionWords.some((sw: string) => sw.includes(word) || word.includes(sw))
        );

        if (matchingWords.length > 0) {
          confidence = 0.5 + (matchingWords.length / Math.max(queryWords.length, subdivisionWords.length)) * 0.3;
        }
      }

      return {
        subdivision,
        confidence,
        cleanQuery,
        cleanSubdivision
      };
    });

    // Sort by confidence (highest first)
    scoredMatches.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = scoredMatches[0];

    // Check if we have any matches
    if (!bestMatch) {
      return null;
    }

    // Only return if confidence is reasonable (>0.4)
    if (bestMatch.confidence < 0.4) {
      console.log(`🏘️ Low confidence match for "${query}": "${bestMatch.subdivision.name}" (${bestMatch.confidence.toFixed(2)})`);
      return null;
    }

    console.log(`🏘️ Found subdivision match: "${bestMatch.subdivision.name}" (confidence: ${bestMatch.confidence.toFixed(2)})`);
    console.log(`   Query: "${query}" → Cleaned: "${bestMatch.cleanQuery}"`);
    console.log(`   Match: "${bestMatch.subdivision.name}" → Cleaned: "${bestMatch.cleanSubdivision}"`);

    return {
      type: 'subdivision',
      name: bestMatch.subdivision.name,
      confidence: bestMatch.confidence,
      data: bestMatch.subdivision
    };
  } catch (error) {
    console.error('Error matching subdivision:', error);
    return null;
  }
}

/**
 * Get multiple potential matches and rank them
 */
export async function findPotentialMatches(query: string): Promise<LocationMatch[]> {
  const matches: LocationMatch[] = [];

  // Check all types
  const countyMatch = matchCounty(query);
  if (countyMatch) matches.push(countyMatch);

  const cityMatch = matchCity(query);
  if (cityMatch) matches.push(cityMatch);

  const subdivisionMatch = await matchSubdivision(query);
  if (subdivisionMatch) matches.push(subdivisionMatch);

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

/**
 * Convert location match to search parameters
 */
export function locationToSearchParams(match: LocationMatch): any {
  const params: any = {};

  switch (match.type) {
    case 'county':
      // Get all cities in the county
      const county = match.data;
      params.cities = county.cities.map((c: any) => c.name);
      params.limit = 100; // Limit county searches to 100
      break;

    case 'city':
      params.cities = [match.name];
      // No limit for city searches
      break;

    case 'subdivision':
      params.subdivisions = [match.name];
      params.city = match.city; // Include city for context
      // No limit for subdivision searches
      break;
  }

  return params;
}

/**
 * Search for subdivisions with disambiguation support
 * Returns multiple matches if ambiguous, single match if clear
 */
export async function searchSubdivisionsWithDisambiguation(query: string): Promise<DisambiguationResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

    // Search subdivisions API
    const response = await fetch(`${baseUrl}/api/subdivisions?search=${encodeURIComponent(query)}&limit=10`);

    if (!response.ok) {
      return { needsDisambiguation: false, matches: [] };
    }

    const data = await response.json();
    const subdivisions = data.subdivisions || [];

    if (subdivisions.length === 0) {
      return { needsDisambiguation: false, matches: [] };
    }

    // Score matches by relevance
    const scoredMatches = subdivisions.map((sub: any) => {
      const subdivisionName = sub.name.toLowerCase();
      const queryLower = query.toLowerCase();

      // Remove common words for better matching
      const cleanQuery = queryLower
        .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
        .trim();
      const cleanSubdivision = subdivisionName
        .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
        .trim();

      let confidence = 0;

      // Exact match (after cleaning)
      if (cleanSubdivision === cleanQuery) {
        confidence = 1.0;
      }
      // Exact match (original)
      else if (subdivisionName === queryLower) {
        confidence = 0.95;
      }
      // Subdivision name starts with query
      else if (subdivisionName.startsWith(queryLower)) {
        confidence = 0.9;
      }
      // Contains match
      else if (subdivisionName.includes(queryLower) || cleanSubdivision.includes(cleanQuery)) {
        confidence = 0.7;
      }
      else {
        confidence = 0.4;
      }

      return {
        ...sub,
        confidence
      };
    });

    // Filter for reasonable confidence (>0.5)
    const goodMatches = scoredMatches.filter((m: any) => m.confidence > 0.5);

    if (goodMatches.length === 0) {
      return { needsDisambiguation: false, matches: [] };
    }

    // Sort by confidence
    goodMatches.sort((a: any, b: any) => b.confidence - a.confidence);

    // Check if top matches have similar confidence (ambiguous)
    const topMatch = goodMatches[0];
    const ambiguousMatches = goodMatches.filter((m: any) =>
      m.confidence >= topMatch.confidence * 0.9 && // Within 10% of top confidence
      m.name !== topMatch.name // Different subdivisions
    );

    // If we have multiple good matches with similar confidence, need disambiguation
    if (ambiguousMatches.length > 1) {
      console.log(`🤔 Ambiguous query "${query}" - found ${ambiguousMatches.length} matches`);

      return {
        needsDisambiguation: true,
        matches: ambiguousMatches.map((sub: any) => ({
          name: sub.name,
          city: sub.city,
          slug: sub.slug,
          listingCount: sub.listingCount,
          type: 'subdivision' as const
        }))
      };
    }

    // Clear single match
    console.log(`✅ Clear match for "${query}": ${topMatch.name} (${topMatch.city})`);

    return {
      needsDisambiguation: false,
      matches: [],
      singleMatch: {
        type: 'subdivision',
        name: topMatch.name,
        city: topMatch.city,
        confidence: topMatch.confidence,
        data: topMatch
      }
    };

  } catch (error) {
    console.error('Error in subdivision disambiguation:', error);
    return { needsDisambiguation: false, matches: [] };
  }
}
