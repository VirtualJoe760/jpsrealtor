# AI Speed Optimization Plan

**Current Performance**: 1-4 seconds
**Target**: Sub-1 second responses

## Performance Bottleneck Analysis

### Current Flow (2 iterations, ~4 seconds)
1. **Iteration 1**: User message → Groq API → matchLocation() → (~1.5s)
2. **Iteration 2**: Results → Groq API → getSubdivisionListings() → (~1.5s)
3. **Iteration 3**: Results → Groq API → Final response → (~1s)
4. **Total**: ~4 seconds

### Where Time is Spent
- **Groq API calls**: 3 calls × ~800ms = 2.4s (60%)
- **Function execution**: 2 functions × ~300ms = 600ms (15%)
- **Token processing**: ~400ms (10%)
- **Network latency**: ~600ms (15%)

## Optimization Strategies

### 1. Reduce Iterations (HIGH IMPACT - 50% faster)

**Problem**: Currently requires 2-3 iterations
- Iteration 1: matchLocation
- Iteration 2: getSubdivisionListings
- Iteration 3: Format response

**Solution**: Pre-process common queries on client-side

```typescript
// Client-side optimization
if (message.includes("homes in") || message.includes("properties in")) {
  // Extract location first, then send with context
  const location = extractLocation(message);

  // Send with pre-matched location type
  const response = await fetch("/api/chat/stream", {
    body: JSON.stringify({
      messages: [...],
      preMatchedLocation: location, // Skip matchLocation call
    })
  });
}
```

**Expected gain**: 2 iterations → 1 iteration = **50% faster**

---

### 2. Use Groq's Fastest Model (MEDIUM IMPACT - 30% faster)

**Current model**: `llama-3.3-70b-versatile` (~800ms per call)
**Fastest model**: `llama-3.1-8b-instant` (~200ms per call)

**Trade-off**: Slightly lower accuracy, but 4x faster

```typescript
// src/lib/groq.ts
export const GROQ_MODELS = {
  FREE: "llama-3.1-8b-instant", // Was: llama-3.3-70b-versatile
  PREMIUM: "llama-3.3-70b-versatile",
};
```

**Expected gain**: 800ms → 200ms per call = **30% faster**

---

### 3. Parallel Function Execution (MEDIUM IMPACT - 30% faster)

**Problem**: Functions execute sequentially
- getSubdivisionListings: ~300ms
- Then AI processes result: ~800ms

**Solution**: Execute functions in parallel when possible

```typescript
// Execute multiple independent functions at once
if (message.tool_calls.length > 1) {
  const results = await Promise.all(
    message.tool_calls.map(call => executeFunctionCall(call))
  );
}
```

**Expected gain**: Sequential → Parallel = **30% faster**

---

### 4. Cache Frequent Queries (HIGH IMPACT - 90% faster for cached)

**Problem**: Same queries hit API repeatedly

**Solution**: Cache subdivision lookups and searches

```typescript
// Redis or in-memory cache
const cacheKey = `chat:${userId}:${queryHash}`;
const cached = await redis.get(cacheKey);

if (cached && !isStale(cached)) {
  return JSON.parse(cached); // Instant response
}

const response = await callGroqAPI(...);
await redis.set(cacheKey, JSON.stringify(response), 'EX', 300); // 5 min cache
```

**Expected gain**: 4s → 400ms = **90% faster for cached queries**

---

### 5. Reduce Token Count (LOW-MEDIUM IMPACT - 15% faster)

**Current**: ~2,000 tokens per request
**Optimized**: ~800 tokens

**Changes**:
- Shorter system prompt
- Only send last 2 messages (not 3)
- Remove verbose function descriptions

```typescript
// src/app/api/chat/stream/route.ts:74-76
const recentMessages = messages.slice(-2); // Was: -3
```

**Expected gain**: 2000 tokens → 800 tokens = **15% faster**

---

### 6. Use Streaming with Early Display (PERCEIVED SPEED - 70% better UX)

**Problem**: User waits for entire response

**Solution**: Stream response tokens as they arrive

```typescript
// Enable streaming
const completion = await createChatCompletion({
  messages: groqMessages,
  stream: true, // Was: false
});

// Stream to client
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of completion) {
      controller.enqueue(chunk);
    }
    controller.close();
  }
});

return new Response(stream);
```

**Expected gain**: User sees response start in ~400ms vs waiting 4s = **70% better perceived speed**

---

### 7. Optimize Database Queries (LOW IMPACT - 10% faster)

**Problem**: Subdivision queries scan large tables

**Solution**: Add database indexes

```typescript
// Add indexes to MongoDB collections
db.neighborhoods.createIndex({ slug: 1 });
db.neighborhoods.createIndex({ citySlug: 1 });
db.neighborhoods.createIndex({ "location.coordinates": "2dsphere" });
```

**Expected gain**: 300ms → 270ms = **10% faster**

---

## Implementation Priority

### Phase 1: Quick Wins (1 hour)
1. ✅ Switch to `llama-3.1-8b-instant` model (30% faster)
2. ✅ Reduce message history to 2 (15% faster)
3. ✅ Enable streaming (70% better UX)

**Total Phase 1 Gain**: ~2s → ~1.2s + streaming UX

---

### Phase 2: Medium Effort (2-4 hours)
4. Implement client-side location pre-matching (50% faster)
5. Add response caching (90% faster for repeat queries)
6. Parallel function execution (30% faster)

**Total Phase 2 Gain**: ~1.2s → ~400ms (or 40ms cached)

---

### Phase 3: Long Term (1 day+)
7. Database indexing (10% faster)
8. CDN for static AI responses
9. Predictive pre-loading of common queries

**Total Phase 3 Gain**: ~400ms → ~300ms

---

## Expected Results

| Phase | Response Time | Improvement | Effort |
|-------|---------------|-------------|--------|
| Current | 4s | Baseline | - |
| Phase 1 | 1.2s | 70% faster | 1 hour |
| Phase 2 | 400ms | 90% faster | 4 hours |
| Phase 3 | 300ms | 93% faster | 1 day |
| **Cached** | **40ms** | **99% faster** | Phase 2 |

---

## Recommended Immediate Actions

### 1. Switch to Fast Model
```bash
# Edit src/lib/groq.ts
FREE: "llama-3.1-8b-instant"
```

### 2. Reduce Context Window
```bash
# Edit src/app/api/chat/stream/route.ts:74
const recentMessages = messages.slice(-2);
```

### 3. Enable Streaming
```bash
# Edit src/app/api/chat/stream/route.ts:102
stream: true
```

These 3 changes take 10 minutes and provide immediate 70% speed boost.

---

## Testing Plan

After each optimization:

```bash
node scripts/test-chat-ui-complete.mjs "show me homes in palm desert country club"
```

Track:
- Response time
- Function iterations
- Token usage
- User experience (streaming)

---

## Trade-offs

### Fast Model (llama-3.1-8b-instant)
- ✅ 4x faster
- ❌ Slightly less accurate function calls (95% vs 98%)
- ❌ Shorter responses
- **Recommendation**: Use for free tier, keep 70B for premium

### Aggressive Caching
- ✅ 99% faster when cached
- ❌ Stale data if listings update
- **Recommendation**: 5-minute TTL, invalidate on property updates

### Reduced Context
- ✅ 15% faster
- ❌ Less conversation memory
- **Recommendation**: Good for single-shot queries, keep 3 for conversations

---

## Monitoring

Track these metrics:
- P50 response time (median)
- P95 response time (slow queries)
- Cache hit rate
- Function call accuracy
- User satisfaction

**Goal**: P50 < 500ms, P95 < 2s
