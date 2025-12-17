# AI-Driven Swipe Queue Implementation Plan

**Rollback Commit**: `7e340054` - ChatWidget: Fix map queries to always show map view
**Date**: December 16, 2025
**Status**: Planning Phase

---

## Executive Summary

Rebuild the swipe queue system to work across **two contexts**:
1. **Map View** (existing): Location-based, subdivision-aware, 7-tier proximity scoring
2. **AI Chat View** (new): Query-based, AI-curated results, conversational follow-up

**Key Goal**: Enable AI to recommend listings based on natural language queries, allow users to swipe through results, and build comprehensive preference data for personalization.

---

## Current System Analysis

### What Works Well (KEEP)
✅ **7-Tier Proximity Scoring** - Excellent subdivision-aware prioritization
✅ **Price Bracket Compatibility** - Smart matching for similar price ranges
✅ **Street-Based Micro-Neighborhoods** - For non-HOA properties
✅ **TTL for Dislikes** - 30-minute expiration prevents permanent blocks
✅ **Anonymous ID Tracking** - Pre-login user behavior capture
✅ **Hybrid Storage** - localStorage + MongoDB sync
✅ **Analytics Auto-Calculation** - Subdivisions, cities, property types, engagement
✅ **FavoritesPannel** - Excellent sidebar with subdivision grouping

### What Needs Enhancement (IMPROVE)
⚠️ **Single Context** - Currently map-only, needs AI chat integration
⚠️ **No Completion Modal** - Users don't know when queue is finished
⚠️ **Limited Analytics** - Need more granular preference tracking
⚠️ **No Query Context** - Swipes not linked to search intent
⚠️ **Manual Initialization** - Requires clicking on map, not AI-triggered

---

## New Feature Requirements

### 1. AI Chat Integration

**User Flow**:
```
User: "Show me homes in Palm Desert Country Club with a pool, 3+ beds"
  ↓
AI: Queries database → Finds 47 matching listings
  ↓
AI Response: "I found 47 homes matching your criteria in Palm Desert Country Club.
             Here are the top results [LISTING_CAROUSEL component]
             Would you like to swipe through all of them?"
  ↓
User: Clicks "View Details" on any listing OR says "Yes, let me swipe"
  ↓
ListingBottomPanel spawns with swipe queue initialized from AI results
  ↓
User swipes through all 47 listings
  ↓
Completion Modal: "You've finished reviewing all properties!
                   • You liked 5 homes
                   • You passed on 42 homes
                   What would you like to do next?"
                   [Search for More] [Review Favorites]
  ↓
User choice:
  - "Review Favorites" → Navigate to /dashboard
  - "Search for More" → Stay in chat, continue conversation
```

### 2. Enhanced User Model

**New Fields to Add**:
```typescript
// Existing fields (keep)
likedListings: Array<{
  listingKey: string;
  listingData: Record<string, any>;
  swipedAt: Date;
  subdivision?: string;
  city?: string;
  propertySubType?: string;
}>

// NEW: Add query context
likedListings: Array<{
  listingKey: string;
  listingData: Record<string, any>;
  swipedAt: Date;
  subdivision?: string;
  city?: string;
  county?: string;              // NEW: For county-level analytics
  propertySubType?: string;

  // NEW: Query context tracking
  sourceContext?: {
    type: 'map' | 'ai_chat';    // Where did this swipe come from?
    query?: string;             // Original AI query (if from chat)
    queueId?: string;           // Link to specific swipe session
    userIntent?: string;        // Parsed intent (e.g., "investment", "family home")
  };

  // NEW: Engagement tracking
  viewDuration?: number;        // How long did they view this listing?
  detailsViewed?: boolean;      // Did they click "View Full Details"?
  photosViewed?: number;        // How many photos did they look at?
}>

// NEW: Query history (for AI personalization)
searchHistory?: Array<{
  query: string;
  timestamp: Date;
  resultsCount: number;
  swipedCount: number;
  likedCount: number;
  filters: Record<string, any>;  // Applied filters (beds, baths, price, etc.)
}>

// NEW: Preference patterns (auto-calculated)
preferencePatterns?: {
  favoriteSubdivisions: Array<{ name: string; county: string; count: number }>;
  favoriteCities: Array<{ name: string; county: string; count: number }>;
  favoriteCounties: Array<{ name: string; count: number }>;
  favoritePropertyTypes: Array<{ type: string; count: number }>;

  priceRange: { min: number; max: number; avg: number };
  bedroomRange: { min: number; max: number; avg: number };
  bathroomRange: { min: number; max: number; avg: number };
  sqftRange: { min: number; max: number; avg: number };

  preferredAmenities: Array<{ name: string; count: number }>;  // pool, spa, garage, etc.
  preferredFeatures: Array<{ name: string; count: number }>;   // view, waterfront, gated

  lastUpdated: Date;
}
```

### 3. Swipe Queue Variants

**Map View Queue** (Keep existing logic):
- 5-mile radius around clicked listing
- 7-tier proximity scoring
- Same property type filter
- Same city filter
- Subdivision-aware prioritization

**AI Chat Queue** (New):
- Results from AI query (no radius limit)
- User's query context preserved
- Sort by AI relevance score OR apply 7-tier scoring if location-based
- Can span multiple cities/subdivisions
- Track which query generated the queue

---

## Implementation Plan

### Phase 1: User Model Enhancement (Days 1-2)

**Files to Modify**:
- `src/models/User.ts` - Add new schema fields
- `src/app/api/swipes/batch/route.ts` - Update analytics calculation

**Tasks**:
1. ✅ Add `county` field to `likedListings` and `dislikedListings`
2. ✅ Add `sourceContext` object to track swipe origin
3. ✅ Add `searchHistory` array for query tracking
4. ✅ Add `preferencePatterns` object for auto-calculated insights
5. ✅ Create migration script to backfill existing data
6. ✅ Update analytics calculation to include county grouping
7. ✅ Add tests for new schema fields

**Database Migration**:
```javascript
// scripts/migrations/add-swipe-context.js
// Backfill county data from existing city/subdivision references
// Set sourceContext.type = 'map' for all existing swipes
// Initialize preferencePatterns from current analytics
```

---

### Phase 2: Swipe Queue Abstraction (Days 3-4)

**New Files to Create**:
- `src/app/utils/swipe/SwipeQueueManager.ts` - Universal queue manager
- `src/app/utils/swipe/MapQueueStrategy.ts` - Map-specific queue logic
- `src/app/utils/swipe/AIChatQueueStrategy.ts` - AI chat-specific queue logic
- `src/app/utils/swipe/types.ts` - Shared types

**Strategy Pattern Design**:
```typescript
// SwipeQueueManager.ts
interface QueueStrategy {
  buildQueue(params: any): Promise<MapListing[]>;
  scoreListings(listings: MapListing[]): MapListing[];
  getNextListing(): MapListing | null;
  onSwipe(listing: MapListing, direction: 'left' | 'right'): void;
}

class SwipeQueueManager {
  private strategy: QueueStrategy;
  private queue: MapListing[];
  private currentIndex: number;
  private context: QueueContext;

  constructor(strategy: QueueStrategy, context: QueueContext) {
    this.strategy = strategy;
    this.context = context;
  }

  async initialize(params: any) {
    const listings = await this.strategy.buildQueue(params);
    this.queue = this.strategy.scoreListings(listings);
    this.currentIndex = 0;
  }

  getNext(): MapListing | null {
    if (this.currentIndex >= this.queue.length) return null;
    return this.queue[this.currentIndex];
  }

  swipeLeft(listing: MapListing) {
    this.strategy.onSwipe(listing, 'left');
    this.currentIndex++;
  }

  swipeRight(listing: MapListing) {
    this.strategy.onSwipe(listing, 'right');
    this.currentIndex++;
  }

  isComplete(): boolean {
    return this.currentIndex >= this.queue.length;
  }

  getProgress(): { current: number; total: number; percent: number } {
    return {
      current: this.currentIndex,
      total: this.queue.length,
      percent: Math.round((this.currentIndex / this.queue.length) * 100)
    };
  }
}
```

**Migration Path**:
1. Extract current `useSwipeQueue.ts` logic into `MapQueueStrategy.ts`
2. Keep `useSwipeQueue.ts` as a React hook wrapper
3. Use `SwipeQueueManager` internally
4. Maintain backward compatibility

---

### Phase 3: AI Chat Queue Integration (Days 5-7)

**Files to Modify**:
- `src/lib/chat/tool-executor.ts` - Add swipe session creation
- `src/app/components/chat/ChatWidget.tsx` - Add swipe trigger
- `src/app/components/chat/ListingCarousel.tsx` - Add swipe CTA

**New Components**:
- `src/app/components/chat/SwipeSessionTrigger.tsx` - Button to start swiping
- `src/app/components/chat/CompletionModal.tsx` - Post-swipe completion dialog

**AI Tool Enhancement**:
```typescript
// Add to tool-executor.ts
{
  name: "createSwipeSession",
  description: "Create a swipe session from query results for user to review",
  parameters: {
    query: { type: "string", description: "Original user query" },
    listings: { type: "array", description: "Array of listing objects to include" },
    userIntent: { type: "string", description: "Parsed user intent (optional)" }
  },
  execute: async ({ query, listings, userIntent }) => {
    // Create swipe session in database
    const sessionId = await createSwipeSession({
      userId: session?.user?.id || anonymousId,
      query,
      listings,
      userIntent,
      createdAt: new Date()
    });

    // Return component data for chat UI
    return {
      type: "swipe_session",
      sessionId,
      totalCount: listings.length,
      query,
      message: `I found ${listings.length} homes matching your criteria. Would you like to swipe through them?`
    };
  }
}
```

**Chat UI Flow**:
```typescript
// In ChatWidget.tsx
{message.componentData?.type === 'swipe_session' && (
  <SwipeSessionTrigger
    sessionId={message.componentData.sessionId}
    totalCount={message.componentData.totalCount}
    query={message.componentData.query}
    onStart={() => {
      // Open ListingBottomPanel with AI queue
      const session = loadSwipeSession(message.componentData.sessionId);
      initializeAIQueue(session.listings, session.query);
      showListingPanel(session.listings[0]);
    }}
  />
)}
```

---

### Phase 4: Completion Modal (Days 8-9)

**New Component**: `src/app/components/mls/map/CompletionModal.tsx`

**Features**:
- Shows swipe summary (liked, disliked, total)
- Displays top liked subdivisions/cities
- Two primary actions:
  - "Search for More" → Returns to chat/map
  - "Review Favorites" → Navigate to /dashboard
- Secondary actions:
  - "Share Favorites" → Generate shareable link
  - "Get Agent Help" → Contact form pre-filled

**Trigger Logic**:
```typescript
// In ListingBottomPanel.tsx or SwipeableListingStack.tsx
useEffect(() => {
  if (queueManager.isComplete()) {
    const summary = {
      totalSwiped: queueManager.getProgress().total,
      liked: likedCount,
      disliked: dislikedCount,
      topSubdivisions: getTopSubdivisions(likedListings),
      topCities: getTopCities(likedListings),
      sourceContext: queueManager.context
    };

    showCompletionModal(summary);
  }
}, [currentIndex, queue.length]);
```

**Modal Design** (Figma reference needed):
```
┌─────────────────────────────────────────┐
│  🎉 Great Job!                          │
│                                         │
│  You reviewed 47 properties             │
│  ❤️  5 Favorites                        │
│  👋 42 Passed                           │
│                                         │
│  Your top picks:                        │
│  • Palm Desert Country Club (3 homes)  │
│  • Indian Wells (2 homes)              │
│                                         │
│  ┌─────────────┐  ┌──────────────┐    │
│  │ Search More │  │ View Favorites│    │
│  └─────────────┘  └──────────────┘    │
│                                         │
│  Share with Agent  •  Save Search      │
└─────────────────────────────────────────┘
```

---

### Phase 5: Dashboard Enhancements (Days 10-11)

**Files to Modify**:
- `src/app/dashboard/page.tsx` - Add county filters, expanded analytics

**New Features**:

1. **Favorites Filtering**:
   - Filter by county (Riverside, Orange, Los Angeles, etc.)
   - Filter by city
   - Filter by subdivision
   - Filter by property type
   - Combined filters (e.g., "Your favorites in Indian Wells Country Club")

2. **Insights Panel**:
   - Average price of favorites
   - Average bedrooms/bathrooms
   - Most common amenities in favorites
   - Price range chart
   - Map view of all favorites

3. **Smart Collections** (Auto-generated):
   - "Your Coachella Valley Favorites" (geo-based)
   - "Your Luxury Picks" (price > $2M)
   - "Your Family Homes" (4+ beds, good schools)
   - "Your Investment Opportunities" (price below market avg)

---

### Phase 6: Analytics & Tracking (Days 12-13)

**New API Endpoints**:

```typescript
// GET /api/analytics/preferences
// Returns comprehensive preference analysis
{
  favoriteLocations: {
    counties: [{ name, count, avgPrice }],
    cities: [{ name, county, count, avgPrice }],
    subdivisions: [{ name, city, county, count, avgPrice }]
  },

  propertyPreferences: {
    priceRange: { min, max, avg, median },
    bedroomRange: { min, max, avg, mode },
    bathroomRange: { min, max, avg, mode },
    sqftRange: { min, max, avg, median },
    yearBuiltRange: { min, max, avg, median }
  },

  amenityPreferences: [
    { name: "Pool", frequency: 0.8 },
    { name: "Spa", frequency: 0.6 },
    { name: "Mountain View", frequency: 0.4 }
  ],

  searchPatterns: {
    topQueries: [{ query, count, lastUsed }],
    commonFilters: { beds: 3, baths: 2, hasPool: true },
    searchFrequency: "2.3 searches/week"
  },

  engagementMetrics: {
    totalSwipes: 234,
    likeRate: 0.12,  // 12% like rate
    avgViewDuration: 23.5,  // seconds
    favoriteGrowthRate: "+15% this month"
  }
}

// POST /api/analytics/track-view
// Track detailed engagement per listing
{
  listingKey: string,
  viewDuration: number,
  photosViewed: number,
  detailsViewed: boolean,
  documentsOpened: string[],
  timestamp: Date
}

// GET /api/favorites/by-location
// Query params: county, city, subdivision, propertyType
{
  favorites: MapListing[],
  count: number,
  analytics: {...}
}
```

---

### Phase 7: Testing & Refinement (Days 14-15)

**Test Scenarios**:

1. **Map View Flow** (existing):
   - Click listing on map
   - Swipe through queue
   - Verify 7-tier scoring still works
   - Check completion modal appears
   - Test "Review Favorites" navigation

2. **AI Chat Flow** (new):
   - Ask for properties with specific criteria
   - Click "View Details" from carousel
   - Swipe through AI-curated queue
   - Verify query context is saved
   - Check completion modal appears
   - Test "Search for More" stays in chat

3. **Anonymous User Flow**:
   - Swipe without login
   - Check localStorage persistence
   - Log in
   - Verify swipes synced to account

4. **Dashboard Flow**:
   - Navigate to /dashboard
   - Apply county filter
   - Apply subdivision filter
   - Check combined filters work
   - Verify analytics are correct

5. **Edge Cases**:
   - Empty queue (no results)
   - Single listing queue
   - Very large queue (500+ listings)
   - Network interruption during swipe
   - Duplicate listing handling

---

## Data Migration Strategy

### Backfill Existing Data

**Script**: `scripts/migrations/backfill-swipe-context.js`

```javascript
// 1. Add county to all existing likedListings
db.users.find({ "likedListings.0": { $exists: true } }).forEach(user => {
  user.likedListings.forEach(liked => {
    if (!liked.county && liked.city) {
      // Lookup county from city
      const cityDoc = db.cities.findOne({ name: liked.city });
      if (cityDoc && cityDoc.county) {
        liked.county = cityDoc.county;
      }
    }

    // Set default sourceContext for existing swipes
    if (!liked.sourceContext) {
      liked.sourceContext = {
        type: 'map',
        queueId: null,
        query: null,
        userIntent: null
      };
    }
  });

  db.users.updateOne({ _id: user._id }, { $set: { likedListings: user.likedListings } });
});

// 2. Initialize preferencePatterns from existing analytics
db.users.find({ "swipeAnalytics": { $exists: true } }).forEach(user => {
  const patterns = calculatePreferencePatterns(user.likedListings);
  db.users.updateOne({ _id: user._id }, { $set: { preferencePatterns: patterns } });
});
```

---

## Performance Considerations

### Database Indexes

```javascript
// Add indexes for new query patterns
db.users.createIndex({ "likedListings.county": 1 });
db.users.createIndex({ "likedListings.subdivision": 1 });
db.users.createIndex({ "likedListings.sourceContext.type": 1 });
db.users.createIndex({ "searchHistory.timestamp": -1 });

// Compound indexes for common filter combinations
db.users.createIndex({
  "likedListings.county": 1,
  "likedListings.city": 1
});
db.users.createIndex({
  "likedListings.county": 1,
  "likedListings.subdivision": 1
});
```

### Caching Strategy

```typescript
// Cache user preferences in Redis
const cacheKey = `user:${userId}:preferences`;
const ttl = 3600; // 1 hour

// On swipe: Invalidate cache
await redis.del(cacheKey);

// On preference fetch: Check cache first
let preferences = await redis.get(cacheKey);
if (!preferences) {
  preferences = await calculatePreferences(userId);
  await redis.setex(cacheKey, ttl, JSON.stringify(preferences));
}
```

---

## UI/UX Enhancements

### Swipe Session Progress Indicator

Add to `ListingBottomPanel.tsx`:
```typescript
<div className="swipe-progress">
  <div className="progress-bar" style={{ width: `${progress.percent}%` }} />
  <span>{progress.current} / {progress.total}</span>
</div>
```

### Quick Filters in Dashboard

Add to `dashboard/page.tsx`:
```typescript
<div className="filter-chips">
  <button onClick={() => filterByCounty('Riverside')}>
    Riverside County ({riversideCount})
  </button>
  <button onClick={() => filterByCity('Palm Desert')}>
    Palm Desert ({palmDesertCount})
  </button>
  <button onClick={() => filterBySubdivision('Indian Wells Country Club')}>
    Indian Wells CC ({indianWellsCount})
  </button>
</div>
```

---

## API Changes Summary

### New Endpoints
- `POST /api/swipe-sessions` - Create AI swipe session
- `GET /api/swipe-sessions/:id` - Load session details
- `GET /api/analytics/preferences` - User preference analysis
- `POST /api/analytics/track-view` - Track engagement
- `GET /api/favorites/by-location` - Filter favorites by location

### Modified Endpoints
- `POST /api/swipes/batch` - Add county, sourceContext tracking
- `GET /api/user/favorites` - Add filter params (county, city, subdivision)

---

## File Changes Summary

### New Files (13)
1. `docs/AI_SWIPE_QUEUE_IMPLEMENTATION_PLAN.md` ← This file
2. `src/app/utils/swipe/SwipeQueueManager.ts`
3. `src/app/utils/swipe/MapQueueStrategy.ts`
4. `src/app/utils/swipe/AIChatQueueStrategy.ts`
5. `src/app/utils/swipe/types.ts`
6. `src/app/components/chat/SwipeSessionTrigger.tsx`
7. `src/app/components/chat/CompletionModal.tsx`
8. `src/app/api/swipe-sessions/route.ts`
9. `src/app/api/swipe-sessions/[id]/route.ts`
10. `src/app/api/analytics/preferences/route.ts`
11. `src/app/api/analytics/track-view/route.ts`
12. `src/app/api/favorites/by-location/route.ts`
13. `scripts/migrations/backfill-swipe-context.js`

### Modified Files (9)
1. `src/models/User.ts` - Add county, sourceContext, searchHistory, preferencePatterns
2. `src/app/api/swipes/batch/route.ts` - Update analytics calculation
3. `src/app/utils/map/useSwipeQueue.ts` - Refactor to use SwipeQueueManager
4. `src/lib/chat/tool-executor.ts` - Add createSwipeSession tool
5. `src/app/components/chat/ChatWidget.tsx` - Add swipe session trigger
6. `src/app/components/chat/ListingCarousel.tsx` - Add swipe CTA
7. `src/app/components/mls/map/ListingBottomPanel.tsx` - Add completion modal trigger
8. `src/app/dashboard/page.tsx` - Add county filters, enhanced analytics
9. `src/app/components/mls/map/FavoritesPannel.tsx` - Add location grouping

---

## Timeline

| Phase | Days | Deliverable |
|-------|------|-------------|
| Phase 1: User Model | 2 | Enhanced schema + migration |
| Phase 2: Queue Manager | 2 | Strategy pattern implementation |
| Phase 3: AI Integration | 3 | Chat swipe sessions working |
| Phase 4: Completion Modal | 2 | Post-swipe flow complete |
| Phase 5: Dashboard | 2 | Location filters + analytics |
| Phase 6: Analytics | 2 | Tracking + preference API |
| Phase 7: Testing | 2 | All scenarios validated |
| **Total** | **15 days** | **Full system operational** |

---

## Success Metrics

### User Engagement
- Swipe completion rate > 60%
- Like rate between 10-20%
- Average session duration > 5 minutes
- Return visit rate > 40% within 7 days

### System Performance
- Queue initialization < 500ms
- Swipe persistence < 100ms
- Dashboard filter response < 200ms
- Analytics calculation < 1s

### Data Quality
- 100% of swipes have county data
- 100% of swipes have sourceContext
- 95% of queries have parsed intent
- 0 duplicate favorites per user

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration fails | High | Thorough testing on staging, backup before migration |
| Performance degrades with large queues | Medium | Implement pagination (50 at a time), lazy loading |
| Anonymous user sync conflicts | Medium | Use queue-based sync, conflict resolution logic |
| AI query parsing errors | Low | Fallback to basic filters, log errors for improvement |
| Cache invalidation bugs | Low | Conservative TTL, manual invalidation on writes |

---

## Next Steps

**Immediate Actions**:
1. ✅ Review this plan with stakeholders
2. ✅ Get design mockups for CompletionModal
3. ✅ Set up staging environment for testing
4. ✅ Create feature branch: `feature/ai-swipe-queue`
5. ✅ Begin Phase 1: User Model Enhancement

**Questions to Resolve**:
- Should we limit AI queue size (e.g., max 100 listings)?
- Do we want to track negative signals (e.g., "skipped without viewing")?
- Should completion modal auto-appear or require manual trigger?
- Do we need A/B testing for different queue orderings?

---

## Rollback Plan

If issues arise:
```bash
# Revert to pre-implementation commit
git reset --hard 7e340054

# Restore database from backup
mongorestore --db jpsrealtor backup/pre-swipe-enhancement/

# Clear Redis cache
redis-cli FLUSHDB

# Restart services
npm run dev
```

---

**Document Owner**: Claude AI Assistant
**Last Updated**: December 16, 2025
**Status**: Ready for Implementation
