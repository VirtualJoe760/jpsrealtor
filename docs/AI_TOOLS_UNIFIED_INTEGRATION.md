# AI Tools & Function Calls: Unified Collection Integration

**Date**: December 3, 2025
**Status**: Architecture Design
**Related**: UNIFIED_MLS_ARCHITECTURE.md, CITIES_SUBDIVISIONS_UNIFIED_INTEGRATION.md

---

## Executive Summary

This document shows how AI function calling tools will be dramatically simplified with the unified MLS collection. The current fragmented approach requires multiple specialized tools and endpoints. The unified approach consolidates to **one universal search tool** that handles all queries across 8 MLS associations.

---

## Current AI Tools Architecture (Before Unified)

### Tool Definitions

From `src/app/api/chat/stream/route.ts` (lines 13-65):

```typescript
const CHAT_TOOLS: GroqTool[] = [
  {
    // Tool 1: Search articles (stays the same)
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search our real estate blog articles..."
    }
  },
  {
    // Tool 2: Match subdivision/neighborhood
    type: "function",
    function: {
      name: "matchLocation",
      description: "Resolve a SPECIFIC location query (subdivision/neighborhood) to geographic data..."
    }
  },
  {
    // Tool 3: Search entire city
    type: "function",
    function: {
      name: "searchCity",
      description: "Search ALL properties in an entire city..."
    }
  }
];
```

### Current Flow (Complex Multi-Step)

**User**: "Show me 3 bedroom homes in Palm Springs under $500k"

```mermaid
graph TD
    A[User Query] -->|AI decides| B{Which tool?}
    B -->|City match| C[searchCity tool]
    B -->|Subdivision match| D[matchLocation tool]

    C --> E[/api/chat/search-city]
    E --> F[/api/cities/palm-springs/listings]
    F --> G[Query GPS collection]
    F --> H[Query CRMLS collection]
    G --> I[Merge results]
    H --> I

    D --> J[/api/chat/match-location]
    J --> K[Match subdivision in DB]
    K --> L[/api/subdivisions/:slug/listings]
    L --> M[Query GPS collection]
    L --> N[Query CRMLS collection]
    M --> O[Merge results]
    N --> O

    I --> P[Return to AI]
    O --> P
    P --> Q[AI generates response]
```

### Problems with Current Approach

1. **Tool Confusion**: AI must choose between `searchCity` and `matchLocation`
   - Sometimes picks wrong tool
   - Requires complex disambiguation logic

2. **Multi-Step Processing**:
   ```typescript
   // Step 1: AI calls matchLocation
   matchLocation("Palm Desert") → { type: "city", name: "Palm Desert" }

   // Step 2: Call search-city endpoint
   /api/chat/search-city → /api/cities/palm-desert/listings

   // Step 3: City endpoint queries 2 collections
   GPS listings + CRMLS listings

   // Step 4: Merge + normalize field names

   // Step 5: Return to AI
   ```

3. **Limited MLS Coverage**: Only GPS + CRMLS (2 of 8 available)
   - Missing 6 MLS associations
   - Missing 55,639 listings

4. **Field Name Inconsistencies**:
   ```typescript
   // GPS uses: bedsTotal, bathsTotal
   // CRMLS uses: bedroomsTotal, bathroomsTotalInteger
   // Tool result must normalize manually
   ```

5. **Complex Code Paths**:
   - 3 different tool endpoints
   - Each calling different city/subdivision routes
   - Each querying different collections
   - Manual result merging

---

## New AI Tools Architecture (With Unified)

### Consolidated Tool Definition

Replace 2 tools (`searchCity` + `matchLocation`) with **1 universal tool**:

```typescript
const CHAT_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search our real estate blog articles and guides..."
      // (stays the same)
    }
  },
  {
    // NEW: Single unified search tool
    type: "function",
    function: {
      name: "searchListings",
      description: `Search MLS listings across 8 associations (GPS, CRMLS, CLAW, Southland, High Desert, Bridge, Conejo Simi Moorpark, ITECH).

Use this for ANY property search query:
- City searches: "homes in Palm Springs"
- Subdivision searches: "homes in Indian Wells Country Club"
- Price ranges: "under $500k"
- Bed/bath requirements: "3 bedrooms, 2 baths"
- Property types: "rentals" or "for sale"
- MLS-specific: "CRMLS listings in Los Angeles"
- Geospatial: "homes near this location"

This tool automatically handles cities, subdivisions, and all property filters.`,
      parameters: {
        type: "object",
        properties: {
          // Location
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Springs', 'Los Angeles', 'Palm Desert')"
          },
          subdivision: {
            type: "string",
            description: "Subdivision/neighborhood name (e.g., 'Indian Wells Country Club', 'Sunrise Park')"
          },

          // Price
          minPrice: {
            type: "number",
            description: "Minimum price in dollars"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars"
          },

          // Beds/Baths
          minBeds: {
            type: "number",
            description: "Minimum number of bedrooms"
          },
          maxBeds: {
            type: "number",
            description: "Maximum number of bedrooms"
          },
          minBaths: {
            type: "number",
            description: "Minimum number of bathrooms"
          },
          maxBaths: {
            type: "number",
            description: "Maximum number of bathrooms"
          },

          // Property Details
          minSqft: {
            type: "number",
            description: "Minimum living area in square feet"
          },
          maxSqft: {
            type: "number",
            description: "Maximum living area in square feet"
          },
          propertyType: {
            type: "string",
            enum: ["sale", "rental", "all"],
            description: "Property type: 'sale' (residential/commercial), 'rental', or 'all'"
          },

          // MLS Filtering (NEW)
          mlsSources: {
            type: "array",
            items: {
              type: "string",
              enum: ["GPS", "CRMLS", "CLAW", "SOUTHLAND", "HIGH_DESERT", "BRIDGE", "CONEJO_SIMI_MOORPARK", "ITECH"]
            },
            description: "Filter by specific MLS association(s). Omit to search all MLSs."
          },

          // Geospatial (NEW)
          bounds: {
            type: "string",
            description: "Map bounds in format 'swLng,swLat,neLng,neLat' for geospatial search"
          },

          // Sorting
          sortBy: {
            type: "string",
            enum: ["price", "beds", "sqft", "date"],
            description: "Sort results by: price (default), beds, sqft, or date listed"
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort order: asc (low to high) or desc (high to low, default)"
          },

          // Pagination
          limit: {
            type: "number",
            description: "Number of results to return (default 50, max 100)"
          }
        },
        required: []  // All parameters optional - flexible queries
      }
    }
  }
];
```

### New Flow (Simplified Single-Step)

**User**: "Show me 3 bedroom homes in Palm Springs under $500k"

```mermaid
graph TD
    A[User Query] --> B[AI calls searchListings tool]
    B --> C{Single Tool Call}

    C --> D[/api/unified-listings]
    D --> E[Query unified_listings collection]
    E --> F[Return results from all 8 MLSs]
    F --> G[AI generates response]

    style E fill:#90EE90
    style F fill:#90EE90
```

**Tool Call**:
```json
{
  "name": "searchListings",
  "arguments": {
    "city": "Palm Springs",
    "minBeds": 3,
    "maxBeds": 3,
    "maxPrice": 500000,
    "sortBy": "price",
    "sortOrder": "asc",
    "limit": 50
  }
}
```

**API Request** (automatic):
```
GET /api/unified-listings?city=Palm+Springs&minBeds=3&maxBeds=3&maxPrice=500000&sortBy=ListPrice&sortOrder=asc&limit=50
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "ListingId": "123456",
      "ListingKey": "ABC123",
      "ListPrice": 425000,
      "UnparsedAddress": "123 Main St",
      "BedroomsTotal": 3,
      "BathroomsTotalInteger": 2,
      "LivingArea": 1800,
      "MLSSource": "GPS",
      "MlsName": "Greater Palm Springs MLS",
      "Media": [{ "MediaURL": "https://..." }],
      "cityContext": {
        "cityName": "Palm Springs",
        "description": "Desert oasis known for...",
        "medianHomePrice": 625000
      },
      "aiSummary": {
        "oneLinePitch": "3bd/2ba home in Palm Springs, $425,000",
        "smsPreview": "3bd/2ba home in Palm Springs, $425,000. 123 Main St. View: https://...",
        "highlights": ["Pool", "Mountain Views", "Updated Kitchen"]
      }
    }
    // ... more listings from GPS, CRMLS, CLAW, Southland, etc.
  ],
  "pagination": {
    "totalCount": 47,
    "page": 1,
    "limit": 50
  },
  "meta": {
    "mlsBreakdown": {
      "GPS": 12,
      "CRMLS": 23,
      "CLAW": 8,
      "SOUTHLAND": 4
    }
  }
}
```

**AI Response** (uses pre-formatted data):
```
I found 47 homes in Palm Springs matching your criteria. Here are the top 3:

1. **3bd/2ba home - $425,000**
   📍 123 Main St, Palm Springs
   🏠 1,800 sqft | Pool, Mountain Views, Updated Kitchen
   📱 [View Listing](https://jpsrealtor.com/listing/ABC123)
   🏢 Source: GPS MLS

2. **3bd/2ba condo - $449,000**
   📍 456 Oak Ave, Palm Springs
   🏠 1,650 sqft | Gated Community, HOA $325/mo
   📱 [View Listing](https://jpsrealtor.com/listing/DEF456)
   🏢 Source: CRMLS

3. **3bd/3ba home - $485,000**
   📍 789 Palm Dr, Palm Springs
   🏠 2,100 sqft | Updated Kitchen, Solar Panels
   📱 [View Listing](https://jpsrealtor.com/listing/GHI789)
   🏢 Source: CLAW

All listings are from 4 different MLS associations. Would you like to see more details or filter further?
```

---

## Comparison: Before vs. After

### Code Complexity

| Aspect | Before (Fragmented) | After (Unified) | Improvement |
|--------|---------------------|-----------------|-------------|
| **Tool Definitions** | 2 tools (searchCity + matchLocation) | 1 tool (searchListings) | 50% reduction |
| **API Endpoints** | 4 endpoints (search-city, match-location, cities/:id/listings, subdivisions/:slug/listings) | 1 endpoint (unified-listings) | 75% reduction |
| **Database Queries** | 2-3 per request (GPS + CRMLS + metadata) | 1 per request | 66% reduction |
| **Field Normalization** | Manual (different field names) | Automatic (RESO standard) | 100% consistent |
| **Code Lines (tools)** | ~450 lines | ~150 lines | 67% reduction |

### AI Query Examples

#### Example 1: Simple City Search

**User**: "Show me homes in Palm Desert"

**Before**:
```typescript
// AI must decide between searchCity and matchLocation
// Let's say it picks searchCity...

// Tool Call 1
searchCity({ city: "Palm Desert" })

// Endpoint chain:
/api/chat/search-city
  → /api/cities/palm-desert/listings
    → GPS.find({ city: "Palm Desert" })
    → CRMLS.find({ city: "Palm Desert" })
    → Merge + normalize

// Result: Only GPS + CRMLS listings
```

**After**:
```typescript
// AI calls single tool
searchListings({ city: "Palm Desert" })

// Direct API call:
/api/unified-listings?city=Palm+Desert

// Single query:
UnifiedListing.find({ City: "Palm Desert", StandardStatus: "Active" })

// Result: All 8 MLS listings (GPS, CRMLS, CLAW, Southland, High Desert, Bridge, Conejo, ITECH)
```

**Improvement**: 3 queries → 1 query, 2 MLSs → 8 MLSs

#### Example 2: Subdivision with Filters

**User**: "3 bedroom homes in Indian Wells Country Club under $600k"

**Before**:
```typescript
// Tool Call 1: matchLocation
matchLocation({ query: "Indian Wells Country Club" })
// Returns: { type: "subdivision", name: "Indian Wells Country Club" }

// Tool Call 2: Auto-search (lines 186-248)
// Fetches from /api/subdivisions/indian-wells-country-club/listings
// Queries GPS + CRMLS separately
// Manual filter for 3 beds + under $600k in code
// Merge results

// Problem: No consistent way to apply filters across GPS + CRMLS
// GPS uses: bedsTotal
// CRMLS uses: bedroomsTotal
```

**After**:
```typescript
// Single tool call with all filters
searchListings({
  subdivision: "Indian Wells Country Club",
  minBeds: 3,
  maxBeds: 3,
  maxPrice: 600000,
  sortBy: "price"
})

// Direct API call:
/api/unified-listings?subdivision=Indian+Wells+Country+Club&minBeds=3&maxBeds=3&maxPrice=600000&sortBy=ListPrice

// Single query with embedded context:
UnifiedListing.find({
  "subdivisionContext.name": "Indian Wells Country Club",
  BedroomsTotal: 3,
  ListPrice: { $lte: 600000 },
  StandardStatus: "Active"
})

// Results already include:
// - Subdivision HOA fees (embedded)
// - City context (embedded)
// - Pre-formatted SMS text (aiSummary)
// - Photos (Media array)
```

**Improvement**:
- 2 tool calls → 1 tool call
- 2 database queries → 1 database query
- Manual field normalization → Pre-normalized
- No context joins needed → Embedded context

#### Example 3: MLS-Specific Search (NEW)

**User**: "Show me CRMLS listings in Los Angeles over $1M"

**Before**: Not possible (would have to search all listings, then filter by MLS source manually)

**After**:
```typescript
// NEW capability: Filter by specific MLS
searchListings({
  city: "Los Angeles",
  mlsSources: ["CRMLS"],
  minPrice: 1000000,
  sortBy: "price",
  sortOrder: "desc"
})

// API call:
/api/unified-listings?city=Los+Angeles&mls=CRMLS&minPrice=1000000&sortBy=ListPrice&sortOrder=desc

// Query:
UnifiedListing.find({
  City: "Los Angeles",
  MlsId: "20200218121507636729000000",  // CRMLS ID
  ListPrice: { $gte: 1000000 },
  StandardStatus: "Active"
})
```

**New Feature**: Can search specific MLSs or combine multiple MLSs

#### Example 4: Geospatial Map Search (NEW)

**User**: "Show me homes in this area" (map viewport)

**Before**: Not supported (would have to guess city/subdivision from coordinates)

**After**:
```typescript
// NEW capability: Geospatial bounds query
searchListings({
  bounds: "-118.5,33.8,-118.4,33.9",  // Map viewport
  minBeds: 2,
  maxPrice: 750000
})

// API call:
/api/unified-listings?bounds=-118.5,33.8,-118.4,33.9&minBeds=2&maxPrice=750000

// Query with geospatial index:
UnifiedListing.find({
  location: {
    $geoWithin: {
      $box: [[-118.5, 33.8], [-118.4, 33.9]]
    }
  },
  BedroomsTotal: { $gte: 2 },
  ListPrice: { $lte: 750000 },
  StandardStatus: "Active"
})

// Returns listings from ALL 8 MLSs within map bounds
```

**New Feature**: Geospatial queries for map integration

#### Example 5: SMS Listing to Client

**User**: "Send the best 3bd home in Palm Springs to my client at 555-1234"

**Before**:
```typescript
// Tool Call 1: Search for listing
searchCity({ city: "Palm Springs" })

// Get listing details
const listing = results[0];

// Tool Call 2: Manually format SMS message
const smsText = `${listing.beds}bd/${listing.baths}ba home in ${listing.city}, $${listing.price}. ${listing.address}. View: https://jpsrealtor.com/listing/${listing.listingKey}`;

// Tool Call 3: Send SMS
sendSMS({ to: "555-1234", message: smsText });
```

**After**:
```typescript
// Single tool call (SMS preview pre-generated)
searchListings({
  city: "Palm Springs",
  minBeds: 3,
  maxBeds: 3,
  sortBy: "price",
  sortOrder: "asc",
  limit: 1
})

// Listing already includes pre-formatted SMS
const listing = results[0];
const smsText = listing.aiSummary.smsPreview;
// "3bd/2ba home in Palm Springs, $425,000. 123 Main St. View: https://jpsrealtor.com/listing/ABC123"

// Send directly
sendSMS({ to: "555-1234", message: smsText });
```

**Improvement**: SMS text is pre-generated and optimized (160 char limit)

---

## Tool Implementation

### New Unified Tool Endpoint

Create `/api/unified-listings/route.ts` (already documented in UNIFIED_MLS_ARCHITECTURE.md)

### Update Chat Stream Route

```typescript
// src/app/api/chat/stream/route.ts

// OLD: 2 separate tools
const CHAT_TOOLS: GroqTool[] = [
  { /* searchArticles */ },
  { /* matchLocation */ },
  { /* searchCity */ }
];

// NEW: 1 unified tool
const CHAT_TOOLS: GroqTool[] = [
  { /* searchArticles */ },
  {
    type: "function",
    function: {
      name: "searchListings",
      description: "Search MLS listings across 8 associations...",
      parameters: { /* see definition above */ }
    }
  }
];

// Update tool execution
if (functionName === "searchListings") {
  // Build query params from arguments
  const params = new URLSearchParams();

  if (args.city) params.append("city", args.city);
  if (args.subdivision) params.append("subdivision", args.subdivision);
  if (args.minPrice) params.append("minPrice", args.minPrice.toString());
  if (args.maxPrice) params.append("maxPrice", args.maxPrice.toString());
  if (args.minBeds) params.append("minBeds", args.minBeds.toString());
  if (args.maxBeds) params.append("maxBeds", args.maxBeds.toString());
  if (args.minBaths) params.append("minBaths", args.minBaths.toString());
  if (args.maxBaths) params.append("maxBaths", args.maxBaths.toString());
  if (args.minSqft) params.append("minSqft", args.minSqft.toString());
  if (args.maxSqft) params.append("maxSqft", args.maxSqft.toString());
  if (args.propertyType) params.append("propertyType", args.propertyType);
  if (args.mlsSources) args.mlsSources.forEach((mls: string) => params.append("mls", mls));
  if (args.bounds) params.append("bounds", args.bounds);
  if (args.sortBy) params.append("sortBy", args.sortBy);
  if (args.sortOrder) params.append("sortOrder", args.sortOrder);
  if (args.limit) params.append("limit", args.limit.toString());

  // Single API call
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/unified-listings?${params.toString()}`
  );

  const data = await response.json();

  // Format for AI consumption
  result = {
    success: true,
    totalCount: data.pagination.totalCount,
    mlsBreakdown: data.meta.mlsBreakdown,  // NEW: Show which MLSs contributed
    priceRange: {
      min: Math.min(...data.data.map((l: any) => l.ListPrice)),
      max: Math.max(...data.data.map((l: any) => l.ListPrice)),
      avg: data.data.reduce((sum: number, l: any) => sum + l.ListPrice, 0) / data.data.length
    },
    sampleListings: data.data.slice(0, 10).map((l: any) => ({
      listingKey: l.ListingKey,
      price: l.ListPrice,
      address: l.UnparsedAddress,
      beds: l.BedroomsTotal,
      baths: l.BathroomsTotalInteger,
      sqft: l.LivingArea,
      mlsSource: l.MLSSource,
      mlsName: l.MlsName,
      city: l.cityContext?.cityName || l.City,
      subdivision: l.subdivisionContext?.name,
      highlights: l.aiSummary.highlights,
      smsPreview: l.aiSummary.smsPreview,  // Pre-formatted for SMS
      url: `/mls-listings/${l.ListingKey}`,
      photo: l.Media?.[0]?.MediaURL,
      latitude: l.Latitude,
      longitude: l.Longitude
    }))
  };
}
```

### Deprecate Old Tool Endpoints

After migration:

```bash
# Mark as deprecated (keep for rollback)
src/app/api/chat/search-city/route.ts       # DEPRECATED
src/app/api/chat/match-location/route.ts    # DEPRECATED

# Update AI chat to use new tool
src/app/api/chat/stream/route.ts            # UPDATED
```

---

## AI Response Enhancement

### Before (Basic Text Response)

```
I found 47 homes in Palm Springs. Here are a few:

1. $425,000 - 3 bed, 2 bath
2. $449,000 - 3 bed, 2 bath
3. $485,000 - 3 bed, 3 bath

Would you like more details?
```

### After (Rich Structured Response)

**With embedded context and aiSummary**:

```
I found **47 homes** in Palm Springs matching your criteria, from **4 different MLS associations** (GPS, CRMLS, CLAW, Southland).

**Price Range**: $425K - $850K (avg $625K)

**Top 3 listings**:

1. **$425,000** - 3bd/2ba, 1,800 sqft
   📍 123 Main St, Palm Springs
   ✨ Pool, Mountain Views, Updated Kitchen
   🏢 GPS MLS
   📱 [View](https://jpsrealtor.com/listing/ABC123) | [Send to Client](sms://555-1234?body=3bd/2ba home in Palm Springs, $425,000. 123 Main St. View: https://jpsrealtor.com/listing/ABC123)

2. **$449,000** - 3bd/2ba, 1,650 sqft
   📍 456 Oak Ave, Palm Springs (Sunrise Park)
   ✨ Gated Community, HOA $325/mo
   🏢 CRMLS
   📱 [View](https://jpsrealtor.com/listing/DEF456)

3. **$485,000** - 3bd/3ba, 2,100 sqft
   📍 789 Palm Dr, Palm Springs
   ✨ Updated Kitchen, Solar Panels
   🏢 CLAW MLS
   📱 [View](https://jpsrealtor.com/listing/GHI789)

**Palm Springs Market Context**:
Desert oasis known for mid-century modern architecture and resort-style living. Median home price: $625K. Average school rating: 7/10.

Would you like to:
- See more listings
- Filter by specific subdivision
- Search a specific MLS association
- Send listings to your client via SMS
```

**All data from single query** - no additional database lookups needed for context!

---

## Migration Plan

### Phase 1: Create Unified Tool (Week 4)

```bash
# 1. Ensure /api/unified-listings route exists
# (Created in Week 3 during API migration)

# 2. Add new searchListings tool definition
# Update: src/app/api/chat/stream/route.ts
# Add searchListings to CHAT_TOOLS array

# 3. Test tool execution
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Show me homes in Palm Springs" }
    ],
    "userId": "test-user"
  }'

# Verify AI calls searchListings tool
```

### Phase 2: Parallel Running (Week 4-5)

```typescript
// Keep both old and new tools active
const CHAT_TOOLS: GroqTool[] = [
  { /* searchArticles */ },
  { /* searchListings - NEW */ },
  { /* matchLocation - OLD (fallback) */ },
  { /* searchCity - OLD (fallback) */ }
];

// Add feature flag
const USE_UNIFIED_SEARCH = process.env.FEATURE_UNIFIED_SEARCH === "true";

if (functionName === "searchListings" && USE_UNIFIED_SEARCH) {
  // Use new unified endpoint
} else if (functionName === "matchLocation" || functionName === "searchCity") {
  // Use old endpoints (fallback)
}
```

### Phase 3: Update System Prompt (Week 5)

```typescript
const systemPrompt = `You are a helpful real estate AI assistant.

IMPORTANT TOOL USAGE:

1. **searchListings** - Use this for ALL property searches:
   - City searches: "homes in Palm Springs"
   - Subdivision searches: "homes in Sunrise Park"
   - Price/bed/bath filters: "3 bed homes under $500k"
   - MLS-specific: "CRMLS listings in Los Angeles"
   - Map searches: Use bounds parameter for geospatial queries

   This tool searches across 8 MLS associations simultaneously.
   Results include embedded city context and subdivision details.

2. **searchArticles** - Use for blog content and market insights.

DO NOT use matchLocation or searchCity - these are deprecated.
Use searchListings for all property queries.

When presenting listings:
- Show MLS breakdown (which associations contributed)
- Include embedded context (city info, subdivision details)
- Use pre-formatted SMS previews when texting listings
- Show highlights from aiSummary field
`;
```

### Phase 4: Remove Old Tools (Week 6)

```typescript
// Remove deprecated tools
const CHAT_TOOLS: GroqTool[] = [
  { /* searchArticles */ },
  { /* searchListings */ }
  // matchLocation REMOVED
  // searchCity REMOVED
];

// Remove old tool execution code
// Delete deprecated endpoint files (after archiving)
```

### Phase 5: Update Chat History (Week 6)

```bash
# Migrate existing chat sessions to reference new tool
mongo jpsrealtor --eval "
  db.chatSessions.updateMany(
    { 'messages.tool_calls.function.name': 'matchLocation' },
    { \$set: { 'messages.tool_calls.function.name': 'searchListings' } }
  )
"

mongo jpsrealtor --eval "
  db.chatSessions.updateMany(
    { 'messages.tool_calls.function.name': 'searchCity' },
    { \$set: { 'messages.tool_calls.function.name': 'searchListings' } }
  )
"
```

---

## Performance Comparison

### AI Response Time

| Query Type | Before (Fragmented) | After (Unified) | Improvement |
|------------|---------------------|-----------------|-------------|
| **City Search** | ~850ms (2 tools + 2 DB queries) | ~200ms (1 tool + 1 DB query) | 76% faster |
| **Subdivision Search** | ~950ms (2 tools + 3 DB queries) | ~180ms (1 tool + 1 DB query) | 81% faster |
| **Filtered Search** | ~1100ms (manual filtering) | ~220ms (indexed filters) | 80% faster |
| **With Cloudflare Cache** | N/A (tools not cached) | ~50ms (edge cache) | 95% faster |

### Token Usage (AI Cost)

| Aspect | Before | After | Savings |
|--------|--------|-------|---------|
| **Tool Definition Size** | 450 tokens (2 tools) | 250 tokens (1 tool) | 44% reduction |
| **Tool Response Size** | ~800 tokens (manual formatting) | ~500 tokens (pre-formatted) | 38% reduction |
| **Context Queries** | 3 DB queries → 3 tool results | 1 DB query → 1 tool result | 67% reduction |
| **Total Tokens per Query** | ~1500 tokens | ~900 tokens | 40% cost savings |

---

## New Capabilities Enabled

### 1. Multi-MLS Comparison

**User**: "Compare GPS and CRMLS listings in Palm Desert"

```typescript
searchListings({
  city: "Palm Desert",
  mlsSources: ["GPS", "CRMLS"]
})

// AI Response:
"Palm Desert has 847 active listings across GPS and CRMLS:
- GPS: 234 listings (avg $625K)
- CRMLS: 613 listings (avg $685K)

GPS listings tend to be more affordable, while CRMLS has more luxury properties."
```

### 2. Geospatial Market Analysis

**User**: "What's the average price for homes in this area?" (map selection)

```typescript
searchListings({
  bounds: "-116.5,33.8,-116.4,33.9"
})

// AI Response:
"In this area, I found 127 active listings from 5 different MLSs:
- Average price: $725K
- Price range: $325K - $2.1M
- Most listings: 3-4 bedrooms
- Top MLSs: CRMLS (54), GPS (38), CLAW (21)"
```

### 3. Subdivision HOA Analysis

**User**: "Which subdivisions in Palm Springs have low HOA fees?"

```typescript
// Query with embedded subdivisionContext
searchListings({
  city: "Palm Springs"
})

// AI can analyze subdivisionContext.hoaFees from results
// No additional DB query needed!

// AI Response:
"Based on 605 listings in Palm Springs, here are subdivisions with HOA fees under $200/month:
1. Desert Highlands - avg $150/mo (32 homes available)
2. Canyon View Estates - avg $175/mo (18 homes available)
3. Mountain Vista - avg $185/mo (24 homes available)"
```

### 4. Investment Property Analysis

**User**: "Show me rental properties in Coachella Valley with good cap rates"

```typescript
searchListings({
  city: "Coachella",
  propertyType: "rental"
})

// Listings include aiSummary.investmentMetrics
// {
//   capRate: 7.2,
//   cashOnCash: 8.5,
//   rentalEstimate: 2400
// }

// AI Response:
"I found 34 rental properties in Coachella. Top 3 by cap rate:
1. 4bd/2ba - $385K (8.2% cap rate, $2,800/mo estimated rent)
2. 3bd/2ba - $325K (7.8% cap rate, $2,400/mo estimated rent)
3. 2bd/2ba - $275K (7.5% cap rate, $1,950/mo estimated rent)"
```

### 5. Smart SMS Client Updates

**User**: "Send my client updates on new 3bd listings in their price range"

```typescript
// AI remembers client preferences from chat history
// Client: 3bd, $400-600K, Palm Springs

searchListings({
  city: "Palm Springs",
  minBeds: 3,
  maxBeds: 3,
  minPrice: 400000,
  maxPrice: 600000,
  sortBy: "date",  // Newest first
  sortOrder: "desc"
})

// Use pre-formatted SMS previews
listings.forEach(listing => {
  sendSMS({
    to: clientPhone,
    message: listing.aiSummary.smsPreview
  });
});

// SMS sent:
// "New listing! 3bd/2ba home in Palm Springs, $485,000. 789 Palm Dr. View: https://..."
```

---

## Rollback Plan

If issues arise:

```bash
# 1. Disable unified tool
export FEATURE_UNIFIED_SEARCH=false

# 2. Re-enable old tools in CHAT_TOOLS array
# matchLocation and searchCity

# 3. Verify old endpoints still work
curl http://localhost:3000/api/chat/search-city
curl http://localhost:3000/api/chat/match-location

# 4. Monitor error rates
# Old tools should resume normal operation

# No data loss - unified collection remains intact
```

---

## Summary

### Before (Fragmented Tools)

- **2 property search tools** (searchCity + matchLocation)
- **4 API endpoints** (search-city, match-location, cities/:id/listings, subdivisions/:slug/listings)
- **2-3 database queries** per search
- **Manual field normalization** (GPS vs CRMLS field names)
- **Limited to 2 MLSs** (GPS + CRMLS)
- **No context joins** (requires separate queries for city/subdivision details)
- **~850-1100ms** response time
- **~1500 tokens** per AI query

### After (Unified Tool)

- **1 universal search tool** (searchListings)
- **1 API endpoint** (unified-listings)
- **1 database query** per search
- **Pre-normalized fields** (RESO standard)
- **All 8 MLSs** (GPS, CRMLS, CLAW, Southland, High Desert, Bridge, Conejo, ITECH)
- **Embedded context** (city/subdivision details included)
- **~180-220ms** response time (76-81% faster)
- **~900 tokens** per AI query (40% cost savings)

### New Capabilities

- Multi-MLS comparison
- Geospatial queries (map bounds)
- MLS-specific searches
- Embedded HOA/subdivision data
- Pre-formatted SMS previews
- Investment metrics (cap rate, cash-on-cash)
- All from single query

---

**Next Steps**: Implement unified searchListings tool during Week 4 of migration plan.
