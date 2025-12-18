# Chat System Refactor Plan
**Date**: December 17, 2025 11:15 PM
**Goal**: Create a clean, compartmentalized, user-focused chat system with simplified tool architecture

---

## Executive Summary

**Current State**:
- ❌ 681-line monolithic system-prompt.ts
- ❌ 633-line all-in-one tool-executor.ts
- ❌ 332-line tools.ts with 30+ parameter mega-tool
- ❌ Complex descriptions overwhelming GPT-OSS 120B
- ❌ Mixing concerns (prompts, execution, routing all tangled)

**Target State**:
- ✅ Modular, focused files (100-200 lines each)
- ✅ Simple tools with clear purposes (5-8 params each)
- ✅ Clean separation of concerns
- ✅ Easy to test, maintain, and extend
- ✅ Best user experience with fast, accurate responses

---

## Problem Analysis

### Current Issues

#### 1. **Tool Complexity**
- `queryDatabase` has 30+ parameters
- 580-character description with examples, formatting, instructions
- Tries to be "one tool for everything"
- AI must make 30+ decisions per query
- **Result**: Malformed JSON, failed tool calls, confused model

#### 2. **File Gigantism**
- `system-prompt.ts`: 681 lines (should be ~100 modular)
- `tool-executor.ts`: 633 lines (should be ~50 per domain)
- `tools.ts`: 332 lines (should be ~150 with simpler tools)
- **Result**: Hard to maintain, find bugs, understand flow

#### 3. **Mixed Concerns**
- Prompts mix identity + instructions + examples + tool guidance
- tool-executor.ts mixes routing + execution + photo fetching + analytics
- tools.ts mixes definitions + documentation + examples
- **Result**: Changes in one place break unexpected things

#### 4. **User Experience Gaps**
- No real-time feedback during tool execution
- No progressive disclosure of results
- No error recovery strategies
- No query understanding feedback
- **Result**: Users wait in silence, then get error or wrong results

---

## Refactor Plan: The Complete Process

### Phase 1: Tool Architecture Redesign (Foundation)

#### 1.1 New Tool Structure (USER-FIRST DESIGN)

**Principle**: Tools map to **user questions**, not technical capabilities.

**Based on Real User Query Analysis** (see `USER_QUERY_ANALYSIS.md`):
- 60% "Show me homes..." → `searchHomes`
- 15% "What's new..." → `searchNewListings`
- 10% "Tell me about..." → `getMarketOverview`
- 5% "How much are..." → `getPricing`
- 3% "Appreciation..." → `getMarketTrends`
- 3% "Compare..." → `compareLocations`
- 1% "Neighborhoods..." → `findNeighborhoods`
- 1% "What is..." → `searchArticles`

```typescript
// src/lib/chat/tools/definitions/
├── search-homes.ts          // 60% - "Show me homes in..."
├── search-new-listings.ts   // 15% - "What's new in..."
├── market-overview.ts       // 10% - "Tell me about..."
├── pricing.ts               // 5% - "How much are..."
├── market-trends.ts         // 3% - "Appreciation in..."
├── compare-locations.ts     // 3% - "Compare X and Y"
├── find-neighborhoods.ts    // 1% - "What neighborhoods..."
├── search-articles.ts       // 1% - "What is..."
└── index.ts                 // Export all + types
```

---

### Tool 1: `searchHomes` (60% of queries)
**User Questions**:
- "Show me homes in Palm Desert"
- "3 bedroom homes under $800k with a pool in Temecula"
- "Homes for sale in Indian Wells"

**Parameters** (natural language mapping):
```typescript
{
  location: string              // "Palm Desert", "PGA West", "92260"

  beds?: number                 // "3 bed" = beds: 3 (interpreted as minimum)
  baths?: number                // "2.5 bath" = baths: 2.5

  priceRange?: {                // Smart parsing:
    min?: number                //   "under $500k" = {max: 500000}
    max?: number                //   "$400-600k" = {min: 400000, max: 600000}
  }

  propertyType?: "house" | "condo" | "townhouse" // User-friendly names

  pool?: boolean                // "with pool" = pool: true
  view?: boolean
  golf?: boolean
  gated?: boolean

  minSqft?: number              // "2000+ sqft" = minSqft: 2000
}
```
**Description**: "Search for homes in a location with optional filters" (58 chars)

**Returns**: Listings + map + basic stats

---

### Tool 2: `searchNewListings` (15% of queries)
**User Questions**:
- "What's new in La Quinta"
- "New listings this week in Palm Desert"
- "Latest homes in Indian Wells"

**Parameters**:
```typescript
{
  location: string

  timeframe?: "today" | "week" | "2weeks" | "month" // Default: "week"

  // Optional filters
  priceRange?: { min?: number, max?: number }
  beds?: number
  propertyType?: string
}
```
**Description**: "Find recently listed homes (last 7-30 days)" (47 chars)

**Returns**: Recent listings sorted by date + market pulse

---

### Tool 3: `getMarketOverview` (10% of queries)
**User Questions**:
- "Tell me about Indian Wells"
- "What's Palm Desert like"
- "Describe the market in La Quinta"

**Parameters**:
```typescript
{
  location: string
}
```
**Description**: "Get market overview and community description" (47 chars)

**Returns**: Text-only summary (NO listings)
- Typical price ranges
- Community characteristics
- Market conditions
- Lifestyle highlights

---

### Tool 4: `getPricing` (5% of queries)
**User Questions**:
- "How much are homes in Palm Desert"
- "Average price for 3 bedroom homes in La Quinta"
- "What do condos cost in Indian Wells"

**Parameters**:
```typescript
{
  location: string
  propertyType?: "house" | "condo" | "townhouse"
  beds?: number                 // For specific queries
}
```
**Description**: "Get typical home prices and price ranges" (43 chars)

**Returns**:
- Average/median prices
- Min/max range
- Price per sqft
- By property type

---

### Tool 5: `getMarketTrends` (3% of queries)
**User Questions**:
- "How much have homes appreciated in Palm Springs"
- "Is La Quinta a good investment"
- "Market trends in Indian Wells"

**Parameters**:
```typescript
{
  location: string

  metric?: "appreciation" | "velocity" | "all" // Default: "all"
  period?: "1y" | "3y" | "5y" | "10y"          // Default: "5y"
}
```
**Description**: "Get appreciation rates and market velocity analysis" (52 chars)

**Returns**:
- Appreciation (annual, cumulative, trend)
- Days on market
- Market temperature
- Investment insights

---

### Tool 6: `compareLocations` (3% of queries)
**User Questions**:
- "Compare Palm Desert and La Quinta"
- "Indian Wells vs Rancho Mirage"
- "Which is better Palm Springs or Palm Desert"

**Parameters**:
```typescript
{
  location1: string
  location2: string

  metric?: "price" | "appreciation" | "velocity" | "all" // Default: "all"
}
```
**Description**: "Compare two locations on price, trends, and value" (51 chars)

**Returns**:
- Side-by-side stats
- Winner per metric
- Key differences
- Investment insights

---

### Tool 7: `findNeighborhoods` (1% of queries)
**User Questions**:
- "What neighborhoods are in Palm Desert"
- "Golf communities in the desert"
- "55+ communities near me"

**Parameters**:
```typescript
{
  city: string

  criteria?: "golf" | "55+" | "family" | "luxury" | "affordable"
}
```
**Description**: "Find neighborhoods and subdivisions with links" (48 chars)

**Returns**:
- List of neighborhoods
- Brief descriptions
- Links to browse

---

### Tool 8: `searchArticles` (1% of queries)
**User Questions**:
- "What are closing costs"
- "Should I get a home inspection"
- "What is HOA"

**Parameters**:
```typescript
{
  query: string
}
```
**Description**: "Search real estate guides and educational content" (51 chars)

**Returns**: Article results with citations

---

**Benefits of User-First Approach**:
- ✅ Every tool maps to actual user questions
- ✅ Natural language parameters ("3 bed" not "minBeds")
- ✅ Smart defaults based on how people speak
- ✅ Clear intent → better AI decisions
- ✅ Each tool optimized for its specific use case

#### 1.2 Tool File Structure

```
src/lib/chat/tools/
├── definitions/              # Tool schemas (~150 lines total)
│   ├── search-homes.ts       # 25 lines
│   ├── search-new-listings.ts # 20 lines
│   ├── market-snapshot.ts    # 15 lines
│   ├── market-analytics.ts   # 20 lines
│   ├── article-search.ts     # 15 lines
│   ├── location-lookup.ts    # 15 lines
│   └── index.ts              # Export + types
│
├── executors/                # Tool implementations (~400 lines total)
│   ├── property-search.ts    # searchHomes + searchNewListings (~150 lines)
│   ├── market-data.ts        # getMarketSnapshot + getMarketStats (~100 lines)
│   ├── content.ts            # searchArticles (~50 lines)
│   ├── location.ts           # findLocation (~50 lines)
│   └── index.ts              # Route to executors (~50 lines)
│
├── utils/                    # Shared utilities
│   ├── photo-fetcher.ts      # Batch photo fetching
│   ├── query-builder.ts      # Build API payloads
│   ├── result-formatter.ts   # Format tool results
│   └── cache.ts              # Tool caching (moved from root)
│
└── index.ts                  # Public API
```

**Benefits**:
- ✅ Each file < 200 lines
- ✅ Clear separation: definitions vs execution vs utils
- ✅ Easy to test individual tools
- ✅ Easy to add new tools

---

### Phase 2: Prompt System Refactor (Clarity)

#### 2.1 Complete Modular Migration

**Current**: system-prompt.ts (681 lines monolithic)

**Target**: Fully modular composition

```
src/lib/chat/prompts/
├── core/
│   ├── identity.ts          # Who you are (base.ts renamed)
│   ├── style.ts             # How to communicate
│   ├── sources.ts           # Citation rules (exists)
│   └── dates.ts             # Dynamic date context
│
├── modes/
│   ├── full.ts              # Default chat mode
│   ├── text-only.ts         # Map digest mode (exists)
│   ├── location-snapshot.ts # Market overview mode (exists)
│   └── index.ts             # Mode router
│
├── tools/
│   ├── search-guidance.ts   # How to use searchHomes
│   ├── market-guidance.ts   # How to use market tools
│   ├── article-guidance.ts  # How to use article search
│   └── index.ts             # Tool usage instructions
│
├── examples/
│   ├── search-examples.ts   # Property search examples
│   ├── market-examples.ts   # Market query examples
│   └── index.ts             # Example library
│
├── help-commands.ts         # Help system (exists)
└── index.ts                 # Composition engine (exists, enhance)
```

**New Composition Logic**:

```typescript
// src/lib/chat/prompts/index.ts
export function buildSystemPrompt(options: {
  mode?: 'full' | 'text-only' | 'location-snapshot';
  locationSnapshot?: { name: string; type: string };
  queryContext?: {
    isPropertySearch?: boolean;
    isMarketResearch?: boolean;
    isQuestion?: boolean;
  };
}): string {
  const { mode = 'full', locationSnapshot, queryContext } = options;

  // Base components (always included)
  let prompt = buildIdentity();
  prompt += buildStyle();
  prompt += buildDates();

  // Mode-specific content
  if (mode === 'location-snapshot' && locationSnapshot) {
    prompt += buildLocationSnapshotMode(locationSnapshot);
  } else if (mode === 'text-only') {
    prompt += buildTextOnlyMode();
  } else {
    // Full mode: Add tool guidance based on query context
    if (queryContext?.isPropertySearch) {
      prompt += buildSearchGuidance();
      prompt += buildSearchExamples();
    } else if (queryContext?.isMarketResearch) {
      prompt += buildMarketGuidance();
      prompt += buildMarketExamples();
    } else {
      // General mode: Include all guidance
      prompt += buildSearchGuidance();
      prompt += buildMarketGuidance();
      prompt += buildArticleGuidance();
    }
  }

  // Always include sources
  prompt += buildSources();

  return prompt;
}
```

**Benefits**:
- ✅ ~800 token prompts (down from 3000+)
- ✅ Context-aware (only include relevant guidance)
- ✅ Easy to update specific sections
- ✅ Clear file organization

#### 2.2 Query Classification

Pre-classify user queries to optimize prompt:

```typescript
// src/lib/chat/query-classifier.ts
export function classifyQuery(query: string): {
  type: 'property_search' | 'market_research' | 'question' | 'help';
  confidence: number;
  extractedIntent?: {
    location?: string;
    filters?: Record<string, any>;
  };
} {
  // Property search patterns
  if (/show|find|search|homes?|properties|listings?/i.test(query)) {
    return {
      type: 'property_search',
      confidence: 0.9,
      extractedIntent: extractSearchIntent(query)
    };
  }

  // Market research patterns
  if (/appreciation|trends?|market|stats|price|value/i.test(query)) {
    return {
      type: 'market_research',
      confidence: 0.85
    };
  }

  // Question patterns
  if (/what|how|why|tell me|explain/i.test(query)) {
    return {
      type: 'question',
      confidence: 0.8
    };
  }

  return { type: 'property_search', confidence: 0.5 };
}
```

**Benefits**:
- ✅ Smaller prompts (only relevant context)
- ✅ Better tool selection (AI has clearer guidance)
- ✅ Faster responses (less token processing)

---

### Phase 3: Execution Layer Refactor (Performance)

#### 3.1 Split tool-executor.ts

**Current**: 633-line monolith

**Target**: Domain-separated executors

```
src/lib/chat/tools/executors/
├── index.ts                  # Router (~50 lines)
├── property-search.ts        # ~150 lines
├── market-data.ts            # ~100 lines
├── content.ts                # ~50 lines
├── location.ts               # ~50 lines
└── types.ts                  # Shared types
```

**Router Pattern**:

```typescript
// src/lib/chat/tools/executors/index.ts
import { executePropertySearch } from './property-search';
import { executeMarketData } from './market-data';
import { executeContent } from './content';
import { executeLocation } from './location';

export async function executeToolCall(
  toolCall: ToolCall,
  userId: string
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall.function;

  // Log raw arguments
  console.log(`[${name}] Raw args:`, args);

  // Sanitize JSON (common utility)
  const sanitizedArgs = sanitizeGroqJSON(args);
  const functionArgs = JSON.parse(sanitizedArgs);

  // Route to domain executor
  switch (name) {
    case 'searchHomes':
    case 'searchNewListings':
      return executePropertySearch(name, functionArgs, userId, toolCall.id);

    case 'getMarketSnapshot':
    case 'getMarketStats':
      return executeMarketData(name, functionArgs, userId, toolCall.id);

    case 'searchArticles':
      return executeContent(name, functionArgs, userId, toolCall.id);

    case 'findLocation':
      return executeLocation(name, functionArgs, userId, toolCall.id);

    default:
      return createErrorResult(toolCall.id, `Unknown function: ${name}`);
  }
}
```

**Benefits**:
- ✅ Each executor file < 200 lines
- ✅ Clear domain boundaries
- ✅ Easy to test independently
- ✅ Easy to optimize per domain

#### 3.2 Shared Utilities

Extract common patterns:

```typescript
// src/lib/chat/tools/utils/photo-fetcher.ts
export async function batchFetchPhotos(
  listings: any[]
): Promise<Map<string, string>> {
  // Extract from tool-executor.ts
}

// src/lib/chat/tools/utils/query-builder.ts
export function buildDatabaseQuery(
  tool: 'searchHomes' | 'searchNewListings',
  args: any
): QueryPayload {
  // Centralized query building
}

// src/lib/chat/tools/utils/result-formatter.ts
export function formatSearchResults(
  listings: any[],
  stats: any,
  photoMap: Map<string, string>
): SearchResult {
  // Consistent formatting
}

// src/lib/chat/tools/utils/sanitizer.ts
export function sanitizeGroqJSON(json: string): string {
  // Aggressive sanitization for malformed JSON
}
```

---

### Phase 4: User Experience Enhancements (Delight)

#### 4.1 Real-Time Progress Updates

**Problem**: Users wait in silence while tools execute

**Solution**: Stream progress updates

```typescript
// During tool execution, send progress events
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'tool_progress',
  tool: 'searchHomes',
  status: 'executing',
  message: 'Searching 2,847 listings in Palm Desert...'
})}\n\n`));

// After tool completes
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'tool_complete',
  tool: 'searchHomes',
  status: 'success',
  message: 'Found 31 homes matching your criteria'
})}\n\n`));
```

**Benefits**:
- ✅ Users see what's happening
- ✅ Perceived performance improvement
- ✅ Build confidence in the system

#### 4.2 Query Understanding Feedback

Show AI's interpretation:

```typescript
// Before tool execution
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'query_understood',
  interpretation: {
    intent: 'property_search',
    location: 'Palm Desert',
    filters: { maxPrice: 800000, pool: true }
  },
  message: 'Searching for homes in Palm Desert under $800k with a pool...'
})}\n\n`));
```

**Benefits**:
- ✅ Users know they were understood correctly
- ✅ Can correct misunderstandings early
- ✅ Builds trust

#### 4.3 Smart Fallbacks

When primary search fails:

```typescript
// If searchHomes fails
1. Try searchNewListings (maybe recent data is available)
2. Try getMarketSnapshot (at least give overview)
3. Suggest findLocation (help them find the right area)
4. Provide getNeighborhoodPageLink (manual browsing)
```

**Benefits**:
- ✅ Never leave user empty-handed
- ✅ Graceful degradation
- ✅ Always provide value

#### 4.4 Progressive Disclosure

Show results as they arrive:

```typescript
// Stream partial results
1. Show first 3 listings immediately
2. Stream stats as they calculate
3. Add remaining listings progressively
4. Finish with market insights
```

**Benefits**:
- ✅ Faster perceived response time
- ✅ Users can start browsing immediately
- ✅ Feels more responsive

---

### Phase 5: API Route Refactor (Orchestration)

#### 5.1 Split route.ts Responsibilities

**Current**: 334-line route handling everything

**Target**: Clean orchestration layer

```
src/app/api/chat/stream/
├── route.ts                  # Main endpoint (~100 lines)
├── handlers/
│   ├── help.ts               # Help command handler
│   ├── tool-execution.ts     # Multi-round tool loop
│   ├── streaming.ts          # Response streaming
│   └── error.ts              # Error handling
└── types.ts                  # Shared types
```

**Clean Route**:

```typescript
// src/app/api/chat/stream/route.ts
export async function POST(req: NextRequest) {
  try {
    const { messages, userId, userTier, mode, locationSnapshot } = await req.json();

    // Validate
    if (!messages || !userId) return error400('Missing required fields');

    // Check help command
    const helpResponse = tryHandleHelpCommand(messages);
    if (helpResponse) return helpResponse;

    // Classify query
    const queryContext = classifyQuery(messages[messages.length - 1].content);

    // Build optimized prompt
    const systemPrompt = buildSystemPrompt({ mode, locationSnapshot, queryContext });

    // Execute tools (multi-round)
    const { messagesWithTools, finalResponse } = await executeTools({
      messages,
      systemPrompt,
      model: selectModel(userTier),
      userId
    });

    // Stream response
    return streamResponse({
      messages: messagesWithTools,
      finalResponse,
      userId,
      userTier
    });

  } catch (error) {
    return handleError(error);
  }
}
```

**Benefits**:
- ✅ Route file < 100 lines
- ✅ Clear flow: validate → help → classify → execute → stream
- ✅ Easy to add middleware (auth, rate limiting, etc.)

---

### Phase 6: Testing & Monitoring (Reliability)

#### 6.1 Unit Tests

```
src/lib/chat/__tests__/
├── tools/
│   ├── search-homes.test.ts
│   ├── search-new-listings.test.ts
│   └── ...
├── prompts/
│   ├── composition.test.ts
│   └── query-classifier.test.ts
└── utils/
    ├── sanitizer.test.ts
    └── photo-fetcher.test.ts
```

#### 6.2 Integration Tests

```typescript
// Test complete flow
describe('Chat System Integration', () => {
  test('property search query → tool call → response', async () => {
    const response = await POST({
      messages: [{ role: 'user', content: 'Show me homes in Palm Desert' }],
      userId: 'test',
      userTier: 'premium'
    });

    expect(response).toContainListings();
    expect(response).toContainStats();
  });
});
```

#### 6.3 Performance Monitoring

```typescript
// Track metrics
- Tool execution time
- Token usage per query type
- Cache hit rates
- Error rates per tool
- User satisfaction (implicit signals)
```

---

## Migration Strategy

### Phase-by-Phase Rollout

**Week 1: Foundation**
- [ ] Create new tool definitions (simple schemas)
- [ ] Create tool executors (split by domain)
- [ ] Test each tool independently
- [ ] Deploy behind feature flag

**Week 2: Prompts**
- [ ] Complete modular prompt system
- [ ] Add query classifier
- [ ] Test prompt composition
- [ ] Deploy to staging

**Week 3: UX**
- [ ] Add progress updates
- [ ] Add query understanding feedback
- [ ] Add smart fallbacks
- [ ] Test with real users

**Week 4: Polish**
- [ ] Split route.ts
- [ ] Add comprehensive tests
- [ ] Add monitoring
- [ ] Deploy to production

---

## Success Metrics

### Technical Metrics
- ✅ Tool success rate > 95% (currently ~70%)
- ✅ Average response time < 3s (currently ~5-10s)
- ✅ Token usage reduction by 60% (3000 → 1200)
- ✅ Cache hit rate > 40%
- ✅ Zero malformed JSON errors

### User Experience Metrics
- ✅ Time to first result < 1s
- ✅ Query understanding accuracy > 90%
- ✅ User retry rate < 10%
- ✅ Perceived performance rating > 4.5/5

### Code Quality Metrics
- ✅ No files > 200 lines
- ✅ Test coverage > 80%
- ✅ Cyclomatic complexity < 10 per function
- ✅ Clear separation of concerns

---

## File Structure Summary (Before/After)

### BEFORE (Current)
```
src/lib/chat/
├── system-prompt.ts         (681 lines) ❌
├── tool-executor.ts         (633 lines) ❌
├── tools.ts                 (332 lines) ❌
├── tool-cache.ts            (164 lines)
├── response-parser.ts       (218 lines)
└── prompts/
    ├── index.ts             (96 lines)
    └── ... (partial)

Total: ~2,637 lines in messy files
```

### AFTER (Target)
```
src/lib/chat/
├── tools/
│   ├── definitions/         (~150 lines total, 6 files)
│   ├── executors/           (~400 lines total, 5 files)
│   ├── utils/               (~200 lines total, 5 files)
│   └── index.ts             (~50 lines)
│
├── prompts/
│   ├── core/                (~150 lines total, 4 files)
│   ├── modes/               (~200 lines total, 4 files)
│   ├── tools/               (~150 lines total, 4 files)
│   ├── examples/            (~100 lines total, 3 files)
│   └── index.ts             (~100 lines)
│
├── query-classifier.ts      (~100 lines)
├── response-parser.ts       (~200 lines)
└── __tests__/               (comprehensive tests)

Total: ~1,800 lines in clean, focused files
```

---

## Next Steps

1. **Review this plan** - Does this align with your vision?
2. **Prioritize phases** - Which phase should we tackle first?
3. **Define success** - What metrics matter most to you?
4. **Start implementation** - I can begin coding immediately

**My Recommendation**: Start with Phase 1 (Tool Architecture) since it's the root cause of current issues. Once tools are simplified, everything else becomes easier.

Ready to start?
