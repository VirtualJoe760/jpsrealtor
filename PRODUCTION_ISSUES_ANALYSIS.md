# Production Issues Analysis

## Issues Identified

### ✅ 1. Theme Hydration Mismatch (FIXED)

**Status**: Fixed and committed (commit `4cf7365d`)

**Problem**: React hydration error showing server rendering with `lightgradient` theme but client initializing with `blackspace` theme, causing className mismatches.

**Root Cause**:
- `src/app/contexts/ThemeContext.tsx:20` - Server default: `'lightgradient'`
- `src/app/contexts/ThemeContext.tsx:36` - Client initial state: `'blackspace'`

**Fix Applied**:
- Changed client initial state to `'lightgradient'` to match server
- Updated condition check to compare against new default
- Both server and client now start with same theme, preventing hydration mismatch

---

### ⚠️ 2. Chat History 403 Error (IDENTIFIED)

**Status**: Root cause identified, likely not critical

**Error**: `Failed to load chat history: 403 'Forbidden'` from ChatProvider.tsx:106

**Investigation Findings**:
- ChatProvider calls `/api/chat/log?userId=${userId}&limit=50` (line 87)
- API route at `src/app/api/chat/log/route.ts` returns 403 when:
  - `userId !== session.user.email` (line 97-101)
- This could occur if:
  1. Session not properly available in production
  2. UserId prop doesn't match authenticated email
  3. Timing issue where session loads after component mounts

**Note**: ChatProvider is commented out in `providers.tsx` (line 16), suggesting this might be legacy code. The app uses `EnhancedChatProvider` instead, which may handle this differently.

**Recommendation**: Monitor in production - if chat history loads fine, this error might be from unused code path.

---

### 🚨 3. Chat Function Calling Not Working (MAJOR ISSUE)

**Status**: Critical issue identified - function calling not implemented

**Problem**:
- User query "tell me about homes in palm desert country club" returns "I couldn't find any properties" instead of executing location search
- Works in local development but fails in production

**Investigation Findings**:

#### What the Chat System Currently Does:
1. User sends message → `IntegratedChatWidget.tsx` calls `/api/chat/stream`
2. `/api/chat/stream` sends messages to Groq AI with system prompt
3. System prompt instructs AI to "Always use /api/chat/match-location FIRST" (line 163)
4. Groq returns **text response only** - no function calls
5. Chat displays text response to user

#### The Problem:
- The system prompt **instructs** the AI to call functions, but doesn't **enable** function calling
- Groq AI can only return text, not execute functions
- The `/api/chat/match-location` and `/api/chat/search-listings` endpoints exist but are never called
- Current implementation: `stream: false, temperature: 0.3, maxTokens: 500` (line 71-73)
- **No tools/functions defined in the Groq API call**

#### Why Local Logs Show Function Calls Working:
- The grep search found 20+ successful function call executions in `local-logs/chat-records/`
- This suggests either:
  1. A different chat implementation was running locally (maybe OpenAI?)
  2. Manual function calls for testing
  3. Old implementation that was removed

#### Available Endpoints (Not Being Used):
- `/api/chat/match-location/route.ts` - Resolves location queries to coordinates
- `/api/chat/search-listings/route.ts` - Searches properties by criteria

---

## Solutions Required

### For Chat Function Calling (Critical):

You need to implement proper function calling. Two approaches:

#### Option A: Groq with Manual Function Parsing (Simpler)
1. Add function definitions to system prompt in structured format
2. Parse AI response for function call markers (e.g., `[CALL: matchLocation("palm desert")]`)
3. Execute functions based on parsed markers
4. Inject results back into conversation
5. Get final response from AI

#### Option B: Groq Function Calling (If Supported)
Check if Groq SDK supports OpenAI-compatible function calling:

```typescript
const completion = await createChatCompletion({
  messages: groqMessages,
  model,
  temperature: 0.3,
  tools: [
    {
      type: "function",
      function: {
        name: "matchLocation",
        description: "Resolve a location query to coordinates and bounds",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Location name or address" }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "searchListings",
        description: "Search MLS listings by criteria",
        parameters: {
          type: "object",
          properties: {
            bounds: { type: "object" },
            minPrice: { type: "number" },
            maxPrice: { type: "number" },
            bedrooms: { type: "number" },
            bathrooms: { type: "number" }
          }
        }
      }
    }
  ],
  tool_choice: "auto"
});

// Check if AI wants to call a function
if (completion.choices[0].finish_reason === 'tool_calls') {
  const toolCalls = completion.choices[0].message.tool_calls;
  // Execute each function call
  // Inject results back
  // Get final response
}
```

#### Option C: Switch to OpenAI (Most Reliable)
- OpenAI has mature function calling support
- Change from Groq to OpenAI in `/api/chat/stream/route.ts`
- Use the commented-out OpenAI implementation at bottom of file (lines 247-290)
- Add tools parameter to OpenAI chat completion

---

## Immediate Actions

### 1. Fix Applied ✅
- [x] Theme hydration mismatch fixed
- [x] Committed and ready to push

### 2. Test Chat History 403
- [ ] Deploy current fixes to production
- [ ] Monitor chat history loading in production
- [ ] If issue persists, add session debugging logs

### 3. Implement Function Calling (Choose One Approach)
- [ ] Research if Groq SDK supports OpenAI-compatible tools
- [ ] If yes: Implement Option B (Groq with tools)
- [ ] If no: Implement Option A (manual parsing) or Option C (switch to OpenAI)

---

## Files to Modify for Function Calling

### Primary:
- `src/app/api/chat/stream/route.ts` - Add function calling logic
- `src/app/components/chatwidget/IntegratedChatWidget.tsx` - Handle function call responses

### May Need Updates:
- `src/lib/groq.ts` - Check if function calling supported
- `src/app/api/chat/match-location/route.ts` - Already exists, just needs to be called
- `src/app/api/chat/search-listings/route.ts` - Already exists, just needs to be called

---

## Next Steps

1. **Push current fixes** (theme hydration)
   ```bash
   git push origin v2
   ```

2. **Research Groq function calling**
   - Check Groq documentation for tools/function calling support
   - Determine which implementation approach to use

3. **Implement chosen approach**
   - Add function calling to `/api/chat/stream`
   - Test locally with "palm desert country club" query
   - Verify function calls execute and properties are found

4. **Deploy and test in production**

---

## Summary

| Issue | Status | Impact | Fix Complexity |
|-------|--------|--------|----------------|
| Theme Hydration | ✅ Fixed | Low | Simple |
| Chat History 403 | ⚠️ Identified | Low-Medium | Monitor first |
| Function Calling | 🚨 Critical | High | Medium-High |

**Bottom Line**: The chat works (generates responses) but can't actually search properties because function calling isn't implemented. The system prompt tells the AI to call functions, but the AI can only return text, not execute code.
