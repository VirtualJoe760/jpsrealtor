# Context-Aware Clustering Implementation

**Date:** December 4, 2025
**Status:** Phase 1 API Complete, Frontend Updates Needed

## Changes Completed

### ✅ `/api/map-clusters/route.ts`

Added intent-aware clustering that respects AI context:

```typescript
// Lines 11-18: Added interface
interface MapRequestContext {
  source?: 'ai' | 'manual' | 'initial';
  intent?: 'explore' | 'specific_location' | 'filtered_search';
  expectedListingCount?: number;
  locationName?: string;
  locationType?: 'subdivision' | 'city' | 'county' | 'custom';
}

// Lines 32-95: Added smart clustering function
function determineClusteringStrategy(
  zoom: number,
  context: MapRequestContext,
  actualListingCount: number
): boolean {
  // Rule 1: AI-driven specific location searches
  if (context.source === 'ai' && context.intent === 'specific_location') {
    if (actualListingCount <= 150) return false; // Show listings
    if (actualListingCount > 150) return true;   // Cluster due to density
  }

  // Rule 2: Filtered searches
  if (context.source === 'ai' && context.intent === 'filtered_search') {
    if (actualListingCount <= 200) return false; // Show listings
  }

  // Rule 3: Manual exploration
  if (context.source === 'manual') {
    return zoom < 13; // Traditional zoom-based
  }

  // Rule 4: Initial page load
  if (context.source === 'initial') {
    return true; // Always cluster
  }

  // Default: zoom-based
  return zoom < 13;
}

// Lines 188-196: Parse context from query params
const context: MapRequestContext = {
  source: (query.get('source') as 'ai' | 'manual' | 'initial') || 'manual',
  intent: (query.get('intent') as 'explore' | 'specific_location' | 'filtered_search') || 'explore',
  expectedListingCount: parseInt(query.get('expectedCount') || '0'),
  locationName: query.get('locationName') || undefined,
  locationType: (query.get('locationType') as 'subdivision' | 'city' | 'county' | 'custom') || undefined
};

// Lines 198-203: Use smart clustering
const listingCount = await UnifiedListing.countDocuments(matchStage);
const returnClusters = determineClusteringStrategy(zoom, context, listingCount);

// Added context to responses for debugging
```

## Changes Needed

### 🔧 `src/app/utils/map/useMapClusters.ts`

**Add after line 28:**
```typescript
// AI Context for intent-aware clustering
export interface MapRequestContext {
  source?: 'ai' | 'manual' | 'initial';
  intent?: 'explore' | 'specific_location' | 'filtered_search';
  expectedListingCount?: number;
  locationName?: string;
  locationType?: 'subdivision' | 'city' | 'county' | 'custom';
}
```

**Change line 34:**
```typescript
// FROM:
fetchClusters: (bounds: MapBounds, filters: Filters) => Promise<void>;

// TO:
fetchClusters: (bounds: MapBounds, filters: Filters, context?: MapRequestContext) => Promise<void>;
```

**Change line 53:**
```typescript
// FROM:
const fetchClusters = useCallback(async (bounds: MapBounds, filters: Filters) => {

// TO:
const fetchClusters = useCallback(async (bounds: MapBounds, filters: Filters, context?: MapRequestContext) => {
```

**Add after line 87 (after mlsSource filter):**
```typescript
      // Add context parameters for AI-driven clustering
      if (context) {
        if (context.source) params.append('source', context.source);
        if (context.intent) params.append('intent', context.intent);
        if (context.expectedListingCount) params.append('expectedCount', String(context.expectedListingCount));
        if (context.locationName) params.append('locationName', context.locationName);
        if (context.locationType) params.append('locationType', context.locationType);
      }
```

**Add after line 91 (after console.log of apiUrl):**
```typescript
      if (context) {
        console.log('🤖 AI Context:', context);
      }
```

**Add after line 104 (after first console.log in response handler):**
```typescript
      if (data.context) {
        console.log('🎯 Server clustering decision:', data.context);
      }
```

## Testing the Current Implementation

You can test the API directly with curl:

### Test 1: Manual Exploration (Default)
```bash
curl "http://localhost:3000/api/map-clusters?north=33.75&south=33.70&east=-116.30&west=-116.40&zoom=14&source=manual"
```
Expected: Returns clusters (zoom 14 < 13 threshold)

### Test 2: AI Specific Location (23 listings)
```bash
curl "http://localhost:3000/api/map-clusters?north=33.75&south=33.73&east=-116.35&west=-116.37&zoom=14&source=ai&intent=specific_location&expectedCount=23&locationName=Palm%20Desert%20Country%20Club&locationType=subdivision"
```
Expected: Returns individual listings (23 <= 150 threshold)

### Test 3: AI Specific Location (500 listings)
```bash
curl "http://localhost:3000/api/map-clusters?north=33.8&south=33.6&east=-116.2&west=-116.5&zoom=14&source=ai&intent=specific_location&expectedCount=500&locationName=Palm%20Desert&locationType=city"
```
Expected: Returns clusters (500 > 150 threshold)

### Test 4: Initial Page Load
```bash
curl "http://localhost:3000/api/map-clusters?north=34.0&south=33.0&east=-116.0&west=-117.0&zoom=10&source=initial"
```
Expected: Returns clusters (initial always clusters)

## Next Steps

1. ✅ Complete `useMapClusters.ts` updates (manual edits above)
2. Update `MLSProvider.tsx` to pass context from URL params
3. Update `/map` page to accept context from URL
4. Update AI chat to generate map URLs with context
5. Test full flow: Chat → "View on Map" → Listings appear immediately

## Expected User Experience

### Before (Manual Exploration):
1. User opens /map → clusters at zoom 8-12
2. User zooms to 13+ → individual listings

### After (AI-Driven):
1. User: "Show me homes in Palm Desert Country Club"
2. AI: "I found 23 homes..." [View on Map button]
3. User clicks → Map opens at zoom 14 with 23 individual listings immediately
4. No clusters blocking the view
5. User: "Show me 4 bedroom homes under $800k"
6. Map re-filters to 12 listings → still shows listings (no clusters)

## Benefits

- **AI intent respected**: When AI directs to specific location, users see listings immediately
- **Manual exploration preserved**: Traditional zoom-based clustering still works
- **Performance optimized**: Eliminated duplicate count queries
- **Debugging enabled**: Context logged and returned in responses
- **Backward compatible**: Existing map usage works unchanged (defaults to 'manual' source)
