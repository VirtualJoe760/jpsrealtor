// src/app/utils/swipe/MapQueueStrategy.ts
// Map-based queue strategy with 7-tier proximity scoring

import type { QueueStrategy, QueueContext, QueueItem } from './types';
import type { MapListing } from '@/types/types';

const SEARCH_RADIUS_MILES = 5;
const MAX_QUEUE_SIZE = 100;

/**
 * Map Queue Strategy - Proximity-based scoring
 *
 * Uses 7-tier scoring system:
 * 1. Same subdivision + same subtype + same zipcode (0-5)
 * 2. Same subdivision + same subtype + different zipcode (50-55)
 * 3. Same subdivision + different subtype + same zipcode (100-105)
 * 4. Same subdivision + different subtype + different zipcode (150-155)
 * 5. Same city + within 2 miles + same subtype + same zipcode (200-202)
 * 6. Same city + within 5 miles + same subtype + same zipcode (300-305)
 * 7. Same city + within 5 miles + different subtype (400-405)
 */
export class MapQueueStrategy implements QueueStrategy {
  getName(): string {
    return 'MapQueue';
  }

  async initializeQueue(context: QueueContext): Promise<QueueItem[]> {
    const { referenceListing } = context;

    console.log('📍 Map Strategy - Reference listing:');
    console.log(`   Address: ${referenceListing.unparsedAddress || referenceListing.address}`);
    console.log(`   Subdivision: ${referenceListing.subdivisionName || 'N/A'}`);
    console.log(`   SubType: ${referenceListing.propertySubType || 'N/A'}`);
    console.log(`   City: ${referenceListing.city || 'N/A'}`);
    console.log(`   Postal: ${referenceListing.postalCode || 'N/A'}`);

    const reference = {
      subdivision: referenceListing.subdivisionName || null,
      propertySubType: referenceListing.propertySubType || null,
      city: referenceListing.city || "",
      latitude: referenceListing.latitude || 0,
      longitude: referenceListing.longitude || 0,
      postalCode: referenceListing.postalCode || "",
      listPrice: referenceListing.listPrice || 0,
    };

    try {
      // Fetch nearby listings from API
      const params = new URLSearchParams({
        lat: String(reference.latitude),
        lng: String(reference.longitude),
        radius: String(SEARCH_RADIUS_MILES),
        propertyType: referenceListing.propertyType || "A",
        propertySubType: reference.propertySubType || "all",
        city: reference.city,
        limit: String(MAX_QUEUE_SIZE),
      });

      console.log('🌐 Fetching nearby listings...');
      const response = await fetch(`/api/mls-listings?${params}`);
      const data = await response.json();

      if (!Array.isArray(data.listings)) {
        console.error('❌ Invalid API response');
        return [];
      }

      console.log(`📦 Received ${data.listings.length} listings from API`);

      console.log('🔍 Sample of received listings (first 5):');
      data.listings.slice(0, 5).forEach((l: MapListing, idx: number) => {
        console.log(`  ${idx + 1}. ${l.listingKey} - ${l.unparsedAddress || l.address}`);
      });

      // Filter and score listings
      const scoredItems = data.listings
        .filter((listing: MapListing) => {
          // Exclude reference listing
          if (listing.listingKey === referenceListing.listingKey) return false;

          // Exclude Pacaso (Co-Ownership) properties
          if (listing.propertySubType?.toLowerCase().includes("co-ownership")) {
            return false;
          }

          // Filter by price bracket compatibility (same or ±1 bracket)
          if (!this.arePricesCompatible(reference.listPrice, listing.listPrice)) {
            return false;
          }

          return true;
        })
        .map((listing: MapListing) => {
          const score = this.calculateScore(listing, reference);
          return this.toQueueItem(listing, score);
        })
        .sort((a, b) => a.score - b.score); // Lower score = higher priority

      console.log(`✅ Scored and filtered: ${scoredItems.length} listings`);

      // Log final queue (just keys and addresses)
      console.log('📋 Final queue (top 10):');
      scoredItems.slice(0, 10).forEach((item, idx) => {
        const tier = item.score < 50 ? 'T1' : item.score < 100 ? 'T2' : item.score < 150 ? 'T3' : item.score < 200 ? 'T4' : item.score < 300 ? 'T5' : item.score < 400 ? 'T6' : 'T7';
        console.log(`  ${idx + 1}. [${tier}] ${item.listingKey} - ${item.slug} (score: ${item.score.toFixed(1)})`);
      });

      return scoredItems;
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      return [];
    }
  }

  /**
   * Calculate Haversine distance in miles
   */
  private calculateDistance(
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
   * Get price bracket
   */
  private getPriceBracket(price: number | undefined): { index: number; label: string } {
    if (!price || price <= 0) return { index: -1, label: "Unknown" };

    if (price < 300000) return { index: 0, label: "$0-299K" };
    if (price < 500000) return { index: 1, label: "$300-499K" };
    if (price < 700000) return { index: 2, label: "$500-699K" };
    if (price < 1000000) return { index: 3, label: "$700-999K" };
    if (price < 1500000) return { index: 4, label: "$1M-1.5M" };
    if (price < 2000000) return { index: 5, label: "$1.5M-2M" };
    if (price < 3000000) return { index: 6, label: "$2M-3M" };
    if (price < 5000000) return { index: 7, label: "$3M-5M" };
    if (price < 10000000) return { index: 8, label: "$5M-10M" };
    return { index: 9, label: "$10M+" };
  }

  /**
   * Check if two prices are in compatible brackets (same or ±1)
   */
  private arePricesCompatible(price1: number | undefined, price2: number | undefined): boolean {
    const bracket1 = this.getPriceBracket(price1);
    const bracket2 = this.getPriceBracket(price2);

    if (bracket1.index === -1 || bracket2.index === -1) return false;

    const diff = Math.abs(bracket1.index - bracket2.index);
    return diff <= 1;
  }

  /**
   * Calculate priority score (lower = higher priority)
   */
  private calculateScore(
    listing: MapListing,
    reference: {
      subdivision: string | null;
      propertySubType: string | null;
      city: string;
      latitude: number;
      longitude: number;
      postalCode: string;
    }
  ): number {
    const distance = this.calculateDistance(
      reference.latitude,
      reference.longitude,
      listing.latitude || 0,
      listing.longitude || 0
    );

    const sameSubdivision =
      listing.subdivisionName &&
      reference.subdivision &&
      listing.subdivisionName.toLowerCase() === reference.subdivision.toLowerCase();

    const sameSubType = listing.propertySubType === reference.propertySubType;
    const sameCity = listing.city?.toLowerCase() === reference.city.toLowerCase();
    const sameZipCode = listing.postalCode === reference.postalCode;

    // Tier 1: Exact match
    if (sameSubdivision && sameSubType && sameCity && sameZipCode) {
      return distance; // 0-5
    }

    // Tier 2: Same subdivision + same subtype + different zipcode
    if (sameSubdivision && sameSubType && sameCity) {
      return 50 + distance; // 50-55
    }

    // Tier 3: Same subdivision + different subtype + same zipcode
    if (sameSubdivision && sameCity && sameZipCode) {
      return 100 + distance; // 100-105
    }

    // Tier 4: Same subdivision + different subtype + different zipcode
    if (sameSubdivision && sameCity) {
      return 150 + distance; // 150-155
    }

    // Tier 5: Nearby (2mi) + same subtype + same zipcode
    if (sameCity && distance <= 2 && sameSubType && sameZipCode) {
      return 200 + distance; // 200-202
    }

    // Tier 6: Moderate distance (5mi) + same subtype + same zipcode
    if (sameCity && distance <= 5 && sameSubType && sameZipCode) {
      return 300 + distance; // 300-305
    }

    // Tier 7: Same city + within 5 miles
    if (sameCity && distance <= 5) {
      return 400 + distance; // 400-405
    }

    // Too far or different city
    return 1000 + distance;
  }

  /**
   * Convert MapListing to QueueItem
   */
  private toQueueItem(listing: MapListing, score: number): QueueItem {
    return {
      listingKey: listing.listingKey,
      slug: listing.slugAddress || listing.slug || listing.listingKey,
      slugAddress: listing.slugAddress || listing.slug || listing.listingKey,
      latitude: listing.latitude || 0,
      longitude: listing.longitude || 0,
      city: listing.city || "",
      subdivisionName: listing.subdivisionName || null,
      propertyType: listing.propertyType || null,
      propertySubType: listing.propertySubType || null,
      score,
      _id: listing._id,
    };
  }
}
