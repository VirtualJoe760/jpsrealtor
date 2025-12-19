// src/lib/chat/tools/executors/search-homes.ts
// Execute searchHomes tool

import { logChatMessage } from '@/lib/chat-logger';

const DEFAULT_PHOTO_URL = "https://placehold.co/600x400/1e293b/94a3b8?text=No+Photo";

/**
 * Execute searchHomes tool
 */
export async function executeSearchHomes(
  args: any,
  userId: string
): Promise<any> {
  console.log('[searchHomes] Args:', JSON.stringify(args, null, 2));

  // Map user-friendly params to database query
  const queryPayload = {
    // Location (required)
    city: extractCity(args.location),
    subdivision: extractSubdivision(args.location),
    zip: extractZip(args.location),

    // Filters
    filters: {
      // Property type mapping: user-friendly → database format
      propertySubType: mapPropertyType(args.propertyType),

      // Beds/baths (interpret as minimum)
      minBeds: args.beds,
      minBaths: args.baths,

      // Price range
      minPrice: args.priceRange?.min,
      maxPrice: args.priceRange?.max,

      // Amenities (boolean flags)
      pool: args.pool,
      view: args.view,
      gated: args.gated,

      // Size
      minSqft: args.minSqft,

      // Always return limited results for chat
      limit: 10,
      sort: "newest"
    },

    // Always include stats for user context
    includeStats: true
  };

  console.log('[searchHomes] Query payload:', JSON.stringify(queryPayload, null, 2));

  // Log query
  await logChatMessage("system", "searchHomes executed", userId, {
    location: args.location,
    filters: Object.fromEntries(
      Object.entries(queryPayload.filters).filter(([_, v]) => v !== undefined && v !== null)
    ),
    timestamp: new Date().toISOString(),
  });

  try {
    // Call /api/query endpoint
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/query`;
    console.log('[searchHomes] Calling API:', apiUrl);

    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload)
      }
    );

    console.log('[searchHomes] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[searchHomes] API error: ${response.status}`, errorText);
      return {
        error: `Search failed (${response.status})`,
        success: false
      };
    }

    const result = await response.json();
    console.log('[searchHomes] Result:', {
      success: result.success,
      count: result.listings?.length || 0,
      hasStats: !!result.stats
    });

    if (!result.success) {
      return {
        error: result.error || "No results found",
        success: false
      };
    }

    // Format response for AI
    const listings = result.listings || [];
    const stats = result.stats || {};

    // Batch fetch photos
    const photoMap = await batchFetchPhotos(listings.slice(0, 10));

    // Calculate map center
    const validCoords = listings.filter((l: any) => l.latitude && l.longitude);
    const centerLat = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + l.latitude, 0) / validCoords.length
      : null;
    const centerLng = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + l.longitude, 0) / validCoords.length
      : null;

    return {
      success: true,
      summary: {
        count: result.meta?.totalListings || listings.length,
        priceRange: {
          min: stats.minPrice || 0,
          max: stats.maxPrice || 0
        },
        avgPrice: stats.avgPrice || 0,
        medianPrice: stats.medianPrice || 0,
        avgPricePerSqft: stats.avgPricePerSqft,
        center: centerLat && centerLng ? { lat: centerLat, lng: centerLng } : null,
        sampleListings: listings.slice(0, 10).map((l: any) => ({
          // Identifiers
          listingKey: l.listingKey,
          slugAddress: l.slugAddress,

          // Display fields
          id: l.listingId || l.listingKey,
          price: l.listPrice,
          beds: l.bedsTotal || l.bedroomsTotal || 0,
          baths: l.bathroomsTotalDecimal || 0,
          sqft: l.livingArea || 0,
          address: l.address || l.unparsedAddress,
          city: l.city,
          subdivision: l.subdivisionName,
          image: photoMap.get(l.listingKey) || DEFAULT_PHOTO_URL,
          url: `/mls-listings/${l.slugAddress || l.listingId}`,

          // Location
          latitude: l.latitude,
          longitude: l.longitude
        }))
      }
    };

  } catch (error: any) {
    console.error('[searchHomes] Fetch error:', error.message, error.stack);
    return {
      error: `Network error: ${error.message}`,
      success: false
    };
  }
}

/**
 * Helper: Extract city from location string
 */
function extractCity(location: string): string | undefined {
  // Simple heuristic: if it's not a ZIP and not a known subdivision pattern, it's a city
  if (/^\d{5}$/.test(location)) return undefined;
  if (location.includes('Country Club') || location.includes('CC')) return undefined;
  return location;
}

/**
 * Helper: Extract subdivision from location string
 */
function extractSubdivision(location: string): string | undefined {
  if (location.includes('Country Club') || location.includes('CC')) {
    return location;
  }
  return undefined;
}

/**
 * Helper: Extract ZIP from location string
 */
function extractZip(location: string): string | undefined {
  if (/^\d{5}$/.test(location)) {
    return location;
  }
  return undefined;
}

/**
 * Helper: Map user-friendly property type to database format
 */
function mapPropertyType(userType?: string): string | undefined {
  if (!userType) return undefined;

  const mapping: Record<string, string> = {
    "house": "Single Family",
    "condo": "Condominium",
    "townhouse": "Townhouse"
  };

  return mapping[userType.toLowerCase()];
}

/**
 * Helper: Batch fetch primary photos for listings
 */
async function batchFetchPhotos(listings: any[]): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();

  if (listings.length === 0) return photoMap;

  try {
    const listingKeys = listings
      .map(l => l.listingKey)
      .filter(Boolean);

    if (listingKeys.length === 0) return photoMap;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mls/photos/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingKeys })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.photos) {
        Object.entries(data.photos).forEach(([key, url]) => {
          photoMap.set(key, url as string);
        });
      }
    }
  } catch (error) {
    console.error('[searchHomes] Photo fetch error:', error);
  }

  return photoMap;
}
