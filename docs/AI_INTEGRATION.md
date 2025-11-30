# AI Integration (Groq)
**Natural Language Property Search & Chat**
**Last Updated:** January 29, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Tool Functions](#tool-functions)
5. [API Routes](#api-routes)
6. [System Prompt](#system-prompt)
7. [Usage Examples](#usage-examples)
8. [Future: Chap Integration](#future-chap-integration)

---

## 🎯 OVERVIEW

JPSRealtor.com uses **Groq SDK** for AI-powered natural language property search. Users can ask questions like "Show me 3-bed homes under $500k in Palm Desert" and the AI:
1. **Interprets intent** using LLM reasoning
2. **Calls tools/functions** to fetch data
3. **Formats responses** with listing carousels and insights
4. **Controls the map** (future Chap feature)

### Key Features
- ✅ **Natural language queries** - No complex filter UIs needed
- ✅ **Function calling** - AI decides which tools to use
- ✅ **Streaming responses** - Real-time text generation
- ✅ **CMA generation** - Automated market analysis
- ✅ **Investment analysis** - Cap Rate, CoC, DSCR calculations
- ✅ **Community insights** - Schools, amenities, demographics

---

## 🛠️ TECHNOLOGY STACK

### Groq SDK
```yaml
Package: groq-sdk 0.8.0
API Endpoint: https://api.groq.com/openai/v1/chat/completions
```

### Available Models

#### 1. **FREE Tier** (Default)
```typescript
model: "llama-3.1-8b-instant"

Specifications:
  - Speed: 840 tokens per second (TPS)
  - Cost: ~$0.013/month per user
  - Context: 32k tokens
  - Function calling: ✅ Yes
  - Best for: General queries, property search
```

#### 2. **PREMIUM Tier** (Future)
```typescript
model: "openai/gpt-oss-120b"

Specifications:
  - Speed: 500 TPS
  - Context: 131k tokens
  - Function calling: ✅ Yes (advanced)
  - Best for: Complex CMA, investment analysis
```

### Configuration
```typescript
// src/lib/groq.ts
export const GROQ_MODELS = {
  FREE: "llama-3.1-8b-instant",
  PREMIUM: "openai/gpt-oss-120b",
};

// Default settings
{
  temperature: 0.3,      // Conservative for accuracy
  maxTokens: 500,        // Context-aware responses
  stream: true,          // Real-time streaming
  tool_choice: "auto"    // AI decides when to use tools
}
```

---

## 🏗️ ARCHITECTURE

### Components

```
User Query
    ↓
IntegratedChatWidget.tsx
    ↓
POST /api/chat/stream
    ↓
Groq AI (llama-3.1-8b-instant)
    ├─ Analyzes intent
    ├─ Decides which tools to call
    └─ Formats response
    ↓
Tool Executors
    ├─ matchLocation()
    ├─ searchCity()
    ├─ getCommunityFacts()
    └─ (future) controlMap()
    ↓
MongoDB Queries
    ↓
Formatted Response
    ├─ [LISTING_CAROUSEL]
    ├─ [MAP_VIEW]
    ├─ [CMA_DISPLAY]
    └─ Plain text
```

### File Structure
```
src/
├── lib/
│   ├── groq.ts              # Groq client & types
│   ├── ai-functions.ts      # Tool function definitions
│   └── generate-chat-title.ts
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── stream/
│   │       │   └── route.ts   # Main chat endpoint
│   │       ├── match-location/
│   │       │   └── route.ts   # Location resolver
│   │       └── search-city/
│   │           └── route.ts   # City search
│   └── components/
│       └── chatwidget/
│           └── IntegratedChatWidget.tsx
```

---

## 🔧 TOOL FUNCTIONS

The AI has access to specialized functions it can call to fetch data:

### 1. **matchLocation**

**Purpose:** Resolve natural language locations to geo data

**Description:**
```
Resolves user queries like "Palm Desert Country Club", "homes near me",
"La Quinta" to actual subdivision/city data with coordinates and bounds.
```

**API Endpoint:** `POST /api/chat/match-location`

**Parameters:**
```typescript
{
  query: string,           // e.g., "Palm Desert Country Club"
  locationType?: string    // "subdivision" | "city" | "neighborhood"
}
```

**Returns:**
```typescript
{
  type: "subdivision" | "city",
  name: string,
  slug: string,
  coordinates: { lat: number, lng: number },
  bounds?: { north, south, east, west },
  metadata?: {
    hoaFee?: number,
    totalListings: number,
    avgPrice: number
  }
}
```

**Example:**
```
User: "Show me homes in Palm Desert Country Club"
AI calls: matchLocation({ query: "Palm Desert Country Club" })
Result: {
  type: "subdivision",
  name: "Palm Desert Country Club",
  slug: "palm-desert-country-club",
  coordinates: { lat: 33.7303, lng: -116.3453 },
  metadata: { hoaFee: 350, totalListings: 47 }
}
```

### 2. **searchCity**

**Purpose:** Search all properties in a city

**Description:**
```
Fetches all active listings in a specified city with optional filters
(price, beds, baths, property type, amenities).
```

**API Endpoint:** `POST /api/chat/search-city`

**Parameters:**
```typescript
{
  citySlug: string,        // e.g., "palm-desert"
  filters?: {
    minPrice?: number,
    maxPrice?: number,
    beds?: number,
    baths?: number,
    propertyType?: "A" | "B" | "C",  // Sale, Rental, Multi-family
    pool?: boolean,
    view?: boolean
  },
  limit?: number,          // Default: 20
  sortBy?: "price" | "size" | "newest"
}
```

**Returns:**
```typescript
{
  city: string,
  totalListings: number,
  listings: IListing[],     // Array of listing objects
  avgPrice: number,
  priceRange: { min: number, max: number }
}
```

**Example:**
```
User: "3-bed homes under $500k in Palm Desert"
AI calls: searchCity({
  citySlug: "palm-desert",
  filters: {
    beds: 3,
    maxPrice: 500000,
    propertyType: "A"
  },
  limit: 20
})
```

### 3. **getCommunityFacts** (Future)

**Purpose:** Get schools, demographics, amenities for a location

**Description:**
```
Provides comprehensive community data including schools, crime stats,
walkability, nearby amenities, and local businesses.
```

**Parameters:**
```typescript
{
  location: string,        // City or subdivision slug
  categories?: string[]    // ["schools", "amenities", "demographics"]
}
```

**Returns:**
```typescript
{
  schools: School[],
  amenities: {
    restaurants: number,
    shopping: number,
    parks: number,
    entertainment: number
  },
  demographics: {
    population: number,
    medianAge: number,
    medianIncome: number
  },
  walkScore?: number,
  transitScore?: number
}
```

### 4. **controlMap** (Future - Chap Feature)

**Purpose:** AI controls map viewport and filters

**Description:**
```
Allows AI to pan/zoom the map, apply filters, highlight listings,
and draw bounds based on natural language commands.
```

**Parameters:**
```typescript
{
  action: "panTo" | "drawBounds" | "applyFilters" | "highlightListings",

  // For panTo
  location?: { lat: number, lng: number, zoom: number },

  // For drawBounds
  bounds?: { north, south, east, west, label?: string },

  // For applyFilters
  filters?: Partial<Filters>,

  // For highlightListings
  listingKeys?: string[]
}
```

**Example (Future):**
```
User: "Show me on the map where these homes are"
AI calls: controlMap({
  action: "highlightListings",
  listingKeys: ["123-456", "789-012"]
})
```

---

## 🌐 API ROUTES

### Main Chat Endpoint

**Route:** `POST /api/chat/stream`

**Location:** `src/app/api/chat/stream/route.ts`

**Request Body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant" | "system",
    content: string
  }>,
  model?: "llama-3.1-8b-instant",  // Optional
  temperature?: number,             // Default: 0.3
  stream?: boolean                  // Default: true
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"type": "text", "content": "I found "}
data: {"type": "text", "content": "47 homes "}
data: {"type": "text", "content": "matching your criteria."}
data: {"type": "tool_call", "name": "searchCity", "args": {...}}
data: {"type": "carousel", "listings": [...]}
data: [DONE]
```

**Response Types:**
```typescript
type StreamResponse =
  | { type: "text", content: string }
  | { type: "tool_call", name: string, args: any }
  | { type: "carousel", listings: IListing[] }
  | { type: "map_view", center: {lat, lng}, zoom: number }
  | { type: "cma", data: CMAData }
  | { type: "error", message: string }
```

### Tool Execution Endpoints

**matchLocation:** `POST /api/chat/match-location`
- Queries subdivisions and cities collections
- Uses fuzzy matching
- Returns geo data + metadata

**searchCity:** `POST /api/chat/search-city`
- Queries listings and crmlsListings collections
- Applies filters
- Joins with photos
- Returns sorted results

---

## 📝 SYSTEM PROMPT

The AI is configured with a comprehensive system prompt that includes:

### 1. Role Definition
```
You are an expert real estate assistant for the Coachella Valley.
You help users find properties, analyze investments, and understand markets.
```

### 2. Investment Formulas
```markdown
**Cap Rate:** (Net Operating Income / Purchase Price) × 100
**Cash-on-Cash:** (Annual Cash Flow / Total Cash Invested) × 100
**DSCR:** Net Operating Income / Annual Debt Service
```

### 3. CMA Guidelines
```markdown
When generating CMAs:
1. Find 5-10 comparable properties (same beds, baths, sqft ±20%)
2. Analyze sold prices in last 6 months
3. Calculate price per sqft averages
4. Consider location, condition, amenities
5. Provide price range estimate
```

### 4. Response Formatting
```markdown
Use special markers for structured data:

[LISTING_CAROUSEL]
{
  "title": "47 homes in Palm Desert",
  "listings": [...]
}
[/LISTING_CAROUSEL]

[MAP_VIEW]
{
  "center": {"lat": 33.72, "lng": -116.37},
  "zoom": 13,
  "listings": [...]
}
[/MAP_VIEW]
```

### 5. Available Tools Documentation
```markdown
Tools you have access to:
- matchLocation(query): Resolve locations
- searchCity(citySlug, filters): Find listings
- getCommunityFacts(location): Get local data
```

### 6. Conversation Guidelines
```markdown
- Be conversational and friendly
- Ask clarifying questions if needed
- Provide actionable insights
- Use emojis sparingly
- Keep responses concise
```

---

## 💡 USAGE EXAMPLES

### Example 1: Property Search

**User Query:**
```
"Show me 3-bed homes under $500k in Palm Desert"
```

**AI Reasoning:**
1. User wants homes (search intent)
2. Location: Palm Desert
3. Filters: beds=3, maxPrice=500000
4. Should fetch and display results

**Tool Calls:**
```typescript
// Step 1: Resolve location
matchLocation({ query: "Palm Desert" })
→ Returns: { type: "city", slug: "palm-desert", ... }

// Step 2: Search listings
searchCity({
  citySlug: "palm-desert",
  filters: { beds: 3, maxPrice: 500000, propertyType: "A" },
  limit: 20
})
→ Returns: { totalListings: 47, listings: [...], avgPrice: 425000 }
```

**AI Response:**
```
I found 47 homes in Palm Desert with 3 bedrooms under $500k!
The average price is $425,000. Here are the top options:

[LISTING_CAROUSEL]
{ "title": "3-bed homes in Palm Desert", "listings": [...] }
[/LISTING_CAROUSEL]

Would you like to see these on a map or filter further?
```

### Example 2: CMA Request

**User Query:**
```
"What's the market value of a 4-bed, 3-bath home in La Quinta Country Club?"
```

**AI Reasoning:**
1. User wants a Comparative Market Analysis (CMA)
2. Need comparable sales data
3. Calculate average price per sqft
4. Provide valuation range

**Tool Calls:**
```typescript
matchLocation({ query: "La Quinta Country Club" })
searchCity({
  citySlug: "la-quinta",
  filters: { beds: 4, baths: 3, propertyType: "A" },
  sortBy: "newest",
  limit: 10
})
```

**AI Response:**
```
Based on recent sales in La Quinta Country Club:

**Comparable Sales (Last 6 months):**
- 4 bed, 3 bath, 2,400 sqft → $625,000 ($260/sqft)
- 4 bed, 3 bath, 2,600 sqft → $680,000 ($262/sqft)
- 4 bed, 3 bath, 2,200 sqft → $590,000 ($268/sqft)

**Average:** $631,667 ($263/sqft)
**Estimated Range:** $600,000 - $675,000

This assumes the home is in good condition with standard finishes.
Want a detailed CMA report?
```

### Example 3: Investment Analysis

**User Query:**
```
"Is this property a good investment?" [referring to a $450k rental]
```

**AI Response:**
```
Let me analyze the investment potential:

**Property:** $450,000 purchase price
**Estimated Rent:** $2,800/month (based on comps)

**Cash Flow Analysis:**
- Gross Rent: $33,600/year
- Expenses (30%): -$10,080
- Net Operating Income: $23,520

**Assuming 20% down ($90k):**
- Mortgage (P&I): $2,150/month = $25,800/year
- **Cash Flow:** -$2,280/year (negative)
- **Cash-on-Cash:** -2.5%

**Verdict:** Not ideal for cash flow. Consider:
1. Negotiate lower price (~$420k)
2. Rent for higher ($3,000+/month)
3. Use as appreciation play (Coachella Valley avg: 6%/year)

Want me to find better investment properties?
```

---

## 🚀 FUTURE: CHAP INTEGRATION

### Vision: AI-Controlled Map

The **"Chap" (Chat + Map)** experience will allow AI to control the map in real-time:

**User:** "Show me these homes on the map"
**AI:** Calls `controlMap({ action: "highlightListings", listingKeys: [...] })`
**Result:** Map automatically pans, zooms, and highlights selected properties

**User:** "Zoom into Palm Desert Country Club"
**AI:** Calls `controlMap({ action: "panTo", location: {...}, zoom: 14 })`
**Result:** Map smoothly animates to location

### Architecture (Future)

```typescript
// ChapProvider.tsx
interface ChapContextType {
  mapController: {
    panTo: (lat, lng, zoom) => void,
    drawBounds: (bounds, label) => void,
    applyFilters: (filters) => void,
    highlightListings: (listingKeys) => void
  },
  currentViewport: { lat, lng, zoom, bounds },
  visibleListingCount: number
}
```

### New Tool: controlMap (Future)

```typescript
{
  type: "function",
  function: {
    name: "controlMap",
    description: "Control the map viewport based on user intent",
    parameters: {
      action: {
        enum: ["panTo", "drawBounds", "applyFilters", "highlightListings"]
      },
      location: { lat: number, lng: number, zoom: number },
      bounds: { north, south, east, west },
      filters: Partial<Filters>,
      listingKeys: string[]
    }
  }
}
```

---

## 📊 PERFORMANCE & COSTS

### Response Times
- **First token:** <500ms (Groq is FAST!)
- **Full response:** 1-3 seconds (depending on tool calls)
- **Streaming:** Real-time (20-50 tokens/second visible to user)

### Cost Analysis (FREE Tier)
```
Model: llama-3.1-8b-instant
Cost per 1M tokens:
  - Input: $0.05
  - Output: $0.08

Average conversation (10 messages):
  - ~5,000 tokens total
  - Cost: ~$0.0004 (less than 1 cent!)

Estimated monthly cost (1000 users, 5 convos each):
  - ~25M tokens
  - Cost: ~$13/month
```

### Optimization Tips
1. **Short system prompts** - Reduce input tokens
2. **Temperature 0.3** - More consistent, fewer retries
3. **Max tokens 500** - Prevents rambling
4. **Tool calling** - More efficient than generating data in text

---

## 🔍 DEBUGGING & TESTING

### Enable Debug Logging
```typescript
// In /api/chat/stream/route.ts
console.log("User message:", userMessage);
console.log("AI response:", completion);
console.log("Tool calls:", toolCalls);
```

### Test Tool Functions Directly
```bash
curl -X POST http://localhost:3000/api/chat/match-location \
  -H "Content-Type: application/json" \
  -d '{"query": "Palm Desert Country Club"}'
```

### Monitor Groq Console
https://console.groq.com/
- View API usage
- Check rate limits
- See error logs

---

## 📚 RELATED DOCUMENTATION

- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - IntegratedChatWidget component
- [MAP_SYSTEM.md](./MAP_SYSTEM.md) - Map integration (future Chap)
- [master-plan.md](../master-plan.md) - Chap vision and implementation plan

---

**This document reflects the current AI integration as of January 2025.**
**For system architecture, see:** [MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)
