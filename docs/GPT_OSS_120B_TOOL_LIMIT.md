# GPT-OSS 120B Tool Use Limit - December 18, 2025

## Critical Finding

**GPT-OSS 120B on Groq API has a hard limit of 2 tools for reliable function calling.**

## Test Results

### ✅ 1 Tool (Minimal): WORKS PERFECTLY
- **Tool**: `queryDatabase` (7 parameters)
- **Test Query**: "Show me homes in Palm Desert"
- **Result**: SUCCESS - Generated valid JSON, included lat/long, map populated

### ✅ 2 Tools: WORKS PERFECTLY
- **Tools**: `queryDatabase` + `searchArticles`
- **Test Queries**:
  - "Show me homes in Palm Desert under 500k" - SUCCESS
  - "can you show me homes in pdcc" - SUCCESS
- **Result**: Valid JSON, proper tool calling, all fields present

### ❌ 3 Tools: BREAKS WITH MALFORMED JSON
- **Tools**: `queryDatabase` + `searchArticles` + `lookupSubdivision`
- **Test Query**: "show me homes in pdcc"
- **Error**: `Failed to parse tool call arguments as JSON`
- **Malformed Output**: `"includeStats\\\": true\"`
- **Result**: Groq API rejects on server side before we can sanitize

### ❌ 10 Tools (Full Set): BREAKS
- **Error**: Same malformed JSON pattern
- **Pattern**: Adds excessive backslashes and garbage whitespace
- **Result**: 400 error from Groq API
- **Note**: Even with MAX_TOOL_ROUNDS=1 (single-round execution), Groq still rejects malformed JSON server-side

## Root Cause

GPT-OSS 120B generates increasingly malformed JSON as tool complexity increases:

**2 Tools** → Clean JSON:
```json
{"city":"Palm Desert","includeStats":true}
```

**3+ Tools** → Malformed JSON:
```json
{"includeStats\": true":"}","subdivision":"Palm Desert Country Club"}
```

The model adds:
- Triple backslashes before quotes
- Malformed key-value pairs (`"includeStats\": true":"}"`)
- Excessive whitespace (\\r\\n sequences)

## Production Solution

**Use MAXIMUM 2 tools for production:**

1. **queryDatabase** - Core property search (simplified to 7 most important params)
2. **searchArticles** - Blog/article search (1 param)

### Removed Tools (Functionality Lost):
- ❌ `lookupSubdivision` - Fuzzy subdivision search
- ❌ `getMarketStats` - Days on market, HOA fees, price/sqft
- ❌ `getAppreciation` - Historical appreciation data
- ❌ `getRegionalStats` - Coachella Valley regional stats
- ❌ `getNeighborhoodPageLink` - Neighborhood browse pages
- ❌ `matchLocation` - Location resolver (deprecated anyway)
- ❌ `searchCity` - City-wide search (deprecated anyway)
- ❌ `searchHomes` - New user-first tool (not yet implemented)

### Workarounds:

1. **Subdivision Search**: Make user spell it out or use city-level search
2. **Market Stats**: Can be included in queryDatabase response
3. **Appreciation**: Will need separate feature or manual lookup
4. **Regional Stats**: User must query cities individually

## Alternative Solutions Explored

### ❌ JSON Sanitization
- Attempted aggressive regex sanitization in `tool-executor.ts`
- **Problem**: Groq API rejects malformed JSON on their server BEFORE sending it to us
- **Conclusion**: Can't fix what we never receive

### ❌ Reduced Tool Parameters
- Reduced queryDatabase from 30+ params to 7 params
- **Problem**: Still breaks at 3 tools regardless of param count
- **Conclusion**: Tool COUNT is the issue, not parameter count

### ❌ Model Fine-tuning
- Not possible - we don't control GPT-OSS 120B
- **Conclusion**: Must work within model limitations

### ❌ Single-Round Execution (MAX_TOOL_ROUNDS=1)
- Changed from MAX_TOOL_ROUNDS=3 to MAX_TOOL_ROUNDS=1
- **Theory**: Prevent multi-round compounding of JSON errors
- **Problem**: Groq rejects malformed JSON on FIRST round (server-side validation)
- **Conclusion**: Single-round helps prevent compounding, but doesn't fix initial malformation with 3+ tools

## Recommendations

### Option 1: Accept 2-Tool Limit (Recommended)
**Pros**:
- Stable, reliable tool calling
- Core functionality works (property search + articles)
- Simple, maintainable

**Cons**:
- Lost advanced features (market stats, appreciation, subdivisions)
- Users must be more specific in queries

### Option 2: Switch to Different Model
Consider models with better tool calling:
- **Qwen 3-32B**: Handles more tools BUT omits lat/long fields (map breaks)
- **llama-3.1-70b**: May handle more tools (untested)
- **Anthropic Claude**: Excellent tool calling (if available via Groq)

**Tradeoff**: GPT-OSS 120B is best for reasoning/responses, just limited on tools

### Option 3: Hybrid Approach
- Use GPT-OSS 120B with 2 tools for main chat
- Separate specialized endpoints for market stats, appreciation
- Call those endpoints directly (no AI tool calling needed)

## Files Modified

### Production Files:
- `src/lib/chat/tools-progressive.ts` - 2-tool configuration (ACTIVE)
- `src/app/api/chat/stream/route.ts` - Using progressive tools

### Backup Files:
- `src/lib/chat/tools.backup.ts` - Full 10-tool set (for reference)
- `src/lib/chat/tools-minimal.ts` - 1-tool test set (for reference)

### Documentation:
- `docs/CHAT_DEBUG_SESSION_DEC18.md` - Debug session notes
- `docs/GPT_OSS_120B_TOOL_LIMIT.md` - This document

## Next Steps

1. ✅ **Confirmed**: 2-tool limit for GPT-OSS 120B
2. ⏳ **Decision Needed**: Accept limitation or switch models?
3. ⏳ **If Accepting**: Simplify UI to match 2-tool capabilities
4. ⏳ **If Switching**: Test alternative models with full tool set
