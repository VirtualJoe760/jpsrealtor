// AI-Auto CMA - Intelligent comparable property finder
import { Listing } from "@/app/components/chat/ListingCarousel";

export interface ComparableCriteria {
  targetProperty: Listing;
  allListings: Listing[];
  maxRadius?: number; // miles, default 1
  maxResults?: number; // default 10
}

export interface ComparableScore {
  listing: Listing;
  score: number;
  reasons: string[];
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if listing has pool (based on property type or other indicators)
 */
function hasPool(listing: Listing): boolean {
  // Check if type mentions pool or if it's in the listing data
  const type = (listing.type || "").toLowerCase();
  return type.includes("pool");
}

/**
 * Find comparable properties using intelligent matching criteria
 */
export function findComparableProperties(
  criteria: ComparableCriteria
): Listing[] {
  const {
    targetProperty,
    allListings,
    maxRadius = 1,
    maxResults = 10,
  } = criteria;

  // If no coordinates, just match on beds/baths/sqft
  const hasCoordinates =
    targetProperty.latitude &&
    targetProperty.longitude &&
    !isNaN(targetProperty.latitude) &&
    !isNaN(targetProperty.longitude);

  // Filter and score candidates
  const scoredListings: ComparableScore[] = allListings
    .filter((listing) => {
      // Don't include the target property itself
      if (listing.id === targetProperty.id) return false;

      // Must have valid price and sqft
      if (!listing.price || listing.price <= 0) return false;
      if (!listing.sqft || listing.sqft <= 0) return false;

      // Check radius if coordinates available
      if (hasCoordinates) {
        if (
          !listing.latitude ||
          !listing.longitude ||
          isNaN(listing.latitude) ||
          isNaN(listing.longitude)
        ) {
          return false;
        }

        const distance = calculateDistance(
          targetProperty.latitude!,
          targetProperty.longitude!,
          listing.latitude,
          listing.longitude
        );

        if (distance > maxRadius) return false;
      }

      return true;
    })
    .map((listing) => {
      let score = 100; // Start with perfect score
      const reasons: string[] = [];

      // Bed/Bath matching (strict)
      const bedDiff = Math.abs(listing.beds - targetProperty.beds);
      const bathDiff = Math.abs(listing.baths - targetProperty.baths);

      if (bedDiff === 0 && bathDiff === 0) {
        score += 50; // Exact bed/bath match is very important
        reasons.push("Exact bed/bath match");
      } else if (bedDiff <= 1 && bathDiff <= 1) {
        score += 20; // Close match
        reasons.push("Similar bed/bath");
      } else {
        score -= bedDiff * 15 + bathDiff * 15; // Penalize differences
      }

      // SqFt matching (±200 sqft tolerance)
      const sqftDiff = Math.abs(listing.sqft - targetProperty.sqft);
      if (sqftDiff <= 200) {
        score += 30;
        reasons.push("Similar square footage");
      } else if (sqftDiff <= 500) {
        score += 10;
      } else {
        score -= (sqftDiff - 200) * 0.02; // Penalize larger differences
      }

      // Subdivision match (if same subdivision, bonus points)
      if (
        listing.subdivision &&
        targetProperty.subdivision &&
        listing.subdivision.toLowerCase() ===
          targetProperty.subdivision.toLowerCase()
      ) {
        score += 40;
        reasons.push("Same subdivision");
      }

      // Pool matching (if target has pool, prioritize pool properties)
      const targetHasPool = hasPool(targetProperty);
      const listingHasPool = hasPool(listing);
      if (targetHasPool && listingHasPool) {
        score += 25;
        reasons.push("Has pool");
      } else if (!targetHasPool && !listingHasPool) {
        score += 10; // Both no pool is also good
      }

      // Price similarity (±20%)
      const priceDiff =
        Math.abs(listing.price - targetProperty.price) / targetProperty.price;
      if (priceDiff <= 0.1) {
        score += 20;
        reasons.push("Similar price");
      } else if (priceDiff <= 0.2) {
        score += 10;
      } else {
        score -= priceDiff * 50; // Penalize large price differences
      }

      // Distance bonus (if coordinates available)
      if (hasCoordinates && listing.latitude && listing.longitude) {
        const distance = calculateDistance(
          targetProperty.latitude!,
          targetProperty.longitude!,
          listing.latitude,
          listing.longitude
        );
        // Closer is better
        const distanceScore = Math.max(0, 20 - distance * 20);
        score += distanceScore;
        if (distance < 0.25) {
          reasons.push("Very close proximity");
        }
      }

      return {
        listing,
        score,
        reasons,
      };
    })
    .filter((item) => item.score > 0) // Only keep positive scores
    .sort((a, b) => b.score - a.score); // Sort by score descending

  // Return top matches
  return scoredListings.slice(0, maxResults).map((item) => item.listing);
}

/**
 * Generate AI-Auto CMA - finds comparables and generates CMA automatically
 */
export function generateAutoComparableCMA(
  targetProperty: Listing,
  allListings: Listing[],
  options?: {
    maxRadius?: number;
    maxResults?: number;
  }
): {
  comparables: Listing[];
  targetProperty: Listing;
  criteria: string[];
} {
  const comparables = findComparableProperties({
    targetProperty,
    allListings,
    maxRadius: options?.maxRadius,
    maxResults: options?.maxResults,
  });

  // Build criteria description
  const criteria: string[] = [
    `Within ${options?.maxRadius || 1} mile radius`,
    `Matching ${targetProperty.beds} beds / ${targetProperty.baths} baths`,
    `Square footage: ${targetProperty.sqft} ±200 sqft`,
  ];

  if (targetProperty.subdivision) {
    criteria.push(`Prioritized ${targetProperty.subdivision} properties`);
  }

  if (hasPool(targetProperty)) {
    criteria.push("Prioritized properties with pool");
  }

  return {
    comparables,
    targetProperty,
    criteria,
  };
}
