# 🚀 Phase 4 Deliverable #6 (Part 2) — AI Integration Layer PROGRESS

## Current Status: IN PROGRESS (50% Complete)

This document tracks the implementation of wiring the AI Preference Engine into the actual chat intelligence.

---

## ✅ Completed Steps

### 1. Enhanced NLP Parser with Preference Intent Detection

**File**: `src/lib/ai/nlp-to-mls.ts`

#### Added to ParsedMLSQuery Interface:
```typescript
// Preference-based AI intent
intent?: "preference_recommendation" | "similar_listing" | "refinement" | "new_search";
targetListingIndex?: number; // For "show me more like the first one"
similarityMode?: "exact_match" | "flexible" | "budget_conscious";
```

#### Created detectPreferenceIntent() Function:
Detects 3 types of preference-based queries:

**1. Similarity Queries**:
- "more like this", "like the first", "like the second", "similar to"
- Extracts target listing index (first, second, third, etc.)
- Detects similarity mode (exact, flexible, budget-conscious)
- Returns: `{ intent: "similar_listing", targetListingIndex: 0, similarityMode: "flexible" }`

**2. Recommendation Queries**:
- "what do you recommend", "help me pick", "what's best for me"
- Returns: `{ intent: "preference_recommendation" }`

**3. More Results Queries**:
- "show me more", "more homes", "more properties"
- Returns: `{ intent: "more_results" }`

#### Updated parseNaturalLanguageQuery():
```typescript
export function parseNaturalLanguageQuery(
  text: string,
  previousQuery?: ParsedMLSQuery
): ParsedMLSQuery {
  const lowerText = text.toLowerCase();
  const query: ParsedMLSQuery = { mlsSource: "ALL", limit: 100 };

  // 🆕 Detect preference-based intent first
  const preferenceIntent = detectPreferenceIntent(lowerText);
  if (preferenceIntent.intent) {
    query.intent = preferenceIntent.intent;
    query.targetListingIndex = preferenceIntent.targetListingIndex;
    query.similarityMode = preferenceIntent.similarityMode;

    // For similarity and recommendation queries, return early
    if (preferenceIntent.intent === "similar_listing" ||
        preferenceIntent.intent === "preference_recommendation") {
      return query;
    }
  }

  // Check refinement
  const isRefinement = detectRefinement(lowerText);
  if (isRefinement && previousQuery) {
    query.intent = "refinement";
    // ...
  }

  // Default to new_search
  if (!query.intent) {
    query.intent = "new_search";
  }

  // ... rest of parsing
}
```

**Example Outputs**:

```typescript
// User: "show me more like the first one"
parseNaturalLanguageQuery("show me more like the first one");
// Returns:
{
  intent: "similar_listing",
  targetListingIndex: 0,
  similarityMode: "flexible",
  mlsSource: "ALL",
  limit: 100
}

// User: "what do you recommend?"
parseNaturalLanguageQuery("what do you recommend?");
// Returns:
{
  intent: "preference_recommendation",
  mlsSource: "ALL",
  limit: 100
}

// User: "show me cheaper homes like the second one"
parseNaturalLanguageQuery("show me cheaper homes like the second one");
// Returns:
{
  intent: "similar_listing",
  targetListingIndex: 1,
  similarityMode: "budget_conscious",
  mlsSource: "ALL",
  limit: 100
}
```

---

## ⏳ Remaining Steps

### 2. Update executeMLSSearch() to Apply Preferences

**File**: `src/lib/ai-functions.ts`

**What Needs To Be Done**:

```typescript
// Before returning results, apply preference intelligence:

export async function executeMLSSearch(params: any, mlsState?: MLSSessionState) {
  // ... existing search logic ...

  let listings = results.listings;

  // A. Filter out dismissed listings
  if (mlsState?.dismissed && mlsState.dismissed.length > 0) {
    listings = listings.filter(l => {
      const key = l.slugAddress || l.slug || l.id;
      return !mlsState.dismissed.includes(key);
    });
    console.log(`🚫 Filtered out ${results.listings.length - listings.length} dismissed listings`);
  }

  // B. Handle similarity queries
  if (params.intent === "similar_listing" && mlsState?.lastListings) {
    const targetIndex = params.targetListingIndex ?? 0;
    const actualIndex = targetIndex === -1 ? mlsState.lastListings.length - 1 : targetIndex;
    const targetListing = mlsState.lastListings[actualIndex];

    if (targetListing) {
      listings = findSimilarListings(targetListing, listings, 10);
      console.log(`🔍 Found ${listings.length} listings similar to target`);
    }
  }

  // C. Handle recommendation queries
  if (params.intent === "preference_recommendation" && mlsState?.preferenceModel) {
    listings = sortByPreference(
      listings,
      mlsState.preferenceModel,
      mlsState.dismissed
    );
    console.log(`🎯 Sorted ${listings.length} listings by preference match`);
  }

  // D. Handle "show me more" with preferences
  if (params.intent === "more_results" && mlsState?.preferenceModel) {
    // Apply preferences in "suggest" mode
    const preferredFilters = applyPreferencesToFilters(
      params,
      mlsState.preferenceModel,
      'suggest'
    );

    // Re-run search with preferred filters
    // ... (implementation needed)
  }

  return {
    success: true,
    listings,
    count: listings.length
  };
}
```

### 3. Wire IntegratedChatWidget to Handle Preference Queries

**File**: `src/app/components/chatwidget/IntegratedChatWidget.tsx`

**What Needs To Be Done**:

```typescript
import { useChatContext } from "@/app/components/chat/ChatProvider";
import {
  findSimilarListings,
  sortByPreference,
  describePreferences,
  applyPreferencesToFilters
} from "@/lib/ai/preference-engine";

// Inside component:
const { mlsState, setLastSearch } = useChatContext();

// After detecting function call:
if (functionCall && functionCall.type === "search") {
  // Parse query to detect intent
  const parsedQuery = parseNaturalLanguageQuery(userMessage, mlsState.lastQuery);

  // Handle similarity queries
  if (parsedQuery.intent === "similar_listing") {
    const targetIndex = parsedQuery.targetListingIndex ?? 0;
    const actualIndex = targetIndex === -1 ? mlsState.lastListings.length - 1 : targetIndex;
    const targetListing = mlsState.lastListings[actualIndex];

    if (targetListing) {
      const similar = findSimilarListings(
        targetListing,
        mlsState.lastListings, // or all available listings
        10
      );

      // Show results with explanation
      addMessage({
        role: "assistant",
        content: `Here are ${similar.length} homes similar to ${targetListing.address}:`,
        listings: similar,
        context: "general"
      });

      return; // Don't run normal search
    }
  }

  // Handle recommendation queries
  if (parsedQuery.intent === "preference_recommendation") {
    if (mlsState.preferenceModel && Object.keys(mlsState.preferenceModel).length > 0) {
      const sorted = sortByPreference(
        mlsState.lastListings,
        mlsState.preferenceModel,
        mlsState.dismissed
      );

      const summary = describePreferences(mlsState.preferenceModel);

      addMessage({
        role: "assistant",
        content: `Based on your favorites (${summary}), here are my top recommendations:`,
        listings: sorted.slice(0, 10),
        context: "general"
      });

      return;
    }
  }

  // Handle "show me more" with preferences
  if (parsedQuery.intent === "more_results") {
    if (mlsState.preferenceModel && Object.keys(mlsState.preferenceModel).length > 0) {
      const suggestedFilters = applyPreferencesToFilters(
        {},
        mlsState.preferenceModel,
        'suggest'
      );

      const searchResponse = await executeMLSSearch(suggestedFilters);

      if (searchResponse.success && searchResponse.listings.length > 0) {
        const summary = describePreferences(mlsState.preferenceModel);

        addMessage({
          role: "assistant",
          content: `Based on your preferences (${summary}), I found ${searchResponse.listings.length} properties:`,
          listings: searchResponse.listings,
          context: "general"
        });
      }

      return;
    }
  }

  // Continue with normal search flow...
}
```

### 4. Add AI Explanation Messages

**Where**: Throughout IntegratedChatWidget response handlers

**Examples**:

```typescript
// When applying preferences automatically:
const summary = describePreferences(mlsState.preferenceModel);
addMessage({
  role: "assistant",
  content: `Because you've liked homes with ${summary}, I've prioritized similar properties below.`,
  // ...
});

// When filtering dismissed:
if (filteredCount > 0) {
  addMessage({
    role: "assistant",
    content: `I removed ${filteredCount} homes you dismissed earlier.`,
    // ...
  });
}

// When using similarity:
addMessage({
  role: "assistant",
  content: `These homes are most similar to ${targetListing.address} based on price, location, and features.`,
  // ...
});
```

### 5. Update MLSChatResponse Display (Future Enhancement)

**File**: `src/app/components/chat/MLSChatResponse.tsx` (if exists)

Add reasoning badge above listings:
```tsx
{intent === "preference_recommendation" && (
  <div className="mb-4 p-3 bg-purple-100 rounded-lg">
    <p className="text-sm text-purple-800">
      🎯 Personalized recommendations based on your favorites
    </p>
  </div>
)}

{intent === "similar_listing" && (
  <div className="mb-4 p-3 bg-blue-100 rounded-lg">
    <p className="text-sm text-blue-800">
      🔍 Homes similar to {targetListing.address}
    </p>
  </div>
)}
```

---

## Testing Checklist

### Test Case 1: Similarity Search ✅ (Partial)
- [ ] User says "show me more like the first one"
- [ ] NLP detects intent: "similar_listing"
- [ ] NLP extracts targetListingIndex: 0
- [ ] executeMLSSearch() calls findSimilarListings()
- [ ] Returns top 10 most similar homes
- [ ] AI explains what made them similar

### Test Case 2: Recommendations ⏳
- [ ] User favorites 3+ homes
- [ ] User says "what do you recommend"
- [ ] NLP detects intent: "preference_recommendation"
- [ ] executeMLSSearch() calls sortByPreference()
- [ ] Returns listings sorted by relevance score
- [ ] AI explains preference criteria

### Test Case 3: Show Me More ⏳
- [ ] User favorites several homes
- [ ] User says "show me more"
- [ ] NLP detects intent: "more_results"
- [ ] applyPreferencesToFilters() creates suggested filters
- [ ] executeMLSSearch() runs with suggested filters
- [ ] Returns personalized results
- [ ] AI explains what preferences were applied

### Test Case 4: Dismissed Filtering ⏳
- [ ] User dismisses 5 listings
- [ ] User runs new search
- [ ] executeMLSSearch() filters out dismissed listings
- [ ] Results don't include dismissed properties
- [ ] AI mentions how many were filtered

### Test Case 5: Refinement with Preferences ⏳
- [ ] User says "show me cheaper"
- [ ] NLP detects intent: "refinement"
- [ ] Uses avgPrice from preferenceModel as baseline
- [ ] Reduces price by 20%
- [ ] Returns cheaper results
- [ ] AI explains price adjustment

---

## Files Modified (So Far)

### Completed ✅
1. **`src/lib/ai/nlp-to-mls.ts`**
   - Added `intent`, `targetListingIndex`, `similarityMode` to ParsedMLSQuery
   - Created `PREFERENCE_INTENT_KEYWORDS` constant
   - Implemented `detectPreferenceIntent()` function
   - Updated `parseNaturalLanguageQuery()` to detect intents

2. **`src/lib/ai/preference-engine.ts`** (from Part 1)
   - Complete preference utility library

3. **`src/app/components/chat/ChatProvider.tsx`** (from Part 1)
   - PreferenceModel infrastructure
   - extractPreferences() function
   - Auto-updating addFavorite/removeFavorite

### Pending ⏳
1. **`src/lib/ai-functions.ts`**
   - Update executeMLSSearch() to apply preference filtering
   - Update executeMLSSearch() to handle similarity queries
   - Update executeMLSSearch() to handle recommendation queries

2. **`src/app/components/chatwidget/IntegratedChatWidget.tsx`**
   - Handle similarity queries
   - Handle recommendation queries
   - Handle "show me more" with preferences
   - Add AI explanation messages

---

## Current Completion: 50%

**What's Done**:
- ✅ NLP intent detection (similarity, recommendations, more results)
- ✅ Preference model extraction and persistence
- ✅ Preference engine utility functions
- ✅ Index detection (first, second, third, etc.)
- ✅ Similarity mode detection (exact, flexible, budget)

**What's Left**:
- ⏳ Wire executeMLSSearch() to preference engine
- ⏳ Handle preference queries in IntegratedChatWidget
- ⏳ Add AI explanation messages
- ⏳ Test all scenarios
- ⏳ Polish UI feedback

---

## Next Immediate Steps

1. **Update executeMLSSearch()** in `ai-functions.ts`
   - Accept mlsState parameter
   - Filter dismissed listings
   - Handle similarity queries
   - Handle recommendation queries
   - Handle "show me more" with preferences

2. **Wire IntegratedChatWidget** to handle preference queries
   - Import preference engine functions
   - Detect intent from parsed query
   - Route to appropriate handler
   - Add explanation messages

3. **Test end-to-end** flows
   - Similarity search
   - Recommendations
   - "Show me more"
   - Dismissed filtering

Once these steps are complete, Phase 4 Deliverable #6 (Part 2) will be 100% functional.

---

## Summary

The AI now has the **intelligence to understand** preference-based queries thanks to the enhanced NLP parser. The next step is to **wire that intelligence** into the actual search execution and chat UI so users can experience the full power of the preference engine.

The foundation is solid. The final wiring will bring it all together! 🚀
