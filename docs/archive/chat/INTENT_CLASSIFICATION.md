# Intent Classification Guide

Pattern-based intent detection for chat system.

---

## Overview

### File
`src/lib/chat/intent-classifier.ts` (283 lines)

### Purpose
Match user queries to single most relevant tool using pattern matching.

### Key Principle
**Single tool per request** - prevents model confusion and simplifies execution.

---

## How It Works

### Flow
```
User Query → classifyIntent() → getToolForIntent() → selectToolForQuery() → Tool Name
```

### Code Example
```typescript
export function selectToolForQuery(userMessage: string): ToolSelectionResult {
  const intentResult = classifyIntent(userMessage);

  if (!intentResult) {
    return { tool: null, intent: null, confidence: 0 };
  }

  const toolName = getToolForIntent(intentResult.intent);

  return {
    tool: toolName,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    patterns: intentResult.detectedPatterns
  };
}
```

---

## Intent Types & Patterns

### 1. search_homes (60%)
**Patterns**:
- "show me homes", "find homes", "properties in"
- "houses for sale", "looking for homes"
- Location + filters (price, beds, pool, etc.)

**Examples**:
- "Show me homes in Palm Desert"
- "Find houses under $600k with a pool"
- "Properties in PDCC with 3 bedrooms"

**Tool**: `searchHomes`

### 2. new_listings (15%)
**Patterns**:
- "new listings", "recent homes", "just listed"
- "what's new in", "latest properties"
- Time keywords: "today", "this week", "past month"

**Examples**:
- "What's new in La Quinta?"
- "Recent listings in PGA West"
- "Show me homes listed today"

**Tool**: `searchNewListings`

### 3. market_overview (10%)
**Patterns**:
- "tell me about", "what's it like"
- "community", "neighborhood"
- NO specific filters or price mentions

**Examples**:
- "Tell me about Palm Desert Country Club"
- "What's La Quinta like?"
- "Is PGA West a good area?"

**Tool**: `getMarketOverview`

### 4. pricing (5%)
**Patterns**:
- "how much", "price", "cost"
- "average price", "typical homes"
- "afford", "budget"

**Examples**:
- "How much are homes in Indian Wells?"
- "What's the average price in PDCC?"
- "Can I afford a home in La Quinta?"

**Tool**: `getPricing`

### 5. market_trends (3%)
**Priority Keywords** (checked first):
- "appreciation", "appreciated", "appreciating"
- "value over time", "grown in value"
- "roi", "return on investment"
- "growth rate"

**Examples**:
- "What's the appreciation like in PGA West?"
- "Has Palm Desert appreciated?"
- "Show me value over time for La Quinta"

**Tool**: `getMarketTrends` or `getAppreciation`

### 6. compare_locations (3%)
**Patterns**:
- "compare", "vs", "versus", "or"
- "difference between", "better"
- Two locations mentioned

**Examples**:
- "Compare Palm Desert vs Indian Wells"
- "Which is better: PDCC or PGA West?"
- "Palm Springs or La Quinta?"

**Tool**: `compareLocations`

### 7. find_neighborhoods (1%)
**Patterns**:
- "neighborhoods", "communities", "areas"
- "where should I", "best place"
- Criteria: "golf", "55+", "family", "luxury"

**Examples**:
- "What neighborhoods are in Palm Desert?"
- "Best golf communities?"
- "Where should I live for schools?"

**Tool**: `findNeighborhoods`

### 8. subdivision_query (NEW)
**Entity Recognition Override**:
- Specific subdivision detected + question about amenities/rules

**Patterns**:
- "does [subdivision] allow/have"
- "what's the HOA", "short term rentals"
- "amenities", "golf courses", "pools"

**Examples**:
- "Does PDCC allow short term rentals?"
- "What's the HOA fee in PGA West?"
- "Does Trilogy have golf courses?"

**Tool**: `getSubdivisionInfo`

### 9. listing_query (NEW)
**Entity Recognition Override**:
- Specific address detected + question

**Patterns**:
- Address pattern + "what's", "tell me"
- "HOA", "price", "details"

**Examples**:
- "What's the HOA for 82223 Vandenberg?"
- "Tell me about 123 Desert Willow Drive"

**Tool**: `getListingInfo`

### 10. search_articles (1%)
**Patterns**:
- "what is", "how to", "explain"
- "guide", "tips", "advice"
- General real estate education questions

**Examples**:
- "What is an HOA?"
- "How to buy a home?"
- "Tips for first time buyers?"

**Tool**: `searchArticles`

---

## Priority System

### Execution Order
```typescript
// Step 0: Entity Recognition Override
const entityResult = identifyEntityType(userMessage);
if (entityResult.type === 'subdivision' && hasQuestion) {
  return { intent: "subdivision_query", confidence: 4.0 };
}

// Step 0.5: Priority Keywords (Appreciation)
const appreciationKeywords = [
  "appreciation", "value over time", "roi", "growth rate"
];
for (const keyword of appreciationKeywords) {
  if (message.includes(keyword)) {
    return { intent: "market_trends", confidence: 3.0 };
  }
}

// Step 1: Pattern Matching
// ... regular pattern matching
```

**Why Priority System?**
- Some keywords like "appreciation" are very specific
- Entity recognition helps disambiguate subdivision vs city queries
- Prevents common misclassifications

---

## Entity Recognition Integration

### File
`src/lib/chat/utils/entity-recognition.ts`

### Purpose
Automatically detect if query is about city, subdivision, or county.

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

### Known Subdivisions (50+)
```typescript
const KNOWN_SUBDIVISIONS = [
  { name: 'Palm Desert Country Club', aliases: ['PDCC', 'PD Country Club'] },
  { name: 'PGA West', aliases: ['PGA'] },
  { name: 'Trilogy', aliases: ['Trilogy at La Quinta'] },
  { name: 'Indian Ridge Country Club', aliases: ['Indian Ridge', 'IRCC'] },
  // ... 50+ more
];
```

---

## Adding New Intents

### Step 1: Define Pattern
```typescript
// In classifyIntent()
if (message.includes("my keyword") || message.includes("another keyword")) {
  return {
    intent: "my_new_intent",
    confidence: 4.0,
    detectedPatterns: ["keyword-match: my keyword"]
  };
}
```

### Step 2: Map Intent to Tool
```typescript
// In getToolForIntent()
function getToolForIntent(intent: string): string | null {
  switch (intent) {
    case "my_new_intent":
      return "myNewTool";
    // ... other intents
  }
}
```

### Step 3: Define Tool
```typescript
// In tools-user-first.ts
{
  type: "function",
  function: {
    name: "myNewTool",
    description: "What this tool does",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location" }
      },
      required: ["location"]
    }
  }
}
```

### Step 4: Create Executor
```typescript
// In tool-executor.ts
async function executeMyNewTool(args: any): Promise<any> {
  return {
    success: true,
    searchParams: { /* params for frontend */ }
  };
}

// Add to router
if (functionName === "myNewTool") {
  result = await executeMyNewTool(functionArgs);
}
```

---

## Testing Intents

### Manual Testing
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes in Palm Desert"}
    ],
    "userId": "test-user",
    "userTier": "premium"
  }'
```

### Check Logs
```
[Intent Classifier] Query: "Show me homes in Palm Desert"
[Intent Classifier] Result: { intent: "search_homes", confidence: 5.0 }
[Tool Selector] Selected tool: searchHomes
[searchHomes] Starting with args: { location: "Palm Desert" }
```

---

## Common Edge Cases

### Ambiguous Queries
**Query**: "Palm Desert"
**Problem**: Is this search or market overview?
**Solution**: Default to search_homes (most common intent)

### Multiple Intents
**Query**: "Show me homes in Palm Desert and tell me about the area"
**Problem**: Two intents (search + overview)
**Solution**: Pick highest confidence (search_homes), user-first approach

### No Match
**Query**: "Hello"
**Problem**: No clear intent
**Solution**: Return null, general conversation (no tool)

---

## Confidence Scoring

### Levels
- **5.0**: Very specific patterns ("show me homes", "find properties")
- **4.0**: Strong patterns ("new listings", subdivision query)
- **3.0**: Priority keywords ("appreciation", "roi")
- **2.0**: Weak patterns (single keyword matches)
- **1.0**: Fallback matches

### Usage
```typescript
if (intentResult.confidence >= 3.0) {
  // High confidence - execute tool
  const tool = getToolByName(intentResult.tool);
} else {
  // Low confidence - general conversation
  const tools = []; // No tool
}
```

---

## Best Practices

### 1. Single Tool Per Request
Don't try to execute multiple tools - ask user to clarify.

### 2. User-First Approach
When uncertain, have AI ask user for clarification vs guessing.

### 3. Priority Keywords First
Check high-priority keywords (appreciation, etc.) before general patterns.

### 4. Entity Recognition for Locations
Use entity recognition to distinguish city vs subdivision queries.

### 5. Confidence Thresholds
Use confidence scores to decide tool execution vs general conversation.

---

## Troubleshooting

### Intent Not Detected
1. Check pattern matching in `classifyIntent()`
2. Add more keyword variations
3. Check priority system (are keywords being checked first?)

### Wrong Tool Selected
1. Review intent → tool mapping in `getToolForIntent()`
2. Check for overlapping patterns
3. Adjust confidence scores

### Tool Not Executed
1. Verify tool exists in `tools-user-first.ts`
2. Check executor routing in `tool-executor.ts`
3. Review logs for errors

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more details.
