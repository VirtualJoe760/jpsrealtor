// src/lib/chat/tool-executor.ts
// Tool execution handlers for chat AI

/**
 * Execute a single tool call and return the result
 */
export async function executeToolCall(toolCall: any): Promise<any> {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  let result: any;

  try {
    if (functionName === "queryDatabase") {
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
  } catch (error: any) {
    console.error(`Error executing ${functionName}:`, error);
    result = { error: error.message };
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

      // Return summary + 10 sample listings for AI
      result.summary = {
        count: totalCount,
        priceRange: { min: minPrice, max: maxPrice },
        avgPrice: avgPrice,
        medianPrice: medianPrice,
        center: { lat: centerLat, lng: centerLng },
        sampleListings: await Promise.all(
          allListings.slice(0, 10).map(async (l: any) => {
            const listingKey = l.listingKey || l.listingId;
            const photoUrl = await fetchListingPhoto(listingKey, l);

            return {
              id: l.listingId || l.listingKey,
              price: l.listPrice,
              beds: l.bedroomsTotal || l.bedsTotal,
              baths: l.bathroomsTotalDecimal,
              sqft: l.livingArea,
              address: l.address || l.unparsedAddress,
              city: l.city,
              subdivision: subdivisionName,
              image: photoUrl,
              url: `/mls-listings/${l.slugAddress || l.listingId}`,
              latitude: parseFloat(l.latitude) || null,
              longitude: parseFloat(l.longitude) || null
            };
          })
        )
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

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      })
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
        sampleListings: await Promise.all(
          allListings.slice(0, 10).map(async (l: any) => {
            const photoUrl = await fetchListingPhoto(l.listingKey, l);

            return {
              id: l.listingKey,
              price: l.listPrice,
              beds: l.bedroomsTotal || l.bedsTotal,
              baths: l.bathroomsTotalDecimal,
              sqft: l.livingArea,
              address: l.address || l.unparsedAddress,
              city: l.city,
              subdivision: l.subdivisionName,
              image: photoUrl,
              url: `/mls-listings/${l.slug || l.listingKey}`,
              latitude: l.latitude,
              longitude: l.longitude,

              // Additional fields for ListingBottomPanel
              yearBuilt: l.yearBuilt,
              lotSizeSqft: l.lotSizeSqft,
              pool: l.poolYn,
              spa: l.spaYn,
              garageSpaces: l.garageSpaces,
              propertyType: l.propertyType,
              propertySubType: l.propertySubType,
              publicRemarks: l.publicRemarks,
              daysOnMarket: l.daysOnMarket,
              onMarketDate: l.onMarketDate,
              slug: l.slug,
              mlsSource: l.mlsSource,
              associationFee: l.associationFee,
              viewYn: l.viewYn
            };
          })
        )
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
  return await response.json();
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

/**
 * Fetch listing photo from API with fallback to database fields
 */
async function fetchListingPhoto(listingKey: string, listing: any): Promise<string> {
  try {
    const photosRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/listings/${listingKey}/photos`,
      {
        cache: "force-cache",
        headers: { "Accept": "application/json" }
      }
    );

    if (photosRes.ok) {
      const photosData = await photosRes.json();
      if (photosData.photos && photosData.photos.length > 0) {
        const primaryPhoto = photosData.photos[0];
        return primaryPhoto.uri800 ||
               primaryPhoto.uri1024 ||
               primaryPhoto.uri640 ||
               primaryPhoto.uri1280 ||
               primaryPhoto.uriLarge ||
               "";
      }
    }
  } catch (photoErr) {
    console.error(`[chat/stream] Failed to fetch photos for ${listingKey}:`, photoErr);
  }

  // Fallback to database photo fields
  return listing.primaryPhoto?.uri800 || listing.primaryPhotoUrl || "";
}
