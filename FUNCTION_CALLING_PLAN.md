# Function Calling Implementation Plan

## Overview
Convert from config-based AI guidance to proper Groq function calling for deterministic, reliable API route selection.

## Current Problems
1. ❌ AI doesn't reliably follow JSON config
2. ❌ No enforcement of config rules
3. ❌ **config-q workflow is hacky
4. ❌ Wrong architectural layer (docs instead of code)

## Solution: Groq Function Calling

### Phase 1: Define Functions ✅ COMPLETED
**File Created:** `src/lib/groq-functions.ts`

Defined 10 functions that map to our API endpoints:
1. `matchLocation` - Identify location type (subdivision/city/county)
2. `searchListings` - Search MLS with filters
3. `getSubdivisionListings` - Get listings by subdivision slug
4. `getCitySubdivisions` - List all subdivisions in a city
5. `getCityListings` - Get all city listings
6. `getCityStats` - Get city market statistics
7. `getSubdivisionStats` - Get subdivision statistics + HOA
8. `getCityHOA` - Get city HOA statistics
9. `researchCommunity` - Auto-discover community facts
10. `generateCMA` - Generate Comparative Market Analysis

### Phase 2: Update Type Definitions ✅ COMPLETED
**File Modified:** `src/lib/groq.ts`

Added interfaces:
- `GroqToolCall` - Represents a function call from AI
- `GroqFunctionDefinition` - Function schema for Groq
- Updated `GroqChatMessage` to support tool calls
- Updated `GroqChatOptions` to accept tools array

### Phase 3: Create Function Executor 🔄 IN PROGRESS
**File to Create:** `src/lib/function-executor.ts`

This handler will:
1. Receive function calls from Groq AI
2. Parse function name and arguments
3. Call the appropriate API endpoint
4. Handle GET vs POST requests
5. Replace URL parameters (`:slug`, `:cityId`)
6. Return results back to AI

### Phase 4: Update Chat Stream Route ⏳ PENDING
**File to Modify:** `src/app/api/chat/stream/route.ts`

Changes needed:
1. Import `GROQ_FUNCTIONS` from groq-functions.ts
2. Pass `tools: GROQ_FUNCTIONS` to Groq API
3. Check response for `tool_calls`
4. If tool calls exist, execute them via function-executor
5. Send tool results back to AI for final response
6. Stream final response to user

### Phase 5: Update Chat Widget ⏳ PENDING
**File to Modify:** `src/app/components/chatwidget/IntegratedChatWidget.tsx`

Changes needed:
1. Handle function call indicators in stream
2. Show "🔧 Calling matchLocation..." status messages
3. Display function results (listings, stats, etc.)
4. Remove old **config-q command (deprecated)
5. Keep **config-log and **config-route for debugging

### Phase 6: Testing ⏳ PENDING
Test with various queries:
- "Show me 3 bedroom homes in Palm Desert Country Club" → matchLocation + searchListings
- "What are average prices in Indian Wells?" → matchLocation + getCityStats
- "List all communities in Palm Desert" → getCitySubdivisions
- "How much are HOA fees in PGA West?" → getSubdivisionStats

### Phase 7: Cleanup ⏳ PENDING
1. Remove ai-config.json (or keep for reference docs only)
2. Remove config injection from system prompt
3. Update documentation
4. Create migration guide

## Benefits of Function Calling

### Before (Config-Based):
```
System Prompt: "Here's a JSON config with all routes..."
User: "Show homes in Palm Desert CC"
AI: *tries to parse config, may or may not follow it*
AI: "Let me search..." *calls wrong route or generic search*
```

### After (Function Calling):
```
System Prompt: "You are a real estate assistant"
Tools: [matchLocation, searchListings, ...]
User: "Show homes in Palm Desert CC"
AI: Returns structured function call:
  {
    "tool_calls": [{
      "function": "matchLocation",
      "arguments": {"query": "Palm Desert CC"}
    }]
  }
Code: Executes matchLocation("/api/chat/match-location", {query: "..."})
Code: Returns result to AI
AI: Returns next function call:
  {
    "tool_calls": [{
      "function": "searchListings",
      "arguments": {"subdivisions": ["Palm Desert Country Club"]}
    }]
  }
Code: Executes searchListings with exact params
Code: Returns listings to AI
AI: Formats response for user
```

## Key Advantages

1. **Deterministic** - AI must return valid function calls, not freeform text
2. **Type-Safe** - Function schemas enforce correct parameters
3. **Auditable** - We log exact function calls and parameters
4. **Debuggable** - Can see precisely what the AI tried to call
5. **Enforceable** - Code validates and executes, not hoping AI follows docs
6. **Separation of Concerns** - AI decides WHAT to do, code handles HOW

## Migration Path

1. ✅ Keep existing `/api/chat/search-listings` and other endpoints
2. ✅ Add function calling layer on top
3. ✅ Gradually migrate users to new system
4. ⏳ Eventually deprecate old config-based approach
5. ⏳ Remove config from system prompt

## Files Created/Modified

### Created:
- ✅ `src/lib/groq-functions.ts` - Function definitions
- ⏳ `src/lib/function-executor.ts` - Function execution handler

### Modified:
- ✅ `src/lib/groq.ts` - Added function calling types
- ⏳ `src/app/api/chat/stream/route.ts` - Use function calling
- ⏳ `src/app/components/chatwidget/IntegratedChatWidget.tsx` - Handle function calls

### Deprecated:
- `src/lib/ai-config.json` - May keep for reference docs
- **config-q: command - Replace with native function calling

## Next Steps

1. Create function-executor.ts
2. Update chat stream route
3. Test with real queries
4. Update chat widget UI
5. Document new system
