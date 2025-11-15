# Swipe System Documentation

## 🎯 Version 2.1 - Street-Based Micro-Neighborhoods (November 15, 2025)

## Overview
The swipe queue system powers the Tinder-style listing discovery experience on the map page. It uses **ONE intelligent API request** with **client-side tier-based scoring** to ensure users see the most relevant listings first, with special **street-based micro-neighborhood matching** for non-HOA properties.

---

## File Structure & Flow

### 1. **Core Logic**
#### `src/app/utils/map/useSwipeQueue.ts`
The main hook that manages the entire swipe queue system.

**Key Responsibilities:**
- Initialize queue with **ONE API request** (5-mile radius)
- Score listings **client-side** using intelligent tier system
- Handle **street-based micro-neighborhoods** for "Not Applicable" properties
- **Immediate swipe persistence** (no batching complexity)
- Return lightweight QueueItem objects sorted by priority

**Key Functions:**
- `initializeQueue()` - Fetches all nearby listings in one request, scores client-side
- `calculateScore()` - Smart tier-based scoring (lower = higher priority)
- `extractStreetName()` - Extracts street name for micro-neighborhood matching
- `calculateDistance()` - Haversine formula for distance calculation
- `markAsLiked()` - Records right swipe, saves immediately to database
- `markAsDisliked()` - Records left swipe, saves immediately to database
- `getNext()` - Returns next listing from pre-sorted queue
- `sendSwipe()` - Immediate API persistence (no batching)

**NEW Tier-Based Scoring System:**
The system makes ONE API request for all listings within 5 miles, then scores them client-side:

**For HOA Properties (has subdivision):**
- **Tier 1** (Score 0-5): Same subdivision + same subtype
- **Tier 2** (Score 100-105): Same subdivision + different subtype
- **Tier 3** (Score 200-202): Same city + within 2 miles + same subtype
- **Tier 4** (Score 300-305): Same city + within 5 miles + same subtype
- **Tier 5** (Score 400-405): Same city + within 5 miles + different subtype

**For "Not Applicable" Properties (uses street-based micro-neighborhoods):**
- **Tier 1** (Score 0-0.5): **Same street** + same type (e.g., "Willow Street")
- **Tier 2** (Score 100-101): **Same street** + different type
- **Tier 3** (Score 200-200.5): Within 0.5 miles + same type
- **Tier 4** (Score 300-302): Within 2 miles + same type
- **Tier 5** (Score 400-405): Within 5 miles + same type
- **Tier 6** (Score 500-505): Within 5 miles + different type

**Score = Base Tier + Distance in Miles** (lower score = higher priority)

---

### 2. **UI Components**

#### `src/app/components/mls/map/MapPageClient.tsx`
The main map page component that orchestrates the swipe experience.

**Key Responsibilities:**
- Initialize swipe queue when user clicks a listing
- Handle swipe actions from ListingBottomPanel
- Advance to next listing after swipe
- Prefetch next listings for instant loading
- Manage selected listing state

**Swipe Flow:**
1. User clicks map marker → `handleMarkerClick()`
2. Initialize queue → `swipeQueue.initializeQueue()`
3. Load listing data → `fetchFullListing()`
4. Show ListingBottomPanel with swipe buttons
5. User swipes → `onSwipeLeft()` or `onSwipeRight()`
6. Record swipe → `swipeQueue.markAsLiked()` / `markAsDisliked()`
7. Advance queue → `swipeQueue.getNext()`
8. Repeat from step 3

**Key Functions:**
- `handleMarkerClick()` - Initializes swipe queue from clicked listing
- `advanceToNextListing()` - Moves to next listing in queue
- `fetchFullListing()` - Loads full listing data for display
- Prefetching logic for instant UX

---

#### `src/app/components/mls/map/ListingBottomPanel.tsx`
The swipeable panel that displays listing details.

**Key Responsibilities:**
- Display listing photos, details, and badges
- Handle drag gestures for swiping
- Trigger swipe callbacks to MapPageClient
- Show swipe animations and feedback

**Swipe Triggers:**
- Physical drag gesture (mobile)
- Swipe button clicks (all devices)
- Keyboard shortcuts (desktop)

---

### 3. **API Routes**

#### `src/app/api/swipes/user/route.ts`
GET endpoint that returns user's swipe history.

**Response:**
```json
{
  "likes": ["listingKey1", "listingKey2"],
  "dislikes": ["listingKey3", "listingKey4"]
}
```

#### `src/app/api/swipes/exclude-keys/route.ts`
GET endpoint that returns all listing keys to exclude (already swiped).

**Response:**
```json
{
  "excludeKeys": ["key1", "key2", "key3"]
}
```

#### `src/app/api/mls-listings/route.ts`
Fetches listings based on various filters for queue building.

**Query Parameters:**
- `lat`, `lng`, `radius` - Geographic search
- `subdivision` - Filter by subdivision
- `propertyType`, `propertySubType` - Property filtering
- `excludeKeys` - Exclude already swiped listings

---

### 4. **Database Models**

#### `src/models/listings.ts`
Defines the `IListing` interface with all property fields.

**Key Properties (camelCase):**
- `unparsedAddress` - Full address string
- `listPrice` - Current listing price
- `bedsTotal` / `bedroomsTotal` - Bedroom count
- `bathroomsTotalInteger` - Bathroom count
- `subdivisionName` - Subdivision name
- `city` - City name
- `listingKey` - Unique identifier

---

## Data Flow Diagram

```
User Click Marker
      ↓
MapPageClient.handleMarkerClick()
      ↓
useSwipeQueue.initializeQueue(clickedListing)
      ↓
buildSmartQueue() → Fetch & Score 1000s of listings
      ↓
Load top 15 into queue + buffer 10 more
      ↓
MapPageClient.fetchFullListing(first listing)
      ↓
Show ListingBottomPanel
      ↓
User Swipes Left/Right
      ↓
useSwipeQueue.markAsLiked() / markAsDisliked()
      ↓
Add to pendingSwipes queue (batch upload)
      ↓
useSwipeQueue.getNext()
      ↓
MapPageClient.advanceToNextListing()
      ↓
Repeat from fetchFullListing
```

---

## Prioritization System

### **NEW: Strict Phase-Based Priority (NEVER DEVIATES)**

The queue builder now uses **sequential phases** that are exhausted in order:

### Phase 1: Exact Neighborhood Match (100 listings max)
```
Filters:
✓ Same subdivision
✓ Same property subtype (SFR, Condo, etc.)
✓ Same property type (A=Sale, B=Lease, C=Income)
✓ Same city
✗ NEVER crosses city boundaries

Sort: Distance (closest first)
Skip: If subdivision = "Not Applicable"
```

### Phase 2: Same Subdivision, Mixed Subtypes (100 listings max)
```
Filters:
✓ Same subdivision
✓ Same property type
✓ ANY property subtype (show all types in subdivision)
✓ Same city
✗ NEVER crosses city boundaries

Sort: Distance (closest first)
Trigger: Phase 1 returns 0 results
```

### Phase 3: Nearby 2-Mile Radius (50 listings max)
```
Filters:
✓ Same property subtype
✓ Same property type
✓ Within 2 miles (Haversine formula)
✓ Same city (hard boundary)
✓ ANY subdivision

Sort: Distance (closest first)
Trigger: Phases 1 & 2 return 0 results
```

### Phase 4: Nearby 5-Mile Radius (50 listings max)
```
Filters:
✓ Same property subtype
✓ Same property type
✓ Within 5 miles (Haversine formula)
✓ Same city (hard boundary)
✓ ANY subdivision

Sort: Distance (closest first)
Trigger: Phases 1, 2, & 3 return 0 results
```

### Auto-Refill:
- Queue automatically refills when < 5 listings remain
- Uses same phase that last succeeded
- If all phases exhausted, marks queue as exhausted

---

## Recent Changes & Fixes

### ✅ NEW: Street-Based Micro-Neighborhoods for "Not Applicable" Properties (LATEST)

**Date:** November 15, 2025

**Problem:**
- "Not Applicable" (non-HOA) properties showed 0 results in Tier 1 & 2
- Nearby houses on same street (Willow, Goldflower, Candlewood) not grouping together
- System defaulting to distant properties with HOA (e.g., Palm Desert Greens 3.5mi away)

**Root Cause:**
- Scoring logic explicitly excluded "Not Applicable" from subdivision matching
- No alternative grouping mechanism for non-HOA properties
- Properties on same street treated as unrelated

**Solution Implemented:**
1. **Added `address` field to reference object** in `initializeQueue()`:
   ```typescript
   const reference = {
     subdivision: clickedListing.subdivisionName || null,
     propertySubType: clickedListing.propertySubType || null,
     city: clickedListing.city || "",
     latitude: clickedListing.latitude || 0,
     longitude: clickedListing.longitude || 0,
     address: clickedListing.unparsedAddress || clickedListing.address || "", // NEW
   };
   ```

2. **Created `extractStreetName()` function** to parse addresses:
   ```typescript
   function extractStreetName(address: string | undefined): string | null {
     if (!address) return null;

     const cleaned = address
       .replace(/^\d+\s+/, '') // Remove house number
       .replace(/,.*$/, '') // Remove after comma
       .replace(/\s+(Unit|Apt|#|Suite).*$/i, '') // Remove units
       .trim();

     return cleaned || null;
   }
   ```

3. **Updated `calculateScore()` with street-based matching**:
   - Detects "Not Applicable" properties
   - Extracts street names from both reference and listing addresses
   - Compares street names (case-insensitive)
   - **Tier 1**: Same street + same type (score 0-0.5, like same subdivision!)
   - **Tier 2**: Same street + different type
   - **Tiers 3-6**: Distance-based fallback

**Results:**
- ✅ "Willow Street" properties now match other "Willow Street" properties as Tier 1
- ✅ Creates "micro-neighborhoods" based on street names
- ✅ Prevents distant HOA properties from appearing first
- ✅ Maintains all benefits of the one-request system

**Files Modified:**
- `src/app/utils/map/useSwipeQueue.ts` - Lines 70-85 (extractStreetName), 152-194 (street matching logic), 363 (address field)

---

### ✅ FIXED: Complete Rewrite to One-Request System with Client-Side Scoring

**Date:** November 15, 2025

**What Changed:**
- Completely rewrote `useSwipeQueue.ts` from multi-phase API system to ONE request + client-side scoring
- Removed all batching complexity (timers, refs, race conditions)
- Implemented immediate swipe persistence (no batching delays)
- Client-side tier-based scoring (5 intelligent tiers)
- Returns lightweight `QueueItem` objects instead of full `MapListing` objects

**Performance Improvements:**
- ✅ **75-87% reduction** in API requests (4-8 requests → 1 request)
- ✅ **100% elimination** of empty requests
- ✅ **Immediate swipe feedback** (no batching delays)
- ✅ **Simpler codebase** (no timers, no race conditions)
- ✅ **Predictable behavior** (deterministic client-side scoring)

**Breaking Changes:**
- None - maintained same public API interface
- MapPageClient still works without changes
- All existing components compatible

### ✅ FIXED: Type Compatibility Between useSwipeQueue and MapPageClient

**Date:** 2025-11-15

**What Changed:**
- Modified `getNext()` to return `{ listing: QueueItem | null, reason?: string }` instead of `QueueItem | null`
- Added `slugAddress` and `_id` properties to `QueueItem` type for backward compatibility
- Populated `slugAddress` and `_id` in `toQueueItem()` function
- Added type annotations to all sort functions to fix implicit `any` type errors
- Removed non-existent `isSyncing` property reference in MapPageClient
- **Added explicit `SwipeQueueHook` interface** to ensure proper type inference

**Files Modified:**
- `src/app/utils/map/useSwipeQueue.ts` - Added SwipeQueueHook interface, updated QueueItem type and getNext() return type
- `src/app/components/mls/map/MapPageClient.tsx` - Removed isSyncing dependency

**Type Safety Improvements:**
- ✅ All TypeScript errors resolved
- ✅ Proper type annotations on sort functions
- ✅ Backward compatible with existing MapPageClient code
- ✅ No breaking changes to public API
- ✅ Explicit return type interface prevents type inference issues

### ✅ FIXED: Property Name Bug

**Root Cause:**
Code was looking for `UnparsedAddress` and `ListPrice` (PascalCase) but actual properties are `unparsedAddress` and `listPrice` (camelCase)

**Fix Applied:**
Updated all references in `useSwipeQueue.ts` to use correct camelCase property names:
- Line 628: `unparsedAddress` instead of `UnparsedAddress`
- Line 629: `listPrice` instead of `ListPrice`
- Line 637-642: All analytics tracking uses camelCase

**Now Shows:**
```
💚💚💚💚...
❤️  SWIPED RIGHT (LIKED)
Address: 74450 Peppergrass Street, Palm Desert, CA 92260
Price: $529,000
💚💚💚💚...
```

---

## Performance Optimizations

1. **Caching:**
   - Score cache prevents re-scoring same listings
   - Result cache for API calls
   - 5-minute TTL on all caches

2. **Prefetching:**
   - Next 2 listings prefetched in background
   - Uses Next.js router prefetch for instant navigation

3. **Batching:**
   - Swipes batched and uploaded every 3 seconds
   - Reduces API calls by 90%

4. **Virtual Scrolling:**
   - Only 15 listings loaded at once
   - Buffer queue holds next 10 ready

---

## Console Log Guide

### Initialization Logs:
```
🔄 Initializing phase-based swipe queue...
🔑 Fingerprint: [hash]
📋 Loaded [N] exclude keys
✅ Swipe queue ready
```

### Queue Initialization Logs:
```
================================================================================
🎬 INITIALIZING QUEUE
================================================================================
Address: 74450 Peppergrass Street, Palm Desert, CA 92260
Subdivision: Palm Desert Country Club
SubType: Single Family Residence
City: Palm Desert
================================================================================

🏗️  Building queue for: Palm Desert

🎯 Phase 1: Exact neighborhood match
   Subdivision: Palm Desert Country Club
   SubType: Single Family Residence
   City: Palm Desert
   Found: 45 exact matches
✅ Using Phase 1 results

📦 Queue initialized with 45 listings
```

### Phase Progression Logs:
```
🎯 Phase 1: Exact neighborhood match
   Found: 0 exact matches

🎯 Phase 2: Same subdivision, mixed subtypes
   Found: 12 subdivision matches
✅ Using Phase 2 results
```

Or if all phases fail:
```
🎯 Phase 1: Exact neighborhood match
   Found: 0 exact matches

⏭️  Phase 1 skipped (no subdivision)

🎯 Phase 3: 2-mile radius, same subtype
   Found: 8 within 2 miles
✅ Using Phase 3 results
```

### Swipe Logs:
```
💚💚💚💚... (80 green hearts)
❤️  USER SWIPED RIGHT (LIKED)
   Address: [address]
   💰 Price: $[price]
```

```
💔💔💔💔... (80 broken hearts)
👎 USER SWIPED LEFT (DISLIKED)
   Address: [address]
   ⏰ Will expire in 30 minutes
```

### Advance Logs:
```
▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
➡️  NEXT LISTING
▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
Address: 39820-palm-greens-palm-desert-ca-92260
City: Palm Desert
Subdivision: Palm Desert Greens
SubType: Single Family Residence
Phase: 1
Remaining: 44
▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
```

### Refill Logs:
```
🔄 Refilling queue (current: 4)

🏗️  Building queue for: Palm Desert
🎯 Phase 1: Exact neighborhood match
   Found: 20 exact matches
✅ Using Phase 1 results

✅ Refilled with 20 listings
```

---

## Testing Guide

### Test Swipe Flow:
1. Open map page: `/mls-listings`
2. Click any map marker
3. Wait for queue initialization (check console)
4. Swipe right → Check console for green hearts + address
5. Verify next listing loads instantly
6. Swipe left → Check console for broken hearts
7. Continue swiping to test queue refill

### Test Phase System:
1. **Test Phase 1:** Click listing in a popular subdivision (e.g., Palm Desert Country Club)
   - Check console shows "Phase 1: Exact neighborhood match"
   - Verify all listings are same subdivision + same subtype
   - Verify they're sorted by distance

2. **Test Phase 2:** Click listing in subdivision with mixed types
   - Check if Phase 1 has few results
   - Verify Phase 2 shows condos + SFRs from same subdivision

3. **Test Phase 3:** Click listing with subdivision = "Not Applicable"
   - Phase 1 should skip
   - Phase 2 should skip
   - Phase 3 should activate (2-mile radius)
   - Verify all listings within 2 miles

4. **Test Phase 4:** Click isolated listing
   - Phases 1-3 should exhaust
   - Phase 4 should activate (5-mile radius)
   - Verify all listings within 5 miles

### Test Exclude System:
1. Swipe on several listings
2. Reload page
3. Click same marker again
4. Verify swiped listings don't appear in queue

---

## Key Implementation Details (For ChatGPT/AI Context)

### Data Structures:

**QueueItem (lightweight object returned to MapPageClient):**
```typescript
{
  listingKey: string;        // Spark primary ID
  slug: string;              // URL slug for routing
  slugAddress?: string;      // For backward compatibility with MapPageClient
  latitude: number;
  longitude: number;
  city: string;
  subdivisionName: string | null;
  propertyType: string | null;
  propertySubType: string | null;
  hoa: number | null;
  score: number;             // Distance-based (1000 - distance)
  _id?: string;              // For backward compatibility with MapPageClient
}
```

**QueueContext (internal state):**
```typescript
{
  subdivision: string | null;
  propertyType: string;      // "A" = Sale, "B" = Lease
  propertySubType: string | null; // "Single Family Residence", etc.
  city: string;              // Hard boundary - NEVER crossed
  latitude: number;
  longitude: number;
  listingType: string;
}
```

### Hard Rules (NEVER VIOLATE):
1. ✅ City boundary is absolute - NEVER show listings from different city
2. ✅ Property type must match (Sale vs Lease vs Income)
3. ✅ Phases execute sequentially - NEVER skip a phase
4. ✅ Distance calculated with Haversine formula
5. ✅ Exclude keys checked on every filter

### API Integration:
The hook calls `/api/mls-listings` with these parameters:
- **Phase 1:** `subdivision`, `propertySubType`, `propertyType`, `city`, `limit`, `excludeKeys`
- **Phase 2:** `subdivision`, `propertyType`, `city`, `limit`, `excludeKeys`
- **Phase 3:** `lat`, `lng`, `radius=2`, `propertySubType`, `propertyType`, `city`, `limit`, `excludeKeys`
- **Phase 4:** `lat`, `lng`, `radius=5`, `propertySubType`, `propertyType`, `city`, `limit`, `excludeKeys`

### Public API (maintained for backward compatibility):

The hook now exports an explicit `SwipeQueueHook` interface:

```typescript
export interface SwipeQueueHook {
  initializeQueue: (clickedListing: MapListing) => Promise<void>;
  getNext: () => { listing: QueueItem | null; reason?: string };
  peekNext: (count?: number) => QueueItem[];
  markAsLiked: (listingKey: string, listingData?: any) => void;
  markAsDisliked: (listingKey: string, listingData?: any) => void;
  reset: () => void;
  flushSwipes: () => Promise<void>;
  isReady: boolean;
  isExhausted: boolean;
  queueLength: number;
  isExcluded: (listingKey: string) => boolean;
  currentPhase: number;
}
```

**Usage:**
```typescript
const swipeQueue = useSwipeQueue(); // Returns SwipeQueueHook
```

**Note:** `getNext()` returns an object with `listing` and optional `reason` for backward compatibility with MapPageClient.

---

## Pending Improvements (User Requested)

### 🎯 High Priority - Next Tasks

1. **Zipcode Filtering:**
   - **Problem:** Currently showing listings from different zipcodes (92260 vs 92211)
   - **Example:** Illinois Avenue (92211) appearing when clicking Willow Street (92260)
   - **Solution:** Extract `postalCode` from listings, boost same-zipcode matches in scoring
   - **Implementation:** Add zipcode comparison to `calculateScore()`, penalize cross-zipcode matches

2. **Filter Panel Priority:**
   - **Problem:** User's active filters (price, beds, baths, HOA preference) not considered in queue
   - **Solution:** Pass active filters to `initializeQueue()`, boost matching listings in scoring
   - **Example:** User filters "Non-HOA only" → prioritize "Not Applicable" properties
   - **Implementation:**
     - Add `filters` parameter to `initializeQueue()`
     - Check filters in `calculateScore()` and boost score for matches
     - Priority: HOA preference > Price range > Bed/Bath counts

3. **Database Enhancement for "Not Applicable" Properties:**
   - **Consideration:** Should we append street name to subdivision field for "Not Applicable" properties?
   - **Example:** "Not Applicable - Willow Street" instead of just "Not Applicable"
   - **Pros:** Better database queries, easier analytics
   - **Cons:** Requires migration, changes existing data structure
   - **Status:** Under consideration - current street extraction works well

---

## Future Improvements

1. **User Preferences:**
   - Save preferred price ranges
   - Remember favorite subdivisions
   - Filter by must-have features (pool, garage)

2. **Advanced Filtering:**
   - School district boundaries
   - Property age preferences
   - Lot size requirements

3. **Social Features:**
   - Share liked listings with family
   - Collaborative wishlists
   - Agent notes and recommendations

4. **Analytics:**
   - Track tier effectiveness
   - Monitor queue exhaustion rates
   - A/B test scoring algorithms
