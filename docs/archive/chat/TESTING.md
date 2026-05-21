# Chat System Testing Guide

How to test chat tools, intents, and components.

---

## Quick Testing

### Test Query via cURL
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes in Palm Desert under $600k"}
    ],
    "userId": "test-user",
    "userTier": "premium"
  }'
```

### Check Logs
```
[Intent Classifier] Query: "Show me homes in Palm Desert under $600k"
[Intent Classifier] Result: { intent: "search_homes", confidence: 5.0 }
[Tool Selector] Selected tool: searchHomes
[searchHomes] Starting with args: { location: "Palm Desert", maxPrice: 600000 }
[searchHomes] Returning search parameters for component-first architecture
```

---

## Testing Intent Classification

### Test All Intents
```bash
# search_homes
curl -X POST http://localhost:3000/api/chat/stream -H "Content-Type: application/json" \  -d '{"messages":[{"role":"user","content":"Show me homes in PDCC"}],"userId":"test","userTier":"premium"}'

# new_listings
curl -X POST http://localhost:3000/api/chat/stream -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What are the latest listings in La Quinta?"}],"userId":"test","userTier":"premium"}'

# market_trends (appreciation)
curl -X POST http://localhost:3000/api/chat/stream -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the appreciation like in PGA West?"}],"userId":"test","userTier":"premium"}'

# subdivision_query
curl -X POST http://localhost:3000/api/chat/stream -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Does PDCC allow short term rentals?"}],"userId":"test","userTier":"premium"}'
```

### Verify Intent Logs
```
[Intent Classifier] Entity recognition: subdivision - Palm Desert Country Club
[Intent Classifier] Priority check: appreciation keyword detected
[Tool Selector] Selected tool: getSubdivisionInfo
```

---

## Testing Tools

### Test searchHomes
```bash
# Basic search
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes in Palm Desert"}
    ],
    "userId": "test-search",
    "userTier": "premium"
  }'

# With filters
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Find homes under $500k with a pool in PDCC"}
    ],
    "userId": "test-search-filtered",
    "userTier": "premium"
  }'
```

**Expected Logs**:
```
[searchHomes] Args: { location: "Palm Desert", maxPrice: 500000, pool: true }
[searchHomes] Query payload: { subdivision: "PDCC", filters: { maxPrice: 500000, pool: true } }
[searchHomes] Returning search parameters
```

### Test getAppreciation
```bash
# Subdivision
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the appreciation like in PGA West?"}
    ],
    "userId": "test-appreciation-subdiv",
    "userTier": "premium"
  }'

# City
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type": "application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How has Palm Desert appreciated?"}
    ],
    "userId": "test-appreciation-city",
    "userTier": "premium"
  }'
```

**Expected Logs**:
```
[getAppreciation] Entity recognition: subdivision - PGA West
[getAppreciation] Success: { component: "appreciation", location: "PGA West", locationType: "subdivision", period: "5y" }
```

---

## Testing Components

### Manual UI Testing
1. Open chat widget
2. Type query: "Show me homes in Palm Desert"
3. Verify:
   - ✅ Intent detected correctly
   - ✅ Tool executed
   - ✅ AI response streams
   - ✅ Component marker parsed
   - ✅ ListingCarousel renders
   - ✅ Data fetches from MongoDB
   - ✅ Listings display with photos

### Component Rendering Tests
```typescript
// Test component marker parsing
const message = "[LISTING_CAROUSEL]I found 47 homes...";
const hasCarousel = message.includes('[LISTING_CAROUSEL]');
console.assert(hasCarousel === true);

// Test parameter extraction
const params = extractSearchParams(message);
console.assert(params.searchParams !== undefined);
```

---

## Performance Testing

### Tool Execution Time
```bash
time curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me homes in Palm Desert"}],"userId":"test","userTier":"premium"}'
```

**Expected**: Tool execution < 100ms

### End-to-End Latency
- Tool execution: ~50ms
- AI streaming: ~1000ms
- Component data fetch: ~500ms
- Total: ~1.5-2 seconds

---

## Error Testing

### Invalid Parameters
```bash
# Missing required parameter
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes"}
    ],
    "userId": "test-no-location",
    "userTier": "premium"
  }'
```

**Expected**: AI asks "Where would you like to search?"

### Unknown Location
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes in Nonexistent City"}
    ],
    "userId": "test-unknown",
    "userTier": "premium"
  }'
```

**Expected**: Tool executes with low-confidence entity recognition, component shows no results

---

## Regression Testing

### Test Suite
```bash
#!/bin/bash

# Test 1: Search homes
echo "Test 1: Search homes"
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me homes in Palm Desert"}],"userId":"test1","userTier":"premium"}' \
  | grep -q "LISTING_CAROUSEL" && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Appreciation query
echo "Test 2: Appreciation"
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the appreciation like in PGA West?"}],"userId":"test2","userTier":"premium"}' \
  | grep -q "appreciation" && echo "✅ PASS" || echo "❌ FAIL"

# Test 3: Subdivision query
echo "Test 3: Subdivision info"
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Does PDCC allow short term rentals?"}],"userId":"test3","userTier":"premium"}' \
  | grep -q "short" && echo "✅ PASS" || echo "❌ FAIL"

echo "All tests complete"
```

---

## Debugging Tips

### 1. Check Console Logs
```bash
# Watch logs in real-time
npm run dev | grep -E "\[searchHomes\]|\[Intent\]|\[Tool\]"
```

### 2. Verify Tool Selection
```typescript
// Add to intent-classifier.ts
console.log('[DEBUG] Intent:', intentResult);
console.log('[DEBUG] Tool:', getToolForIntent(intentResult.intent));
```

### 3. Test Entity Recognition
```typescript
// Test in Node REPL
const { identifyEntityType } = require('./src/lib/chat/utils/entity-recognition');
identifyEntityType("PGA West");
// → { type: 'subdivision', value: 'PGA West', confidence: 'high' }
```

### 4. Inspect Tool Arguments
```typescript
// Add to tool-executor.ts
console.log('[DEBUG] RAW args:', toolCall.function.arguments);
console.log('[DEBUG] PARSED args:', functionArgs);
console.log('[DEBUG] RESULT:', result);
```

---

## Common Test Scenarios

### Scenario 1: Property Search with Filters
```
User: "Show me 3 bedroom homes in Palm Desert under $600k with a pool"

Expected:
- Intent: search_homes
- Tool: searchHomes
- Args: { location: "Palm Desert", beds: 3, maxPrice: 600000, pool: true }
- Component: [LISTING_CAROUSEL]
- Data: Listings matching filters
```

### Scenario 2: Appreciation Query
```
User: "What's the appreciation like in PGA West?"

Expected:
- Intent: market_trends
- Entity: subdivision - PGA West
- Tool: getAppreciation
- Args: { location: "PGA West", period: "5y" }
- Component: [APPRECIATION]
- Data: Closed sales chart showing appreciation
```

### Scenario 3: Subdivision Info
```
User: "Does PDCC allow short term rentals?"

Expected:
- Intent: subdivision_query
- Entity: subdivision - Palm Desert Country Club
- Tool: getSubdivisionInfo
- Args: { subdivisionName: "Palm Desert Country Club", field: "shortTermRentals" }
- Response: Direct answer about rental restrictions
```

---

## Monitoring

### Chat Logs
Check `local-logs/chat-records/` for detailed conversation logs:
```bash
# View latest chat log
ls -lt local-logs/chat-records/ | head -1
cat local-logs/chat-records/chat_<latest>.json | jq .
```

### Performance Metrics
```typescript
// Add timing to tool-executor.ts
const startTime = Date.now();
const result = await executeSearchHomes(args);
const duration = Date.now() - startTime;
console.log(`[PERF] searchHomes: ${duration}ms`);
```

---

## Next Steps

See also:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and fixes
- [TOOLS.md](./TOOLS.md) - Tool development guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
