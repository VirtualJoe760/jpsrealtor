// src/lib/chat/tools/executors/search-homes.ts
// Execute searchHomes tool - Component-First Architecture
//
// This executor returns search parameters (NOT data!) for frontend components
// to fetch their own listings. Components handle data fetching, photo loading,
// and map positioning independently.

import { logChatMessage } from '@/lib/chat-logger';

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

  // NEW ARCHITECTURE: Return search parameters for frontend components to fetch their own data
  // Components (ListingCarousel, MapView) will receive these params and query MongoDB directly
  console.log('[searchHomes] Returning search parameters for component-first architecture');

  return {
    success: true,
    message: `I'll show you homes matching your search criteria.`,
    searchParams: queryPayload,
    // Extract location context for AI response
    locationContext: {
      city: queryPayload.city,
      subdivision: queryPayload.subdivision,
      zip: queryPayload.zip,
      filters: Object.fromEntries(
        Object.entries(queryPayload.filters).filter(([_, v]) => v !== undefined && v !== null)
      )
    }
  };
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

// Photo fetching removed - components handle their own photo fetching via /api/listings/[key]/photos
