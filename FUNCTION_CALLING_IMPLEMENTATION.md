# Function Calling Implementation - Complete Guide

## ✅ Completed Work

### 1. Function Definitions Created
**File:** `src/lib/groq-functions.ts`

- Defined 10 Groq functions matching our API routes
- Created endpoint mapping for function execution
- All functions properly typed with parameters and descriptions

### 2. Type System Updated
**File:** `src/lib/groq.ts`

Added interfaces:
- `GroqToolCall` - Represents AI function calls
- `GroqFunctionDefinition` - Function schemas
- Updated `GroqChatMessage` to support tool role and tool_calls
- Updated `GroqChatOptions` to accept tools array
- Modified `createChatCompletion()` to pass tools to Groq API

### 3. Function Executor Created
**File:** `src/lib/function-executor.ts`

Handles:
- Executing function calls by calling actual API endpoints
- GET vs POST request handling
- URL parameter replacement (`:slug`, `:cityId`)
- Query string generation for GET requests
- Result formatting for AI consumption
- Error handling and logging

## 🔄 Next Steps - Chat Stream Route

The chat stream route needs to be updated to use an **agent loop** pattern:

```typescript
// Pseudo-code for the new flow:
1. User sends message
2. AI receives message + available functions
3. AI decides to call function(s) → returns tool_calls
4. We execute the functions → get results
5. We send results back to AI as tool messages
6. AI processes results → may call more functions OR give final answer
7. Loop continues until AI returns final text response (no more tool_calls)
8. Return final response to user
```

### Key Changes Needed in `src/app/api/chat/stream/route.ts`:

```typescript
import { GROQ_FUNCTIONS } from "@/lib/groq-functions";
import { executeFunctionCall, formatFunctionResultsForAI } from "@/lib/function-executor";
import type { GroqToolCall } from "@/lib/groq";

// In POST handler:
const MAX_ITERATIONS = 5; // Prevent infinite loops

while (iterations < MAX_ITERATIONS) {
  // Call Groq with tools enabled
  const completion = await createChatCompletion({
    messages: groqMessages,
    model,
    temperature: 0.3,
    maxTokens: 1000,
    tools: GROQ_FUNCTIONS, // ← Key addition
    tool_choice: "auto",
  });

  const message = completion.choices[0].message;

  // Check if AI wants to call functions
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Execute each function
    for (const toolCall of message.tool_calls) {
      const result = await executeFunctionCall({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      });

      // Add result to conversation as tool message
      groqMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: formatFunctionResultsForAI(toolCall.function.name, result),
      });
    }

    // Continue loop - let AI process results
    continue;
  }

  // No tool calls - AI has final answer
  return finalResponse;
}
```

### Simplified System Prompt

Remove the massive JSON config dump. Replace with:

```typescript
function buildSystemPrompt(): string {
  return `You are an expert real estate AI assistant for JPSRealtor.com.

You have access to these functions:
- matchLocation() - Identify location type
- searchListings() - Search MLS
- getSubdivisionListings() - Get subdivision listings
- getCityStats() - Get market statistics
- researchCommunity() - Answer community questions
- generateCMA() - Create market analysis

CRITICAL RULES:
1. ALWAYS call matchLocation() FIRST when user mentions a location
2. Use subdivision search when possible (most specific)
3. For county searches, set limit: 100
4. Call functions to get data - don't make up information

Be conversational and explain what you're doing!`;
}
```

## 📱 Mobile & Theme Optimization

### Files to Optimize:

1. **`src/app/components/chat/ChatMapView.tsx`**
   - Add theme context support
   - Use theme colors for markers, popups, controls
   - Optimize touch interactions for mobile
   - Add safe-area padding for iPhone notch
   - Improve marker clustering for mobile

2. **`src/app/components/chat/ListingCarousel.tsx`** (if exists)
   - Responsive card sizing
   - Touch-friendly swipe gestures
   - Theme-aware colors

3. **Chat Panels/Containers**
   - Mobile-first layout
   - Collapsible sections
   - Theme-aware backgrounds and borders

### Theme Integration Pattern:

```typescript
import { useTheme } from "@/app/contexts/ThemeContext";

function ChatMapView() {
  const { theme } = useTheme();

  const mapStyle = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';

  const markerColor = theme === 'dark' ? '#60a5fa' : '#2563eb';

  return (
    <div className="bg-background text-foreground">
      <Map style={mapStyle} />
    </div>
  );
}
```

## 🧪 Testing Plan

### Test Cases:

1. **Basic Location Search**
   - "Show me homes in Palm Desert Country Club"
   - Expected: matchLocation() → searchListings() → display results

2. **City Stats Query**
   - "What are average prices in Indian Wells?"
   - Expected: matchLocation() → getCityStats() → formatted response

3. **Community Research**
   - "How many subdivisions are in Palm Desert?"
   - Expected: getCitySubdivisions() → formatted list

4. **Multi-step Query**
   - "Find 3 bedroom homes under $500k in Corona"
   - Expected: matchLocation() → searchListings(beds=3, maxPrice=500000)

5. **CMA Request**
   - "Generate a CMA for listing XYZ"
   - Expected: generateCMA() → formatted analysis

## 🗑️ Cleanup Tasks

1. **Remove/Archive:**
   - `src/lib/ai-config.json` (keep for reference, remove from imports)
   - **config-q: command from IntegratedChatWidget
   - Old config-based system prompt

2. **Keep:**
   - **config-log and **config-route for debugging
   - Update them to show function definitions instead

3. **Document:**
   - Update README with function calling architecture
   - Create migration guide from old to new system

## 📊 Benefits Comparison

### Before (Config-Based):
- ❌ AI sometimes ignored config
- ❌ No enforcement of rules
- ❌ Debugging was unclear
- ❌ Wrong routes often called

### After (Function Calling):
- ✅ AI must return valid function calls
- ✅ Type-safe parameters
- ✅ Clear audit trail of function calls
- ✅ Deterministic route selection
- ✅ Easy to debug (see exactly what was called)
- ✅ Can validate/modify function calls before execution

## 🚀 Deployment Checklist

- [ ] Update chat stream route with function calling loop
- [ ] Test all 10 functions individually
- [ ] Test multi-function conversations
- [ ] Optimize mobile UI for chat map
- [ ] Add theme support to all chat components
- [ ] Update **config commands
- [ ] Remove old config from system prompt
- [ ] Document new architecture
- [ ] Monitor function call logs
- [ ] Gather user feedback

## 📝 Implementation Priority

1. **HIGH**: Finish chat stream route (enables function calling)
2. **HIGH**: Test basic function calls
3. **MEDIUM**: Mobile & theme optimization
4. **LOW**: Cleanup old config code
5. **LOW**: Documentation updates

---

## Current Status

- ✅ Function definitions
- ✅ Type system
- ✅ Function executor
- ✅ Groq.ts tool support
- 🔄 Chat stream route (IN PROGRESS)
- ⏳ Mobile/theme optimization
- ⏳ Testing
- ⏳ Cleanup

**Estimated completion:** 2-3 hours of focused work remaining
