# Chat System Troubleshooting Guide

Common issues and solutions.

---

## Intent Classification Issues

### Intent Not Detected
**Symptom**: User query doesn't trigger any tool

**Causes**:
1. No matching patterns in `intent-classifier.ts`
2. Low confidence score (< 3.0)
3. Query too ambiguous

**Solutions**:
```typescript
// 1. Add more keywords to pattern matching
if (message.includes("show") || message.includes("find") || message.includes("search")) {
  return { intent: "search_homes", confidence: 5.0 };
}

// 2. Lower confidence threshold
if (intentResult.confidence >= 2.0) {  // Was 3.0
  const tool = getToolByName(intentResult.tool);
}

// 3. Add logging
console.log('[DEBUG] Intent result:', intentResult);
console.log('[DEBUG] Confidence:', intentResult.confidence);
```

### Wrong Tool Selected
**Symptom**: Query triggers wrong tool

**Causes**:
1. Overlapping patterns
2. Missing priority keywords
3. Entity recognition override incorrect

**Solutions**:
```typescript
// 1. Add priority check BEFORE general patterns
// Check for appreciation keywords first
if (message.includes("appreciation") || message.includes("roi")) {
  return { intent: "market_trends", confidence: 3.0 };
}

// 2. Use entity recognition to disambiguate
const entityResult = identifyEntityType(userMessage);
if (entityResult.type === 'subdivision' && message.includes("allow")) {
  return { intent: "subdivision_query", confidence: 4.0 };
}

// 3. Adjust pattern specificity
// Be more specific with patterns to avoid overlaps
if (message.includes("new listing") || message.includes("recently listed")) {
  return { intent: "new_listings", confidence: 4.0 };
}
```

---

## Tool Execution Errors

### MongoDB Timeout
**Symptom**: `Operation unified_listings.find() buffering timed out after 10000ms`

**Cause**: Tool executor is making backend database calls (OLD ARCHITECTURE)

**Solution**: Use component-first architecture
```typescript
// ❌ WRONG - Don't do this
async function executeSearchHomes(args) {
  const response = await fetch('/api/query', { ... });  // Backend call
  return { listings: await response.json() };
}

// ✅ CORRECT - Return parameters only
async function executeSearchHomes(args) {
  return {
    success: true,
    searchParams: {
      city: args.location,
      filters: { maxPrice: args.maxPrice }
    }
  };
}
```

### Tool Not Found
**Symptom**: `Unknown function: myTool`

**Causes**:
1. Tool not defined in `tools-user-first.ts`
2. Tool not registered in `tool-executor.ts`
3. Typo in tool name

**Solutions**:
```typescript
// 1. Add tool definition
export const ALL_TOOLS = [
  {
    type: "function",
    function: {
      name: "myTool",  // Exact name must match
      description: "...",
      parameters: { ... }
    }
  }
];

// 2. Register in executor
if (functionName === "myTool") {
  result = await executeMyTool(functionArgs);
}

// 3. Check spelling
console.log('[DEBUG] Tool name:', functionName);
```

### JSON Parse Error
**Symptom**: `Unexpected token in JSON at position...`

**Cause**: Groq API returns malformed JSON in tool arguments

**Solution**: Already handled by sanitization in `tool-executor.ts`
```typescript
// Groq argument sanitization (lines 20-52)
let argsString = toolCall.function.arguments;

// Fix 1: Remove excessive backslashes
argsString = argsString.replace(/\\+"/g, '"');

// Fix 2: Fix malformed patterns
argsString = argsString.replace(/(":\s*(?:true|false|null|\d+))"\s*:\s*"\}"/, '$1');

// Fix 3: Remove garbage whitespace
argsString = argsString.replace(/\r/g, '');

const functionArgs = JSON.parse(argsString);
```

If still failing, add more aggressive sanitization.

---

## Component Rendering Issues

### Component Not Rendering
**Symptom**: AI response shows but component doesn't appear

**Causes**:
1. Component marker not in response
2. Marker parsing failing
3. Component receiving wrong props

**Solutions**:
```typescript
// 1. Check AI response for marker
console.log('[DEBUG] AI response:', message.content);
// Should contain: "[LISTING_CAROUSEL]I found..."

// 2. Verify marker parsing
if (msg.content.includes('[LISTING_CAROUSEL]')) {
  console.log('[DEBUG] Marker detected');
  const params = extractSearchParams(msg);
  console.log('[DEBUG] Params:', params);
}

// 3. Check component props
<ListingCarousel
  searchParams={params}  // Must be defined
  onListingClick={...}
/>
```

### Component Shows No Data
**Symptom**: Component renders but shows empty state

**Causes**:
1. Search parameters incorrect
2. MongoDB query returns no results
3. Component data fetching failing

**Solutions**:
```typescript
// 1. Check params passed to component
useEffect(() => {
  console.log('[DEBUG] Search params:', searchParams);
  // Verify all required fields present
}, [searchParams]);

// 2. Check MongoDB query
const response = await fetch('/api/mls-listings', {
  method: 'POST',
  body: JSON.stringify(searchParams)
});
console.log('[DEBUG] API response:', await response.json());

// 3. Add error handling
const [error, setError] = useState(null);
try {
  const data = await response.json();
  setListings(data.listings);
} catch (err) {
  setError(err.message);
  console.error('[ERROR] Data fetch failed:', err);
}
```

---

## Entity Recognition Issues

### Wrong Location Type
**Symptom**: Subdivision detected as city or vice versa

**Cause**: Entity not in known lists

**Solution**: Add to entity lists
```typescript
// Add to KNOWN_SUBDIVISIONS
const KNOWN_SUBDIVISIONS = [
  { name: 'New Subdivision', aliases: ['New Sub', 'NS'] },
  // ... existing subdivisions
];

// Add to COACHELLA_VALLEY_CITIES
const COACHELLA_VALLEY_CITIES = [
  'New City',
  // ... existing cities
];
```

### Entity Not Recognized
**Symptom**: `{ type: 'city', confidence: 'low' }` for known subdivision

**Cause**: Typo or variation not in aliases

**Solution**: Add alias
```typescript
{
  name: 'Palm Desert Country Club',
  aliases: ['PDCC', 'PD Country Club', 'Palm Desert CC']  // Add variations
}
```

---

## SSE Streaming Issues

### Stream Cuts Off
**Symptom**: AI response incomplete, stream stops early

**Causes**:
1. Timeout reached
2. Connection dropped
3. Error during streaming

**Solutions**:
```typescript
// 1. Increase timeout (stream/route.ts)
const stream = await groqStream(messages, tools, {
  timeout: 60000  // 60 seconds
});

// 2. Add reconnection logic (frontend)
const reader = response.body.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Process chunk
  }
} catch (error) {
  console.error('[SSE] Stream error:', error);
  // Retry or show error
}

// 3. Check for errors in stream
if (chunk.includes('error:')) {
  console.error('[SSE] Error in stream:', chunk);
}
```

### Tool Choice Error
**Symptom**: `Error: 400 Tool choice is none, but model called a tool`

**Cause**: Mismatch between tool availability and model behavior

**Solution**: Ensure tool is loaded correctly
```typescript
// Verify tool is in tools array
const tools = intentResult.tool
  ? [getToolByName(intentResult.tool)]
  : [];

console.log('[DEBUG] Tools loaded:', tools.map(t => t.function.name));
```

---

## Performance Issues

### Slow Response Times
**Symptom**: Query takes 10+ seconds to respond

**Causes**:
1. Backend database call during tool execution (OLD ARCHITECTURE)
2. Large data payloads
3. Unoptimized MongoDB queries

**Solutions**:
```typescript
// 1. Use component-first architecture
// Tools return parameters, components fetch data

// 2. Limit data returned
const filters = {
  ...args.filters,
  limit: 10,  // Limit results
  sort: "newest"
};

// 3. Add indexes to MongoDB
// See docs/CHAT_CLEANUP_COMPLETE_DEC19.md for index recommendations
```

### Memory Issues
**Symptom**: Browser slows down, high memory usage

**Causes**:
1. Too many messages in state
2. Large component renders
3. Memory leaks

**Solutions**:
```typescript
// 1. Limit message history
const MAX_MESSAGES = 50;
if (messages.length > MAX_MESSAGES) {
  setMessages(messages.slice(-MAX_MESSAGES));
}

// 2. Virtualize long lists
import { FixedSizeList } from 'react-window';

// 3. Cleanup on unmount
useEffect(() => {
  return () => {
    // Cleanup subscriptions, timers, etc.
  };
}, []);
```

---

## Common Error Messages

### "Operation buffering timed out"
**Fix**: Migrate to component-first architecture (don't call MongoDB during tool execution)

### "Unknown function"
**Fix**: Add tool to `tools-user-first.ts` and register in `tool-executor.ts`

### "location is required"
**Fix**: Ensure AI is passing location parameter, or ask user for clarification

### "JSON parse error"
**Fix**: Check Groq argument sanitization in `tool-executor.ts`

### "Rate limit exceeded"
**Fix**: Implement rate limiting or upgrade API tier

---

## Debugging Workflow

### 1. Identify Issue
- Check browser console for errors
- Review server logs
- Test with curl to isolate frontend vs backend

### 2. Add Logging
```typescript
// Intent classification
console.log('[DEBUG] Query:', userMessage);
console.log('[DEBUG] Intent:', intentResult);
console.log('[DEBUG] Tool:', toolName);

// Tool execution
console.log('[DEBUG] Tool args:', functionArgs);
console.log('[DEBUG] Tool result:', result);

// Component rendering
console.log('[DEBUG] Component marker:', hasMarker);
console.log('[DEBUG] Search params:', searchParams);
```

### 3. Test in Isolation
```bash
# Test intent classification
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"YOUR QUERY"}],"userId":"test","userTier":"premium"}' \
  | grep -E "Intent|Tool|Error"
```

### 4. Compare with Working Example
- Find similar working query
- Compare intent classification
- Compare tool execution
- Compare component rendering

### 5. Check Recent Changes
```bash
# Review recent commits
git log --oneline -10

# Check diff for specific file
git diff HEAD~1 src/lib/chat/intent-classifier.ts
```

---

## Getting Help

### Check Documentation
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
2. [TOOLS.md](./TOOLS.md) - Tool development
3. [INTENT_CLASSIFICATION.md](./INTENT_CLASSIFICATION.md) - Intent patterns
4. [TESTING.md](./TESTING.md) - Testing guide

### Review Chat Logs
```bash
# Find relevant chat session
ls -lt local-logs/chat-records/ | head -5

# View session details
cat local-logs/chat-records/chat_20251219_*.json | jq .
```

### Check Git History
```bash
# See cleanup commits
git log --oneline --grep="Cleanup" -10

# View comprehensive analysis
cat docs/CHAT_CLEANUP_COMPLETE_DEC19.md
```

---

## Prevention

### Before Deploying Changes
1. ✅ Test all intent patterns
2. ✅ Verify tool execution
3. ✅ Check component rendering
4. ✅ Review performance metrics
5. ✅ Run regression tests

### Code Review Checklist
- [ ] No backend MongoDB calls in tool executors
- [ ] Tools return parameters, not data
- [ ] Intent patterns don't overlap
- [ ] Error handling added
- [ ] Logging added for debugging
- [ ] Tests passing

---

## Emergency Fixes

### Critical Bug in Production
1. Identify affected tool/intent
2. Disable tool temporarily:
```typescript
// In tool-executor.ts
if (functionName === "problematicTool") {
  return {
    success: false,
    error: "This tool is temporarily disabled"
  };
}
```
3. Fix issue in development
4. Test thoroughly
5. Deploy fix
6. Re-enable tool

### Rollback Strategy
```bash
# Revert to previous working commit
git log --oneline -10  # Find last working commit
git revert <commit-hash>
git push origin improved-chat
```
