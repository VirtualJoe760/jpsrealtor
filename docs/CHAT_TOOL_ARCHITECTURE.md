# Chat Tool System Architecture - Complete Documentation

**Last Updated:** December 15, 2025
**Version:** 2.0

## Table of Contents

1. [Overview](#overview)
2. [Tool Definitions](#1-tool-definitions)
3. [Tool Execution](#2-tool-execution)
4. [AI Response Streaming](#3-ai-response-streaming)
5. [Backend Query Endpoint](#4-backend-query-endpoint)
6. [Frontend Parsing](#5-frontend-parsing)
7. [Frontend Rendering](#6-frontend-rendering)
8. [Component Types](#7-component-types)
9. [Debugging Guide](#debugging-guide)
10. [Key Files Reference](#key-files-reference)

---

## Overview

The JPSREALTOR chat system uses a sophisticated multi-layered architecture that enables AI-powered real estate search with tool calling, streaming responses, and dynamic component rendering.

**Architecture Flow:**
```
User Query → ChatWidget → Stream API → Tool Execution → AI Response → Component Parsing → Rendering
```

---

## 1. TOOL DEFINITIONS

**Location:** `src/lib/chat/tools.ts`

### Available Tools

The system defines 10 tools available to the AI in the `CHAT_TOOLS` array:

#### Core Property Search Tools

### 1. `queryDatabase` (PRIMARY TOOL)

**Purpose:** Flexible property search with 30+ filters
**Status:** ✅ ACTIVE - Primary tool for all property queries

**Parameters:**

```typescript
{
  // Location filters
  city?: string;              // e.g., "La Quinta", "Indian Wells"
  subdivision?: string;       // e.g., "Indian Wells Country Club"
  zip?: string;              // e.g., "92253"
  county?: string;           // e.g., "Riverside County"

  // Property filters
  propertySubType?: string;  // "Single Family", "Condominium", "Townhouse"
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minYear?: number;          // Year built
  maxYear?: number;

  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Amenity filters
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  gated?: boolean;
  minGarages?: number;

  // Time filters (CRITICAL FOR "NEW LISTINGS")
  maxDaysOnMarket?: number;  // e.g., 7 for listings from last week
  listedAfter?: string;      // ISO date string, e.g., "2025-12-07"

  // Options
  includeStats?: boolean;    // Include price/DOM statistics
  includeDOMStats?: boolean; // Include Days on Market stats
  compareWith?: object;      // For comparisons
  limit?: number;            // Max results (default: 10)
  sort?: string;            // "newest", "price_asc", "price_desc"
}
```

**Time Filtering Examples:**

```javascript
// Find new listings from last 7 days
{
  city: "Indian Wells",
  listedAfter: "2025-12-08", // 7 days ago from today
  includeStats: true,
  sort: "newest"
}

// Find listings on market less than 30 days
{
  subdivision: "PGA West",
  maxDaysOnMarket: 30,
  sort: "newest"
}
```

**Response Format:**

```javascript
{
  success: true,
  summary: {
    count: 31,                      // Total matching listings
    priceRange: {
      min: 385000,
      max: 3995000
    },
    avgPrice: 1436095,
    medianPrice: 1250000,
    center: {                       // Geographic center of listings
      lat: 33.8303,
      lng: -116.5453
    },
    sampleListings: [               // First 10 listings WITH PHOTOS
      {
        id: "listing-key-1",
        price: 525000,
        beds: 3,
        baths: 2,
        sqft: 2400,
        address: "123 Country Club Dr",
        city: "Indian Wells",
        subdivision: "Indian Wells Country Club",
        image: "https://cdn.photos.com/uri800/photo1.jpg", // ← Photo URL
        url: "/mls-listings/listing-slug-1",
        latitude: 33.8303,
        longitude: -116.5453
      }
      // ... 9 more listings
    ]
  }
}
```

---

### 2. `matchLocation` (DEPRECATED)

**Status:** ⚠️ DEPRECATED - Use `queryDatabase` with subdivision parameter
**Purpose:** Legacy tool for subdivision lookup

**Migration:**
```javascript
// OLD (deprecated)
matchLocation({ query: "Indian Wells Country Club" })

// NEW (recommended)
queryDatabase({ subdivision: "Indian Wells Country Club" })
```

**Auto-Search Feature:**
When `matchLocation` succeeds with a subdivision, it automatically calls `/api/subdivisions/[slug]/listings` and appends `result.summary` object to the tool response. This allows AI to receive listings without an additional tool call.

---

### 3. `searchCity` (DEPRECATED)

**Status:** ⚠️ DEPRECATED - Use `queryDatabase` with city parameter
**Purpose:** Legacy tool for city-wide search

---

#### Analytics & Market Tools

### 4. `getAppreciation`

**Purpose:** Property appreciation analytics over time
**Use Case:** "What's the appreciation in Palm Desert?"

**Parameters:**

```typescript
{
  city?: string;              // e.g., "Palm Desert"
  subdivision?: string;       // e.g., "Vintage Country Club"
  county?: string;           // e.g., "Riverside County"
  period?: string;           // "1y", "3y", "5y", "10y" (default: "5y")
  propertySubType?: string;  // "Single Family", "Condominium"
}
```

**Response:**

```javascript
{
  location: { city: "Palm Desert" },
  period: "5y",
  annualAppreciation: 8.5,        // 8.5% per year
  cumulativeAppreciation: 50.3,   // 50.3% total over 5 years
  trend: "increasing",
  confidence: "high",
  dataPoints: [
    { year: 2020, avgPrice: 450000 },
    { year: 2021, avgPrice: 488250 },
    { year: 2022, avgPrice: 529750 },
    { year: 2023, avgPrice: 575000 },
    { year: 2024, avgPrice: 623875 },
    { year: 2025, avgPrice: 676635 }
  ]
}
```

---

### 5. `getMarketStats`

**Purpose:** Comprehensive market statistics
**Use Case:** "What are the market stats for La Quinta?"

**Parameters:**

```typescript
{
  city?: string;
  subdivision?: string;
  county?: string;
  propertySubType?: string;
}
```

**Response:**

```javascript
{
  location: { city: "La Quinta" },
  daysOnMarket: {
    avg: 45,
    median: 38,
    distribution: { "0-30": 35, "31-60": 40, "61-90": 15, "90+": 10 },
    trend: "decreasing"
  },
  pricePerSqft: {
    avg: 285,
    median: 275,
    min: 180,
    max: 450
  },
  hoaFees: {
    avg: 350,
    median: 325,
    distribution: { "0-200": 25, "201-400": 45, "401-600": 20, "600+": 10 },
    frequency: "monthly"
  },
  propertyTax: {
    avg: 6500,
    median: 6200,
    effectiveRate: 1.15
  }
}
```

---

### 6. `getRegionalStats`

**Purpose:** Coachella Valley region-wide statistics
**Use Case:** "Show me new listings across the valley"

**Parameters:**

```typescript
{
  daysNew?: number;        // 7 = last week, 30 = last month
  propertyType?: string;   // "sale" or "rental"
}
```

**Response:**

```javascript
{
  region: "Coachella Valley",
  totalListings: 1247,
  cities: [
    {
      name: "Indian Wells",
      count: 87,
      avgPrice: 1250000,
      medianPrice: 950000
    },
    {
      name: "La Quinta",
      count: 234,
      avgPrice: 875000,
      medianPrice: 725000
    }
    // ... more cities
  ]
}
```

---

#### Utility Tools

### 7. `searchArticles`

**Purpose:** Search blog articles for real estate information
**Priority:** Called FIRST for informational queries (not property searches)

**Parameters:**

```typescript
{
  query: string;  // Search keywords
}
```

**Example:**

```javascript
// User: "Tell me about the Coachella Valley market"
searchArticles({ query: "Coachella Valley market overview" })
```

**Response:**

```javascript
{
  results: [
    {
      title: "Coachella Valley Market Overview",
      slug: "coachella-valley-market-overview",
      category: "market-insights",
      excerpt: "The Coachella Valley real estate market...",
      publishedAt: "2024-11-15"
    }
    // ... more articles
  ]
}
```

---

### 8. `lookupSubdivision`

**Purpose:** Fuzzy match subdivision names
**Use Case:** User says "the Vintage" → Resolves to "Vintage Country Club"

**Parameters:**

```typescript
{
  query: string;     // User's subdivision query
  city?: string;     // Optional city context
}
```

**Example:**

```javascript
lookupSubdivision({ query: "the vintage", city: "Indian Wells" })

// Returns:
{
  matched: true,
  subdivisionName: "Vintage Country Club",
  slug: "vintage-country-club",
  city: "Indian Wells"
}
```

---

### 9. `getNeighborhoodPageLink`

**Purpose:** Generate links to neighborhood pages (fallback when search fails)
**Use Case:** Zero results, but neighborhood page exists

**Parameters:**

```typescript
{
  city?: string;
  subdivision?: string;
  county?: string;
}
```

**Response:**

```javascript
{
  url: "/neighborhoods/indian-wells/vintage-country-club",
  title: "Vintage Country Club - Indian Wells",
  description: "Explore Vintage Country Club in Indian Wells with market stats and insights"
}
```

---

## 2. TOOL EXECUTION

**Location:** `src/lib/chat/tool-executor.ts`

### Execution Flow

```javascript
async function executeToolCall(toolCall: any): Promise<any> {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  console.log(`[${functionName}] Starting with args:`, functionArgs);

  let result;

  // Route to appropriate executor
  if (functionName === "queryDatabase") {
    result = await executeQueryDatabase(functionArgs);
  } else if (functionName === "matchLocation") {
    result = await executeMatchLocation(functionArgs);
  } else if (functionName === "getAppreciation") {
    result = await executeGetAppreciation(functionArgs);
  } else if (functionName === "getMarketStats") {
    result = await executeGetMarketStats(functionArgs);
  } else if (functionName === "searchArticles") {
    result = await executeSearchArticles(functionArgs);
  } else if (functionName === "lookupSubdivision") {
    result = await executeLookupSubdivision(functionArgs);
  } else if (functionName === "getNeighborhoodPageLink") {
    result = await executeGetNeighborhoodPageLink(functionArgs);
  } else {
    result = { error: `Unknown function: ${functionName}` };
  }

  console.log(`[${functionName}] Result:`, result);

  return {
    role: "tool",
    tool_call_id: toolCall.id,
    name: functionName,
    content: JSON.stringify(result)
  };
}
```

---

### Key Tool Executor: `executeQueryDatabase`

**Endpoint:** `POST /api/query`

**Process:**

1. **Construct Query Payload**
   ```javascript
   const queryPayload = {
     filters: {
       city: args.city,
       subdivision: args.subdivision,
       zip: args.zip,
       county: args.county,
       propertySubType: args.propertySubType,
       minBeds: args.minBeds,
       maxBeds: args.maxBeds,
       minBaths: args.minBaths,
       maxBaths: args.maxBaths,
       minPrice: args.minPrice,
       maxPrice: args.maxPrice,
       minSqft: args.minSqft,
       maxSqft: args.maxSqft,
       pool: args.pool,
       spa: args.spa,
       view: args.view,
       gated: args.gated,
       minGarages: args.minGarages,
       minYear: args.minYear,
       maxYear: args.maxYear,
       maxDaysOnMarket: args.maxDaysOnMarket,
       listedAfter: args.listedAfter,  // ← Time filtering
       limit: args.limit || 10,
       sort: args.sort || "newest"
     },
     includeStats: args.includeStats !== false,
     includeDOMStats: args.includeDOMStats,
     compareWith: args.compareWith
   };
   ```

2. **Call Backend API**
   ```javascript
   const response = await fetch(`${baseUrl}/api/query`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(queryPayload)
   });

   const data = await response.json();
   // data = { success: true, listings: [...], stats: {...}, meta: {...} }
   ```

3. **Calculate Center Coordinates**
   ```javascript
   const center = data.listings.length > 0
     ? {
         lat: data.listings.reduce((sum, l) => sum + l.latitude, 0) / data.listings.length,
         lng: data.listings.reduce((sum, l) => sum + l.longitude, 0) / data.listings.length
       }
     : { lat: 33.7, lng: -116.3 }; // Default to Coachella Valley
   ```

4. **Fetch Photos for First 10 Listings** ⭐ CRITICAL
   ```javascript
   const listingsWithPhotos = await Promise.all(
     data.listings.slice(0, 10).map(async (listing) => {
       const photoUrl = await fetchListingPhoto(listing.listingKey, listing);

       return {
         id: listing.listingKey,
         price: listing.listPrice,
         beds: listing.bedroomsTotal || listing.bedsTotal || 0,
         baths: listing.bathroomsTotalDecimal ||
                (listing.bathroomsFull + (listing.bathroomsHalf ? 0.5 : 0)) || 0,
         sqft: listing.livingArea,
         address: listing.unparsedAddress,
         city: listing.city,
         subdivision: listing.subdivisionName,
         image: photoUrl,  // ← Photo URL
         url: `/mls-listings/${listing.slugAddress}`,
         latitude: listing.latitude,
         longitude: listing.longitude
       };
     })
   );
   ```

5. **Return Summary Object**
   ```javascript
   return {
     success: true,
     summary: {
       count: data.meta.totalListings,
       priceRange: {
         min: data.stats.minPrice,
         max: data.stats.maxPrice
       },
       avgPrice: data.stats.avgPrice,
       medianPrice: data.stats.medianPrice,
       center,
       sampleListings: listingsWithPhotos
     }
   };
   ```

---

### Photo Fetching Logic ⭐ CRITICAL

**Function:** `fetchListingPhoto(listingKey, listing)`

```javascript
async function fetchListingPhoto(listingKey: string, listing: any): Promise<string> {
  try {
    // Call photos API endpoint
    const photosRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/listings/${listingKey}/photos`,
      { cache: "force-cache" }
    );

    if (photosRes.ok) {
      const photosData = await photosRes.json();

      // Get first photo from photos array
      const primaryPhoto = photosData.photos[0];

      if (primaryPhoto) {
        return primaryPhoto.uri800 || primaryPhoto.uri1024 || primaryPhoto.uri1600 || "";
      }
    }
  } catch (error) {
    console.error(`[fetchListingPhoto] Error fetching photos for ${listingKey}:`, error);
  }

  // Fallback to database fields
  return listing.primaryPhoto?.uri800 ||
         listing.primaryPhotoUrl ||
         listing.media?.[0]?.Uri800 ||
         "";
}
```

**Why This Matters:**
If `fetchListingPhoto()` returns empty strings for all listings, the carousel will render but images will be broken/missing. This is a common cause of "carousel not showing" issues.

---

## 3. AI RESPONSE STREAMING

**Location:** `src/app/api/chat/stream/route.ts`

### Multi-Round Tool Execution

The streaming route implements a **multi-round tool calling loop** to allow the AI to use multiple tools sequentially:

```javascript
export async function POST(req: NextRequest) {
  const { messages, userId, userTier } = await req.json();

  // Convert messages to Groq format
  const groqMessages = convertToGroqMessages(messages);

  // Add system prompt
  groqMessages.unshift({
    role: "system",
    content: SYSTEM_PROMPT
  });

  const MAX_TOOL_ROUNDS = 3;
  let toolRound = 0;
  let messagesWithTools = [...groqMessages];
  let needsStreaming = true;

  // Multi-round tool execution loop
  while (toolRound < MAX_TOOL_ROUNDS) {
    console.log(`[TOOL ROUND ${toolRound + 1}/${MAX_TOOL_ROUNDS}]`);

    // 1. Call AI (non-streaming for tool calls)
    const completion = await groq.chat.completions.create({
      messages: messagesWithTools,
      model: "llama-3.3-70b-versatile",
      stream: false, // ⭐ CRITICAL: Tool calls cannot be streamed
      tools: CHAT_TOOLS,
      tool_choice: "auto"
    });

    const assistantMessage = completion.choices[0]?.message;

    // 2. Check for tool calls
    if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
      // No tools needed - this is the final response
      console.log("[TOOL EXECUTION] No tool calls - final response ready");
      messagesWithTools.push(assistantMessage);
      needsStreaming = false;
      break;
    }

    console.log(`[TOOL EXECUTION] ${assistantMessage.tool_calls.length} tool(s) called:`,
      assistantMessage.tool_calls.map(tc => tc.function.name)
    );

    // 3. Execute all tool calls in parallel
    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(tc => executeToolCall(tc))
    );

    // 4. Append assistant message + tool results to conversation
    messagesWithTools.push(assistantMessage);
    messagesWithTools.push(...toolResults);

    toolRound++;
  }

  // After tool execution, stream final response
  const stream = await streamFinalResponse(messagesWithTools, needsStreaming);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
```

---

### Streaming Final Response

```javascript
async function streamFinalResponse(
  messagesWithTools: any[],
  needsStreaming: boolean
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  let fullResponseText = "";

  return new ReadableStream({
    async start(controller) {
      try {
        if (!needsStreaming) {
          // Stream cached response (from non-streaming tool call)
          const lastMessage = messagesWithTools[messagesWithTools.length - 1];
          fullResponseText = lastMessage.content || "";

          // Stream word-by-word for smooth UX
          const words = fullResponseText.split(' ');
          for (const word of words) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`)
            );
            await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay
          }
        } else {
          // Stream AI response in real-time
          const streamResponse = await groq.chat.completions.create({
            messages: messagesWithTools,
            model: "llama-3.3-70b-versatile",
            stream: true
          });

          for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullResponseText += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`)
              );
            }
          }
        }

        // Parse component data from complete response
        const componentData = parseComponentData(fullResponseText);

        console.log("[COMPONENTS]", Object.keys(componentData));

        // Send components to client
        if (Object.keys(componentData).length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ components: componentData })}\n\n`
            )
          );
        }

        // Send done signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );

        controller.close();
      } catch (error) {
        console.error("[STREAM ERROR]", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`
          )
        );
        controller.close();
      }
    }
  });
}
```

---

### Component Markers

The AI is instructed (via system prompt) to embed special markers in its response text:

**Example AI Response:**

```
I found 31 homes in Indian Wells Country Club ranging from $359,000 to $3,995,000!

[LISTING_CAROUSEL]
{
  "title": "31 homes in Indian Wells Country Club",
  "listings": [
    {
      "id": "listing-key-1",
      "price": 525000,
      "beds": 3,
      "baths": 2,
      "sqft": 2400,
      "address": "123 Country Club Dr",
      "city": "Indian Wells",
      "subdivision": "Indian Wells Country Club",
      "image": "https://cdn.photos.com/uri800/photo1.jpg",
      "url": "/mls-listings/listing-slug-1",
      "latitude": 33.8303,
      "longitude": -116.5453
    }
    // ... 9 more listings
  ]
}
[/LISTING_CAROUSEL]

[MAP_VIEW]
{
  "listings": [/* same 10 listings */],
  "center": {"lat": 33.8303, "lng": -116.5453},
  "zoom": 13
}
[/MAP_VIEW]

[SOURCES]
[
  {"type": "mls", "name": "California Regional MLS", "abbreviation": "CRMLS"}
]
[/SOURCES]

Let me know if you'd like more details on any of these homes!
```

The `parseComponentData()` function extracts the JSON blocks between markers and removes them from the displayed text.

---

## 4. BACKEND QUERY ENDPOINT

**Location:** `src/app/api/query/route.ts`

### POST Handler

```javascript
import { executeQuery } from "@/lib/queries/aggregators/active-listings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[/api/query] Request:", body);

    // Execute query using modular query system
    const result = await executeQuery(body);

    console.log("[/api/query] Result:", {
      listingCount: result.listings?.length,
      totalCount: result.meta?.totalListings,
      hasStats: !!result.stats
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("[/api/query] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

### Query System Architecture

**Location:** `src/lib/queries/`

**Structure:**

```
src/lib/queries/
├── aggregators/
│   └── active-listings.ts    # Main query executor
├── filters/
│   ├── index.ts              # Filter builder
│   ├── time.ts               # Time-based filters
│   ├── location.ts           # Location filters
│   ├── property.ts           # Property attribute filters
│   └── amenities.ts          # Amenity filters
└── calculations/
    ├── stats.ts              # Price/DOM statistics
    └── market-stats.ts       # Market analytics
```

**Example Query Flow:**

```javascript
// 1. Build filters
const filters = buildFilters({
  subdivision: "Indian Wells Country Club",
  minPrice: 300000,
  maxPrice: 1000000,
  minBeds: 2,
  listedAfter: "2025-12-08"
});

// Result:
{
  subdivisionName: "Indian Wells Country Club",
  listPrice: { $gte: 300000, $lte: 1000000 },
  bedroomsTotal: { $gte: 2 },
  onMarketDate: { $gte: new Date("2025-12-08") }
}

// 2. Execute MongoDB query
const listings = await UnifiedListing.find(filters)
  .limit(10)
  .sort({ onMarketDate: -1 })
  .lean();

// 3. Calculate stats
const stats = calculateStats(listings);

// 4. Return result
return {
  listings,
  stats,
  meta: {
    totalListings: await UnifiedListing.countDocuments(filters),
    returned: listings.length,
    filters
  }
};
```

---

### Response Format

```javascript
{
  success: true,
  listings: [
    {
      _id: "...",
      listingKey: "3yd-CRMLS-OC24123456",
      slugAddress: "123-country-club-dr-indian-wells-ca-92210",
      unparsedAddress: "123 Country Club Dr, Indian Wells, CA 92210",
      listPrice: 525000,
      bedroomsTotal: 3,
      bathroomsTotalDecimal: 2.0,
      livingArea: 2400,
      city: "Indian Wells",
      subdivisionName: "Indian Wells Country Club",
      latitude: 33.8303,
      longitude: -116.5453,
      onMarketDate: "2025-12-10T08:00:00.000Z",
      media: [
        {
          Uri800: "https://cdn.photos.com/photo1-800.jpg",
          MediaCategory: "Primary Photo",
          Order: 0
        }
        // ... more photos
      ],
      // ... many more fields
    }
    // ... 9 more listings
  ],
  stats: {
    avgPrice: 542500,
    medianPrice: 525000,
    minPrice: 385000,
    maxPrice: 700000,
    avgPricePerSqft: 215,
    avgDaysOnMarket: 45,
    medianDaysOnMarket: 38
  },
  meta: {
    totalListings: 31,
    returned: 10,
    filters: {
      subdivisionName: "Indian Wells Country Club"
    }
  }
}
```

---

## 5. FRONTEND PARSING

**Location:** `src/lib/chat/response-parser.ts`

### Component Parser

```javascript
export function parseComponentData(responseText: string): {
  carousel?: any;
  listView?: any;
  mapView?: any;
  articles?: any;
  appreciation?: any;
  comparison?: any;
  sources?: any;
  marketStats?: any;
  neighborhoodLink?: any;
} {
  const components: any = {};

  // Parse [LISTING_CAROUSEL]...[/LISTING_CAROUSEL]
  const carouselMatch = responseText.match(
    /\[LISTING_CAROUSEL\]\s*([\s\S]*?)\s*\[\/LISTING_CAROUSEL\]/
  );
  if (carouselMatch) {
    try {
      const jsonStr = carouselMatch[1].trim();
      components.carousel = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found carousel with",
        components.carousel?.listings?.length || 0,
        "listings"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse carousel JSON:", e);
    }
  }

  // Parse [LIST_VIEW]...[/LIST_VIEW]
  const listViewMatch = responseText.match(
    /\[LIST_VIEW\]\s*([\s\S]*?)\s*\[\/LIST_VIEW\]/
  );
  if (listViewMatch) {
    try {
      const jsonStr = listViewMatch[1].trim();
      components.listView = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found list view with",
        components.listView?.listings?.length || 0,
        "listings"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse list view JSON:", e);
    }
  }

  // Parse [MAP_VIEW]...[/MAP_VIEW]
  const mapMatch = responseText.match(
    /\[MAP_VIEW\]\s*([\s\S]*?)\s*\[\/MAP_VIEW\]/
  );
  if (mapMatch) {
    try {
      const jsonStr = mapMatch[1].trim();
      components.mapView = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found map view with",
        components.mapView?.listings?.length || 0,
        "listings"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse map view JSON:", e);
    }
  }

  // Parse [APPRECIATION]...[/APPRECIATION]
  const appreciationMatch = responseText.match(
    /\[APPRECIATION\]\s*([\s\S]*?)\s*\[\/APPRECIATION\]/
  );
  if (appreciationMatch) {
    try {
      const jsonStr = appreciationMatch[1].trim();
      components.appreciation = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found appreciation data for",
        components.appreciation?.location?.city ||
        components.appreciation?.location?.subdivision ||
        components.appreciation?.location?.county ||
        "location"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse appreciation JSON:", e);
    }
  }

  // Parse [COMPARISON]...[/COMPARISON]
  const comparisonMatch = responseText.match(
    /\[COMPARISON\]\s*([\s\S]*?)\s*\[\/COMPARISON\]/
  );
  if (comparisonMatch) {
    try {
      const jsonStr = comparisonMatch[1].trim();
      components.comparison = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found comparison data:",
        components.comparison?.location1?.name,
        "vs",
        components.comparison?.location2?.name
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse comparison JSON:", e);
    }
  }

  // Parse [ARTICLE_RESULTS]...[/ARTICLE_RESULTS]
  const articleMatch = responseText.match(
    /\[ARTICLE_RESULTS\]\s*([\s\S]*?)\s*\[\/ARTICLE_RESULTS\]/
  );
  if (articleMatch) {
    try {
      const jsonStr = articleMatch[1].trim();
      components.articles = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found article results with",
        components.articles?.results?.length || 0,
        "articles"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse article results JSON:", e);
    }
  }

  // Parse [SOURCES]...[/SOURCES] or [SOURCES] [...]
  // First try multi-line format with closing tag
  let sourcesMatch = responseText.match(
    /\[SOURCES\]\s*([\s\S]*?)\s*\[\/SOURCES\]/
  );

  // If not found, try single-line JSON array format (e.g., "[SOURCES] [ {...} ]")
  if (!sourcesMatch) {
    sourcesMatch = responseText.match(/\[SOURCES\]\s*(\[[\s\S]*?\])/);
  }

  if (sourcesMatch) {
    try {
      const jsonStr = sourcesMatch[1].trim();
      components.sources = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found",
        components.sources?.length || 0,
        "source citations"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse sources JSON:", e);
    }
  }

  // Parse [MARKET_STATS]...[/MARKET_STATS]
  const marketStatsMatch = responseText.match(
    /\[MARKET_STATS\]\s*([\s\S]*?)\s*\[\/MARKET_STATS\]/
  );
  if (marketStatsMatch) {
    try {
      const jsonStr = marketStatsMatch[1].trim();
      components.marketStats = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found market stats for",
        components.marketStats?.location?.city ||
        components.marketStats?.location?.subdivision ||
        "location"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse market stats JSON:", e);
    }
  }

  // Parse [NEIGHBORHOOD_LINK]...[/NEIGHBORHOOD_LINK]
  const neighborhoodLinkMatch = responseText.match(
    /\[NEIGHBORHOOD_LINK\]\s*([\s\S]*?)\s*\[\/NEIGHBORHOOD_LINK\]/
  );
  if (neighborhoodLinkMatch) {
    try {
      const jsonStr = neighborhoodLinkMatch[1].trim();
      components.neighborhoodLink = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found neighborhood link:",
        components.neighborhoodLink?.title
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse neighborhood link JSON:", e);
    }
  }

  return components;
}
```

---

### Text Cleaning

```javascript
export function cleanResponseText(responseText: string): string {
  let cleaned = responseText;

  // Remove [LISTING_CAROUSEL]...[/LISTING_CAROUSEL] blocks
  cleaned = cleaned.replace(
    /\[LISTING_CAROUSEL\]\s*[\s\S]*?\s*\[\/LISTING_CAROUSEL\]/g,
    ''
  );

  // Remove [LIST_VIEW]...[/LIST_VIEW] blocks
  cleaned = cleaned.replace(
    /\[LIST_VIEW\]\s*[\s\S]*?\s*\[\/LIST_VIEW\]/g,
    ''
  );

  // Remove [SOURCES]...[/SOURCES] blocks (multi-line format)
  cleaned = cleaned.replace(
    /\[SOURCES\]\s*[\s\S]*?\s*\[\/SOURCES\]/g,
    ''
  );

  // Remove [SOURCES] [...] blocks (single-line format)
  cleaned = cleaned.replace(/\[SOURCES\]\s*\[[\s\S]*?\]/g, '');

  // Remove [MAP_VIEW]...[/MAP_VIEW] blocks
  cleaned = cleaned.replace(
    /\[MAP_VIEW\]\s*[\s\S]*?\s*\[\/MAP_VIEW\]/g,
    ''
  );

  // Remove [APPRECIATION]...[/APPRECIATION] blocks
  cleaned = cleaned.replace(
    /\[APPRECIATION\]\s*[\s\S]*?\s*\[\/APPRECIATION\]/g,
    ''
  );

  // Remove [COMPARISON]...[/COMPARISON] blocks
  cleaned = cleaned.replace(
    /\[COMPARISON\]\s*[\s\S]*?\s*\[\/COMPARISON\]/g,
    ''
  );

  // Remove [ARTICLE_RESULTS]...[/ARTICLE_RESULTS] blocks
  cleaned = cleaned.replace(
    /\[ARTICLE_RESULTS\]\s*[\s\S]*?\s*\[\/ARTICLE_RESULTS\]/g,
    ''
  );

  // Remove [MARKET_STATS]...[/MARKET_STATS] blocks
  cleaned = cleaned.replace(
    /\[MARKET_STATS\]\s*[\s\S]*?\s*\[\/MARKET_STATS\]/g,
    ''
  );

  // Remove [NEIGHBORHOOD_LINK]...[/NEIGHBORHOOD_LINK] blocks
  cleaned = cleaned.replace(
    /\[NEIGHBORHOOD_LINK\]\s*[\s\S]*?\s*\[\/NEIGHBORHOOD_LINK\]/g,
    ''
  );

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}
```

---

## 6. FRONTEND RENDERING

**Location:** `src/app/components/chat/ChatWidget.tsx`

### SSE Stream Consumption

```typescript
const handleAIQuery = async (query: string) => {
  try {
    // Add user message
    const userMessage = addMessage(query, "user");

    // Call stream API
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        userId: session?.user?.id,
        userTier: (session?.user as any)?.tier || "free"
      })
    });

    if (!response.ok) throw new Error("Stream failed");

    setIsStreaming(true);
    let fullText = "";
    let components: ComponentData | undefined;

    // Read SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));

          // Token (text content)
          if (data.token) {
            fullText += data.token;
            setStreamingText(fullText);
          }

          // Components (carousel, map, etc.)
          if (data.components) {
            components = data.components;
          }

          // Done signal
          if (data.done) {
            setIsStreaming(false);
            setStreamingText("");

            // Add complete message with components
            addMessage(fullText, "assistant", undefined, components);
          }

          // Error
          if (data.error) {
            console.error("[STREAM ERROR]", data.error);
            setIsStreaming(false);
          }
        }
      }
    }
  } catch (error) {
    console.error("[handleAIQuery] Error:", error);
    setIsStreaming(false);
  }
};
```

---

### Component Rendering

```tsx
{messages.map((msg, index) => (
  <div key={msg.id} className="message-container">
    {/* User/Assistant Message Bubble */}
    <div className={`message ${msg.role === "user" ? "user" : "assistant"}`}>
      <ReactMarkdown>{cleanResponseText(msg.content)}</ReactMarkdown>
    </div>

    {/* Listing Carousel */}
    {msg.components?.carousel && (
      <div className="component-wrapper">
        <ListingCarousel
          listings={msg.components.carousel.listings}
          title={msg.components.carousel.title}
          onOpenPanel={handleOpenListingPanel}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    )}

    {/* List View */}
    {msg.components?.listView && (
      <div className="component-wrapper">
        <ListingListView
          listings={msg.components.listView.listings}
          title={msg.components.listView.title}
          totalCount={msg.components.listView.totalCount}
          onOpenPanel={handleOpenListingPanel}
        />
      </div>
    )}

    {/* Map View */}
    {msg.components?.mapView && (
      <div className="component-wrapper">
        <ChatMapView
          listings={msg.components.mapView.listings}
          center={msg.components.mapView.center}
          zoom={msg.components.mapView.zoom}
        />
      </div>
    )}

    {/* Appreciation Card */}
    {msg.components?.appreciation && (
      <div className="component-wrapper">
        <AppreciationCard data={msg.components.appreciation} />
      </div>
    )}

    {/* Comparison Chart */}
    {msg.components?.comparison && (
      <div className="component-wrapper">
        <SubdivisionComparisonChart data={msg.components.comparison} />
      </div>
    )}

    {/* Market Stats */}
    {msg.components?.marketStats && (
      <div className="component-wrapper">
        <MarketStatsCard data={msg.components.marketStats} />
      </div>
    )}

    {/* Article Results */}
    {msg.components?.articles && (
      <div className="component-wrapper">
        {msg.components.articles.results.map((article: any) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    )}

    {/* Neighborhood Link */}
    {msg.components?.neighborhoodLink && (
      <div className="component-wrapper">
        <a
          href={msg.components.neighborhoodLink.url}
          className="neighborhood-link-card"
        >
          <h3>{msg.components.neighborhoodLink.title}</h3>
          <p>{msg.components.neighborhoodLink.description}</p>
        </a>
      </div>
    )}

    {/* Source Citations */}
    {msg.components?.sources && (
      <div className="sources-container">
        <SourceBubbles sources={msg.components.sources} />
      </div>
    )}
  </div>
))}
```

---

### Component Data Storage

**Location:** `src/app/components/chat/ChatProvider.tsx`

```typescript
export interface ComponentData {
  carousel?: {
    title?: string;
    listings: Listing[];
  };
  listView?: {
    title?: string;
    listings: Listing[];
    totalCount?: number;
    hasMore?: boolean;
  };
  mapView?: {
    listings: any[];
    center?: { lat: number; lng: number };
    zoom?: number;
  };
  sources?: SourceType[];
  appreciation?: {
    location: { city?: string; subdivision?: string; county?: string };
    period: string;
    annualAppreciation: number;
    cumulativeAppreciation: number;
    trend: string;
    confidence: string;
    dataPoints: Array<{ year: number; avgPrice: number }>;
  };
  comparison?: {
    location1: { name: string; type: string };
    location2: { name: string; type: string };
    metrics: any[];
  };
  articles?: {
    results: Array<{
      title: string;
      slug: string;
      category: string;
      excerpt: string;
      publishedAt: string;
    }>;
  };
  marketStats?: {
    location: { city?: string; subdivision?: string };
    daysOnMarket: any;
    pricePerSqft: any;
    hoaFees: any;
    propertyTax: any;
  };
  neighborhoodLink?: {
    url: string;
    title: string;
    description: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  components?: ComponentData; // Attached to each message
}

// Messages stored in sessionStorage
const STORAGE_KEY = "jpsrealtor_chat_messages";
const STORAGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function saveMessages(messages: ChatMessage[]) {
  const data = {
    messages,
    timestamp: Date.now()
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadMessages(): ChatMessage[] {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  const data = JSON.parse(stored);
  const age = Date.now() - data.timestamp;

  if (age > STORAGE_EXPIRY_MS) {
    sessionStorage.removeItem(STORAGE_KEY);
    return [];
  }

  return data.messages;
}
```

---

## 7. COMPONENT TYPES

### 1. LISTING_CAROUSEL

**Location:** `src/app/components/chat/ListingCarousel.tsx`

**Purpose:** Horizontal scrolling property cards

**Features:**
- Auto-scroll with touch/drag support
- Favorite toggle
- CMA selection
- "Open in Map View" button
- Responsive sizing

**Props:**

```typescript
interface ListingCarouselProps {
  listings: Listing[];
  title?: string;
  onOpenPanel?: (listing: Listing) => void;
  onToggleFavorite?: (listingKey: string) => void;
}
```

**Rendering:**

```tsx
<div className="listing-carousel">
  <h3>{title || `${listings.length} Properties`}</h3>
  <div className="carousel-container">
    {listings.map(listing => (
      <ListingCard
        key={listing.id}
        listing={listing}
        onOpenPanel={() => onOpenPanel(listing)}
        onToggleFavorite={() => onToggleFavorite(listing.id)}
      />
    ))}
  </div>
  <button onClick={handleOpenInMapView}>
    Open in Map View
  </button>
</div>
```

---

### 2. LIST_VIEW

**Location:** `src/app/components/chat/ListingListView.tsx`

**Purpose:** Paginated vertical listing view

**Features:**
- Full listing count display
- Pagination (10 per page)
- Sort options
- Filter chips

**Props:**

```typescript
interface ListingListViewProps {
  listings: Listing[];
  title?: string;
  totalCount?: number;
  hasMore?: boolean;
  onOpenPanel?: (listing: Listing) => void;
}
```

---

### 3. MAP_VIEW

**Location:** `src/app/components/chat/ChatMapView.tsx`

**Purpose:** Interactive map with listing markers

**Features:**
- Embedded Mapbox map
- Clustered markers
- Click to open listing panel
- Auto-zoom to fit all listings

**Props:**

```typescript
interface ChatMapViewProps {
  listings: any[];
  center?: { lat: number; lng: number };
  zoom?: number;
}
```

---

### 4. APPRECIATION

**Location:** `src/app/components/analytics/AppreciationCard.tsx`

**Purpose:** Property appreciation analytics

**Features:**
- Line chart with data points
- Annual/cumulative appreciation
- Trend indicator
- Confidence level

**Props:**

```typescript
interface AppreciationCardProps {
  data: {
    location: { city?: string; subdivision?: string };
    period: string;
    annualAppreciation: number;
    cumulativeAppreciation: number;
    trend: string;
    confidence: string;
    dataPoints: Array<{ year: number; avgPrice: number }>;
  };
}
```

---

### 5. COMPARISON

**Location:** `src/app/components/chat/SubdivisionComparisonChart.tsx`

**Purpose:** Side-by-side comparison chart

**Features:**
- Bar chart comparison
- Multiple metrics (price, DOM, appreciation)
- Color-coded bars

**Props:**

```typescript
interface ComparisonChartProps {
  data: {
    location1: { name: string; type: string };
    location2: { name: string; type: string };
    metrics: Array<{
      name: string;
      location1Value: number;
      location2Value: number;
      unit: string;
    }>;
  };
}
```

---

### 6. MARKET_STATS

**Location:** `src/app/components/chat/MarketStatsCard.tsx`

**Purpose:** Market statistics card

**Displays:**
- Days on Market (avg, median, distribution)
- Price per Sqft (avg, median, range)
- HOA Fees (avg, median, distribution)
- Property Tax (avg, median, effective rate)

**Props:**

```typescript
interface MarketStatsCardProps {
  data: {
    location: { city?: string; subdivision?: string };
    daysOnMarket: {
      avg: number;
      median: number;
      distribution: Record<string, number>;
      trend: string;
    };
    pricePerSqft: {
      avg: number;
      median: number;
      min: number;
      max: number;
    };
    hoaFees: {
      avg: number;
      median: number;
      distribution: Record<string, number>;
      frequency: string;
    };
    propertyTax: {
      avg: number;
      median: number;
      effectiveRate: number;
    };
  };
}
```

---

### 7. ARTICLE_RESULTS

**Location:** `src/app/components/chat/ArticleCard.tsx`

**Purpose:** Blog article cards

**Features:**
- Article thumbnail
- Category badge
- Excerpt
- "Read Article" link

**Props:**

```typescript
interface ArticleCardProps {
  article: {
    title: string;
    slug: string;
    category: string;
    excerpt: string;
    publishedAt: string;
  };
}
```

---

### 8. SOURCES

**Location:** `src/app/components/chat/SourceBubble.tsx`

**Purpose:** Source citation bubbles

**Types:**
- `mls` - MLS source (CRMLS, GPS, etc.)
- `web` - External website
- `article` - Blog article
- `analytics` - Market analytics source

**Props:**

```typescript
interface SourceBubblesProps {
  sources: Array<{
    type: "mls" | "web" | "article" | "analytics";
    name?: string;
    abbreviation?: string;
    url?: string;
    domain?: string;
    category?: string;
    slug?: string;
    title?: string;
  }>;
}
```

**Rendering:**

```tsx
<div className="sources-container">
  {sources.map((source, index) => (
    <div key={index} className={`source-bubble ${source.type}`}>
      {source.type === "mls" && (
        <span title={source.name}>{source.abbreviation}</span>
      )}
      {source.type === "web" && (
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {source.domain}
        </a>
      )}
      {source.type === "article" && (
        <a href={`/insights/${source.category}/${source.slug}`}>
          {source.title}
        </a>
      )}
      {source.type === "analytics" && (
        <span>{source.name}</span>
      )}
    </div>
  ))}
</div>
```

---

## DEBUGGING GUIDE

### Common Issues

#### Issue 1: Carousel Not Displaying

**Symptoms:**
- AI response shows listing count and details
- Map view appears
- But no carousel component

**Possible Causes:**

1. **No Photo URLs** - `fetchListingPhoto()` returning empty strings
   - **Check:** Browser console for `[PARSE] Found carousel with X listings`
   - **Check:** Network tab for `/api/listings/[key]/photos` requests
   - **Fix:** Verify photo data exists in MongoDB `media` array

2. **Tool Response Missing `sampleListings`**
   - **Check:** Server console for `[queryDatabase] Query result:`
   - **Check:** Tool response has `summary.sampleListings` array
   - **Fix:** Verify `executeQueryDatabase()` is fetching photos

3. **Component Parsing Failed**
   - **Check:** Browser console for `[PARSE] Failed to parse carousel JSON`
   - **Check:** AI response text contains valid JSON between `[LISTING_CAROUSEL]` tags
   - **Fix:** Check system prompt instructs AI to output valid JSON

4. **React Rendering Issue**
   - **Check:** `msg.components?.carousel` is populated in ChatWidget
   - **Check:** `ListingCarousel` component is imported and rendered
   - **Fix:** Verify component rendering logic in ChatWidget

---

#### Issue 2: Map View Not Centering

**Symptoms:**
- Map appears but doesn't zoom to listings
- Listings appear outside map bounds

**Possible Causes:**

1. **Missing `center` Coordinates**
   - **Check:** Tool response has `summary.center` object
   - **Fix:** Verify center calculation in `executeQueryDatabase()`

2. **Invalid Latitude/Longitude**
   - **Check:** Listing lat/lng values are valid numbers (not null/0)
   - **Fix:** Check MongoDB data quality

---

#### Issue 3: Sources Not Parsing

**Symptoms:**
- AI outputs `[SOURCES] [ {...} ]` but no source bubbles appear

**Possible Causes:**

1. **Single-Line Format Not Parsed**
   - **Check:** Browser console for `[PARSE] Failed to parse sources JSON`
   - **Fix:** Verify response-parser.ts handles both formats (already fixed)

2. **Invalid JSON**
   - **Check:** AI response has valid JSON array
   - **Fix:** Update system prompt with clear examples

---

#### Issue 4: Tool Not Being Called

**Symptoms:**
- AI responds with generic text, no listings shown
- No tool execution logs in server console

**Possible Causes:**

1. **Query Not Recognized**
   - **Check:** System prompt defines when to use each tool
   - **Fix:** Add more examples to system prompt

2. **Tool Schema Mismatch**
   - **Check:** Tool definition in `tools.ts` matches executor in `tool-executor.ts`
   - **Fix:** Verify parameter names are consistent

---

### Debugging Steps

#### 1. Enable Debug Logging

Add to `.env.local`:

```
NEXT_PUBLIC_DEBUG_CHAT=true
```

This enables verbose console logging throughout the system.

---

#### 2. Check Tool Execution Logs

Watch server console for:

```
[TOOL ROUND 1/3]
[TOOL EXECUTION] 1 tool(s) called: queryDatabase
[queryDatabase] Starting with args: { subdivision: "Indian Wells Country Club", ... }
[queryDatabase] API response: { success: true, listingCount: 10 }
[queryDatabase] Fetching photos for 10 listings...
[queryDatabase] Query result: { success: true, summary: { count: 31, ... } }
```

---

#### 3. Inspect API Response

Test query endpoint directly:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "subdivision": "Indian Wells Country Club",
      "limit": 10,
      "sort": "newest"
    },
    "includeStats": true
  }'
```

Expected response:

```json
{
  "success": true,
  "listings": [ /* 10 listings */ ],
  "stats": { /* price/DOM stats */ },
  "meta": { "totalListings": 31, "returned": 10 }
}
```

---

#### 4. Check Photo API

Test photo fetching:

```bash
curl http://localhost:3000/api/listings/3yd-CRMLS-OC24123456/photos
```

Expected response:

```json
{
  "photos": [
    {
      "uri800": "https://cdn.photos.com/photo1-800.jpg",
      "uri1024": "https://cdn.photos.com/photo1-1024.jpg",
      "uri1600": "https://cdn.photos.com/photo1-1600.jpg",
      "mediaCategory": "Primary Photo",
      "order": 0
    }
    // ... more photos
  ]
}
```

---

#### 5. Verify Component Data

In browser console:

```javascript
// Get ChatProvider context
const { messages } = useChatContext();

// Check last message
const lastMsg = messages[messages.length - 1];
console.log('Last message:', lastMsg);
console.log('Components:', lastMsg.components);
console.log('Carousel:', lastMsg.components?.carousel);
console.log('Listings:', lastMsg.components?.carousel?.listings);

// Check each listing has image
lastMsg.components?.carousel?.listings.forEach((listing, i) => {
  console.log(`Listing ${i + 1}:`, {
    id: listing.id,
    price: listing.price,
    image: listing.image,
    hasImage: !!listing.image
  });
});
```

---

#### 6. Check AI Response Text

In browser console:

```javascript
// Get raw AI response (before parsing)
const lastMsg = messages[messages.length - 1];
console.log('Raw response text:', lastMsg.content);

// Check for component markers
console.log('Has LISTING_CAROUSEL:', lastMsg.content.includes('[LISTING_CAROUSEL]'));
console.log('Has MAP_VIEW:', lastMsg.content.includes('[MAP_VIEW]'));
console.log('Has SOURCES:', lastMsg.content.includes('[SOURCES]'));
```

---

#### 7. Test Parser Directly

In browser console:

```javascript
import { parseComponentData } from '@/lib/chat/response-parser';

const testResponse = `
I found 31 homes!

[LISTING_CAROUSEL]
{
  "title": "31 homes in Indian Wells Country Club",
  "listings": [...]
}
[/LISTING_CAROUSEL]
`;

const components = parseComponentData(testResponse);
console.log('Parsed components:', components);
```

---

## KEY FILES REFERENCE

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Tool System** |
| Tool Definitions | `src/lib/chat/tools.ts` | Defines all available tools with schemas |
| Tool Executor | `src/lib/chat/tool-executor.ts` | Executes tool calls and returns results |
| System Prompt | `src/lib/chat/system-prompt.ts` | AI instructions for using tools |
| **Backend API** |
| Stream Route | `src/app/api/chat/stream/route.ts` | SSE streaming with multi-round tool execution |
| Query Endpoint | `src/app/api/query/route.ts` | Main property search API |
| Photo Endpoint | `src/app/api/listings/[key]/photos/route.ts` | Fetch listing photos |
| **Query System** |
| Query Executor | `src/lib/queries/aggregators/active-listings.ts` | Main query executor |
| Filter Builder | `src/lib/queries/filters/index.ts` | Builds MongoDB filters |
| Time Filters | `src/lib/queries/filters/time.ts` | Time-based filtering |
| Stats Calculator | `src/lib/queries/calculations/stats.ts` | Price/DOM statistics |
| **Frontend** |
| Response Parser | `src/lib/chat/response-parser.ts` | Parses component markers |
| ChatWidget | `src/app/components/chat/ChatWidget.tsx` | Main chat interface |
| ChatProvider | `src/app/components/chat/ChatProvider.tsx` | Chat state management |
| **Components** |
| ListingCarousel | `src/app/components/chat/ListingCarousel.tsx` | Horizontal property cards |
| ListingListView | `src/app/components/chat/ListingListView.tsx` | Paginated list view |
| ChatMapView | `src/app/components/chat/ChatMapView.tsx` | Embedded map |
| AppreciationCard | `src/app/components/analytics/AppreciationCard.tsx` | Appreciation analytics |
| ComparisonChart | `src/app/components/chat/SubdivisionComparisonChart.tsx` | Side-by-side comparison |
| MarketStatsCard | `src/app/components/chat/MarketStatsCard.tsx` | Market statistics |
| ArticleCard | `src/app/components/chat/ArticleCard.tsx` | Blog article cards |
| SourceBubble | `src/app/components/chat/SourceBubble.tsx` | Source citations |

---

## CONCLUSION

This documentation provides a complete reference for the JPSREALTOR chat tool system, from tool definitions through component rendering. Use this guide to:

- Understand how tools are executed
- Debug component rendering issues
- Add new tools or components
- Optimize query performance
- Troubleshoot carousel/map display issues

For the specific issue where the carousel didn't display for "show me homes in Indian Wells Country Club", follow the debugging steps in the Debugging Guide section.
