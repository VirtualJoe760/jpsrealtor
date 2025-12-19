// src/lib/chat/tool-executor.ts
// Tool execution handlers for chat AI

import { toolCache } from './tool-cache';
import { logChatMessage } from '@/lib/chat-logger';
import { executeSearchHomes } from './tools/executors/search-homes';
import { getSubdivisionData, checkShortTermRentals } from './utils/subdivision-data';
import { getListingData, checkListingShortTermRentals } from './utils/listing-data';

/**
 * Execute a single tool call and return the result
 */
export async function executeToolCall(toolCall: any, userId: string = 'unknown'): Promise<any> {
  const functionName = toolCall.function.name;

  // Log RAW arguments from Groq BEFORE any processing
  console.log(`[${functionName}] RAW arguments from Groq:`, toolCall.function.arguments);

  // CRITICAL: Aggressive sanitization for Groq API's severely malformed JSON
  let argsString = toolCall.function.arguments;

  // Fix 1: Remove all excessive backslashes (triple, double → none)
  // "includeStats\\\": true" → "includeStats": true
  argsString = argsString.replace(/\\+"/g, '"');

  // Fix 2: Fix the specific pattern: "key\": value":"}"
  // This handles: {"includeStats\": true":"}","subdivision":"Palm Desert Country Club"}
  // Step 1: Remove the malformed closing pattern ":"}"
  argsString = argsString.replace(/"\s*:\s*"\}"/g, '');

  // Step 2: Fix standalone ":"}" patterns
  argsString = argsString.replace(/:\s*"\}"/g, '');

  // Fix 3: Remove all garbage whitespace (carriage returns, excessive newlines)
  argsString = argsString.replace(/\r/g, '');
  argsString = argsString.replace(/\n\s*\n\s*\n/g, '\n'); // Triple+ newlines → single

  // Fix 4: Fix malformed boolean values with quotes inside
  // "includeStats": true" → "includeStats": true
  argsString = argsString.replace(/:\s*true"\s*$/gm, ': true');
  argsString = argsString.replace(/:\s*false"\s*$/gm, ': false');
  argsString = argsString.replace(/:\s*true"\s*,/g, ': true,');
  argsString = argsString.replace(/:\s*false"\s*,/g, ': false,');

  console.log(`[${functionName}] SANITIZED arguments:`, argsString);

  const functionArgs = JSON.parse(argsString);

  console.log(`[${functionName}] Starting with args:`, JSON.stringify(functionArgs, null, 2));

  // Log tool execution start
  await logChatMessage("system", `Executing tool: ${functionName}`, userId, {
    tool: functionName,
    arguments: functionArgs,
    timestamp: new Date().toISOString(),
  });

  // Check cache first (skip caching for certain tools)
  const cacheableTools = [
    'searchHomes',              // NEW: 2 minute cache
    'getSubdivisionInfo',       // NEW: Subdivision data queries
    'getListingInfo',           // NEW: Listing data queries
    'queryDatabase',
    'getAppreciation',
    'getMarketStats',
    'getRegionalStats',
    'searchArticles',
    'lookupSubdivision',
    'getNeighborhoodPageLink'
  ];

  if (cacheableTools.includes(functionName)) {
    const cachedResult = toolCache.get(functionName, functionArgs);
    if (cachedResult) {
      console.log(`[${functionName}] Returning cached result`);
      return {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(cachedResult),
      };
    }
  }

  let result: any;

  try {
    // NEW USER-FIRST TOOLS
    if (functionName === "searchHomes") {
      result = await executeSearchHomes(functionArgs, userId);
    }
    else if (functionName === "getSubdivisionInfo") {
      result = await executeGetSubdivisionInfo(functionArgs);
    }
    else if (functionName === "getListingInfo") {
      result = await executeGetListingInfo(functionArgs);
    }
    // OLD TOOLS (to be migrated)
    else if (functionName === "queryDatabase") {
      result = await executeQueryDatabase(functionArgs);
    } else if (functionName === "matchLocation") {
      result = await executeMatchLocation(functionArgs);
    } else if (functionName === "searchArticles") {
      result = await executeSearchArticles(functionArgs);
    } else if (functionName === "searchCity") {
      result = await executeSearchCity(functionArgs);
    } else if (functionName === "getAppreciation") {
      result = await executeGetAppreciation(functionArgs);
    } else if (functionName === "getMarketStats") {
      result = await executeGetMarketStats(functionArgs);
    } else if (functionName === "lookupSubdivision") {
      result = await executeLookupSubdivision(functionArgs);
    } else if (functionName === "getRegionalStats") {
      result = await executeGetRegionalStats(functionArgs);
    } else if (functionName === "getNeighborhoodPageLink") {
      result = await executeGetNeighborhoodPageLink(functionArgs);
    } else {
      result = { error: `Unknown function: ${functionName}` };
    }

    // Cache successful results
    if (result && !result.error && cacheableTools.includes(functionName)) {
      toolCache.set(functionName, functionArgs, result);
    }

    // Log tool execution result
    await logChatMessage("system", `Tool result: ${functionName}`, userId, {
      tool: functionName,
      success: !result?.error,
      resultSummary: result?.error ? { error: result.error } : {
        listingCount: result?.summary?.count || result?.listings?.length || 0,
        hasData: !!result?.success || !!result?.listings || !!result?.data,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[${functionName}] Error:`, error);
    result = { error: error.message };

    // Log error
    await logChatMessage("system", `Tool error: ${functionName}`, userId, {
      tool: functionName,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // AUTOMATIC SEARCH: If matchLocation succeeded, call the WORKING subdivision endpoint
  if (functionName === "matchLocation" && result.success && result.match?.type === "subdivision") {
    console.log("[AUTO-SEARCH] Subdivision match found, using working /api/subdivisions endpoint");

    try {
      const subdivisionName = result.match.name;
      const slug = subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      console.log("[AUTO-SEARCH] Fetching from /api/subdivisions/" + slug + "/listings");

      const listingsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/subdivisions/${slug}/listings?limit=10`,
        { method: "GET" }
      );
      const listingsData = await listingsResponse.json();

      const allListings = listingsData.listings || [];
      const totalCount = listingsData.pagination?.total || allListings.length;

      console.log("[AUTO-SEARCH] Found", totalCount, "listings from working endpoint");

      // ANALYTICS PATTERN: Use accurate stats from API, not calculated from sample
      const apiStats = listingsData.stats || {};
      const minPrice = apiStats.priceRange?.min || 0;
      const maxPrice = apiStats.priceRange?.max || 0;
      const avgPrice = apiStats.avgPrice || 0;
      const medianPrice = apiStats.medianPrice || 0;

      // Calculate center coordinates for map
      const validCoords = allListings.filter((l: any) => l.latitude && l.longitude);
      const centerLat = validCoords.length > 0
        ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.latitude), 0) / validCoords.length
        : 33.72;
      const centerLng = validCoords.length > 0
        ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.longitude), 0) / validCoords.length
        : -116.37;

      // Return summary + 10 sample listings for AI (MINIMAL fields for token efficiency)
      const sampleListings = allListings.slice(0, 10);
      const photoMap = await batchFetchPhotos(sampleListings);

      result.summary = {
        count: totalCount,
        priceRange: { min: minPrice, max: maxPrice },
        avgPrice: avgPrice,
        medianPrice: medianPrice,
        center: { lat: centerLat, lng: centerLng },
        sampleListings: sampleListings.map((l: any) => {
          const listingKey = l.listingKey || l.listingId;

          return {
            // IDENTIFIERS (for frontend to fetch full data)
            listingKey: listingKey,
            slugAddress: l.slugAddress,
            slug: l.slug,

            // DISPLAY FIELDS (for carousel cards)
            id: l.listingId || l.listingKey,
            price: l.listPrice,
            beds: l.bedroomsTotal || l.bedsTotal,
            baths: l.bathroomsTotalDecimal,
            sqft: l.livingArea,
            address: l.address || l.unparsedAddress,
            city: l.city,
            subdivision: subdivisionName,
            image: photoMap.get(listingKey) || DEFAULT_PHOTO_URL,
            url: `/mls-listings/${l.slugAddress || l.listingId}`,

            // LOCATION (for map)
            latitude: parseFloat(l.latitude) || null,
            longitude: parseFloat(l.longitude) || null
          };
        })
      };

      console.log("[AUTO-SEARCH] Summary:", JSON.stringify(result.summary, null, 2));
    } catch (error: any) {
      console.error("[AUTO-SEARCH] Failed:", error);
    }
  }

  return {
    role: "tool" as const,
    tool_call_id: toolCall.id,
    name: functionName,
    content: JSON.stringify(result)
  };
}

/**
 * Execute queryDatabase tool
 */
async function executeQueryDatabase(args: any): Promise<any> {
  console.log('[queryDatabase] Starting with args:', JSON.stringify(args, null, 2));

  // Build database query payload
  const queryPayload = {
    city: args.city,
    subdivision: args.subdivision,
    zip: args.zip,
    county: args.county,
    filters: {
      propertySubType: args.propertySubType,
      minBeds: args.minBeds,
      maxBeds: args.maxBeds,
      minBaths: args.minBaths,
      maxBaths: args.maxBaths,
      minSqft: args.minSqft,
      maxSqft: args.maxSqft,
      minYear: args.minYear,
      maxYear: args.maxYear,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      pool: args.pool,
      spa: args.spa,
      view: args.view,
      gated: args.gated,
      minGarages: args.minGarages,
      maxDaysOnMarket: args.maxDaysOnMarket,
      listedAfter: args.listedAfter, // Keep as string - MongoDB field is stored as string, not Date
      limit: Math.min(args.limit || 10, 10), // Reduced from 100 to 10 for faster responses
      sort: args.sort
    },
    includeStats: args.includeStats !== false,
    includeDOMStats: args.includeDOMStats,
    includeComparison: args.compareWith ? {
      compareWith: args.compareWith,
      isCity: true
    } : undefined
  };

  // Log the database query being executed
  await logChatMessage("system", "Database query executed", "system", {
    endpoint: "/api/query",
    query: {
      location: {
        city: args.city,
        subdivision: args.subdivision,
        zip: args.zip,
        county: args.county,
      },
      filters: Object.fromEntries(
        Object.entries(queryPayload.filters).filter(([_, v]) => v !== undefined && v !== null)
      ),
    },
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      console.error(`[queryDatabase] API returned ${response.status}: ${response.statusText}`);
      return {
        error: `Query failed with status ${response.status}`,
        success: false
      };
    }

    const queryResult = await response.json();
    console.log('[queryDatabase] Query result:', {
      success: queryResult.success,
      listingCount: queryResult.listings?.length || 0,
      hasStats: !!queryResult.stats
    });

    // Log database query results
    await logChatMessage("system", "Database query results", "system", {
      success: queryResult.success,
      totalListings: queryResult.meta?.totalListings || queryResult.listings?.length || 0,
      stats: queryResult.stats ? {
        avgPrice: queryResult.stats.avgPrice,
        medianPrice: queryResult.stats.medianPrice,
        minPrice: queryResult.stats.minPrice,
        maxPrice: queryResult.stats.maxPrice,
        avgDaysOnMarket: queryResult.stats.avgDaysOnMarket,
      } : null,
      timestamp: new Date().toISOString(),
    });

  if (queryResult.success) {
    const allListings = queryResult.listings || [];
    const stats = queryResult.stats || {};
    const domStats = queryResult.domStats || {};
    const comparison = queryResult.comparison;

    // Calculate center coordinates
    const validCoords = allListings.filter((l: any) => l.latitude && l.longitude);
    const centerLat = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + l.latitude, 0) / validCoords.length
      : null;
    const centerLng = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + l.longitude, 0) / validCoords.length
      : null;

    return {
      success: true,
      summary: {
        count: queryResult.meta.totalListings,
        priceRange: { min: stats.minPrice || 0, max: stats.maxPrice || 0 },
        avgPrice: stats.avgPrice || 0,
        medianPrice: stats.medianPrice || 0,
        avgPricePerSqft: stats.avgPricePerSqft,
        avgDaysOnMarket: stats.avgDaysOnMarket,
        center: centerLat && centerLng ? { lat: centerLat, lng: centerLng } : null,
        marketVelocity: domStats.marketVelocity,
        freshListings: domStats.freshListings,
        staleListings: domStats.staleListings,
        domInsights: domStats.insights,
        comparison: comparison ? {
          winner: comparison.winner,
          insights: comparison.insights,
          differences: comparison.differences
        } : undefined,
        sampleListings: await (async () => {
          // Batch fetch all photos in parallel
          const sampleListings = allListings.slice(0, 10);
          const photoMap = await batchFetchPhotos(sampleListings);

          // Return MINIMAL listing objects - frontend will fetch complete data on-demand
          // This reduces token usage from ~4000 to ~800 (80% savings!)
          return sampleListings.map((l: any) => ({
            // IDENTIFIERS (required for frontend to fetch full data)
            listingKey: l.listingKey,
            slugAddress: l.slugAddress,
            slug: l.slug,

            // DISPLAY FIELDS (for carousel cards - all that's needed for initial render)
            id: l.listingKey,
            price: l.listPrice,
            beds: l.bedroomsTotal || l.bedsTotal,
            baths: l.bathroomsTotalDecimal,
            sqft: l.livingArea,
            address: l.address || l.unparsedAddress,
            city: l.city,
            subdivision: l.subdivisionName,
            image: photoMap.get(l.listingKey) || DEFAULT_PHOTO_URL,
            url: `/mls-listings/${l.slug || l.listingKey}`,

            // LOCATION (for map positioning)
            latitude: l.latitude,
            longitude: l.longitude,

            // NOTE: No publicRemarks, no agent info, no 30+ extra fields
            // Frontend fetches complete data when user opens ListingBottomPanel
          }));
        })()
      },
      meta: queryResult.meta
    };
  } else {
    console.error('[queryDatabase] Query unsuccessful:', queryResult.error);
    return { error: queryResult.error || "Query failed", success: false };
  }
  } catch (error: any) {
    console.error('[queryDatabase] Exception:', error);
    return {
      error: `Failed to query database: ${error.message}`,
      success: false
    };
  }
}

/**
 * Execute matchLocation tool
 */
async function executeMatchLocation(args: any): Promise<any> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/match-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  return await response.json();
}

/**
 * Execute searchArticles tool
 */
async function executeSearchArticles(args: any): Promise<any> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/articles/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  const data = await response.json();

  // Transform featuredImage.url to image for ArticleCard compatibility
  if (data.results && Array.isArray(data.results)) {
    data.results = data.results.map((article: any) => ({
      ...article,
      image: article.featuredImage?.url || article.image,
      // Remove featuredImage to avoid confusion
      featuredImage: undefined
    }));
  }

  console.log('[executeSearchArticles] API returned:', data.results?.length, 'articles');
  console.log('[executeSearchArticles] First article has image?:', data.results?.[0]?.image);

  return data;
}

/**
 * Execute searchCity tool
 */
async function executeSearchCity(args: any): Promise<any> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/search-city`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  return await response.json();
}

/**
 * Execute getAppreciation tool
 */
async function executeGetAppreciation(args: any): Promise<any> {
  const params = new URLSearchParams();
  if (args.city) params.append("city", args.city);
  if (args.subdivision) params.append("subdivision", args.subdivision);
  if (args.county) params.append("county", args.county);
  if (args.period) params.append("period", args.period);
  if (args.propertySubType) params.append("propertySubType", args.propertySubType);

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/appreciation?${params.toString()}`);
  return await response.json();
}

/**
 * Execute getMarketStats tool
 */
async function executeGetMarketStats(args: any): Promise<any> {
  const params = new URLSearchParams();
  if (args.city) params.append("city", args.city);
  if (args.subdivision) params.append("subdivision", args.subdivision);
  if (args.county) params.append("county", args.county);
  if (args.propertySubType) params.append("propertySubType", args.propertySubType);
  if (args.stats) params.append("stats", args.stats);

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/market-stats?${params.toString()}`);
  return await response.json();
}

/**
 * Execute lookupSubdivision tool
 */
async function executeLookupSubdivision(args: any): Promise<any> {
  const params = new URLSearchParams();
  if (args.query) params.append("query", args.query);
  if (args.city) params.append("city", args.city);

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/subdivision-lookup?${params.toString()}`);
  return await response.json();
}

/**
 * Execute getRegionalStats tool
 */
async function executeGetRegionalStats(args: any): Promise<any> {
  const params = new URLSearchParams();
  if (args.daysNew) params.append("daysNew", args.daysNew.toString());
  if (args.propertyType) params.append("propertyType", args.propertyType);

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/regions/coachella-valley/stats?${params.toString()}`);
  return await response.json();
}

async function executeGetNeighborhoodPageLink(args: any): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Helper to create slug from name
  const createSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Priority: subdivision > city > county
  if (args.subdivision) {
    const subdivisionSlug = createSlug(args.subdivision);
    const citySlug = args.city ? createSlug(args.city) : 'palm-desert'; // Default to Palm Desert if no city

    return {
      success: true,
      url: `${baseUrl}/neighborhoods/${citySlug}/${subdivisionSlug}`,
      title: `${args.subdivision} in ${args.city || 'Coachella Valley'}`,
      description: `View all homes and detailed information for ${args.subdivision}${args.city ? ` in ${args.city}` : ''}.`,
      type: 'subdivision'
    };
  } else if (args.city) {
    const citySlug = createSlug(args.city);

    return {
      success: true,
      url: `${baseUrl}/neighborhoods/${citySlug}`,
      title: `${args.city} Neighborhoods`,
      description: `Browse all neighborhoods and subdivisions in ${args.city}. Find homes for sale across all communities.`,
      type: 'city'
    };
  } else if (args.county) {
    // For counties, we'll direct to the neighborhoods page with a note
    return {
      success: true,
      url: `${baseUrl}/neighborhoods`,
      title: `${args.county} County Neighborhoods`,
      description: `Explore cities and neighborhoods in ${args.county} County. Browse available communities and find your perfect home.`,
      type: 'county'
    };
  } else {
    // No specific location provided - general neighborhoods page
    return {
      success: true,
      url: `${baseUrl}/neighborhoods`,
      title: 'Browse All Neighborhoods',
      description: 'Explore all cities and neighborhoods in the Coachella Valley. Find your perfect community.',
      type: 'general'
    };
  }
}

// Default placeholder for listings without photos
const DEFAULT_PHOTO_URL = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop&q=80"; // Professional house placeholder

/**
 * Batch fetch photos for multiple listings in parallel
 * @param listings Array of listings to fetch photos for
 * @returns Map of listingKey -> photoUrl
 */
async function batchFetchPhotos(listings: any[]): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();

  // Process in chunks of 10 to avoid overwhelming the server
  const chunkSize = 10;
  for (let i = 0; i < listings.length; i += chunkSize) {
    const chunk = listings.slice(i, i + chunkSize);

    // Fetch photos in parallel for this chunk
    const photoPromises = chunk.map(async (listing) => {
      const listingKey = listing.listingKey || listing.listingId;
      const photoUrl = await fetchListingPhoto(listingKey, listing);
      return [listingKey, photoUrl] as const;
    });

    const results = await Promise.all(photoPromises);
    results.forEach(([key, url]) => photoMap.set(key, url));
  }

  console.log(`[batchFetchPhotos] Fetched ${photoMap.size} photos`);
  return photoMap;
}

/**
 * Fetch listing photo from API with timeout and fallback chain
 */
async function fetchListingPhoto(listingKey: string, listing: any): Promise<string> {
  try {
    // Create AbortController for 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const photosRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/listings/${listingKey}/photos`,
      {
        cache: "force-cache",
        headers: { "Accept": "application/json" },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (photosRes.ok) {
      const photosData = await photosRes.json();
      if (photosData.photos && photosData.photos.length > 0) {
        const primaryPhoto = photosData.photos[0];
        const photoUrl = primaryPhoto.uri800 ||
               primaryPhoto.uri1024 ||
               primaryPhoto.uri640 ||
               primaryPhoto.uri1280 ||
               primaryPhoto.uriLarge ||
               "";

        if (photoUrl) {
          return photoUrl;
        }
      }
    }
  } catch (photoErr: any) {
    // Log timeout or fetch errors
    if (photoErr.name === 'AbortError') {
      console.warn(`[fetchListingPhoto] Timeout fetching photos for ${listingKey}`);
    } else {
      console.error(`[fetchListingPhoto] Failed to fetch photos for ${listingKey}:`, photoErr);
    }
  }

  // Fallback chain: database fields -> placeholder
  const fallbackUrl = listing.primaryPhoto?.uri800 ||
                      listing.primaryPhotoUrl ||
                      listing.media?.[0]?.Uri800 ||
                      DEFAULT_PHOTO_URL;

  if (fallbackUrl === DEFAULT_PHOTO_URL) {
    console.log(`[fetchListingPhoto] Using placeholder for ${listingKey}`);
  }

  return fallbackUrl;
}

/**
 * Execute getSubdivisionInfo tool
 * Get information about a subdivision (HOA, amenities, rental restrictions, etc.)
 */
async function executeGetSubdivisionInfo(args: any): Promise<any> {
  console.log('[getSubdivisionInfo] Starting with args:', JSON.stringify(args, null, 2));

  const { subdivisionName, field = 'all' } = args;

  if (!subdivisionName) {
    return {
      success: false,
      error: "subdivisionName is required"
    };
  }

  try {
    // Get subdivision data
    const subdivisionData = await getSubdivisionData(subdivisionName);

    if (!subdivisionData.found) {
      return {
        success: false,
        error: subdivisionData.error || `Subdivision "${subdivisionName}" not found`
      };
    }

    const sub = subdivisionData.subdivision!;

    // Build response based on requested field
    let response: any = {
      success: true,
      subdivision: sub.name,
      city: sub.city,
      county: sub.county
    };

    if (field === 'shortTermRentals' || field === 'all') {
      // Check short-term rental status (with fallback to nearby listings)
      const strStatus = await checkShortTermRentals(subdivisionName);

      response.shortTermRentals = {
        allowed: strStatus.allowed,
        details: strStatus.details,
        confidence: strStatus.confidence,
        source: strStatus.source
      };
    }

    if (field === 'hoa' || field === 'all') {
      response.hoa = {
        monthlyMin: sub.hoaMonthlyMin,
        monthlyMax: sub.hoaMonthlyMax,
        includes: sub.hoaIncludes
      };
    }

    if (field === 'amenities' || field === 'all') {
      response.amenities = {
        golfCourses: sub.golfCourses,
        golfCoursesNames: sub.golfCoursesNames,
        tennisCourts: sub.tennisCourts,
        pools: sub.pools,
        restaurantNames: sub.restaurantNames,
        securityType: sub.securityType
      };
    }

    if (field === 'all') {
      response.description = sub.description;
      response.features = sub.features;
      response.listingCount = sub.listingCount;
      response.priceRange = sub.priceRange;
      response.avgPrice = sub.avgPrice;
      response.medianPrice = sub.medianPrice;
      response.seniorCommunity = sub.seniorCommunity;
      response.communityType = sub.communityType;
    }

    console.log('[getSubdivisionInfo] Success:', JSON.stringify(response, null, 2).substring(0, 500));
    return response;

  } catch (error: any) {
    console.error('[getSubdivisionInfo] Error:', error);
    return {
      success: false,
      error: error.message || "Failed to get subdivision info"
    };
  }
}

/**
 * Execute getListingInfo tool
 * Get information about a specific listing by address
 */
async function executeGetListingInfo(args: any): Promise<any> {
  console.log('[getListingInfo] Starting with args:', JSON.stringify(args, null, 2));

  const { address, field = 'all' } = args;

  if (!address) {
    return {
      success: false,
      error: "address is required"
    };
  }

  try {
    // Get listing data (includes subdivision data if available)
    const listingData = await getListingData(address, true);

    if (!listingData.found) {
      return {
        success: false,
        error: listingData.error || `Listing not found for address "${address}"`
      };
    }

    const listing = listingData.listing!;

    // Build response based on requested field
    let response: any = {
      success: true,
      address: listing.address,
      city: listing.city,
      subdivisionName: listing.subdivisionName
    };

    if (field === 'shortTermRentals' || field === 'all') {
      // Check short-term rental status (with fallback chain)
      const strStatus = await checkListingShortTermRentals(address);

      response.shortTermRentals = {
        allowed: strStatus.allowed,
        details: strStatus.details,
        confidence: strStatus.confidence,
        source: strStatus.source
      };
    }

    if (field === 'hoa' || field === 'all') {
      response.hoa = {
        hasHOA: listing.associationYN,
        fee: listing.associationFee,
        frequency: listing.associationFeeFrequency
      };

      // Include subdivision HOA if available
      if (listingData.subdivisionInfo) {
        response.subdivisionHOA = {
          monthlyMin: listingData.subdivisionInfo.hoaMonthlyMin,
          monthlyMax: listingData.subdivisionInfo.hoaMonthlyMax
        };
      }
    }

    if (field === 'details' || field === 'all') {
      response.details = {
        price: listing.currentPrice,
        listPrice: listing.listPrice,
        originalListPrice: listing.originalListPrice,
        pricePerSquareFoot: listing.pricePerSquareFoot,
        bedrooms: listing.bedroomsTotal,
        bathrooms: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger,
        livingArea: listing.livingArea,
        lotSizeAcres: listing.lotSizeAcres,
        lotSizeSquareFeet: listing.lotSizeSquareFeet,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType,
        pool: listing.poolYN,
        spa: listing.spaYN,
        view: listing.viewYN,
        mlsStatus: listing.mlsStatus,
        daysOnMarket: listing.daysOnMarket,
        mlsSource: listing.mlsSource,
        listingId: listing.listingId
      };
    }

    console.log('[getListingInfo] Success:', JSON.stringify(response, null, 2).substring(0, 500));
    return response;

  } catch (error: any) {
    console.error('[getListingInfo] Error:', error);
    return {
      success: false,
      error: error.message || "Failed to get listing info"
    };
  }
}
