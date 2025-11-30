# Swipe System
**Tinder-Style Property Discovery**
**Last Updated:** January 29, 2025
**Version:** 2.1 (Street-Based Micro-Neighborhoods)

---

## 📋 OVERVIEW

The swipe queue system powers the Tinder-style listing discovery experience. Key features:
- **5-mile radius search** around selected listing
- **7-tier proximity scoring** (0-505 points, lower = better match)
- **Street-based micro-neighborhoods** for non-HOA properties
- **Immediate swipe persistence** to MongoDB
- **100 listing max** queue with smart prioritization
- **Analytics tracking** (top subdivisions, cities, property types)

---

## 🏗️ ARCHITECTURE

### File Structure

```
src/app/utils/map/
└── useSwipeQueue.ts        # Main hook (all logic)

src/app/api/
├── swipes/
│   ├── batch/route.ts      # Save swipes (POST)
│   └── exclude-keys/route.ts  # Get already-swiped (GET)

src/app/components/mls/map/
├── MapPageClient.tsx       # Initializes queue
└── ListingBottomPanel.tsx  # Swipe gestures
```

### Data Flow

```
User clicks listing on map
    ↓
MapPageClient.handleListingClick()
    ↓
useSwipeQueue.initializeQueue(selectedListing)
    ↓
GET /api/mls-listings?lat=...&lng=...&radius=5
    ├─ Fetch all listings within 5 miles
    ├─ Exclude already-swiped (GET /api/swipes/exclude-keys)
    └─ Filter out Pacaso (co-ownership)
    ↓
calculateScore() for each listing (client-side)
    ├─ HOA properties: Tier 1-5 scoring
    └─ Non-HOA: Street-based micro-neighborhood scoring
    ↓
Sort by score (ascending)
    ↓
Return top 100 listings as queue
    ↓
User swipes left/right
    ↓
POST /api/swipes/batch (immediate persistence)
    ├─ Save to MongoDB
    ├─ Update user analytics
    └─ Link anonymous sessions to accounts
    ↓
getNext() returns next listing from queue
```

---

## 🎯 TIER-BASED SCORING

### For HOA Properties (Has Subdivision)

```typescript
Tier 1 (Score 0-5): Same subdivision + same subtype
  - Priority: Highest
  - Example: Both in "Palm Desert Country Club", both Single Family
  - Distance weight: 0-5 points (closer = lower score)

Tier 2 (Score 100-105): Same subdivision + different subtype
  - Example: Palm Desert Country Club, but one Condo, one Single Family

Tier 3 (Score 200-202): Same city + within 2 miles + same subtype
  - For when no subdivision match exists

Tier 4 (Score 300-305): Same city + within 5 miles + same subtype
  - Broader search within city boundaries

Tier 5 (Score 400-405): Same city + within 5 miles + different subtype
  - Lowest priority, but still same city
```

### For Non-HOA Properties (Street-Based Micro-Neighborhoods)

```typescript
Tier 1 (Score 0-0.5): Same street + same type
  - Priority: Highest
  - Example: Both on "Willow Street", both Single Family
  - Creates micro-neighborhoods based on street names

Tier 2 (Score 100-101): Same street + different type
  - Example: Both on Willow Street, one SFR, one Condo

Tier 3 (Score 200-200.5): Within 0.5 miles + same type
  - Immediate vicinity matching

Tier 4 (Score 300-302): Within 2 miles + same type
  - Medium-range search

Tier 5 (Score 400-405): Within 5 miles + same type
  - Broad search

Tier 6 (Score 500-505): Within 5 miles + different type
  - Lowest priority fallback
```

**Street Name Extraction:**
```typescript
function extractStreetName(address: string): string {
  // "12345 Willow Street" → "Willow Street"
  // "456 N. Palm Canyon Dr, #203" → "Palm Canyon"
  // Removes: numbers, unit numbers, directionals, apt/unit/suite
}
```

---

## 🔧 CORE FUNCTIONS

### initializeQueue()
```typescript
async function initializeQueue(selectedListing: IListing)
```

**Steps:**
1. Fetch exclude keys (already-swiped listings)
2. Query API for all listings within 5-mile radius
3. Filter out:
   - Already-swiped
   - Pacaso properties (co-ownership)
   - Selected listing itself
4. Score each listing (calculateScore)
5. Sort by score (ascending)
6. Limit to 100 listings
7. Return QueueItem array

**Performance:**
- Single API request (~500 listings)
- Client-side scoring (fast)
- Total time: <500ms

### calculateScore()
```typescript
function calculateScore(
  listing: IListing,
  selected: IListing
): number
```

**Logic:**
```typescript
// HOA Properties
if (listing.subdivision && selected.subdivision) {
  if (sameSubdivision && sameSubtype) {
    return 0 + distance; // Tier 1: 0-5
  } else if (sameSubdivision && differentSubtype) {
    return 100 + distance; // Tier 2: 100-105
  }
  // ... more tiers
}

// Non-HOA Properties (street-based)
if (listing.subdivision === "Not Applicable") {
  const listingStreet = extractStreetName(listing.address);
  const selectedStreet = extractStreetName(selected.address);

  if (listingStreet === selectedStreet && sameType) {
    return 0 + (distance * 0.1); // Tier 1: 0-0.5
  }
  // ... more tiers
}
```

### calculateDistance()
```typescript
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number
```

**Haversine Formula:**
```typescript
const R = 3958.8; // Earth radius in miles
const dLat = toRadians(lat2 - lat1);
const dLng = toRadians(lng2 - lng1);
const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
return R * c; // Distance in miles
```

### markAsLiked() / markAsDisliked()
```typescript
function markAsLiked(listingKey: string)
function markAsDisliked(listingKey: string)
```

**Actions:**
1. Update local state (likedListings/dislikedListings)
2. Remove from queue
3. Call sendSwipe() for immediate persistence

### sendSwipe()
```typescript
async function sendSwipe(
  listingKey: string,
  direction: "left" | "right"
)
```

**API Call:**
```typescript
POST /api/swipes/batch
{
  swipes: [{
    listingKey: "123-456",
    direction: "left",
    timestamp: "2025-01-29T10:30:00Z",
    sessionId: "anon-uuid" // or userId if authenticated
  }]
}
```

**Response Actions:**
- Save to MongoDB (swipes collection)
- Update user analytics (top subdivisions, cities)
- Link anonymous sessions to accounts on login
- 30-minute TTL for dislikes

### getNext()
```typescript
function getNext(): QueueItem | null
```

Returns the next listing in the pre-sorted queue.

---

## 🌐 API ENDPOINTS

### POST /api/swipes/batch

**Purpose:** Save swipes to database (immediate, not batched despite name)

**Request:**
```typescript
{
  swipes: Array<{
    listingKey: string,
    direction: "left" | "right",
    timestamp: string,
    sessionId?: string,
    userId?: string
  }>
}
```

**Response:**
```typescript
{
  success: true,
  saved: number,
  analytics: {
    topSubdivisions: string[],
    topCities: string[],
    topPropertyTypes: string[]
  }
}
```

**Database Operations:**
1. Upsert swipe document (replace if exists)
2. Set TTL: 30 minutes for dislikes, permanent for likes
3. Update user analytics aggregation
4. Link anonymous to authenticated user if applicable

### GET /api/swipes/exclude-keys

**Purpose:** Get list of already-swiped listing keys for current user

**Query Params:**
```typescript
?sessionId=anon-uuid  // For anonymous users
&userId=user-id       // For authenticated users
```

**Response:**
```typescript
{
  excludeKeys: ["123-456", "789-012", ...]
}
```

**Used by:** useSwipeQueue to filter out already-seen listings

---

## 📊 ANALYTICS TRACKING

### User Analytics Document

```typescript
{
  userId: string,
  sessionId: string,

  swipeHistory: [
    {
      listingKey: string,
      direction: "left" | "right",
      timestamp: Date,
      listingData: {
        subdivision: string,
        city: string,
        propertyType: string,
        price: number
      }
    }
  ],

  aggregates: {
    topSubdivisions: [
      { name: "Palm Desert Country Club", count: 15 },
      { name: "PGA West", count: 8 }
    ],
    topCities: [
      { name: "Palm Desert", count: 25 },
      { name: "La Quinta", count: 12 }
    ],
    topPropertyTypes: [
      { type: "Single Family", count: 30 },
      { type: "Condo", count: 10 }
    ],
    priceRange: { min: 300000, max: 800000 },
    avgPriceLiked: 450000
  },

  lastActive: Date
}
```

### Analytics Usage (Future)

- **Personalized recommendations**: Show more from liked subdivisions
- **Email campaigns**: "New listings in areas you like"
- **Agent insights**: "This lead likes luxury condos in La Quinta"
- **ML training**: Property preference models

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Before (Original Batching System)
```
- Multiple API requests (fetch, then batch save)
- Complex batching logic
- 5-second delay before persistence
- Potential data loss on navigation
```

### After (Immediate Persistence)
```
- Single API request for queue initialization
- Immediate swipe saves
- Client-side scoring (fast)
- No complex state management
```

**Improvements:**
- **50% fewer API calls** (one fetch vs fetch + batch)
- **Instant feedback** (no 5-second delay)
- **Reliable persistence** (immediate saves)
- **Simpler code** (no batching complexity)

### Client-Side Scoring Benefits

**Before:** Server calculated all distances/scores
**After:** Client calculates (JavaScript is fast!)

**Performance:**
- 500 listings × scoring: ~50ms on client
- No server load for scoring
- Immediate queue ready

---

## 🐛 BUG FIXES & IMPROVEMENTS

### Version 2.1 (January 2025)
- ✅ Added street-based micro-neighborhood scoring for non-HOA properties
- ✅ Improved extractStreetName() to handle complex addresses
- ✅ Fixed distance calculation precision

### Version 2.0 (December 2024)
- ✅ Removed batching complexity (immediate persistence)
- ✅ Single API request architecture
- ✅ Client-side tier-based scoring
- ✅ Improved performance (50% fewer calls)

### Version 1.x (Prior)
- Original batching system
- Multiple API calls
- Server-side scoring

---

## 💡 USAGE EXAMPLE

```typescript
import { useSwipeQueue } from "@/app/utils/map/useSwipeQueue";

function MapPageClient() {
  const {
    queue,
    isLoading,
    initializeQueue,
    markAsLiked,
    markAsDisliked,
    getNext,
    reset
  } = useSwipeQueue();

  const handleListingClick = async (listing: IListing) => {
    await initializeQueue(listing);
    // Queue is now ready
  };

  const handleSwipeLeft = () => {
    markAsDisliked(currentListing.listingKey);
    const next = getNext();
    setCurrentListing(next);
  };

  const handleSwipeRight = () => {
    markAsLiked(currentListing.listingKey);
    const next = getNext();
    setCurrentListing(next);
  };

  return (
    <ListingBottomPanel
      listing={currentListing}
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
    />
  );
}
```

---

## 🔮 FUTURE ENHANCEMENTS

- [ ] ML-based scoring (learn from user preferences)
- [ ] Collaborative filtering ("Users who liked X also liked Y")
- [ ] Backfill queue when < 10 listings remain
- [ ] Predictive prefetching (load next batch in background)
- [ ] A/B test different radius distances (3mi vs 5mi vs 10mi)
- [ ] Price bracket matching (only show similar price ranges)

---

## 📚 RELATED DOCUMENTATION

- [MAP_SYSTEM.md](./MAP_SYSTEM.md) - Map integration
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - ListingBottomPanel
- [DATABASE_MODELS.md](./DATABASE_MODELS.md) - Swipes collection schema

---

**Last Updated:** January 29, 2025
