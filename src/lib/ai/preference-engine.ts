// src/lib/ai/preference-engine.ts
// AI Preference Engine for personalizing MLS searches based on user behavior

import type { PreferenceModel } from "@/app/components/chat/ChatProvider";
import type { Listing } from "@/app/components/chat/ListingCarousel";
import type { MapFilters } from "@/app/utils/mls/filterListingsServerSide";

/**
 * Apply user preferences to MLS search filters
 * Intelligently modifies filters based on learned behavior
 */
export function applyPreferencesToFilters(
  baseFilters: Partial<MapFilters>,
  preferenceModel: PreferenceModel,
  mode: 'augment' | 'suggest' | 'strict' = 'augment'
): Partial<MapFilters> {
  const modifiedFilters = { ...baseFilters };

  // Augment mode: Add preferences only if not already specified
  if (mode === 'augment') {
    // Apply price preferences if not specified
    if (!modifiedFilters.minPrice && !modifiedFilters.maxPrice && preferenceModel.priceRange) {
      // Use preference range with 20% buffer
      const buffer = (preferenceModel.priceRange.max - preferenceModel.priceRange.min) * 0.2;
      modifiedFilters.minPrice = Math.max(0, preferenceModel.priceRange.min - buffer);
      modifiedFilters.maxPrice = preferenceModel.priceRange.max + buffer;
    }

    // Apply bed/bath preferences if not specified
    if (!modifiedFilters.minBeds && preferenceModel.preferredBeds) {
      modifiedFilters.minBeds = Math.max(1, preferenceModel.preferredBeds - 1);
    }
    if (!modifiedFilters.minBaths && preferenceModel.preferredBaths) {
      modifiedFilters.minBaths = Math.max(1, preferenceModel.preferredBaths - 1);
    }

    // Apply feature preferences if not specified
    if (!modifiedFilters.poolYn && preferenceModel.preferredFeatures?.includes('pool')) {
      modifiedFilters.poolYn = true;
    }
    if (!modifiedFilters.spaYn && preferenceModel.preferredFeatures?.includes('spa')) {
      modifiedFilters.spaYn = true;
    }

    // Avoid disliked features
    if (preferenceModel.avoidedFeatures?.includes('land-lease')) {
      modifiedFilters.landLease = false;
    }
  }

  // Suggest mode: Recommend filters based on preferences
  else if (mode === 'suggest') {
    // Use average preferences as starting point
    if (preferenceModel.avgPrice) {
      const buffer = preferenceModel.avgPrice * 0.15;
      modifiedFilters.minPrice = Math.max(0, preferenceModel.avgPrice - buffer);
      modifiedFilters.maxPrice = preferenceModel.avgPrice + buffer;
    }

    if (preferenceModel.preferredBeds) {
      modifiedFilters.minBeds = preferenceModel.preferredBeds;
    }
    if (preferenceModel.preferredBaths) {
      modifiedFilters.minBaths = preferenceModel.preferredBaths;
    }

    // Apply all preferred features
    if (preferenceModel.preferredFeatures) {
      if (preferenceModel.preferredFeatures.includes('pool')) {
        modifiedFilters.poolYn = true;
      }
      if (preferenceModel.preferredFeatures.includes('spa')) {
        modifiedFilters.spaYn = true;
      }
    }

    // Exclude avoided features
    if (preferenceModel.avoidedFeatures?.includes('land-lease')) {
      modifiedFilters.landLease = false;
    }

    // Prefer preferred cities
    if (preferenceModel.preferredCities && preferenceModel.preferredCities.length > 0) {
      modifiedFilters.cities = preferenceModel.preferredCities;
    }
  }

  // Strict mode: Use preferences as hard constraints
  else if (mode === 'strict') {
    if (preferenceModel.priceRange) {
      modifiedFilters.minPrice = preferenceModel.priceRange.min;
      modifiedFilters.maxPrice = preferenceModel.priceRange.max;
    }
    if (preferenceModel.preferredBeds) {
      modifiedFilters.minBeds = preferenceModel.preferredBeds;
      modifiedFilters.maxBeds = preferenceModel.preferredBeds;
    }
    if (preferenceModel.preferredBaths) {
      modifiedFilters.minBaths = preferenceModel.preferredBaths;
      modifiedFilters.maxBaths = preferenceModel.preferredBaths;
    }
  }

  return modifiedFilters;
}

/**
 * Find listings similar to a given listing
 * Uses proximity matching on key attributes
 */
export function findSimilarListings(
  targetListing: Listing,
  allListings: Listing[],
  limit: number = 5
): Listing[] {
  interface ScoredListing {
    listing: Listing;
    score: number;
  }

  const scored: ScoredListing[] = allListings
    .filter(l => l.id !== targetListing.id) // Exclude the target listing itself
    .map(listing => {
      let score = 0;

      // Price similarity (within 20%)
      const priceDiff = Math.abs(listing.price - targetListing.price) / targetListing.price;
      if (priceDiff < 0.1) score += 10;
      else if (priceDiff < 0.2) score += 5;
      else if (priceDiff < 0.3) score += 2;

      // Bed/bath exact match
      if (listing.beds === targetListing.beds) score += 8;
      if (listing.baths === targetListing.baths) score += 6;

      // Sqft similarity (within 15%)
      if (targetListing.sqft && listing.sqft) {
        const sqftDiff = Math.abs(listing.sqft - targetListing.sqft) / targetListing.sqft;
        if (sqftDiff < 0.15) score += 7;
        else if (sqftDiff < 0.25) score += 3;
      }

      // Same city
      if (listing.city === targetListing.city) score += 10;

      // Same subdivision
      if (listing.subdivision === targetListing.subdivision) score += 15;

      // Same property type
      if (listing.type === targetListing.type) score += 5;

      // Feature matching
      if (listing.poolYn && targetListing.poolYn) score += 4;
      if (listing.spaYn && targetListing.spaYn) score += 3;
      if (listing.landLease === targetListing.landLease) score += 2;

      return { listing, score };
    });

  // Sort by score descending and take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.listing);
}

/**
 * Calculate relevance score for a listing based on user preferences
 * Higher score = better match to user's learned preferences
 */
export function scoreListingRelevance(
  listing: Listing,
  preferenceModel: PreferenceModel
): number {
  let score = 0;

  // Price match
  if (preferenceModel.priceRange) {
    if (listing.price >= preferenceModel.priceRange.min && listing.price <= preferenceModel.priceRange.max) {
      score += 10;
    } else if (preferenceModel.avgPrice) {
      const priceDiff = Math.abs(listing.price - preferenceModel.avgPrice) / preferenceModel.avgPrice;
      if (priceDiff < 0.2) score += 5;
      else if (priceDiff < 0.3) score += 2;
    }
  }

  // Preferred city
  if (preferenceModel.preferredCities?.includes(listing.city)) {
    score += 10;
  }

  // Preferred subdivision
  if (preferenceModel.preferredSubdivisions?.includes(listing.subdivision || '')) {
    score += 8;
  }

  // Bed/bath match
  if (preferenceModel.preferredBeds && listing.beds === preferenceModel.preferredBeds) {
    score += 7;
  }
  if (preferenceModel.preferredBaths && listing.baths === preferenceModel.preferredBaths) {
    score += 5;
  }

  // Sqft match
  if (preferenceModel.preferredSqft && listing.sqft) {
    const sqftDiff = Math.abs(listing.sqft - preferenceModel.preferredSqft) / preferenceModel.preferredSqft;
    if (sqftDiff < 0.15) score += 6;
    else if (sqftDiff < 0.25) score += 3;
  }

  // Feature preferences
  if (preferenceModel.preferredFeatures) {
    if (preferenceModel.preferredFeatures.includes('pool') && listing.poolYn) score += 5;
    if (preferenceModel.preferredFeatures.includes('spa') && listing.spaYn) score += 3;
  }

  // Avoided features (negative score)
  if (preferenceModel.avoidedFeatures) {
    if (preferenceModel.avoidedFeatures.includes('land-lease') && listing.landLease) score -= 10;
    if (preferenceModel.avoidedFeatures.includes('high-hoa') && listing.associationFee && listing.associationFee > 600) score -= 5;
  }

  // Property type match
  if (preferenceModel.preferredPropertyTypes?.includes(listing.type || '')) {
    score += 4;
  }

  return score;
}

/**
 * Sort listings by relevance to user preferences
 * Returns listings sorted from most to least relevant
 */
export function sortByPreference(
  listings: Listing[],
  preferenceModel: PreferenceModel,
  dismissedKeys: string[] = []
): Listing[] {
  interface ScoredListing {
    listing: Listing;
    score: number;
  }

  const scored: ScoredListing[] = listings
    .filter(listing => {
      // Filter out dismissed listings
      const key = listing.slugAddress || listing.slug || listing.id;
      return !dismissedKeys.includes(key);
    })
    .map(listing => ({
      listing,
      score: scoreListingRelevance(listing, preferenceModel),
    }));

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.listing);
}

/**
 * Generate a human-readable summary of user preferences
 * Useful for AI to explain what it learned about the user
 */
export function describePreferences(preferenceModel: PreferenceModel): string {
  const parts: string[] = [];

  if (preferenceModel.avgPrice) {
    parts.push(`average price around $${(preferenceModel.avgPrice / 1000).toFixed(0)}k`);
  }

  if (preferenceModel.preferredBeds) {
    parts.push(`${preferenceModel.preferredBeds} bedrooms`);
  }

  if (preferenceModel.preferredBaths) {
    parts.push(`${preferenceModel.preferredBaths} bathrooms`);
  }

  if (preferenceModel.preferredCities && preferenceModel.preferredCities.length > 0) {
    const cities = preferenceModel.preferredCities.slice(0, 3).join(', ');
    parts.push(`in ${cities}`);
  }

  if (preferenceModel.preferredFeatures && preferenceModel.preferredFeatures.length > 0) {
    parts.push(`with ${preferenceModel.preferredFeatures.join(', ')}`);
  }

  if (preferenceModel.preferredSqft) {
    parts.push(`around ${(preferenceModel.preferredSqft / 1000).toFixed(1)}k sqft`);
  }

  if (parts.length === 0) {
    return "no strong preferences yet";
  }

  return parts.join(', ');
}

/**
 * Check if a listing matches avoided preferences
 * Returns true if listing should be filtered out
 */
export function shouldAvoidListing(
  listing: Listing,
  preferenceModel: PreferenceModel
): boolean {
  if (!preferenceModel.avoidedFeatures || preferenceModel.avoidedFeatures.length === 0) {
    return false;
  }

  // Check for land lease
  if (preferenceModel.avoidedFeatures.includes('land-lease') && listing.landLease) {
    return true;
  }

  // Check for high HOA
  if (preferenceModel.avoidedFeatures.includes('high-hoa')) {
    if (listing.associationFee && listing.associationFee > 600) {
      return true;
    }
  }

  return false;
}
