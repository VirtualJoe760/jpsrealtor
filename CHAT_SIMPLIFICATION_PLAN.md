# Chat Widget Simplification Plan

## Current State
- **File size**: 2,011 lines
- **Main issue**: Contains old function detection logic that parses AI responses for function calls in text
- **New system**: Groq handles function calling natively via API

## What Can Be Removed

### 1. Old Function Detection Code (~800 lines)
All the `detectFunctionCall()` logic that parses text like:
- `searchListings(...)`
- `matchLocation(...)`
- `research(...)`

This is no longer needed because Groq API returns function calls in metadata.

### 2. Manual Function Execution (~400 lines)
Code that manually calls APIs after detecting functions:
- `executeMLSSearch()`
- Fetching subdivision data
- Building search parameters

This is no longer needed because functions are executed server-side.

### 3. WebLLM Complexity (~300 lines)
- Progressive loading
- Model initialization
- Streaming logic for local AI

We're using Groq API now, so this is dead code.

## New Simplified Flow

```typescript
async function handleSend(userMessage: string) {
  // 1. Add user message
  addMessage({ role: "user", content: userMessage });

  // 2. Call Groq API
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({ messages, userId })
  });

  const data = await response.json();

  // 3. Extract listings from metadata
  const listings = data.metadata?.functionCalls
    ?.find(c => c.function === 'getSubdivisionListings')
    ?.data?.listings;

  // 4. Add assistant message with listings
  addMessage({
    role: "assistant",
    content: data.response,
    listings
  });

  // 5. Update map
  if (listings) {
    setSearchResults(listings);
  }
}
```

**Result**: ~150 lines instead of 2,011!

## Implementation Strategy

Instead of rewriting the entire file (risky), I'll:
1. Comment out all the old function detection code
2. Replace with simple Groq API call
3. Test thoroughly
4. Remove commented code once verified

## Files to Create

1. `SimplifiedChatWidget.tsx` - New clean implementation
2. Keep old file as `.backup` for reference
3. Gradually migrate features as needed
