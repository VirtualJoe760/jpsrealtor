// src/app/utils/swipe/ChatQueueStrategy.ts
// Chat-based queue strategy for neighborhood queries

import type { QueueStrategy, QueueContext, QueueItem } from './types';
import type { MapListing } from '@/types/types';

const MAX_QUEUE_SIZE = 200;

/**
 * Chat Queue Strategy - Neighborhood-based
 *
 * Fetches all active listings in the neighborhood (subdivision or city)
 * and sorts by price descending (highest to lowest).
 *
 * This strategy is used when the chat AI identifies a neighborhood query
 * and passes the neighborhood identifier to the frontend.
 */
export class ChatQueueStrategy implements QueueStrategy {
  private neighborhoodType: 'subdivision' | 'city' | null = null;
  private neighborhoodId: string | null = null;
  private filters: any = {};

  getName(): string {
    return 'ChatQueue';
  }

  async initializeQueue(context: QueueContext): Promise<QueueItem[]> {
    const { referenceListing, query } = context;

    console.log('💬 Chat Strategy - Initializing neighborhood queue');
    console.log(`   Reference listing: ${referenceListing.unparsedAddress || referenceListing.address}`);
    console.log(`   Subdivision: ${referenceListing.subdivisionName || 'N/A'}`);
    console.log(`   City: ${referenceListing.city || 'N/A'}`);

    // Determine neighborhood type from reference listing
    const subdivision = referenceListing.subdivisionName;
    const city = referenceListing.city;

    // Try to extract neighborhood context from query (JSON-encoded metadata)
    let queryMetadata: any = null;
    if (query) {
      try {
        queryMetadata = JSON.parse(query);
      } catch {
        // Not JSON, ignore
      }
    }

    if (queryMetadata?.neighborhoodType && queryMetadata?.neighborhoodId) {
      // Use metadata from query
      this.neighborhoodType = queryMetadata.neighborhoodType;
      this.neighborhoodId = queryMetadata.neighborhoodId;
      this.filters = queryMetadata.filters || {};

      console.log(`   ✅ Using query metadata: ${this.neighborhoodType} - ${this.neighborhoodId}`);
    } else if (subdivision) {
      // Fallback: Use subdivision from reference listing
      this.neighborhoodType = 'subdivision';
      this.neighborhoodId = this.createSlug(subdivision);

      console.log(`   ✅ Using subdivision: ${subdivision} → ${this.neighborhoodId}`);
    } else if (city) {
      // Fallback: Use city from reference listing
      this.neighborhoodType = 'city';
      this.neighborhoodId = this.createSlug(city);

      console.log(`   ✅ Using city: ${city} → ${this.neighborhoodId}`);
    } else {
      console.error('❌ Could not determine neighborhood type - no subdivision or city');
      return [];
    }

    try {
      // Build API URL based on neighborhood type
      let apiUrl = '';

      if (this.neighborhoodType === 'subdivision') {
        apiUrl = `/api/subdivisions/${this.neighborhoodId}/listings`;
      } else if (this.neighborhoodType === 'city') {
        apiUrl = `/api/cities/${this.neighborhoodId}/listings`;
      } else {
        console.error('❌ Invalid neighborhood type');
        return [];
      }

      // Add filters to query params
      const params = new URLSearchParams({
        limit: String(MAX_QUEUE_SIZE),
      });

      // Price filters
      if (this.filters.minPrice) params.append('minPrice', String(this.filters.minPrice));
      if (this.filters.maxPrice) params.append('maxPrice', String(this.filters.maxPrice));

      // Subdivision API uses 'beds' (exact match), City API uses 'minBeds' (range)
      if (this.filters.beds) {
        const paramName = this.neighborhoodType === 'subdivision' ? 'beds' : 'minBeds';
        params.append(paramName, String(this.filters.beds));
      }
      if (this.filters.baths) {
        const paramName = this.neighborhoodType === 'subdivision' ? 'baths' : 'minBaths';
        params.append(paramName, String(this.filters.baths));
      }

      // Size filters
      if (this.filters.minSqft) params.append('minSqft', String(this.filters.minSqft));
      if (this.filters.maxSqft) params.append('maxSqft', String(this.filters.maxSqft));
      if (this.filters.minLotSize) params.append('minLotSize', String(this.filters.minLotSize));
      if (this.filters.maxLotSize) params.append('maxLotSize', String(this.filters.maxLotSize));

      // Year filters
      if (this.filters.minYear) params.append('minYear', String(this.filters.minYear));
      if (this.filters.maxYear) params.append('maxYear', String(this.filters.maxYear));

      // Amenity filters
      if (this.filters.pool) params.append('pool', 'true');
      if (this.filters.spa) params.append('spa', 'true');
      if (this.filters.view) params.append('view', 'true');
      if (this.filters.fireplace) params.append('fireplace', 'true');
      if (this.filters.gatedCommunity) params.append('gatedCommunity', 'true');
      if (this.filters.seniorCommunity) params.append('seniorCommunity', 'true');

      // Garage/Stories
      if (this.filters.garageSpaces) params.append('garageSpaces', String(this.filters.garageSpaces));
      if (this.filters.stories) params.append('stories', String(this.filters.stories));

      // Property type
      if (this.filters.propertyType) params.append('propertyType', this.filters.propertyType);

      // Geographic filters
      if (this.filters.eastOf) params.append('eastOf', this.filters.eastOf);
      if (this.filters.westOf) params.append('westOf', this.filters.westOf);
      if (this.filters.northOf) params.append('northOf', this.filters.northOf);
      if (this.filters.southOf) params.append('southOf', this.filters.southOf);

      // HOA filters
      if (this.filters.hasHOA !== undefined) params.append('hasHOA', String(this.filters.hasHOA));
      if (this.filters.maxHOA) params.append('maxHOA', this.filters.maxHOA.toString());
      if (this.filters.minHOA) params.append('minHOA', this.filters.minHOA.toString());

      const urlWithParams = params.toString() ? `${apiUrl}?${params.toString()}` : apiUrl;
      console.log(`🌐 Fetching neighborhood listings: ${urlWithParams}`);

      const response = await fetch(urlWithParams);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.listings)) {
        console.error('❌ Invalid API response');
        return [];
      }

      console.log(`📦 Received ${data.listings.length} listings from API`);
      console.log(`📊 Total available: ${data.pagination?.total || data.listings.length}`);

      // Convert to QueueItems and sort by price (highest first)
      const queueItems = data.listings
        .filter((listing: any) => {
          // Exclude the reference listing
          if (listing.listingKey === referenceListing.listingKey) return false;

          // Exclude Pacaso (Co-Ownership) properties
          if (listing.propertySubType?.toLowerCase().includes("co-ownership")) {
            return false;
          }

          return true;
        })
        .map((listing: any) => this.toQueueItem(listing))
        .sort((a, b) => b.score - a.score); // Higher price = lower score value (shown first)

      console.log(`✅ Queue initialized: ${queueItems.length} listings`);
      console.log('📋 First 5 listings:');
      queueItems.slice(0, 5).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.listingKey} - $${item.score.toLocaleString()}`);
      });

      return queueItems;
    } catch (error) {
      console.error('❌ Error fetching neighborhood listings:', error);
      return [];
    }
  }

  /**
   * Convert listing to QueueItem
   * For chat queues, score is just the price (for sorting purposes)
   */
  private toQueueItem(listing: any): QueueItem {
    return {
      listingKey: listing.listingKey || listing.listingId || listing._id,
      slug: listing.slugAddress || listing.slug || listing.listingKey,
      slugAddress: listing.slugAddress || listing.slug,
      latitude: listing.latitude || 0,
      longitude: listing.longitude || 0,
      city: listing.city || "",
      subdivisionName: listing.subdivisionName || null,
      propertyType: listing.propertyType || null,
      propertySubType: listing.propertySubType || null,
      score: listing.listPrice || 0, // Use price as score for sorting
      _id: listing._id,
    };
  }

  /**
   * Create URL-friendly slug from name
   */
  private createSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}
