# Chat System Decision Needed - December 18, 2025

## The Situation

We have **two conflicting requirements**:

### 1. User-First Tool Architecture (Ideal UX)
Based on analysis of real user queries, we designed **8 focused tools**:
- `searchHomes` (60% of queries) - "Show me homes in [location]"
- `searchNewListings` (15%) - "What's new in [location]"
- `getMarketOverview` (10%) - "Tell me about [location]"
- `getPricing` (5%) - "How much are homes in [location]"
- `getMarketTrends` (3%) - "How much have homes appreciated"
- `compareLocations` (3%) - "Compare [location1] and [location2]"
- `findNeighborhoods` (1%) - "What neighborhoods are in [city]"
- `searchArticles` (1%) - Real estate knowledge questions

**Benefits**:
- ✅ Each tool maps to specific user questions
- ✅ Natural language parameters
- ✅ Smart defaults
- ✅ Specialized responses
- ✅ Better UX

See: `docs/USER_QUERY_ANALYSIS.md`

### 2. GPT-OSS 120B Technical Limit (Hard Constraint)
Through systematic testing, we confirmed:
- ✅ **1 tool**: Works perfectly
- ✅ **2 tools**: Works perfectly
- ❌ **3+ tools**: Generates malformed JSON that Groq API rejects server-side

**Root Cause**: GPT-OSS 120B model generates increasingly malformed JSON as tool complexity increases. The malformation happens during model generation, before our sanitization can fix it.

**Evidence**:
```
Malformed JSON from GPT-OSS 120B:
{"includeStats\\\": true\"...}

Triple backslashes, malformed key-value pairs, excessive whitespace
```

**Attempts to Fix**:
- ❌ JSON sanitization (Groq rejects on server-side first)
- ❌ Reduced tool parameters (issue is tool COUNT, not param count)
- ❌ Single-round execution MAX_TOOL_ROUNDS=1 (doesn't fix initial malformation)

See: `docs/GPT_OSS_120B_TOOL_LIMIT.md`

---

## The Conflict

**User-First Approach** = 8 tools
**GPT-OSS 120B Limit** = 2 tools maximum

**We cannot have both.**

---

## Options

### Option 1: Accept 2-Tool Limit with GPT-OSS 120B

**Use only the 2 most common tools:**
- `searchHomes` (60% of queries)
- `searchArticles` (1% of queries - but needed for knowledge)

**Pros**:
- ✅ Stable, reliable tool calling
- ✅ Best reasoning model (GPT-OSS 120B)
- ✅ Core functionality works
- ✅ Simple, maintainable

**Cons**:
- ❌ Lost 6 tools (40% of use cases):
  - No `searchNewListings` (can't filter by "new")
  - No `getMarketOverview` (can't get area descriptions)
  - No `getPricing` (can't get price-only data)
  - No `getMarketTrends` (can't get appreciation data)
  - No `compareLocations` (can't compare two areas)
  - No `findNeighborhoods` (can't list subdivisions)
- ❌ Users must work around limitations
- ❌ Not truly "user-first"

**Workarounds**:
- Market stats can be included in `searchHomes` response
- Users can ask for "new homes" and we sort by date
- Overviews can be text-only responses (no tool needed)

---

### Option 2: Switch to Different Model

**Use llama-3.3-70b-versatile which supports parallel tool calling:**

**Pros**:
- ✅ Can handle all 8 tools
- ✅ Supports parallel tool calls
- ✅ True user-first architecture
- ✅ Better UX - all use cases covered

**Cons**:
- ❌ Not tested yet - might have own issues
- ❌ May not have GPT-OSS's reasoning quality
- ❌ May omit fields like Qwen did (latitude/longitude)
- ❌ Unknown performance characteristics

**Risk**: We'd need to thoroughly test before committing.

**Fallback**: If llama-3.3-70b doesn't work, could try other models:
- `llama-3.1-70b-versatile`
- `mixtral-8x7b-32768`
- Anthropic Claude (if available via Groq)

---

### Option 3: Hybrid Multi-Call Approach

**Use GPT-OSS 120B with intelligent tool subset selection:**

**Strategy**:
1. Classify user intent (browse, new, overview, price, trends, compare, neighborhoods, knowledge)
2. Load only the 2 relevant tools for that intent
3. Make GPT-OSS call with those 2 tools
4. If more tools needed, make second call with different 2 tools

**Example Flow**:
```
User: "Compare Palm Desert and La Quinta"
  ↓
Intent: COMPARISON
  ↓
Load tools: [compareLocations, getPricing]
  ↓
GPT-OSS calls: compareLocations
  ↓
Response generated
```

**Pros**:
- ✅ Keep GPT-OSS 120B quality
- ✅ Support all 8 tools (eventually)
- ✅ Each call is within 2-tool limit
- ✅ True user-first architecture

**Cons**:
- ❌ More complex implementation
- ❌ Requires intent classification layer
- ❌ May need multiple API calls per query
- ❌ Slower overall response time
- ❌ More expensive (multiple calls)

---

### Option 4: User-First with Tool Consolidation

**Redesign to fit 2 tools while keeping user-first principles:**

**Tool 1: `queryProperties`** (80% of use cases)
- Handles: browsing, new listings, pricing, neighborhoods
- Smart modes: "browse", "new", "price-only"
- Comprehensive parameters covering all needs

**Tool 2: `getMarketInsights`** (20% of use cases)
- Handles: overviews, trends, comparisons
- Smart modes: "overview", "trends", "compare"
- Returns text or data based on mode

**Pros**:
- ✅ Works within 2-tool limit
- ✅ User-first intent mapping preserved
- ✅ GPT-OSS 120B quality
- ✅ All use cases covered
- ✅ Stable and maintainable

**Cons**:
- ❌ Tools become more complex (multiple modes)
- ❌ Loses some clarity of 8 focused tools
- ❌ AI needs to understand mode parameter

**This is a compromise**: User-first intent mapping + 2-tool technical limit

---

## Current Configuration

**Active**: 2-tool limit (Option 1) - TEMPORARY
- File: `src/lib/chat/tools-progressive.ts`
- Tools: `queryDatabase` (basic params), `searchArticles`
- Works reliably but limited functionality

**Backed up**: Full 10-tool set (pre-user-first refactor)
- File: `src/lib/chat/tools.backup.ts`
- Tools: All original tools including deprecated ones

**Planned**: User-first 8-tool set (not yet implemented)
- Design: `docs/USER_QUERY_ANALYSIS.md`
- Not compatible with GPT-OSS 120B's 2-tool limit

---

## Recommendation

**Option 4: User-First with Tool Consolidation**

This is the best compromise:
- Preserves user-first intent mapping
- Works within GPT-OSS 120B's 2-tool limit
- Covers all use cases
- Maintains GPT-OSS's reasoning quality
- Achievable without switching models

**Implementation Plan**:

1. **Design 2 consolidated tools**:
   - `queryProperties` - All property search needs
   - `getMarketInsights` - All market analysis needs

2. **Add mode/intent parameters**:
   - AI selects the right mode based on user query
   - Tool executor handles mode routing

3. **Test thoroughly**:
   - Verify 2 tools work reliably
   - Test all user query patterns
   - Ensure no regression

4. **Document**:
   - Update tool definitions
   - Create user query → tool mode mapping
   - Add examples

**Alternative**: If testing reveals issues with 2-tool consolidation, proceed to **Option 2** (switch models) with full testing protocol.

---

## Decision Required

**Question**: Which option should we pursue?

**Factors to Consider**:
- User experience vs technical constraints
- Development time vs feature completeness
- Model quality vs tool flexibility
- Risk tolerance for model switching

**Next Steps**:
1. Get user/stakeholder decision on preferred option
2. Implement chosen approach
3. Test thoroughly before deployment
4. Document final architecture

---

## Files Referenced

- `docs/USER_QUERY_ANALYSIS.md` - User-first tool design (8 tools)
- `docs/CHAT_SYSTEM_REFACTOR_PLAN.md` - Original refactor plan
- `docs/GPT_OSS_120B_TOOL_LIMIT.md` - Technical limitation findings
- `docs/CHAT_DEBUG_SESSION_DEC18.md` - Debug history
- `src/lib/chat/tools-progressive.ts` - Current 2-tool config
- `src/lib/chat/tools.backup.ts` - Original 10-tool set
- `src/app/api/chat/stream/route.ts` - Chat streaming endpoint
