// src/app/utils/chat/filter-extractor.ts
// Client-side filter extraction from natural language queries
// Simple pattern matching - no LLM needed

export interface ExtractedFilters {
  propertySubTypes?: string[];
  excludePropertySubTypes?: string[];
  subdivision?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
}

/**
 * Extract filters from user's natural language query
 * Uses simple regex patterns for deterministic, fast extraction
 */
export function extractFiltersFromQuery(userMessage: string): ExtractedFilters {
  const lower = userMessage.toLowerCase();
  const filters: ExtractedFilters = {};

  // Property type detection (trigger phrases)
  if (lower.match(/\bsingle family\b|\bsfr\b|\bhouse\b|\bhome\b/i) &&
      !lower.match(/condo|townhouse|apartment/i)) {
    filters.propertySubTypes = ['Single Family Residence'];
    filters.excludePropertySubTypes = ['Condominium', 'Townhouse', 'Residential Income'];
  }

  if (lower.match(/\bcondo\b|\bcondominium\b/i)) {
    filters.propertySubTypes = ['Condominium'];
  }

  if (lower.match(/\btownhouse\b|\btown house\b/i)) {
    filters.propertySubTypes = ['Townhouse'];
  }

  // Subdivision detection
  const subdivisionMatch = lower.match(/\bin ([a-z\s]+?)(?: subdivision| neighborhood| community|,| with| that|$)/i);
  if (subdivisionMatch) {
    filters.subdivision = subdivisionMatch[1].trim();
  }

  // City detection - Coachella Valley cities
  const cityMatch = lower.match(/\b(palm desert|rancho mirage|palm springs|la quinta|indian wells|cathedral city|desert hot springs|indio|coachella)\b/i);
  if (cityMatch) {
    filters.city = cityMatch[1];
  }

  // Price detection - "under $500k"
  const priceUnderMatch = lower.match(/\bunder \$?([\d,]+)k?\b/i);
  if (priceUnderMatch) {
    const amount = parseInt(priceUnderMatch[1].replace(/,/g, ''));
    filters.maxPrice = amount > 1000 ? amount : amount * 1000;
  }

  // Price detection - "over $500k"
  const priceOverMatch = lower.match(/\bover \$?([\d,]+)k?\b/i);
  if (priceOverMatch) {
    const amount = parseInt(priceOverMatch[1].replace(/,/g, ''));
    filters.minPrice = amount > 1000 ? amount : amount * 1000;
  }

  // Price detection - "between $800k and $1.2M"
  const priceBetweenMatch = lower.match(/\bbetween \$?([\d,]+)k? and \$?([\d,.]+)[km]?\b/i);
  if (priceBetweenMatch) {
    const min = parseFloat(priceBetweenMatch[1].replace(/,/g, ''));
    const maxStr = priceBetweenMatch[2].replace(/,/g, '');
    const max = parseFloat(maxStr);

    filters.minPrice = min > 1000 ? min : min * 1000;

    // Handle "1.2M" format
    if (priceBetweenMatch[0].toLowerCase().includes('m')) {
      filters.maxPrice = max > 100 ? max : max * 1000000;
    } else {
      filters.maxPrice = max > 1000 ? max : max * 1000;
    }
  }

  // Bedroom detection - "3 bedroom" or "3 bed"
  const bedsMatch = lower.match(/\b(\d+)\s*(?:bed|bedroom)/i);
  if (bedsMatch) {
    filters.beds = parseInt(bedsMatch[1]);
  }

  // Bathroom detection - "2 bathroom" or "2 bath"
  const bathsMatch = lower.match(/\b(\d+)\s*(?:bath|bathroom)/i);
  if (bathsMatch) {
    filters.baths = parseInt(bathsMatch[1]);
  }

  console.log('[filter-extractor] Extracted filters from query:', { userMessage, filters });

  return filters;
}

/**
 * Apply filters to listing array (client-side filtering)
 * Works with chat Listing type
 */
export function applyFiltersToListings<T extends {
  type?: string;
  propertySubType?: string;
  subdivision?: string;
  city?: string;
  price?: number;
  beds?: number;
  baths?: number;
}>(
  listings: T[],
  filters: ExtractedFilters
): T[] {
  let filtered = [...listings];

  console.log(`[filter-extractor] Applying filters to ${listings.length} listings:`, filters);

  // Property subtype filter (inclusive)
  if (filters.propertySubTypes && filters.propertySubTypes.length > 0) {
    filtered = filtered.filter(l => {
      const listingType = l.type || l.propertySubType || '';
      return filters.propertySubTypes!.includes(listingType);
    });
    console.log(`[filter-extractor] After propertySubTypes filter: ${filtered.length} listings`);
  }

  // Property subtype exclusion filter
  if (filters.excludePropertySubTypes && filters.excludePropertySubTypes.length > 0) {
    filtered = filtered.filter(l => {
      const listingType = l.type || l.propertySubType || '';
      return !filters.excludePropertySubTypes!.includes(listingType);
    });
    console.log(`[filter-extractor] After exclude filter: ${filtered.length} listings`);
  }

  // Subdivision filter
  if (filters.subdivision) {
    filtered = filtered.filter(l =>
      l.subdivision?.toLowerCase().includes(filters.subdivision!.toLowerCase())
    );
    console.log(`[filter-extractor] After subdivision filter: ${filtered.length} listings`);
  }

  // City filter
  if (filters.city) {
    filtered = filtered.filter(l =>
      l.city?.toLowerCase() === filters.city!.toLowerCase()
    );
    console.log(`[filter-extractor] After city filter: ${filtered.length} listings`);
  }

  // Min price filter
  if (filters.minPrice) {
    filtered = filtered.filter(l => (l.price || 0) >= filters.minPrice!);
    console.log(`[filter-extractor] After minPrice filter (>= $${filters.minPrice}): ${filtered.length} listings`);
  }

  // Max price filter
  if (filters.maxPrice) {
    filtered = filtered.filter(l => (l.price || 0) <= filters.maxPrice!);
    console.log(`[filter-extractor] After maxPrice filter (<= $${filters.maxPrice}): ${filtered.length} listings`);
  }

  // Beds filter (minimum)
  if (filters.beds) {
    filtered = filtered.filter(l => (l.beds || 0) >= filters.beds!);
    console.log(`[filter-extractor] After beds filter (>= ${filters.beds}): ${filtered.length} listings`);
  }

  // Baths filter (minimum)
  if (filters.baths) {
    filtered = filtered.filter(l => (l.baths || 0) >= filters.baths!);
    console.log(`[filter-extractor] After baths filter (>= ${filters.baths}): ${filtered.length} listings`);
  }

  console.log(`[filter-extractor] Final result: ${filtered.length} listings`);

  return filtered;
}
