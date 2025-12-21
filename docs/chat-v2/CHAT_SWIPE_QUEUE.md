# Chat Swipe Queue Implementation

## Overview

Implemented a neighborhood-based swipe queue system for chat view that allows users to swipe through all listings in a neighborhood (subdivision or city) when they click "View Details" on any listing from a neighborhood search.

**Implementation Date:** December 19, 2025

---

## Key Features

1. **Neighborhood-Based Queue**: When users view listings from a neighborhood query (e.g., "show me homes in PDCC"), the swipe queue includes ALL listings in that neighborhood, not just those visible in the carousel/list
2. **End-of-Queue Modal**: Beautiful modal appears when users finish swiping through all listings, offering options to:
   - View their favorites
   - Continue chatting
   - Search another area
3. **Strategy Pattern**: Uses ChatQueueStrategy separate from MapQueueStrategy to keep map and chat queues independent
4. **Theme Support**: Full light/dark theme support for the modal

---

## Architecture

### Components Created

#### 1. **ChatQueueStrategy** (`src/app/utils/swipe/ChatQueueStrategy.ts`)
- Implements `QueueStrategy` interface
- Fetches all listings in a neighborhood (subdivision or city)
- Supports filters (price, beds, baths, pool)
- Sorts listings by price (highest first)
- Extracts neighborhood metadata from query parameter or reference listing

**Key Methods:**
- `initializeQueue(context)`: Fetches neighborhood listings and creates queue
- `getName()`: Returns "ChatQueue"

#### 2. **EndOfQueueModal** (`src/app/components/chat/EndOfQueueModal.tsx`)
- Animated modal using Framer Motion
- Shows when queue is exhausted
- Displays stats (total swiped, total liked)
- Three action buttons:
  - View Favorites (primary if user has favorites)
  - Continue Chatting
  - Search Another Area

**Props:**
```typescript
interface EndOfQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFavorites: () => void;
  onContinueChat: () => void;
  neighborhoodName?: string;
  totalSwiped?: number;
  totalLiked?: number;
}
```

#### 3. **ChatResultsContainer Integration** (`src/app/components/chat/ChatResultsContainer.tsx`)
**Changes:**
- Imports `useSwipeQueue`, `ChatQueueStrategy`, and `EndOfQueueModal`
- Initializes swipe queue with ChatQueueStrategy
- Wraps `onOpenListingPanel` with `handleOpenListingPanelWithQueue`
- Passes neighborhood metadata via JSON-encoded query parameter
- Tracks queue state (swiped count, liked count)
- Shows end-of-queue modal when exhausted

**New State:**
```typescript
const swipeQueue = useSwipeQueue(new ChatQueueStrategy());
const [showEndOfQueueModal, setShowEndOfQueueModal] = useState(false);
const [queueSwipedCount, setQueueSwipedCount] = useState(0);
const [queueLikedCount, setQueueLikedCount] = useState(0);
```

#### 4. **useSwipeQueue Hook Update** (`src/app/utils/map/useSwipeQueue.ts`)
**Changes:**
- Added optional `strategy` parameter to function signature
- Defaults to `MapQueueStrategy` if no strategy provided (preserves map behavior)
- Stores strategy in ref and applies it during initialization

**Signature:**
```typescript
export function useSwipeQueue(strategy?: any): SwipeQueueHook
```

---

## Data Flow

### 1. User Searches for Neighborhood
```
User: "show me homes in PDCC"
  ↓
AI: Identifies neighborhood (subdivision)
  ↓
ChatResultsContainer: Fetches listings from /api/subdivisions/pdcc/listings
  ↓
Displays listings in carousel or list view
```

### 2. User Clicks "View Details"
```
User clicks listing
  ↓
handleOpenListingPanelWithQueue called
  ↓
Creates queryMetadata JSON:
  {
    neighborhoodType: "subdivision",
    neighborhoodId: "pdcc",
    filters: { minPrice, maxPrice, beds, baths, pool }
  }
  ↓
Initializes swipe queue with ChatQueueStrategy
  ↓
ChatQueueStrategy.initializeQueue:
  - Parses queryMetadata from query parameter
  - Fetches ALL listings in PDCC from API
  - Creates queue sorted by price
  ↓
Opens ListingBottomPanel (managed by parent ChatWidget)
```

### 3. User Swipes Through Queue
```
User swipes left/right
  ↓
SwipeQueueManager.getNext() provides next listing
  ↓
Listings marked as excluded (liked/disliked)
  ↓
Queue eventually exhausted
  ↓
EndOfQueueModal appears with stats
```

---

## Neighborhood Metadata Flow

The neighborhood context is passed from ChatResultsContainer to ChatQueueStrategy via the `query` parameter:

```typescript
// ChatResultsContainer builds metadata
const queryMetadata = JSON.stringify({
  neighborhoodType: "subdivision",  // or "city"
  neighborhoodId: "pdcc",           // slug
  filters: { minPrice, maxPrice, beds, baths, pool }
});

// Passed to queue initialization
await swipeQueue.initializeQueue(clickedListing, 'ai_chat', queryMetadata);

// ChatQueueStrategy parses it
const queryMetadata = JSON.parse(query);
if (queryMetadata?.neighborhoodType && queryMetadata?.neighborhoodId) {
  this.neighborhoodType = queryMetadata.neighborhoodType;
  this.neighborhoodId = queryMetadata.neighborhoodId;
  this.filters = queryMetadata.filters || {};
}
```

**Fallback:** If no metadata in query, ChatQueueStrategy uses the reference listing's subdivision or city to create the queue.

---

## API Endpoints Used

### Subdivision Listings
```
GET /api/subdivisions/[slug]/listings?minPrice=&maxPrice=&minBeds=&minBaths=&pool=
```

### City Listings
```
GET /api/cities/[cityId]/listings?minPrice=&maxPrice=&minBeds=&minBaths=&pool=
```

Both endpoints return:
```typescript
{
  listings: Listing[],
  pagination: { total, page, limit, pages },
  stats: { totalListings, avgPrice, medianPrice, priceRange }
}
```

---

## Queue Strategy Comparison

| Feature | MapQueueStrategy | ChatQueueStrategy |
|---------|------------------|-------------------|
| **Source** | Map click | Chat listing click |
| **Scope** | 5-mile radius | Entire neighborhood |
| **Scoring** | 7-tier proximity | Price (descending) |
| **API** | `/api/mls-listings` | `/api/subdivisions/[slug]/listings` or `/api/cities/[cityId]/listings` |
| **Filters** | Price brackets, property subtype | All neighborhood filters (price, beds, baths, pool) |
| **Max Size** | 100 listings | 200 listings |

---

## Modal Behavior

### When Queue is Exhausted
```typescript
useEffect(() => {
  if (swipeQueue.isExhausted && swipeQueue.queueLength === 0 && queueSwipedCount > 0) {
    setShowEndOfQueueModal(true);
  }
}, [swipeQueue.isExhausted, swipeQueue.queueLength, queueSwipedCount]);
```

### Modal Actions

1. **View Favorites** (if user liked properties)
   - Closes modal
   - TODO: Navigate to favorites page

2. **Continue Chatting** (primary if no favorites)
   - Closes modal
   - Returns to chat

3. **Search Another Area**
   - Closes modal
   - Returns to chat (user can type new query)

---

## Important Notes

### Map Queue Untouched
- **Map view swipe queue remains completely unchanged**
- Map still uses `MapQueueStrategy` with proximity-based scoring
- Only chat view uses `ChatQueueStrategy`

### Queue Initialization
- Queue is initialized when user clicks "View Details" on ANY listing in a neighborhood search
- Queue includes ALL listings in that neighborhood, not just those displayed in carousel/list
- Filters from chat query (price, beds, baths, pool) are applied to the queue

### Exclude Keys
- Swipe queue system respects exclude keys (previously liked/disliked listings)
- Users won't see listings they've already swiped on

---

## Future Enhancements

1. **Favorites Navigation**
   - Implement `handleViewFavorites` to open favorites sidebar or navigate to favorites page

2. **Queue Stats Tracking**
   - Currently `queueSwipedCount` and `queueLikedCount` are reset on initialization
   - Could track swipes within ListingBottomPanel to update these counts

3. **Region/County Support**
   - ChatQueueStrategy currently supports subdivision and city
   - Could extend to support region and county queries

4. **Queue Preloading**
   - Could initialize queue in background when listings are fetched
   - Would make first "View Details" click instant

---

## Testing

To test the complete flow:

1. Start dev server: `npm run dev`
2. Open chat widget
3. Ask: "show me homes in PDCC"
4. Click "View Details" on any listing
5. Swipe through all listings
6. End-of-queue modal should appear

**Test Cases:**
- [ ] Queue initializes with all PDCC listings (not just carousel)
- [ ] Filters are applied (if user specified price/beds/etc)
- [ ] Modal appears when queue exhausted
- [ ] Modal shows correct stats (total swiped, total liked)
- [ ] "Continue Chatting" closes modal
- [ ] Theme switching works on modal
- [ ] Map view queue still works independently

---

## Files Modified

### New Files
- `src/app/utils/swipe/ChatQueueStrategy.ts` (157 lines)
- `src/app/components/chat/EndOfQueueModal.tsx` (128 lines)
- `docs/chat-v2/CHAT_SWIPE_QUEUE.md` (this file)

### Modified Files
- `src/app/components/chat/ChatResultsContainer.tsx`
  - Added swipe queue initialization
  - Added modal rendering
  - Wrapped `onOpenListingPanel` handler
  - Cleaned up debug logs
- `src/app/utils/map/useSwipeQueue.ts`
  - Added optional `strategy` parameter
  - Preserved backward compatibility for map view

---

## Related Documentation

- [Chat V2 Rewrite Plan](./CHAT_V2_REWRITE_PLAN.md)
- [SwipeQueueManager](../../src/app/utils/swipe/SwipeQueueManager.ts)
- [MapQueueStrategy](../../src/app/utils/swipe/MapQueueStrategy.ts)
