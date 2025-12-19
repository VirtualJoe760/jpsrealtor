// src/lib/chat/utils/subdivision-data.ts
// Fetch subdivision/community data for AI queries

import Subdivision from "@/models/subdivisions";
import UnifiedListing from "@/models/unified-listing";
import connectToDatabase from "@/lib/mongodb";

export interface SubdivisionDataResult {
  found: boolean;
  subdivision?: {
    name: string;
    city: string;
    county: string;
    description?: string;
    listingCount?: number;
    priceRange?: { min: number; max: number };
    avgPrice?: number;
    medianPrice?: number;
    features?: string[];

    // Community Facts
    communityType?: string;
    hoaMonthlyMin?: number;
    hoaMonthlyMax?: number;
    hoaIncludes?: string;
    shortTermRentalsAllowed?: "yes-unrestricted" | "yes-limited" | "no-hoa" | "no-city" | "unknown";
    shortTermRentalDetails?: string;
    minimumLeaseLength?: string;
    golfCourses?: number;
    golfCoursesNames?: string;
    tennisCourts?: number;
    pools?: number;
    restaurantNames?: string;
    securityType?: string;
    seniorCommunity?: boolean;
  };
  error?: string;
}

/**
 * Get subdivision/community data by name
 *
 * @param subdivisionName - Subdivision name (can be normalized or original)
 * @param fields - Optional array of specific fields to return
 * @returns Subdivision data or error
 *
 * @example
 * const data = await getSubdivisionData("Palm Desert Country Club");
 * if (data.found) {
 *   console.log(data.subdivision.shortTermRentalsAllowed);
 * }
 */
export async function getSubdivisionData(
  subdivisionName: string,
  fields?: string[]
): Promise<SubdivisionDataResult> {
  try {
    await connectToDatabase();

    // Normalize the name for search
    const normalized = subdivisionName.toLowerCase().trim();

    // Search by normalized name or original name
    const subdivision = await Subdivision.findOne({
      $or: [
        { normalizedName: normalized },
        { name: { $regex: new RegExp(`^${subdivisionName}$`, 'i') } }
      ]
    }).lean();

    if (!subdivision) {
      return {
        found: false,
        error: `Subdivision "${subdivisionName}" not found in database`
      };
    }

    // Build result object with requested fields (or all fields)
    const result: SubdivisionDataResult = {
      found: true,
      subdivision: {
        name: subdivision.name,
        city: subdivision.city,
        county: subdivision.county,
        description: subdivision.description,
        listingCount: subdivision.listingCount,
        priceRange: subdivision.priceRange,
        avgPrice: subdivision.avgPrice,
        medianPrice: subdivision.medianPrice,
        features: subdivision.features,

        // Community facts
        communityType: subdivision.communityFacts?.communityType,
        hoaMonthlyMin: subdivision.communityFacts?.hoaMonthlyMin,
        hoaMonthlyMax: subdivision.communityFacts?.hoaMonthlyMax,
        hoaIncludes: subdivision.communityFacts?.hoaIncludes,
        shortTermRentalsAllowed: subdivision.communityFacts?.shortTermRentalsAllowed,
        shortTermRentalDetails: subdivision.communityFacts?.shortTermRentalDetails,
        minimumLeaseLength: subdivision.communityFacts?.minimumLeaseLength,
        golfCourses: subdivision.communityFacts?.golfCourses,
        golfCoursesNames: subdivision.communityFacts?.golfCoursesNames,
        tennisCourts: subdivision.communityFacts?.tennisCourts,
        pools: subdivision.communityFacts?.pools,
        restaurantNames: subdivision.communityFacts?.restaurantNames,
        securityType: subdivision.communityFacts?.securityType,
        seniorCommunity: subdivision.seniorCommunity,
      }
    };

    return result;
  } catch (error: any) {
    console.error("[subdivision-data] Error fetching subdivision:", error);
    return {
      found: false,
      error: error.message || "Failed to fetch subdivision data"
    };
  }
}

/**
 * Check if short-term rentals are allowed in a subdivision
 *
 * Strategy:
 * 1. Check subdivision model's shortTermRentalsAllowed field
 * 2. If "unknown", check nearby listings for STR data
 * 3. If still inconclusive, return "unknown" with advice to check city/county
 *
 * @param subdivisionName - Subdivision name
 * @returns STR status and details
 */
export async function checkShortTermRentals(subdivisionName: string): Promise<{
  allowed: "yes-unrestricted" | "yes-limited" | "no-hoa" | "no-city" | "unknown" | "inconclusive";
  details?: string;
  source: "subdivision-model" | "nearby-listings" | "inconclusive";
  confidence: "high" | "medium" | "low";
}> {
  try {
    // STEP 1: Check subdivision model
    const subdivisionData = await getSubdivisionData(subdivisionName);

    if (subdivisionData.found && subdivisionData.subdivision?.shortTermRentalsAllowed) {
      const status = subdivisionData.subdivision.shortTermRentalsAllowed;

      // If we have definitive data from subdivision model
      if (status !== "unknown") {
        return {
          allowed: status,
          details: subdivisionData.subdivision.shortTermRentalDetails,
          source: "subdivision-model",
          confidence: "high"
        };
      }
    }

    // STEP 2: Fallback - Check nearby listings for STR data
    await connectToDatabase();

    // NOTE: UnifiedListing model doesn't have shortTermRentalsAllowed field
    // This fallback strategy won't work with current schema
    // Listings don't contain STR data - it's only at subdivision/city level

    // STEP 3: Inconclusive - not enough data
    return {
      allowed: "inconclusive",
      details: `Limited data available for ${subdivisionName}. Many listings (especially non-GPS MLS) don't include STR information.`,
      source: "inconclusive",
      confidence: "low"
    };

  } catch (error: any) {
    console.error("[subdivision-data] Error checking STR:", error);
    return {
      allowed: "inconclusive",
      details: "Error checking short-term rental status",
      source: "inconclusive",
      confidence: "low"
    };
  }
}

/**
 * Helper: Get most common value from array
 */
function getMostCommonValue(arr: any[]): any {
  const counts: Record<string, number> = {};
  arr.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
  });

  let maxCount = 0;
  let mostCommon = arr[0];

  Object.entries(counts).forEach(([val, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = val;
    }
  });

  return mostCommon;
}
