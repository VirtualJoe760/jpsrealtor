# Chat System Architecture

Component-first, intent-based real estate AI chat system.

---

## System Overview

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ User Query                                                       │
│ "Show me homes in Palm Desert under $600k"                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Intent Classification (intent-classifier.ts)                    │
│ • Pattern matching against known intents                        │
│ • Confidence scoring                                            │
│ • Entity recognition for locations                              │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Tool Selection (stream/route.ts)                                │
│ • Load SINGLE most relevant tool (0 or 1)                       │
│ • User-first approach: ask vs chain                             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Tool Execution (tool-executor.ts)                               │
│ • Execute selected tool                                         │
│ • Return PARAMETERS, not data                                   │
│ • ~50ms execution time                                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ AI Response Streaming (Groq API)                                │
│ • Format natural language response                              │
│ • Include component markers                                     │
│ • Stream via SSE                                                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend Component Rendering (ChatResultsContainer.tsx)         │
│ • Parse component markers                                       │
│ • Pass search params to components                              │
│ • Components fetch their own data                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component-First Architecture

### Key Principle
**Tools return parameters, components fetch data.**

### Old System ❌ (Deleted Dec 19, 2025)
```typescript
// AI calls backend during tool execution
async function executeSearchHomes(args) {
  // ❌ Backend API call during tool execution
  const response = await fetch('/api/query', {
    method: 'POST',
    body: JSON.stringify(queryPayload)
  });

  const data = await response.json();
  // ❌ Returns data to AI (10+ seconds, timeouts)
  return { listings: data.listings };
}
```

**Problems**:
- MongoDB queries during tool execution (10+ second timeouts)
- Large data payloads in AI context (token bloat)
- Backend responsible for data transformation
- 650+ line tool executor with complex query logic

### New System ✅ (Current)
```typescript
// AI returns parameters, frontend fetches data
async function executeSearchHomes(args) {
  // ✅ Return search parameters only
  return {
    success: true,
    searchParams: {
      city: args.location,
      filters: {
        maxPrice: args.maxPrice,
        minBeds: args.beds,
        pool: args.pool
      }
    }
  };
  // ✅ Execution time: ~50ms (200x faster)
}
```

**Benefits**:
- No backend MongoDB calls during tool execution
- Tiny payloads (parameters only, not data)
- Frontend components handle data fetching
- 585 line tool executor (33% smaller)
- Zero timeout errors

---

## Intent Classification System

### File
`src/lib/chat/intent-classifier.ts` (283 lines)

### Purpose
Pattern-match user queries to determine single most relevant tool.

### Flow
```typescript
export function classifyIntent(userMessage: string): IntentResult {
  const message = userMessage.toLowerCase();

  // Step 0: Entity recognition override
  const entityResult = identifyEntityType(userMessage);

  // Step 0.5: Priority keywords (appreciation, ROI, etc.)
  const appreciationKeywords = [
    "appreciation", "value over time", "roi", "growth rate"
  ];
  for (const keyword of appreciationKeywords) {
    if (message.includes(keyword)) {
      return { intent: "market_trends", confidence: 3.0 };
    }
  }

  // Step 1: Pattern matching
  if (message.includes("show me") || message.includes("find")) {
    if (message.includes("new listing") || message.includes("recent")) {
      return { intent: "new_listings", confidence: 4.0 };
    }
    return { intent: "search_homes", confidence: 5.0 };
  }

  // ... more patterns
}
```

### Intent Distribution
- `search_homes`: 60% (property searches)
- `new_listings`: 15% (recent listings)
- `market_overview`: 10% (community info)
- `pricing`: 5% (price queries)
- `market_trends`: 3% (appreciation, velocity)
- `compare_locations`: 3% (X vs Y)
- `find_neighborhoods`: 1% (browsing)
- `subdivision_query`: NEW (HOA, amenities)
- `listing_query`: NEW (specific property)
- `search_articles`: 1% (educational)

---

## Tool System

### File Structure
```
src/lib/chat/
├── tools-user-first.ts        # Tool definitions (11 tools)
├── tool-executor.ts           # Execution handlers
└── tools/
    └── executors/
        └── search-homes.ts    # searchHomes implementation
```

### Tool Definition (tools-user-first.ts)
```typescript
export const ALL_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "searchHomes",
      description: "Search for homes in a location with optional filters",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, subdivision, or ZIP" },
          beds: { type: "number", description: "Minimum bedrooms" },
          maxPrice: { type: "number", description: "Maximum price" },
          pool: { type: "boolean", description: "Must have pool" }
        },
        required: ["location"]
      }
    }
  },
  // ... 10 more tools
];
```

### Tool Executor (tool-executor.ts)
```typescript
export async function executeToolCall(toolCall: any, userId: string) {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  let result: any;

  // Route to specific executor
  if (functionName === "searchHomes") {
    result = await executeSearchHomes(functionArgs, userId);
  } else if (functionName === "getSubdivisionInfo") {
    result = await executeGetSubdivisionInfo(functionArgs);
  }
  // ... more tools

  return {
    role: "tool",
    tool_call_id: toolCall.id,
    name: functionName,
    content: JSON.stringify(result)
  };
}
```

---

## Stream Route (Main Endpoint)

### File
`src/app/api/chat/stream/route.ts`

### Purpose
Main chat endpoint with SSE streaming.

### Flow
```typescript
export async function POST(req: Request) {
  // 1. Request validation
  const { messages, userId, userTier } = await req.json();

  // 2. Help command check (fast path)
  if (lastMessage === '/help') {
    // Return help menu immediately
  }

  // 3. Intent classification
  const intentResult = selectToolForQuery(lastMessage);

  // 4. Dynamic tool loading (0 or 1 tool)
  const tools = intentResult.tool
    ? [getToolByName(intentResult.tool)]
    : [];

  // 5. Tool execution (non-streaming)
  if (hasToolCall) {
    const toolResult = await executeToolCall(toolCall, userId);
    messages.push(toolResult);
  }

  // 6. Final response streaming (SSE)
  const stream = await groqStream(messages, tools);

  // 7. Component parsing
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### Key Design Decisions
1. **Single tool per request** - Prevents model confusion
2. **User-first approach** - AI asks user vs chaining tools
3. **Component-first** - Tools return params, frontend fetches data
4. **Non-streaming tools** - Tool execution happens before streaming

---

## Entity Recognition

### File
`src/lib/chat/utils/entity-recognition.ts`

### Purpose
Automatically detect location type (city, subdivision, county).

### How It Works
```typescript
export function identifyEntityType(query: string): EntityRecognitionResult {
  const normalized = query.toLowerCase().trim();

  // Step 1: Check against known subdivisions
  for (const subdivision of KNOWN_SUBDIVISIONS) {
    if (normalized.includes(subdivision.name.toLowerCase())) {
      return {
        type: 'subdivision',
        value: subdivision.name,
        confidence: 'high'
      };
    }
  }

  // Step 2: Check against known cities
  for (const city of COACHELLA_VALLEY_CITIES) {
    if (normalized.includes(city.toLowerCase())) {
      return {
        type: 'city',
        value: city,
        confidence: 'high'
      };
    }
  }

  // Step 3: Check for county
  if (normalized.includes('county')) {
    return {
      type: 'county',
      value: extractCountyName(normalized),
      confidence: 'medium'
    };
  }

  // Step 4: Default to city
  return {
    type: 'city',
    value: extractLocationName(query),
    confidence: 'low'
  };
}
```

### Known Entities
```typescript
const KNOWN_SUBDIVISIONS = [
  { name: 'Palm Desert Country Club', aliases: ['PDCC'] },
  { name: 'PGA West', aliases: ['PGA'] },
  { name: 'Trilogy', aliases: [] },
  // ... 50+ more
];

const COACHELLA_VALLEY_CITIES = [
  'Palm Desert', 'Palm Springs', 'La Quinta', 'Indian Wells',
  'Rancho Mirage', 'Desert Hot Springs', 'Cathedral City',
  'Indio', 'Coachella'
];
```

---

## Frontend Components

### ChatWidget.tsx
Main chat UI container.

```typescript
export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    // Send to /api/chat/stream
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content }],
        userId, userTier
      })
    });

    // Parse SSE stream
    const reader = response.body.getReader();
    // ... stream parsing
  };

  return (
    <div className="chat-widget">
      <ChatResultsContainer messages={messages} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
```

### ChatResultsContainer.tsx
Parses component markers and renders appropriate components.

```typescript
export function ChatResultsContainer({ messages }: Props) {
  return (
    <div className="results">
      {messages.map((msg) => {
        if (msg.role === 'assistant') {
          // Parse component markers
          if (msg.content.includes('[LISTING_CAROUSEL]')) {
            const params = extractSearchParams(msg);
            return <ListingCarousel searchParams={params} />;
          }

          if (msg.content.includes('[APPRECIATION]')) {
            const params = extractAppreciationParams(msg);
            return <AppreciationContainer {...params} />;
          }
        }

        return <MessageBubble message={msg} />;
      })}
    </div>
  );
}
```

### ListingCarousel.tsx
Fetches and displays property listings.

```typescript
export function ListingCarousel({ searchParams }: Props) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Component fetches its own data
    async function fetchListings() {
      const response = await fetch('/api/mls-listings', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      const data = await response.json();
      setListings(data.listings);
      setLoading(false);
    }

    fetchListings();
  }, [searchParams]);

  return (
    <div className="carousel">
      {listings.map(listing => (
        <ListingCard key={listing.listingKey} listing={listing} />
      ))}
    </div>
  );
}
```

---

## Data Flow Example

### Complete Flow: "Show me homes in PDCC under $500k"

**1. User Input** → ChatInput component
```typescript
onSend("Show me homes in PDCC under $500k")
```

**2. POST to /api/chat/stream**
```json
{
  "messages": [
    { "role": "user", "content": "Show me homes in PDCC under $500k" }
  ],
  "userId": "user123",
  "userTier": "premium"
}
```

**3. Intent Classification**
```typescript
selectToolForQuery("Show me homes in PDCC under $500k")
// → { tool: "searchHomes", intent: "search_homes", confidence: 5.0 }
```

**4. Tool Execution**
```typescript
executeSearchHomes({
  location: "PDCC",
  maxPrice: 500000
})
// → {
//     success: true,
//     searchParams: {
//       subdivision: "Palm Desert Country Club",
//       filters: { maxPrice: 500000 }
//     }
//   }
```

**5. AI Response (Streaming)**
```
[LISTING_CAROUSEL]I found 47 homes in Palm Desert Country Club under $500k.

Average price: $425,000
Price range: $285k - $495k
Most popular: 2-3 bedrooms

The community features championship golf courses and resort-style amenities.
```

**6. Component Rendering**
```typescript
// ChatResultsContainer parses [LISTING_CAROUSEL]
<ListingCarousel
  searchParams={{
    subdivision: "Palm Desert Country Club",
    filters: { maxPrice: 500000 }
  }}
/>
```

**7. Component Data Fetching**
```typescript
// ListingCarousel fetches from MongoDB
POST /api/mls-listings
{
  "subdivision": "Palm Desert Country Club",
  "filters": { "maxPrice": 500000 }
}
// → Returns 47 listings with photos, details, etc.
```

**8. Final Display**
- AI message with market context
- Carousel with 47 property cards
- Map view with markers
- Market statistics card

**Total Time**: ~2 seconds (Tool: 50ms, AI: 1s, Data fetch: 500ms, Render: 500ms)

---

## Performance Architecture

### Old System Bottleneck ❌
```
User Query (0ms)
  ↓
AI Tool Call (50ms)
  ↓
Backend API Call (2000ms)     ← BOTTLENECK
  ↓
MongoDB Query (8000ms)        ← BOTTLENECK
  ↓
Data Transformation (500ms)
  ↓
Return to AI (10,550ms total) ← TIMEOUT
```

### New System Flow ✅
```
User Query (0ms)
  ↓
AI Tool Call (50ms)            ← FAST
  ↓
Return Parameters (0ms)        ← INSTANT
  ↓
AI Response Streaming (1000ms)
  ↓
Frontend Data Fetch (500ms)    ← PARALLEL
  ↓
Component Render (500ms)
  ↓
Total: ~2000ms                 ← 5x FASTER
```

---

## Caching Strategy

### Tool Cache
```typescript
// 2-minute cache for expensive tools
const cacheableTools = [
  'searchHomes',              // Property searches
  'getSubdivisionInfo',       // Subdivision data
  'getListingInfo',           // Listing details
  'getAppreciation',          // Appreciation queries
  'getMarketStats',           // Market statistics
  'searchArticles'            // Article searches
];

// Cache by tool name + arguments
toolCache.set(functionName, functionArgs, result);
const cached = toolCache.get(functionName, functionArgs);
```

### Photo Cache
```typescript
// Force-cache for listing photos
const photosRes = await fetch(`/api/listings/${listingKey}/photos`, {
  cache: "force-cache",  // Browser cache
  headers: { "Accept": "application/json" }
});
```

---

## Error Handling

### Tool Execution Errors
```typescript
try {
  result = await executeSearchHomes(functionArgs, userId);

  // Cache successful results
  if (result && !result.error) {
    toolCache.set(functionName, functionArgs, result);
  }
} catch (error) {
  console.error(`[${functionName}] Error:`, error);
  result = { error: error.message };

  // Log error for debugging
  await logChatMessage("system", `Tool error: ${functionName}`, userId, {
    tool: functionName,
    error: error.message
  });
}
```

### Component Errors
```typescript
export function ListingCarousel({ searchParams }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch('/api/mls-listings', {
          method: 'POST',
          body: JSON.stringify(searchParams)
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setListings(data.listings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [searchParams]);

  if (error) {
    return <ErrorMessage>Failed to load listings: {error}</ErrorMessage>;
  }

  // ... render listings
}
```

---

## Security Considerations

### Rate Limiting
```typescript
// Tool-level rate limiting (future enhancement)
const rateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000 // 1 minute
});

if (!rateLimiter.check(userId)) {
  return { error: "Rate limit exceeded" };
}
```

### Input Sanitization
```typescript
// Groq argument sanitization (aggressive cleanup)
let argsString = toolCall.function.arguments;

// Fix 1: Remove excessive backslashes
argsString = argsString.replace(/\\+"/g, '"');

// Fix 2: Fix malformed JSON patterns
argsString = argsString.replace(/(":\s*(?:true|false|null|\d+))"\s*:\s*"\}"/, '$1');

// Fix 3: Remove garbage whitespace
argsString = argsString.replace(/\r/g, '');

const functionArgs = JSON.parse(argsString);
```

### User Tier Validation
```typescript
// Premium features restricted by user tier
if (userTier !== 'premium' && functionName === 'getAppreciation') {
  return {
    error: "Appreciation data is a premium feature"
  };
}
```

---

## Monitoring & Logging

### Chat Logging
```typescript
await logChatMessage("system", "searchHomes executed", userId, {
  location: args.location,
  filters: Object.fromEntries(
    Object.entries(queryPayload.filters)
      .filter(([_, v]) => v !== undefined && v !== null)
  ),
  timestamp: new Date().toISOString()
});
```

### Performance Monitoring
```typescript
const startTime = Date.now();
const result = await executeSearchHomes(args, userId);
const duration = Date.now() - startTime;

console.log(`[searchHomes] Execution time: ${duration}ms`);
```

---

## Next Steps

See related documentation:
- [Intent Classification Guide](./INTENT_CLASSIFICATION.md)
- [Tool Development Guide](./TOOLS.md)
- [Testing Guide](./TESTING.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
