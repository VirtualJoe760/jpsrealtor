# Real Estate User Query Analysis
**Date**: December 17, 2025 11:30 PM
**Purpose**: Map real user questions to tool architecture (USER-FIRST APPROACH)

---

## Real User Query Patterns

### Category 1: BROWSING (60% of queries)
**User Intent**: "I want to see what's available"

#### Query Patterns:
```
"Show me homes in [location]"
"What's available in [location]"
"Homes for sale in [location]"
"Properties in [location]"
"Search [location]"
"Find me homes in [location]"
"I'm looking in [location]"
"Let's look at [location]"
```

#### With Basic Filters:
```
"Show me 3 bedroom homes in Palm Desert"
"Homes under $500k in La Quinta"
"Show me homes in Indian Wells with a pool"
"4 bed 3 bath homes in Temecula"
"Single family homes in Palm Springs under $1M"
"Condos in Palm Desert under $400k"
```

#### With Multiple Filters:
```
"Show me 3+ bed homes under $800k with a pool in Temecula"
"Find 2-3 bedroom condos under $300k in La Quinta"
"Homes with pool and spa in Indian Wells under $2M"
"Single family homes 2000+ sqft under $600k in Palm Desert"
```

**What They Need**:
- Listings with photos
- Basic stats (price range, count)
- Map with pins
- Fast results

**Tool Needed**: `searchHomes(location, filters)`

---

### Category 2: NEW LISTINGS (15% of queries)
**User Intent**: "What just hit the market?"

#### Query Patterns:
```
"What's new in [location]"
"New listings in [location]"
"Latest homes in [location]"
"Recent listings in [location]"
"Show me what just came on the market in [location]"
"Newest homes in [location]"
"This week's listings in [location]"
"What came on the market today in [location]"
"Fresh listings in [location]"
```

#### With Timeframes:
```
"New listings this week in Palm Desert"
"What's new in the last 30 days in La Quinta"
"Homes listed in the past 2 weeks in Indian Wells"
"Today's new listings in Coachella Valley"
```

**What They Need**:
- Recent listings (7-30 days)
- Sorted by date (newest first)
- Quick market pulse

**Tool Needed**: `searchNewListings(location, timeframe)`

---

### Category 3: MARKET OVERVIEW (10% of queries)
**User Intent**: "Tell me about this area"

#### Query Patterns:
```
"Tell me about [location]"
"What's [location] like"
"Is [location] a good area"
"What's the market like in [location]"
"Tell me about living in [location]"
"What should I know about [location]"
"Give me an overview of [location]"
"What's [location] known for"
"Describe [location]"
"What's special about [location]"
```

**What They Need**:
- Text overview (not listings)
- Typical prices
- Community vibe
- Market conditions
- Lifestyle info

**Tool Needed**: `getMarketOverview(location)` (text-only)

---

### Category 4: PRICE QUESTIONS (5% of queries)
**User Intent**: "How much do homes cost here?"

#### Query Patterns:
```
"How much are homes in [location]"
"What's the average price in [location]"
"Typical home prices in [location]"
"Price range in [location]"
"How expensive is [location]"
"Can I afford [location]"
"What do homes go for in [location]"
"Median price in [location]"
```

#### Specific Property Types:
```
"How much are 3 bedroom homes in Palm Desert"
"Average price for condos in La Quinta"
"What do single family homes cost in Indian Wells"
"Price per square foot in Palm Springs"
```

**What They Need**:
- Average/median prices
- Price ranges
- Price per sqft
- By property type

**Tool Needed**: `getPricing(location, propertyType?)`

---

### Category 5: MARKET TRENDS (3% of queries)
**User Intent**: "Is this a good investment?"

#### Query Patterns:
```
"How much have homes appreciated in [location]"
"Is [location] a good investment"
"Are prices going up in [location]"
"Market trends in [location]"
"Is the market hot in [location]"
"Should I buy now in [location]"
"Price trends in [location]"
"Is [location] appreciating"
"Market forecast for [location]"
```

#### Specific Metrics:
```
"5 year appreciation in Palm Desert"
"How fast do homes sell in La Quinta"
"Days on market in Indian Wells"
"Is Palm Springs appreciating faster than Palm Desert"
```

**What They Need**:
- Appreciation rates (1y, 3y, 5y, 10y)
- Market velocity (days on market)
- Trend direction
- Comparison data

**Tool Needed**: `getMarketTrends(location, metric?, period?)`

---

### Category 6: COMPARISONS (3% of queries)
**User Intent**: "Which area is better?"

#### Query Patterns:
```
"Compare [location1] and [location2]"
"Which is better [location1] or [location2]"
"Difference between [location1] and [location2]"
"[location1] vs [location2]"
"Should I buy in [location1] or [location2]"
"Which has better value [location1] or [location2]"
```

#### Specific Comparisons:
```
"Compare Palm Desert and La Quinta"
"Indian Wells vs Rancho Mirage"
"Which appreciates faster Palm Springs or Palm Desert"
"Compare condos in Palm Desert vs La Quinta"
```

**What They Need**:
- Side-by-side stats
- Price differences
- Appreciation comparison
- Market velocity comparison
- Winner/insights

**Tool Needed**: `compareLocations(location1, location2, metric?)`

---

### Category 7: SPECIFIC FEATURES (2% of queries)
**User Intent**: "I need X amenity"

#### Query Patterns:
```
"Homes with pools in [location]"
"Pool homes in [location]"
"Homes with views in [location]"
"Mountain view homes in [location]"
"Golf course homes in [location]"
"Gated communities in [location]"
"Homes with guest houses in [location]"
"Waterfront homes in [location]"
```

**What They Need**:
- Filtered listings
- Feature-specific results
- Photos highlighting feature

**Tool Needed**: `searchHomes(location, features)` (same as browsing)

---

### Category 8: NEIGHBORHOODS (1% of queries)
**User Intent**: "Help me explore areas"

#### Query Patterns:
```
"What neighborhoods are in [city]"
"Show me subdivisions in [city]"
"Where should I look in [city]"
"Best neighborhoods in [city]"
"Family-friendly areas in [city]"
"Golf communities in [area]"
"55+ communities in [area]"
```

**What They Need**:
- List of neighborhoods
- Links to browse each
- Quick characteristics

**Tool Needed**: `findNeighborhoods(city, criteria?)`

---

### Category 9: REAL ESTATE KNOWLEDGE (1% of queries)
**User Intent**: "Teach me about real estate"

#### Query Patterns:
```
"What is HOA"
"What are closing costs"
"How much are property taxes in [location]"
"What is escrow"
"Should I get a home inspection"
"What are hidden costs of buying"
"FHA vs conventional loan"
"What is earnest money"
```

**What They Need**:
- Article content
- Educational guides
- Local-specific info

**Tool Needed**: `searchArticles(query)`

---

## USER-FIRST Tool Architecture

### Tool 1: `searchHomes` (60% of use cases)
**User Questions**: "Show me homes in [location]" + filters

**Parameters** (smart defaults):
```typescript
{
  location: string          // "Palm Desert", "PGA West", "92260"

  // Bedrooms/Baths
  beds?: number            // Interpreted as minBeds (e.g., "3 bed" = minBeds: 3)
  baths?: number           // Interpreted as minBaths

  // Price
  priceRange?: {           // Smart: "under $500k" = {max: 500000}
    min?: number           //        "$400-600k" = {min: 400000, max: 600000}
    max?: number
  }

  // Property Type
  propertyType?: "house" | "condo" | "townhouse" // User-friendly names

  // Amenities (boolean flags)
  pool?: boolean
  view?: boolean
  golf?: boolean
  gated?: boolean

  // Size
  minSqft?: number
}
```

**Description** (< 80 chars):
"Search for homes in a location with optional filters"

**Returns**: Listings + basic stats + map

---

### Tool 2: `searchNewListings` (15% of use cases)
**User Questions**: "What's new in [location]"

**Parameters**:
```typescript
{
  location: string          // Required

  timeframe?: "today" | "week" | "2weeks" | "month" // Default: "week"

  // Optional filters (same as searchHomes)
  priceRange?: { min?: number, max?: number }
  beds?: number
  propertyType?: string
}
```

**Description** (< 70 chars):
"Find recently listed homes (last 7-30 days)"

**Returns**: Recent listings sorted by date

---

### Tool 3: `getMarketOverview` (10% of use cases)
**User Questions**: "Tell me about [location]"

**Parameters**:
```typescript
{
  location: string          // Required
}
```

**Description** (< 60 chars):
"Get a market overview and community description"

**Returns**: Text summary (no listings)
- Typical price ranges
- Community characteristics
- Market conditions
- Lifestyle highlights

---

### Tool 4: `getPricing` (5% of use cases)
**User Questions**: "How much are homes in [location]"

**Parameters**:
```typescript
{
  location: string          // Required
  propertyType?: "house" | "condo" | "townhouse" // Optional
}
```

**Description** (< 60 chars):
"Get typical home prices and price ranges"

**Returns**:
- Average price
- Median price
- Min/max range
- Price per sqft
- By property type if specified

---

### Tool 5: `getMarketTrends` (3% of use cases)
**User Questions**: "How much have homes appreciated in [location]"

**Parameters**:
```typescript
{
  location: string          // Required

  metric?: "appreciation" | "velocity" | "all" // Default: "all"

  period?: "1y" | "3y" | "5y" | "10y" // Default: "5y" for appreciation
}
```

**Description** (< 70 chars):
"Get appreciation rates, market velocity, and trend analysis"

**Returns**:
- Appreciation: Annual rate, cumulative, trend
- Velocity: Days on market, market temperature
- Forecasts and insights

---

### Tool 6: `compareLocations` (3% of use cases)
**User Questions**: "Compare [location1] and [location2]"

**Parameters**:
```typescript
{
  location1: string         // Required
  location2: string         // Required

  metric?: "price" | "appreciation" | "velocity" | "all" // Default: "all"
}
```

**Description** (< 70 chars):
"Compare two locations side-by-side on price, trends, and value"

**Returns**:
- Side-by-side stats
- Winner per metric
- Key differences
- Investment insights

---

### Tool 7: `findNeighborhoods` (1% of use cases)
**User Questions**: "What neighborhoods are in [city]"

**Parameters**:
```typescript
{
  city: string              // Required

  criteria?: "golf" | "55+" | "family" | "luxury" | "affordable" // Optional
}
```

**Description** (< 70 chars):
"Find neighborhoods and subdivisions with links to browse"

**Returns**:
- List of neighborhoods
- Brief description each
- Links to browse listings

---

### Tool 8: `searchArticles` (1% of use cases)
**User Questions**: "What is [real estate term]" or knowledge questions

**Parameters**:
```typescript
{
  query: string             // Required - their question or topic
}
```

**Description** (< 60 chars):
"Search real estate guides and educational content"

**Returns**: Article results with citations

---

## Query → Tool Mapping (Decision Tree)

```
User Query
    ↓
┌─────────────────────────────────────────────────┐
│ STEP 1: Intent Classification                   │
└─────────────────────────────────────────────────┘
    ↓
    Contains "show|find|search|homes|properties"?
    ├─ YES → Is there a time modifier?
    │         ├─ "new|latest|recent|this week" → searchNewListings
    │         └─ NO → searchHomes
    │
    ├─ Contains "tell me about|what's X like|describe"?
    │   → getMarketOverview
    │
    ├─ Contains "how much|price|cost|expensive"?
    │   → getPricing
    │
    ├─ Contains "appreciate|trends|investment|going up"?
    │   → getMarketTrends
    │
    ├─ Contains "compare|vs|better|difference"?
    │   → compareLocations
    │
    ├─ Contains "neighborhoods|subdivisions|communities"?
    │   → findNeighborhoods
    │
    └─ Contains "what is|how to|explain"?
        → searchArticles

┌─────────────────────────────────────────────────┐
│ STEP 2: Extract Parameters (NLP-lite)           │
└─────────────────────────────────────────────────┘
    ↓
    Location: Extract city/subdivision/ZIP
    ├─ "in [LOCATION]" → location parameter
    ├─ "at [LOCATION]" → location parameter
    └─ Proper noun pattern → likely location

    Filters:
    ├─ "3 bed|3 bedroom" → beds: 3
    ├─ "2.5 bath" → baths: 2.5
    ├─ "under $500k" → priceRange: {max: 500000}
    ├─ "$400-600k" → priceRange: {min: 400000, max: 600000}
    ├─ "with pool" → pool: true
    ├─ "condo|condominium" → propertyType: "condo"
    ├─ "2000+ sqft" → minSqft: 2000
    └─ etc.

┌─────────────────────────────────────────────────┐
│ STEP 3: Build Tool Call                         │
└─────────────────────────────────────────────────┘
    ↓
    Construct minimal parameter object
    ├─ Only include extracted parameters
    ├─ Use smart defaults when ambiguous
    └─ Validate location exists
```

---

## Examples: Query → Tool → Response

### Example 1: Simple Browse
**User**: "Show me homes in Palm Desert"

**Intent**: browsing
**Tool**: `searchHomes`
**Params**: `{ location: "Palm Desert" }`
**Response**:
- Listings carousel (10 homes)
- Map with pins
- Stats: "31 homes available • $450k-$2.5M • Avg $687k"

---

### Example 2: Filtered Search
**User**: "Show me 3 bedroom homes under $800k with a pool in Temecula"

**Intent**: browsing with filters
**Tool**: `searchHomes`
**Params**:
```json
{
  "location": "Temecula",
  "beds": 3,
  "priceRange": { "max": 800000 },
  "pool": true
}
```
**Response**:
- Filtered listings (8 homes)
- Map
- Stats: "8 homes match • $589k-$799k • Avg $672k"

---

### Example 3: New Listings
**User**: "What's new this week in La Quinta"

**Intent**: new listings
**Tool**: `searchNewListings`
**Params**:
```json
{
  "location": "La Quinta",
  "timeframe": "week"
}
```
**Response**:
- Recent listings (5 homes, newest first)
- "5 new listings this week"
- Quick market pulse

---

### Example 4: Market Overview
**User**: "Tell me about Indian Wells"

**Intent**: market overview
**Tool**: `getMarketOverview`
**Params**: `{ location: "Indian Wells" }`
**Response** (text only):
> "Indian Wells is one of the desert's most exclusive communities, known for world-class golf and the BNP Paribas tennis tournament. Homes typically range from $800K to $5M+, with luxury estates in communities like Indian Wells Country Club commanding premium prices..."

---

### Example 5: Pricing
**User**: "How much are 3 bedroom homes in Palm Desert"

**Intent**: pricing
**Tool**: `getPricing`
**Params**:
```json
{
  "location": "Palm Desert",
  "propertyType": "house",
  "beds": 3
}
```
**Response**:
> "3-bedroom homes in Palm Desert:
> - Average: $687,000
> - Median: $625,000
> - Range: $450,000 - $1.2M
> - Price/sqft: $312"

---

### Example 6: Appreciation
**User**: "How much have homes appreciated in Palm Springs over 5 years"

**Intent**: market trends
**Tool**: `getMarketTrends`
**Params**:
```json
{
  "location": "Palm Springs",
  "metric": "appreciation",
  "period": "5y"
}
```
**Response**:
> "Palm Springs 5-Year Appreciation:
> - Annual: +8.2%
> - Cumulative: +48.7%
> - Trend: Strong upward
> - Market: Hot (above regional average)"

---

### Example 7: Comparison
**User**: "Compare Palm Desert and La Quinta"

**Intent**: comparison
**Tool**: `compareLocations`
**Params**:
```json
{
  "location1": "Palm Desert",
  "location2": "La Quinta",
  "metric": "all"
}
```
**Response** (table):
```
                   Palm Desert    La Quinta      Winner
Average Price      $687k          $612k          La Quinta (more affordable)
5Y Appreciation    +7.8%          +8.9%          La Quinta (stronger growth)
Days on Market     42 days        38 days        La Quinta (faster sales)

Insights: La Quinta offers better value with stronger appreciation and faster sales.
```

---

### Example 8: Neighborhoods
**User**: "What golf communities are in Palm Desert"

**Intent**: neighborhoods
**Tool**: `findNeighborhoods`
**Params**:
```json
{
  "city": "Palm Desert",
  "criteria": "golf"
}
```
**Response**:
> "Golf Communities in Palm Desert:
> 1. [Desert Willow](link) - 2 championship courses
> 2. [Ironwood Country Club](link) - 3 courses, private
> 3. [PGA West](link) - Stadium course, luxury
> 4. [Indian Ridge Country Club](link) - Semi-private"

---

### Example 9: Knowledge
**User**: "What are typical closing costs"

**Intent**: education
**Tool**: `searchArticles`
**Params**: `{ query: "closing costs" }`
**Response**:
> "Here's what I found about closing costs:
>
> [ARTICLE_RESULTS]
> 1. Understanding Closing Costs - 3-5% of purchase price typically...
> 2. Hidden Costs of Homeownership - Beyond the down payment...
>
> [SOURCES]"

---

## Tool Priority Matrix

When multiple tools could work, use this priority:

1. **searchNewListings** IF time modifier detected
2. **compareLocations** IF two locations mentioned
3. **searchHomes** IF "show|find|search" + location
4. **getMarketOverview** IF "tell me about|describe"
5. **getPricing** IF "how much|price|cost"
6. **getMarketTrends** IF "appreciate|trend|investment"
7. **findNeighborhoods** IF "neighborhoods|subdivisions"
8. **searchArticles** IF question about real estate knowledge

---

## Benefits of User-First Approach

### 1. **Clear Intent Mapping**
- ✅ Every tool maps to specific user questions
- ✅ No ambiguity about when to use what
- ✅ AI makes better decisions

### 2. **Natural Language**
- ✅ Parameters match how users speak
- ✅ "3 bed" not "minBeds: 3, maxBeds: null"
- ✅ "under $500k" not "maxPrice: 500000"

### 3. **Smart Defaults**
- ✅ "3 bed" automatically means minBeds (not exact)
- ✅ "new listings" defaults to 7 days
- ✅ "appreciation" defaults to 5 years

### 4. **Fewer Parameters**
- ✅ 8 tools with 2-8 params each
- ✅ vs 1 tool with 30+ params
- ✅ Less cognitive load for AI

### 5. **Specialized Responses**
- ✅ Each tool returns exactly what user needs
- ✅ Text for overviews, listings for searches
- ✅ No "one size fits all" responses

### 6. **Better UX**
- ✅ Faster (smaller prompts, focused tools)
- ✅ More accurate (clear intent)
- ✅ Predictable (consistent patterns)

---

## Next: Update Refactor Plan

This user-first analysis should replace the technical tool design in the refactor plan. The tools should be organized by **user intent**, not technical capability.
