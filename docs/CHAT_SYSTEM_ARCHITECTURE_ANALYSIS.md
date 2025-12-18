# Chat System Architecture - Complete Analysis
**Date**: December 17, 2025
**Analyst**: Claude Code
**Purpose**: Comprehensive review, cleanup proposals, and getLocationSnapshot integration fix

---

## Executive Summary

### Current State
- ✅ **Modular prompt system EXISTS** (`src/lib/chat/prompts/`)
- ⚠️  **Only used for `textOnly` mode** - regular chat still uses monolithic `system-prompt.ts`
- ❌ **getLocationSnapshot is a bandaid** - implemented as a fake tool that just injects prompts
- ❌ **Tool array pollution** - getLocationSnapshot at position 0 confuses Groq's JSON generator
- ✅ **Tool caching works** - 2-60min TTLs based on data volatility
- ✅ **Help system works** - directory-style commands (`help`, `tools`, `examples`)

### Key Finding
**The modular prompt system (the "index architecture") is only partially implemented**. It was designed to replace the monolithic system-prompt.ts, but currently only works for `textOnly:  true` mode.

---

## File Inventory & Usage Status

### 🟢 ACTIVE FILES (Currently Used)

| File | Purpose | Used By | Status |
|------|---------|---------|--------|
| `prompts/index.ts` | Prompt composition entry point | stream/route.ts | ✅ Active (partial) |
| `prompts/base.ts` | Core identity & communication style | prompts/index.ts | ✅ Active (textOnly mode) |
| `prompts/sources.ts` | Citation rules & [SOURCES] format | prompts/index.ts | ✅ Active (textOnly mode) |
| `prompts/text-only.ts` | Map digest mode instructions | prompts/index.ts | ✅ Active (textOnly mode) |
| `prompts/help-commands.ts` | Help directory system | stream/route.ts | ✅ Active |
| `system-prompt.ts` | Legacy monolithic prompt (680 lines!) | prompts/index.ts | ✅ Active (default mode) |
| `tools.ts` | Tool definitions for Groq function calling | stream/route.ts | ✅ Active |
| `tool-executor.ts` | Tool execution router (654 lines!) | stream/route.ts | ✅ Active |
| `tool-cache.ts` | In-memory TTL cache | tool-executor.ts | ✅ Active |
| `response-parser.ts` | Extract UI components from AI response | stream/route.ts, ChatWidget.tsx | ✅ Active |

### 🔴 DEPRECATED / PROBLEMATIC FILES

| File | Issue | Action Needed |
|------|-------|---------------|
| `system-prompt.ts` | **Monolithic 680-line prompt** - should be modularized | Migrate to prompts/ modules |
| `tool-executor.ts` | **654 lines, all-in-one** - hard to maintain | Consider splitting by domain |
| `getLocationSnapshot` in tools.ts | **Fake tool** - just injects prompts, confuses Groq | Remove from tools, make prompt-level feature |

---

## Architecture Map

### 1. Request Flow

```
User Query
    ↓
ChatWidget.tsx (frontend)
    ↓
POST /api/chat/stream (stream/route.ts)
    ↓
┌─────────────────────────────────────┐
│ Check Help Commands                 │
│ (help, tools, examples)             │
│ → Return instantly, no AI call      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Build System Prompt                 │
│                                     │
│ buildSystemPrompt({ textOnly })     │
│                                     │
│ IF textOnly = true:                 │
│   ├─ base.ts (identity)             │
│   ├─ text-only.ts (map digest)      │
│   └─ sources.ts (citations)         │
│                                     │
│ ELSE (default):                     │
│   └─ system-prompt.ts (monolithic)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ TOOL EXECUTION (Multi-Round)        │
│                                     │
│ Round 1: AI calls tools             │
│   → tool-executor.ts                │
│   → Check tool-cache.ts             │
│   → Execute tool function           │
│   → Return result                   │
│                                     │
│ Round 2: AI uses results            │
│   → May call more tools             │
│   → Or generate final response      │
│                                     │
│ Round 3 (if needed): Final response │
│   → No tools, just markdown         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ STREAM FINAL RESPONSE               │
│                                     │
│ Parse components:                   │
│ ├─ [LISTING_CAROUSEL]               │
│ ├─ [MAP_VIEW]                       │
│ ├─ [APPRECIATION]                   │
│ ├─ [ARTICLE_RESULTS]                │
│ └─ [SOURCES]                        │
│                                     │
│ Clean conversational text           │
└─────────────────────────────────────┘
    ↓
ChatWidget.tsx renders UI components
```

### 2. Prompt System (Modular Architecture)

**Location**: `src/lib/chat/prompts/`

**Design**: Compositional prompt building based on context

```typescript
// The "index architecture" you mentioned
buildSystemPrompt({ textOnly: false }) // Full mode
    → system-prompt.ts (monolithic - needs migration)

buildSystemPrompt({ textOnly: true })  // Map digest mode
    → base.ts + text-only.ts + sources.ts (modular!)
```

**Current Implementation Status**:
- ✅ **TextOnly mode**: Fully modular (~800 tokens, 73% reduction)
- ❌ **Default mode**: Still using monolithic system-prompt.ts (3000+ tokens)

**Why Partial?**
The modular system was started but not completed. The plan was to break system-prompt.ts into modules like:
- `base.ts` - Identity & communication (DONE)
- `sources.ts` - Citations (DONE)
- `text-only.ts` - Map digests (DONE)
- `tool-usage.ts` - Tool selection workflow (TODO)
- `property-search.ts` - Property search instructions (TODO)
- `market-analytics.ts` - Appreciation & stats (TODO)
- `regional.ts` - Coachella Valley queries (TODO)
- etc.

### 3. Tool System

**Location**: `src/lib/chat/tools.ts` (definitions) + `src/lib/chat/tool-executor.ts` (execution)

**Available Tools**:
1. ✅ `queryDatabase` - Universal property search (30+ filters)
2. ✅ `searchArticles` - Blog article search
3. ✅ `getAppreciation` - Market appreciation analytics
4. ✅ `getMarketStats` - DOM, $/sqft, HOA, tax stats
5. ✅ `getRegionalStats` - Coachella Valley city breakdown
6. ✅ `lookupSubdivision` - Fuzzy subdivision name matching
7. ✅ `getNeighborhoodPageLink` - Browse page links
8. ⚠️  `getLocationSnapshot` - **FAKE TOOL - BANDAID!**
9. ⚠️  `matchLocation` - **DEPRECATED** (use queryDatabase)
10. ⚠️  `searchCity` - **DEPRECATED** (use queryDatabase)

**Tool Execution Flow**:
```
1. Groq returns tool_calls array
2. stream/route.ts calls executeToolCall()
3. tool-executor.ts:
   a. Sanitize malformed JSON from Groq
   b. Check tool-cache.ts for cached result
   c. Route to specific executor function
   d. Return result as tool message
4. Append to conversation, continue rounds
```

**Caching Strategy**:
- `queryDatabase`: 2 minutes (searches change frequently)
- `getAppreciation`: 10 minutes (slow-changing data)
- `getMarketStats`: 10 minutes (relatively stable)
- `getRegionalStats`: 5 minutes (regional data)
- `searchArticles`: 30 minutes (content rarely changes)
- `lookupSubdivision`: 1 hour (names don't change)
- `getNeighborhoodPageLink`: 1 hour (URLs don't change)

---

## THE GETLOCATIONSNAPSHOT PROBLEM

### What I Did (Bandaid Approach)

**Commit**: `b5c7a643` - "Add getLocationSnapshot tool for clean location insights"

**Implementation**:
1. Added `getLocationSnapshot` as a tool in `tools.ts` at position 0
2. Tool definition has `locationName` and `locationType` parameters
3. executor function in `tool-executor.ts` returns a PROMPT, not data:
   ```typescript
   return {
     success: true,
     message: `Please provide a real estate market snapshot for ${locationName}...`
   };
   ```
4. ChatWidget listens for `requestLocationInsights` event from MapSearchBar
5. Sends background query: "Give me a Real Estate Snapshot of [location]"

**Why It's a Bandaid**:
- ❌ It's not a real tool - it doesn't fetch data
- ❌ It just injects a prompt into the conversation
- ❌ Adding it at position 0 confuses Groq's JSON generator
- ❌ Groq starts generating malformed JSON for OTHER tools (`"includeStats\\\": true\"`)
- ❌ The tool definition misleads the AI about what it can do

### Why It Broke Tool Calling

**Root Cause**: Tool array pollution + Groq model confusion

When I added `getLocationSnapshot` at position 0 (highest priority):
1. Groq's `openai/gpt-oss-120b` model sees it as the "primary" tool
2. The model's JSON generator gets confused by having a "fake" tool alongside real tools
3. When generating arguments for `queryDatabase`, it produces malformed JSON:
   - Triple backslashes: `"includeStats\\\": true\"`
   - Misplaced quotes: `true\"`
   - Carriage returns and garbage whitespace

**Evidence**:
```json
// Groq API error from logs
{
  "error": {
    "message": "Failed to parse tool call arguments as JSON",
    "failed_generation": "{\n  \"city\": \"Temecula\",\n  \"maxPrice\": 800000,\n  \"pool\": true,\n  \"includeStats\\\": true\"\n..."
  }
}
```

**Why Removing It Fixed The Issue**:
- With `getLocationSnapshot` commented out, Groq only sees "real" tools
- JSON generation returns to normal
- Tool calling works perfectly again

---

## THE CORRECT SOLUTION

### Approach: Make getLocationSnapshot a Prompt-Level Feature

**Concept**: Location snapshots should be a MODE, not a TOOL.

**Implementation Plan**:

#### 1. Create New Prompt Module
**File**: `src/lib/chat/prompts/location-snapshot.ts`

```typescript
export function buildLocationSnapshotPrompt(location: {
  name: string;
  type: 'city' | 'subdivision' | 'county' | 'region';
}): string {
  return `
# LOCATION SNAPSHOT MODE

You are providing a real estate market snapshot for: **${location.name}** (${location.type})

**Your Task**: Provide a concise, engaging overview in 2-3 paragraphs covering:

1. **Typical Home Prices** by property type (SFR, condos, townhomes)
   - Use general knowledge about the area's price ranges
   - Mention if it's a luxury, mid-range, or affordable market

2. **Market Activity & Trends**
   - Current market conditions (hot/balanced/slow)
   - What buyers are looking for (pools, views, golf course, etc.)
   - Recent trends (appreciating, stable, adjusting)

3. **Community Highlights**
   - Lifestyle & demographics (retirees, families, professionals)
   - Notable amenities & attractions
   - Unique characteristics or fun facts

**Format**: Markdown with short, readable paragraphs. Be warm and informative.

**Example**:
"Indian Wells is one of the desert's most exclusive communities, known for world-class golf and the BNP Paribas tennis tournament. Homes here typically range from $800K to $5M+, with luxury estates in communities like Indian Wells Country Club commanding premium prices.

The market stays strong year-round, with buyers seeking resort-style living, mountain views, and access to championship golf courses. Properties with casita guest houses and outdoor living spaces are especially popular.

This tight-knit community attracts affluent retirees and seasonal residents who love the sophisticated desert lifestyle. The city has some of the lowest property tax rates in the valley and maintains its exclusivity through careful planning."

**Remember**: Keep it conversational, avoid jargon, and make it engaging!
`;
}
```

#### 2. Update Prompt Index
**File**: `src/lib/chat/prompts/index.ts`

```typescript
import { buildLocationSnapshotPrompt } from './location-snapshot';

export interface PromptOptions {
  textOnly?: boolean;
  locationSnapshot?: {
    name: string;
    type: 'city' | 'subdivision' | 'county' | 'region';
  };
  dates?: { ... };
}

export function buildSystemPrompt(options: PromptOptions = {}): string {
  const { textOnly = false, locationSnapshot } = options;

  // ... dates calculation ...

  if (locationSnapshot) {
    // LOCATION SNAPSHOT MODE: Focused prompt for location overviews
    let prompt = buildBasePrompt(dates);
    prompt += buildLocationSnapshotPrompt(locationSnapshot);
    prompt += buildSourcesPrompt();
    return prompt;
  }

  if (textOnly) {
    // ... existing textOnly logic ...
  }

  // ... existing default logic ...
}
```

#### 3. Update Stream Route
**File**: `src/app/api/chat/stream/route.ts`

```typescript
const body = await req.json();
const { messages, userId, userTier = "free", textOnly = false, locationSnapshot } = body;

// Build system prompt
const systemPrompt = buildSystemPrompt({ textOnly, locationSnapshot });
```

#### 4. Update ChatWidget Event Handler
**File**: `src/app/components/chat/ChatWidget.tsx`

```typescript
// Listen for location insights requests from MapSearchBar
useEffect(() => {
  const handleLocationInsights = (event: CustomEvent) => {
    const { locationName, locationType } = event.detail;

    // Send to AI with locationSnapshot mode
    const queryPayload = {
      messages: [{
        role: "user",
        content: `Tell me about ${locationName}`  // Simple query, mode does the work
      }],
      userId: user?.id || 'anonymous',
      userTier: user?.tier || 'free',
      locationSnapshot: {
        name: locationName,
        type: locationType
      }
    };

    // Send in background
    handleAIQuery(queryPayload, /* background */ true);
  };

  window.addEventListener('requestLocationInsights', handleLocationInsights as EventListener);
  return () => window.removeEventListener('requestLocationInsights', handleLocationInsights as EventListener);
}, [user]);
```

#### 5. Remove getLocationSnapshot from tools.ts

```typescript
// REMOVE this entire tool definition (lines 10-40)
// {
//   type: "function",
//   function: {
//     name: "getLocationSnapshot",
//     ...
//   }
// }
```

#### 6. Remove getLocationSnapshot from tool-executor.ts

```typescript
// REMOVE the execution handler (around line 216-229)
// async function executeGetLocationSnapshot(args: any): Promise<any> { ... }

// REMOVE from router (line 71-72)
// if (functionName === "getLocationSnapshot") {
//   result = await executeGetLocationSnapshot(functionArgs);
// }
```

---

## CLEANUP PROPOSALS

### Priority 1: Fix getLocationSnapshot (CRITICAL - BLOCKS PROD)
**Impact**: Chat is broken on production
**Effort**: 30 minutes
**Action**:
1. Implement location-snapshot.ts prompt module (above)
2. Update prompt index, stream route, ChatWidget
3. Remove getLocationSnapshot from tools.ts and tool-executor.ts
4. Test with curl: "Show me homes in Temecula under $800k with a pool"
5. Test map search → location snapshot flow

### Priority 2: Complete Modular Prompt Migration (HIGH VALUE)
**Impact**: 73% token reduction, faster responses, easier maintenance
**Effort**: 2-3 hours
**Action**:
1. Break system-prompt.ts into modules:
   - `tool-usage.ts` - Tool selection workflow & batching
   - `property-search.ts` - queryDatabase usage & examples
   - `market-analytics.ts` - Appreciation & stats tools
   - `regional.ts` - Coachella Valley queries
   - `articles.ts` - Article search & formatting
   - `investment.ts` - Investment formulas & CMA
2. Update prompts/index.ts to compose based on query type
3. Add query classification logic (property search vs market research vs questions)
4. Deprecate system-prompt.ts completely

### Priority 3: Clean Up Deprecated Tools (MEDIUM)
**Impact**: Cleaner codebase, less AI confusion
**Effort**: 15 minutes
**Action**:
1. Remove `matchLocation` from tools.ts and tool-executor.ts
2. Remove `searchCity` from tools.ts and tool-executor.ts
3. Update help-commands.ts to remove references
4. Add migration note in CHANGELOG

### Priority 4: Split tool-executor.ts by Domain (LOW)
**Impact**: Better code organization
**Effort**: 1 hour
**Action**:
1. Create `tool-executors/` directory
2. Split by domain:
   - `property-search.ts` - queryDatabase
   - `analytics.ts` - getAppreciation, getMarketStats, getRegionalStats
   - `content.ts` - searchArticles
   - `location.ts` - lookupSubdivision, getNeighborhoodPageLink
3. Keep tool-executor.ts as router
4. Reduces from 654 lines to ~100 line router + smaller modules

### Priority 5: Add Tool Usage Analytics (NICE TO HAVE)
**Impact**: Understand which tools users actually use
**Effort**: 30 minutes
**Action**:
1. Add analytics events in tool-executor.ts
2. Track: tool name, cache hit/miss, execution time, error rate
3. Create dashboard in /admin or logs
4. Use data to optimize caching TTLs

---

## TESTING PLAN

### Test 1: Basic Property Search (queryDatabase)
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me homes in Palm Desert"}],"userId":"test","userTier":"premium"}'
```

**Expected**: Returns carousel + map with Palm Desert listings

### Test 2: Filtered Search (queryDatabase with multiple params)
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me homes in Temecula under $800k with a pool"}],"userId":"test","userTier":"premium"}'
```

**Expected**: Returns filtered listings with pool amenity

### Test 3: Location Snapshot Mode
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tell me about Indian Wells"}],"userId":"test","locationSnapshot":{"name":"Indian Wells","type":"city"}}'
```

**Expected**: Returns 2-3 paragraph markdown snapshot (no carousel)

### Test 4: Help Commands
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"help"}],"userId":"test"}'
```

**Expected**: Returns help directory instantly (no AI call)

### Test 5: Market Analytics (getAppreciation)
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"How much have homes appreciated in Palm Springs over 5 years?"}],"userId":"test","userTier":"premium"}'
```

**Expected**: Returns appreciation component with annual/cumulative rates

### Test 6: Article Search
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What are the hidden costs of homeownership?"}],"userId":"test"}'
```

**Expected**: Returns article results component

---

## FUNCTIONALITY IMPROVEMENTS

### 1. Smart Query Classification
**Problem**: AI sometimes chooses wrong tool or mode
**Solution**: Pre-classify queries before sending to AI

```typescript
// Add to stream/route.ts
function classifyQuery(query: string): {
  type: 'property_search' | 'market_research' | 'question' | 'location_info';
  confidence: number;
} {
  // Property search patterns
  if (/show|find|search|homes?|properties|listings?/i.test(query)) {
    return { type: 'property_search', confidence: 0.9 };
  }

  // Market research patterns
  if (/appreciation|trends?|market|stats|price/i.test(query)) {
    return { type: 'market_research', confidence: 0.85 };
  }

  // Question patterns
  if (/what|how|why|tell me about|explain/i.test(query)) {
    return { type: 'question', confidence: 0.8 };
  }

  return { type: 'property_search', confidence: 0.5 }; // Default
}
```

### 2. Tool Execution Timeout & Retry
**Problem**: Tools can hang or fail silently
**Solution**: Add timeout and retry logic

```typescript
async function executeWithTimeout(fn: () => Promise<any>, timeoutMs: number = 10000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
  );

  return Promise.race([fn(), timeout]);
}

// In tool-executor.ts
try {
  result = await executeWithTimeout(() => executeQueryDatabase(functionArgs), 10000);
} catch (error) {
  if (error.message === 'Tool execution timeout') {
    // Retry once with shorter timeout
    result = await executeWithTimeout(() => executeQueryDatabase(functionArgs), 5000);
  }
}
```

### 3. Streaming Tool Results (Future)
**Problem**: Users wait for all tools to complete before seeing anything
**Solution**: Stream tool results as they complete

```typescript
// Return partial results as tools complete
controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({
    toolResult: {
      name: 'queryDatabase',
      status: 'complete',
      summary: '31 homes found in Palm Desert'
    }
  })}\\n\\n`)
);
```

### 4. User Preferences & Context
**Problem**: AI doesn't remember user preferences across sessions
**Solution**: Add user context to system prompt

```typescript
const userContext = await getUserPreferences(userId);

const systemPrompt = buildSystemPrompt({
  userContext: {
    favoriteAreas: userContext.favoriteAreas || [],
    priceRange: userContext.priceRange,
    preferredPropertyTypes: userContext.propertyTypes,
  }
});
```

---

## DOCUMENTATION UPDATES NEEDED

### 1. /docs/CMS_AND_INSIGHTS_COMPLETE.md
**Status**: Outdated (created Dec 1, 2025)
**Action**: Create new comprehensive doc covering:
- Chat system architecture (this document)
- Prompt system (modular vs monolithic)
- Tool definitions & usage
- Component markers & UI rendering

### 2. /docs/CHAT_INTEGRATION.md
**Status**: Possibly outdated
**Action**: Review and update with:
- Current flow (help → tools → streaming)
- getLocationSnapshot removal
- Modular prompt system

### 3. Create /docs/TOOL_DEVELOPMENT_GUIDE.md
**Purpose**: Guide for adding new tools
**Contents**:
- Tool definition structure
- Executor function template
- Caching strategy
- Testing checklist
- Common pitfalls (like getLocationSnapshot!)

---

## ESTIMATED EFFORT

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Fix getLocationSnapshot | P1 | 30 min | CRITICAL |
| Test & verify fix | P1 | 15 min | CRITICAL |
| Complete modular prompts | P2 | 2-3 hrs | HIGH |
| Remove deprecated tools | P3 | 15 min | MEDIUM |
| Split tool-executor | P4 | 1 hr | LOW |
| Add analytics | P5 | 30 min | NICE |
| Update docs | P2 | 1 hr | HIGH |

**Total for P1-P2**: ~4-5 hours
**Total for all**: ~5-6 hours

---

## GROQ MODEL CAPABILITIES (December 2025)

### Official Documentation Summary

Based on current Groq documentation (https://console.groq.com/docs/tool-use/overview):

**All Groq-hosted models support tool use.** Key capabilities:

| Model | Local Tools | Parallel Calls | JSON Mode | Built-In Tools | Best For |
|-------|-------------|----------------|-----------|----------------|----------|
| `openai/gpt-oss-120b` | ✅ | ❌ | ✅ | ✅ | **BEST reasoning & tool use** |
| `openai/gpt-oss-20b` | ✅ | ❌ | ✅ | ✅ | Lighter reasoning |
| `llama-3.3-70b-versatile` | ✅ | ✅ | ✅ | ❌ | Parallel tool calls |
| `llama-3.1-8b-instant` | ✅ | ✅ | ✅ | ❌ | Fast/cheap (legacy) |
| `groq/compound` | ❌ | N/A | ✅ | ✅ | Server-side tools only |

### Critical Insights

**GPT-OSS 120B is the BEST model for tool use**:
- Top-tier reasoning capabilities
- Highest quality tool selection and argument generation
- Built-in tools for web search, code execution, browser automation
- **Limitation**: Cannot make parallel tool calls (sequential only)

**This is NOT a bug** - it's a documented feature limitation. GPT-OSS models are designed for sequential tool calling, which is perfectly fine for our use case.

### Tool Definition Requirements (Per Official Docs)

Tool definitions MUST follow this structure:

```json
{
  "type": "function",
  "function": {
    "name": "function_name",
    "description": "Clear description helps model decide when to use this",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Parameter description"
        }
      },
      "required": ["param1"]
    }
  }
}
```

**CRITICAL**: Parameters must be valid JSON Schema. Do NOT include:
- ❌ `default` field (not part of JSON Schema for function calling)
- ❌ Invalid enum values
- ❌ Nested arrays without proper typing

**Why This Matters**: Invalid schema fields confuse the model's JSON generator, causing malformed output like `"includeStats\\\": true\"`.

### Tool Calling Workflow (4 Steps)

1. **Initial Request**: Submit tool definitions with user messages
2. **Model Response**: Returns `tool_calls` array with function name and JSON arguments
3. **Execution**: Application executes tools and returns results as `tool` messages
4. **Evaluation**: Model uses results to generate final response or make more tool calls

### Performance Advantage

Groq's speed (300-1000+ tokens/second) makes multi-round tool calling feel instant compared to traditional APIs (10-30 tokens/second).

### What We Learned

**My mistake**: I blamed GPT-OSS 120B for being "broken" when:
1. The actual issue was invalid JSON Schema in our tool definitions
2. The fake `getLocationSnapshot` tool was polluting the tools array
3. I should have checked current documentation instead of relying on training data

**The fix**: Remove invalid schema, remove fake tools, use GPT-OSS 120B properly.

---

## CONCLUSION

The chat system has a solid foundation with good separation of concerns:
- ✅ Modular prompt system (partial)
- ✅ Tool caching working well
- ✅ Help system is great UX
- ✅ Component parsing works

Main issues:
- ❌ getLocationSnapshot is a bandaid that breaks tool calling
- ❌ Invalid JSON Schema fields in tool definitions
- ❌ Using wrong model (llama-3.1-8b-instant instead of gpt-oss-120b)
- ❌ Modular prompt system incomplete (only textOnly mode)
- ❌ Deprecated tools still in codebase
- ❌ Documentation outdated

**Immediate action**:
1. Revert to `openai/gpt-oss-120b` (the BEST model)
2. Verify all tool definitions have valid JSON Schema
3. Implement the getLocationSnapshot fix as outlined above
4. Test with proper model

**Next steps**: Complete modular prompt migration, clean up deprecated code, update docs.

Let me know when you're ready to implement the fixes!
