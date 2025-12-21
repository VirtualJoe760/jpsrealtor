# Cities Implementation Action Plan
## Comprehensive Filtering for City-Level Queries

**Created**: December 19, 2025
**Status**: Ready for Implementation
**Dependencies**: Comprehensive Filtering System (Subdivisions) ✅ Complete

---

## Executive Summary

This document outlines the action plan for extending comprehensive filtering functionality to city-level queries. Cities require a different approach than subdivisions due to larger datasets and broader geographic scope.

### Important Database Note

**Days on Market Field**:
- Database stores: `onMarketDate` (timestamp, e.g., "2018-03-03T09:00:00Z")
- NOT `daysOnMarket` (may exist but unreliable)
- Calculate days: `Math.floor((Date.now() - new Date(onMarketDate)) / 86400000)`
- For 7-day filter: `onMarketDate >= new Date(Date.now() - 7 * 86400000)`

### Key Differences from Subdivisions

| Aspect | Subdivisions | Cities |
|--------|-------------|--------|
| **Dataset Size** | Small (20-100 listings) | Large (500-5000+ listings) |
| **Default Query** | Show all listings | Show newest only (onMarketDate ≤7 days) |
| **Result Limit** | No hard limit | 100 listings max |
| **Filter Strategy** | Optional filters | Encourage specific filters |
| **Geographic Filters** | Not needed | Support directional (east/west of street) |
| **HOA Filters** | Basic boolean | Support price range ("under $300/m") |

---

## Current Subdivision Implementation (Baseline)

### What Works Well ✅

1. **20+ Comprehensive Filters**: Price, beds, baths, size, year, amenities, garage, stories, property type
2. **Exact Match for Beds/Baths**: "3 beds" = exactly 3, not 3+
3. **Property Type Stats**: Aggregation pipeline provides detailed market snapshot
4. **Markdown Formatting**: AI responses use tables, bold text, bullet points
5. **Component Markers**: Internal markers stripped from displayed text
6. **Tool Execution Flow**: Two-call AI pattern (tool → results → response)

### Example Subdivision Query Flow

```
User: "show me 3 bed homes in pdcc with pools"
  ↓
AI Call #1: Identifies searchHomes tool needed
  ↓
Tool Executor: Fetches stats from /api/subdivisions/pdcc/listings?beds=3&pool=true&limit=1
  ↓
Stats Return: { totalListings: 31, avgPrice: 524448, propertyTypes: [...] }
  ↓
AI Call #2: Formats response with markdown
  ↓
Frontend: Displays formatted text + listing carousel component
  ↓
Component: Fetches full data from /api/subdivisions/pdcc/listings?beds=3&pool=true
```

---

## Cities Requirements

### User Stories

1. **General City Query** (No filters)
   - **Input**: "show me homes in la quinta"
   - **Expected Behavior**:
     - Return newest listings only (onMarketDate within past 7 days)
     - Maximum 100 listings
     - AI suggests adding filters for specific results
     - User can open mapview to see all listings
     - **Note**: Calculate daysOnMarket from `onMarketDate` field

2. **Specific Filtered Query**
   - **Input**: "non hoa properties in la quinta east of washington street 3bed 2bath with a pool only"
   - **Expected Behavior**:
     - Apply all filters including geographic
     - Return up to 100 matching listings
     - Provide comprehensive stats

3. **HOA-Specific Query**
   - **Input**: "properties in la quinta west of adams with an hoa under $300/m single family only"
   - **Expected Behavior**:
     - Apply HOA price range filter
     - Apply geographic filter (west of adams)
     - Apply property type filter (single family)
     - Return matching results with stats

---

## Implementation Steps

### Phase 1: API Route Modifications

**File**: `src/app/api/cities/[cityId]/listings/route.ts`

#### Changes Required:

1. **Add Default Sorting for General Queries**
   ```typescript
   // Determine if this is a general query (no filters except location)
   const hasFilters = Object.keys(filterArgs).length > 0;

   // For general queries, prioritize newest listings (≤7 days old)
   // NOTE: We calculate daysOnMarket from onMarketDate field
   const sortBy = !hasFilters
     ? { onMarketDate: -1 }  // Newest first (most recent onMarketDate)
     : { listDate: -1 };      // Normal sort for filtered queries

   // Add filter for general queries - only show listings from past 7 days
   if (!hasFilters) {
     const sevenDaysAgo = new Date();
     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

     baseQuery.onMarketDate = {
       $gte: sevenDaysAgo.toISOString()
     };
   }
   ```

2. **Implement Hard Limit**
   ```typescript
   const MAX_CITY_LISTINGS = 100;

   const listings = await UnifiedListing.find(baseQuery)
     .sort(sortBy)
     .limit(Math.min(limit || MAX_CITY_LISTINGS, MAX_CITY_LISTINGS))
     .select(/* fields */);
   ```

3. **Add Geographic Filters**
   ```typescript
   // New filter parameters
   const {
     // ... existing filters
     eastOf,    // Street name (e.g., "washington street")
     westOf,    // Street name
     northOf,   // Street name
     southOf,   // Street name
   } = req.query;

   // Implementation (requires geocoding or street boundary data)
   // This will need geographic boundary lookup
   if (eastOf) {
     const streetLongitude = await getStreetLongitude(eastOf, cityId);
     baseQuery.longitude = { $gt: streetLongitude };
   }
   ```

4. **Enhance HOA Filters**
   ```typescript
   // Replace simple hoaYN boolean with price range support
   const {
     hasHOA,        // boolean: true = has HOA, false = no HOA
     maxHOA,        // number: maximum monthly HOA fee
     minHOA,        // number: minimum monthly HOA fee
   } = req.query;

   if (hasHOA === false || hasHOA === 'false') {
     // No HOA
     baseQuery.$and = baseQuery.$and || [];
     baseQuery.$and.push({
       $or: [
         { hoaYN: false },
         { hoaYN: { $exists: false } },
         { associationFee: 0 },
         { associationFee: { $exists: false } }
       ]
     });
   } else if (hasHOA === true || hasHOA === 'true') {
     // Has HOA
     baseQuery.$and = baseQuery.$and || [];
     baseQuery.$and.push({
       $and: [
         { hoaYN: true },
         { associationFee: { $gt: 0 } }
       ]
     });

     // Apply HOA price filters if provided
     if (maxHOA) {
       baseQuery.associationFee = baseQuery.associationFee || {};
       baseQuery.associationFee.$lte = Number(maxHOA);
     }
     if (minHOA) {
       baseQuery.associationFee = baseQuery.associationFee || {};
       baseQuery.associationFee.$gte = Number(minHOA);
     }
   }
   ```

5. **Add "General Query" Flag to Response**
   ```typescript
   return NextResponse.json({
     success: true,
     data: listings,
     stats: {
       totalListings: stats.totalListings,
       displayedListings: listings.length,
       isGeneralQuery: !hasFilters,
       suggestFilters: !hasFilters && stats.totalListings > 100,
       // ... other stats
     }
   });
   ```

---

### Phase 2: Tool Definitions

**File**: `src/lib/chat-v2/tools.ts`

#### Changes Required:

Add new parameters to searchHomes tool:

```typescript
{
  type: "function",
  function: {
    name: "searchHomes",
    description: "Search for homes and properties. Use for any property search, browsing, new listings, or pricing questions. Supports comprehensive filtering.",
    parameters: {
      type: "object",
      properties: {
        // ... existing 20+ parameters

        // NEW: Geographic filters
        eastOf: {
          type: "string",
          description: "Show listings east of this street (e.g., 'Washington Street')"
        },
        westOf: {
          type: "string",
          description: "Show listings west of this street (e.g., 'Adams Street')"
        },
        northOf: {
          type: "string",
          description: "Show listings north of this street"
        },
        southOf: {
          type: "string",
          description: "Show listings south of this street"
        },

        // NEW: Enhanced HOA filters
        hasHOA: {
          type: "boolean",
          description: "Filter by HOA presence. true = has HOA, false = no HOA"
        },
        maxHOA: {
          type: "number",
          description: "Maximum monthly HOA fee in dollars (e.g., 300 for 'under $300/month')"
        },
        minHOA: {
          type: "number",
          description: "Minimum monthly HOA fee in dollars"
        }
      },
      required: ["location"]
    }
  }
}
```

---

### Phase 3: Tool Executor Updates

**File**: `src/lib/chat-v2/tool-executors.ts`

#### Changes Required:

1. **Update executeSearchHomes function signature**:
   ```typescript
   async function executeSearchHomes(args: {
     location: string;
     // ... existing 20+ filters

     // NEW: Geographic filters
     eastOf?: string;
     westOf?: string;
     northOf?: string;
     southOf?: string;

     // NEW: Enhanced HOA filters
     hasHOA?: boolean;
     maxHOA?: number;
     minHOA?: number;
   }): Promise<{ success: boolean; data: any }> {
   ```

2. **Build filters object with new parameters**:
   ```typescript
   // Geographic filters
   if (filterArgs.eastOf) filters.eastOf = filterArgs.eastOf;
   if (filterArgs.westOf) filters.westOf = filterArgs.westOf;
   if (filterArgs.northOf) filters.northOf = filterArgs.northOf;
   if (filterArgs.southOf) filters.southOf = filterArgs.southOf;

   // HOA filters
   if (filterArgs.hasHOA !== undefined) filters.hasHOA = filterArgs.hasHOA;
   if (filterArgs.maxHOA) filters.maxHOA = filterArgs.maxHOA;
   if (filterArgs.minHOA) filters.minHOA = filterArgs.minHOA;
   ```

3. **Pass filters to API call**:
   ```typescript
   const params = new URLSearchParams({ limit: '1' });
   Object.entries(filterArgs).forEach(([key, value]) => {
     if (value !== undefined && value !== null) {
       params.append(key, String(value));
     }
   });
   ```

4. **Return stats with general query flag**:
   ```typescript
   return {
     success: true,
     data: {
       component: "neighborhood",
       neighborhood: {
         type: entityResult.type,
         name: location,
         normalizedName: entityResult.value,
         cityId: entityResult.value.toLowerCase().replace(/\s+/g, "-"),
         filters,
         isGeneralQuery: !Object.keys(filters).length  // No filters = general query
       },
       location: { /* ... */ },
       stats: stats || { /* ... */ }
     }
   };
   ```

---

### Phase 4: System Prompt Updates

**File**: `src/lib/chat-v2/system-prompt.ts`

#### Changes Required:

Add city-specific instructions:

```typescript
export const SYSTEM_PROMPT = `You are a helpful real estate AI assistant...

## CITY QUERIES - IMPORTANT!

Cities have larger datasets than subdivisions. Follow these guidelines:

### General City Queries (No Filters)
When a user asks for general city results like "show me homes in La Quinta":

1. **Use searchHomes tool** with ONLY the location parameter
2. **Explain the results**: "I'm showing you the newest listings from the past 7 days in La Quinta (up to 100 properties)"
3. **Encourage filters**: "To see specific results, try adding filters like:
   - Budget range: 'homes under $500k'
   - Features: '3 bed 2 bath with pool'
   - Location: 'east of Washington Street'
   - HOA: 'no HOA' or 'HOA under $300/month'
   - Property type: 'single family only'"
4. **Mention mapview**: "You can also open the map view to browse all [X] listings in La Quinta."

### Filtered City Queries
When a user provides specific criteria like "3 bed homes with pool in La Quinta":

1. **Use searchHomes tool** with all relevant filters
2. **Show comprehensive stats** (same as subdivision queries)
3. **Format with markdown tables** showing property type breakdown

### Geographic Filters
Support directional queries:
- "east of Washington Street" → eastOf parameter
- "west of Adams" → westOf parameter
- "north of Highway 111" → northOf parameter
- "south of Avenue 50" → southOf parameter

### HOA Filters
Support various HOA queries:
- "no HOA" → hasHOA: false
- "with HOA" → hasHOA: true
- "HOA under $300/month" → hasHOA: true, maxHOA: 300
- "HOA between $200-$500/month" → hasHOA: true, minHOA: 200, maxHOA: 500

## EXAMPLE CITY RESPONSES

**User**: "show me homes in la quinta"
**You**: "[LISTING_CAROUSEL]I'm showing you the **newest listings** in La Quinta from the past 7 days (up to 100 properties).

**Quick Stats:**
- 87 new listings
- Average: $645,000 | Median: $575,000

To see specific results, add filters like:
• Budget: 'homes under $600k'
• Features: '3 bed 2 bath with pool'
• Location: 'east of Washington Street'
• HOA: 'no HOA properties'

You can also open map view to browse all 1,247 listings in La Quinta!"

**User**: "non hoa properties in la quinta east of washington street 3bed 2bath with a pool only"
**You**: "[LISTING_CAROUSEL]I found **23 non-HOA homes** in La Quinta east of Washington Street with 3 beds, 2 baths, and a pool.

**Market Overview:**
- Average: $485,000 | Median: $475,000
- Range: $395,000 - $625,000

**Property Types:**
| Type | Count | Avg Price | $/sqft |
|------|-------|-----------|--------|
| Single-Family | 21 | $482,000 | $268 |
| Manufactured | 2 | $515,000 | $245 |

These homes offer pool living without HOA fees in east La Quinta!"

**User**: "properties in la quinta west of adams with an hoa under $300/m single family only"
**You**: "[LISTING_CAROUSEL]I found **34 single-family homes** in La Quinta west of Adams with HOA under $300/month.

**Market Overview:**
- Average: $425,000 | Median: $415,000
- HOA Range: $125 - $295/month

**Property Types:**
| Type | Count | Avg Price | $/sqft | Avg HOA |
|------|-------|-----------|--------|---------|
| Single-Family | 34 | $425,000 | $245 | $215 |

Affordable HOA fees in west La Quinta - great value!"
`;
```

---

### Phase 5: Frontend Component Updates

**File**: `src/app/components/chat/ChatResultsContainer.tsx`

#### Changes Required:

1. **Add new filter parameters to API calls**:
   ```typescript
   // Geographic filters
   if (f.eastOf) params.append('eastOf', f.eastOf);
   if (f.westOf) params.append('westOf', f.westOf);
   if (f.northOf) params.append('northOf', f.northOf);
   if (f.southOf) params.append('southOf', f.southOf);

   // HOA filters
   if (f.hasHOA !== undefined) params.append('hasHOA', String(f.hasHOA));
   if (f.maxHOA) params.append('maxHOA', f.maxHOA.toString());
   if (f.minHOA) params.append('minHOA', f.minHOA.toString());
   ```

2. **Handle general query responses**:
   ```typescript
   // Check if this is a general query with suggestions
   if (data.stats?.isGeneralQuery && data.stats?.suggestFilters) {
     console.log('[ChatResults] General city query - AI will suggest filters');
   }
   ```

**File**: `src/app/utils/swipe/ChatQueueStrategy.ts`

Same changes as ChatResultsContainer for filter parameters.

**File**: `src/app/components/chat/ChatProvider.tsx`

Update TypeScript interfaces:

```typescript
neighborhood?: {
  type: "city" | "subdivision" | "county" | "region";
  cityId?: string;
  subdivisionSlug?: string;
  countyId?: string;
  name: string;
  normalizedName?: string;
  isGeneralQuery?: boolean;  // NEW
  filters?: {
    // ... existing 20+ filters

    // NEW: Geographic filters
    eastOf?: string;
    westOf?: string;
    northOf?: string;
    southOf?: string;

    // NEW: Enhanced HOA filters
    hasHOA?: boolean;
    maxHOA?: number;
    minHOA?: number;
  };
};
```

---

### Phase 6: Geographic Filter Implementation

This is the most complex part and requires additional infrastructure.

#### Option 1: Street Boundary Database (Recommended)

1. **Create Street Boundaries Collection**:
   ```typescript
   // New MongoDB collection: street_boundaries
   interface StreetBoundary {
     cityId: string;
     streetName: string;
     normalizedName: string;
     direction: 'north-south' | 'east-west';
     coordinates: {
       latitude?: number;   // For east-west streets
       longitude?: number;  // For north-south streets
     };
     bounds: {
       minLat: number;
       maxLat: number;
       minLng: number;
       maxLng: number;
     };
   }
   ```

2. **Seed Major Streets** for each city:
   ```javascript
   // Example for La Quinta
   const laQuintaStreets = [
     {
       cityId: 'la-quinta',
       streetName: 'Washington Street',
       normalizedName: 'washington',
       direction: 'north-south',
       coordinates: { longitude: -116.310 },  // Approximate
       bounds: { /* city bounds */ }
     },
     {
       cityId: 'la-quinta',
       streetName: 'Adams Street',
       normalizedName: 'adams',
       direction: 'north-south',
       coordinates: { longitude: -116.275 }
     },
     {
       cityId: 'la-quinta',
       streetName: 'Highway 111',
       normalizedName: 'highway-111',
       direction: 'east-west',
       coordinates: { latitude: 33.663 }
     }
   ];
   ```

3. **Implement Lookup Function**:
   ```typescript
   // src/lib/geo/street-lookup.ts
   export async function getStreetCoordinate(
     streetName: string,
     cityId: string
   ): Promise<{ latitude?: number; longitude?: number } | null> {
     const normalized = streetName.toLowerCase()
       .replace(/street|st|avenue|ave|boulevard|blvd|highway|hwy/g, '')
       .trim();

     const street = await StreetBoundary.findOne({
       cityId,
       normalizedName: { $regex: new RegExp(normalized, 'i') }
     });

     return street?.coordinates || null;
   }
   ```

4. **Apply Geographic Filters in API**:
   ```typescript
   // In cities/[cityId]/listings/route.ts
   import { getStreetCoordinate } from '@/lib/geo/street-lookup';

   if (eastOf) {
     const coord = await getStreetCoordinate(eastOf, cityId);
     if (coord?.longitude) {
       baseQuery.longitude = { $gt: coord.longitude };
     }
   }

   if (westOf) {
     const coord = await getStreetCoordinate(westOf, cityId);
     if (coord?.longitude) {
       baseQuery.longitude = { $lt: coord.longitude };
     }
   }

   if (northOf) {
     const coord = await getStreetCoordinate(northOf, cityId);
     if (coord?.latitude) {
       baseQuery.latitude = { $gt: coord.latitude };
     }
   }

   if (southOf) {
     const coord = await getStreetCoordinate(southOf, cityId);
     if (coord?.latitude) {
       baseQuery.latitude = { $lt: coord.latitude };
     }
   }
   ```

#### Option 2: Geocoding API (Alternative)

Use Google Maps Geocoding API or similar to resolve street names to coordinates on-the-fly. More flexible but requires API calls.

---

## Testing Strategy

### Test Cases

#### 1. General City Query
```
Input: "show me homes in la quinta"
Expected:
✅ Returns max 100 listings
✅ Listings have daysOnMarket ≤ 7 (or recent listDate)
✅ AI suggests adding filters
✅ AI mentions mapview option
✅ Stats show totalListings vs displayedListings
```

#### 2. Filtered City Query (No Geographic)
```
Input: "3 bed 2 bath homes with pool in la quinta under $500k"
Expected:
✅ Applies all filters correctly
✅ Returns exact match for beds/baths
✅ Includes pool filter
✅ Respects price cap
✅ Shows property type breakdown
✅ No suggestion to add filters
```

#### 3. Geographic Filter (East Of)
```
Input: "homes in la quinta east of washington street"
Expected:
✅ Identifies washington street longitude
✅ Filters listings with longitude > street longitude
✅ Returns correct subset
✅ Stats reflect filtered data
```

#### 4. HOA Filter (No HOA)
```
Input: "non hoa properties in la quinta"
Expected:
✅ Filters out listings with hoaYN: true
✅ Filters out listings with associationFee > 0
✅ Returns only non-HOA properties
```

#### 5. HOA Price Range
```
Input: "homes with hoa under $300/month in la quinta"
Expected:
✅ Filters hasHOA: true
✅ Filters maxHOA: 300
✅ Returns only listings with HOA ≤ $300/month
✅ Stats show HOA range
```

#### 6. Complex Combined Query
```
Input: "non hoa properties in la quinta east of washington street 3bed 2bath with a pool only single family"
Expected:
✅ All filters applied correctly
✅ Returns intersection of all criteria
✅ Property type breakdown shows only single-family
✅ Stats accurate
```

### Performance Testing

1. **Query Performance**:
   - General city query should return < 500ms
   - Filtered query should return < 1s
   - Geographic queries should return < 1.5s (includes street lookup)

2. **Database Indexing**:
   ```javascript
   // Ensure these indexes exist
   UnifiedListing.index({ cityId: 1, onMarketDate: -1 });  // For newest-first sorting
   UnifiedListing.index({ cityId: 1, listDate: -1 });
   UnifiedListing.index({ cityId: 1, longitude: 1, latitude: 1 });
   UnifiedListing.index({ cityId: 1, hoaYN: 1, associationFee: 1 });
   ```

3. **Load Testing**:
   - Test with La Quinta (large dataset: ~1,200 listings)
   - Test with Palm Desert (very large: ~3,500 listings)
   - Ensure 100-listing limit prevents performance degradation

---

## Migration Plan

### Step 1: Database Setup (1-2 hours)
- [ ] Create street_boundaries collection
- [ ] Seed major streets for Coachella Valley cities
- [ ] Create required indexes

### Step 2: API Updates (2-3 hours)
- [ ] Update cities/[cityId]/listings/route.ts
- [ ] Implement default sorting for general queries
- [ ] Add 100-listing hard limit
- [ ] Implement geographic filters with street lookup
- [ ] Enhance HOA filters with price range

### Step 3: Tool Updates (1 hour)
- [ ] Update tools.ts with new parameters
- [ ] Update tool-executors.ts to pass new filters
- [ ] Update return data structure with isGeneralQuery flag

### Step 4: System Prompt Updates (1 hour)
- [ ] Add city-specific instructions
- [ ] Add example responses for general queries
- [ ] Add example responses for geographic queries
- [ ] Add example responses for HOA queries

### Step 5: Frontend Updates (1-2 hours)
- [ ] Update ChatResultsContainer.tsx
- [ ] Update ChatQueueStrategy.ts
- [ ] Update ChatProvider.tsx TypeScript interfaces
- [ ] Test component rendering

### Step 6: Testing (2-3 hours)
- [ ] Test all 6 test cases above
- [ ] Performance testing with large datasets
- [ ] Edge case testing (no results, invalid streets, etc.)
- [ ] Cross-browser testing

### Step 7: Documentation (1 hour)
- [ ] Update COMPREHENSIVE_FILTERING_SYSTEM.md
- [ ] Add cities section
- [ ] Document geographic filter usage
- [ ] Update README.md

**Total Estimated Time**: 10-14 hours

---

## Edge Cases to Handle

### 1. No Results
```typescript
if (listings.length === 0 && hasFilters) {
  return NextResponse.json({
    success: true,
    data: [],
    stats: {
      totalListings: 0,
      suggestion: "Try expanding your filters - reduce number of bedrooms, increase price range, or remove amenity requirements"
    }
  });
}
```

### 2. Invalid Street Name
```typescript
if (eastOf) {
  const coord = await getStreetCoordinate(eastOf, cityId);
  if (!coord) {
    console.warn(`[Cities API] Street not found: ${eastOf} in ${cityId}`);
    // Continue without geographic filter
    // Could optionally return error or suggestion
  }
}
```

### 3. Conflicting Geographic Filters
```typescript
// User says "east of washington AND west of adams"
// These might be contradictory depending on street positions
if (eastOf && westOf) {
  const eastCoord = await getStreetCoordinate(eastOf, cityId);
  const westCoord = await getStreetCoordinate(westOf, cityId);

  if (eastCoord?.longitude && westCoord?.longitude) {
    if (eastCoord.longitude > westCoord.longitude) {
      // Contradiction - no area exists east of washington AND west of adams
      return NextResponse.json({
        success: false,
        error: "Geographic filters conflict - no area exists matching criteria"
      });
    }
  }
}
```

### 4. General Query with >100 Results
```typescript
if (!hasFilters && stats.totalListings > 100) {
  stats.message = `Showing 100 of ${stats.totalListings} total listings. Add filters for specific results or open map view to browse all.`;
}
```

---

## Success Metrics

### Functional Metrics
- [ ] General city queries return ≤100 newest listings
- [ ] All 20+ filters work correctly for cities
- [ ] Geographic filters correctly subset results
- [ ] HOA price range filters work accurately
- [ ] No results trigger appropriate suggestions
- [ ] AI responses include comprehensive stats with markdown

### Performance Metrics
- [ ] General queries < 500ms
- [ ] Filtered queries < 1s
- [ ] Geographic queries < 1.5s
- [ ] Database indexes utilized (check .explain())

### User Experience Metrics
- [ ] AI suggests filters for general queries
- [ ] AI mentions mapview option
- [ ] Markdown formatting renders correctly
- [ ] Component markers hidden from user
- [ ] Stats provide useful market snapshot

---

## Future Enhancements

### Phase 2 Features (After Initial Release)

1. **Polygon Geographic Filters**
   - Support complex geographic queries like "within 1 mile of downtown"
   - Implement radius searches
   - Support ZIP code boundary filtering

2. **Smart Filter Suggestions**
   - When no results, AI suggests specific filter relaxations
   - "Try increasing max price to $550k" instead of generic message

3. **Saved Searches**
   - Allow users to save complex filter combinations
   - "Save this search and notify me of new listings"

4. **Comparative Analysis**
   - "Compare homes east vs west of Washington Street"
   - Side-by-side stats for different filter combinations

5. **School District Filters**
   - "homes in [city] within [school district] boundaries"
   - Integrate school rating data

---

## Appendix: Key Files Reference

### Files to Modify
1. `src/app/api/cities/[cityId]/listings/route.ts` - Main API logic
2. `src/lib/chat-v2/tools.ts` - Tool definitions
3. `src/lib/chat-v2/tool-executors.ts` - Tool execution
4. `src/lib/chat-v2/system-prompt.ts` - AI instructions
5. `src/app/components/chat/ChatResultsContainer.tsx` - Frontend display
6. `src/app/utils/swipe/ChatQueueStrategy.ts` - Swipe queue
7. `src/app/components/chat/ChatProvider.tsx` - TypeScript interfaces

### New Files to Create
1. `src/models/StreetBoundary.ts` - Street boundary model
2. `src/lib/geo/street-lookup.ts` - Geographic lookup utilities
3. `src/scripts/seed-streets.ts` - Street data seeding script

### Database Collections
1. `unified_listings` - Existing listings collection
2. `street_boundaries` - New geographic reference data

---

## Questions to Resolve

1. **Street Boundary Data Source**:
   - Do we have existing geographic data for major streets?
   - Should we use a geocoding API or pre-seed boundaries?
   - What's the budget for geocoding API calls if needed?

2. **HOA Data Quality**:
   - Are `hoaYN` and `associationFee` fields consistently populated?
   - Do we need data cleanup before implementing HOA filters?

3. **Performance Targets**:
   - Is 100-listing limit acceptable for all cities?
   - Should limit be configurable per city based on dataset size?

4. **User Experience**:
   - Should we show "X more listings available" count in general queries?
   - How prominent should the mapview suggestion be?

---

**Next Steps**: Review this plan, resolve questions, then proceed with Phase 1 implementation.
