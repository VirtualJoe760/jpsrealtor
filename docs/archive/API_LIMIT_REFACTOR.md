# API Limit Refactoring - December 2024

## Problem Statement

Previously, the chat tool executor (`tool-executors.ts`) was forcing API limits for general city queries:

```typescript
// OLD APPROACH - BAD
if (isGeneralCityQuery && stats && stats.totalListings > 50) {
  filters.limit = 60;  // ❌ Coupling chat-specific logic into tool executor
  filters.sort = 'newest';
}
```

### Issues with Old Approach

1. **Poor Separation of Concerns**: Chat-specific display logic mixed with API tool execution
2. **API Inflexibility**: Other components using the same APIs get artificial limits
3. **Confusing Metrics**: `displayedListings` vs `totalListings` created confusion
4. **Inefficient for Different Views**: Map needs more listings, cards need fewer

## New Architecture

### Principle: APIs Stay Dumb, Components Stay Smart

**APIs should:**
- Accept optional `limit` and `page` parameters
- Return accurate stats from FULL dataset (not limited results)
- Provide metadata like `newListingsCount` calculated from total
- Set reasonable defaults to prevent accidental large queries

**Frontend components should:**
- Decide their own display limits based on use case
- Add `?limit=X` to API calls as needed
- Handle pagination if needed

### Implementation Plan

#### 1. Remove Auto-Limiting from Tool Executor

**File**: `src/lib/chat-v2/tool-executors.ts`

Remove this logic:
```typescript
// DELETE THIS
if (isGeneralCityQuery && stats && stats.totalListings > 50) {
  filters.limit = 60;
  filters.sort = 'newest';
}
```

Keep the detection but only for metadata:
```typescript
// KEEP THIS
const isGeneralCityQuery = entityResult.type === 'city' && !hasAnyFilters;

metadata: {
  isGeneralCityQuery,  // AI can use this to suggest filters
}
```

#### 2. Update API Response Schema

**Files**:
- `src/app/api/cities/[cityId]/listings/route.ts`
- `src/app/api/subdivisions/[slug]/listings/route.ts`

Remove `displayedListings`, keep clean stats:

```typescript
// AFTER
stats: {
  totalListings: total,              // Total matching query
  newListingsCount: X,               // Count from past 7 days (calculated from ALL)
  newListingsPct: Y,                 // Percentage of total that are new
  avgPrice: priceStats.avgPrice,     // From ALL listings
  medianPrice: priceStats.medianPrice,
  ...
}
```

#### 3. Set Reasonable Default Limits in APIs

**Files**: Same as above

```typescript
// At top of GET handler
const limit = parseInt(searchParams.get("limit") || "100");  // Default 100
const page = parseInt(searchParams.get("page") || "1");
```

This prevents accidents while allowing override:
- Chat: `?limit=60` (show fewer)
- Map: `?limit=200` (show more for clustering)
- No limit specified: 100 (reasonable default)

#### 4. Frontend Components Add Explicit Limits

**File**: `src/app/components/chat/ChatResultsContainer.tsx`

Update the API URL building to add limit:

```typescript
// For chat, we only want ~60 listings for performance
if (f.limit) {
  params.append('limit', f.limit.toString());
} else {
  params.append('limit', '60');  // Chat default
}
```

The chat will pass `filters.limit` or default to 60 for display.

#### 5. Update AI System Prompt

**File**: `src/lib/chat-v2/system-prompt.ts`

Update general city query instructions:

**BEFORE**:
```
I'm showing you the **newest 60 listings** in Beverly Hills.
There are **278 total homes** on the market.
```

**AFTER**:
```
There are **278 homes** on the market in Beverly Hills, including **12 new listings**
from the past week. I'm showing you a selection to get started.

**To narrow your search, try:**
• Budget: 'homes under $1M'
• Features: '3 bed 2 bath with pool'
```

Remove metadata.displayLimit references.

## Benefits of New Architecture

1. **Separation of Concerns**: APIs are reusable across all components
2. **Frontend Control**: Each component decides what it needs
3. **Accurate Stats**: Always calculated from full dataset
4. **Better Performance**: Components request exactly what they need
5. **Cleaner Code**: No chat-specific logic bleeding into APIs

## Migration Checklist

- [ ] Remove auto-limit from tool-executors.ts
- [ ] Remove displayedListings from cities API
- [ ] Remove displayedListings from subdivisions API
- [ ] Set default limit=100 in both APIs
- [ ] Update ChatResultsContainer to add ?limit=60
- [ ] Update system-prompt.ts
- [ ] Test general city queries (Beverly Hills)
- [ ] Verify map view still works
- [ ] Commit changes

## Example API Calls After Refactor

### Chat Component
```
GET /api/cities/beverly-hills/listings?limit=60&sort=newest
```

### Map Component
```
GET /api/cities/beverly-hills/listings?limit=200
```

### Neighborhood Page
```
GET /api/subdivisions/pga-west/listings?limit=100&page=1
```

All get accurate stats, each controls their own display.
