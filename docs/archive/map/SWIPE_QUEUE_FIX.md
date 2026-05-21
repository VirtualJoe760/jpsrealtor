# Swipe Queue Not Loading Next Properties - Fixed

**Date**: December 12, 2025
**Issue**: After swiping right/left on properties, no new properties were loading
**Status**: ✅ Fixed

---

## 🐛 The Problem

User reported that when swiping right (like) or left (dislike) on properties, the swipe queue wasn't loading the next property to view. The panel would just stay on the same property or close unexpectedly.

### Symptoms:
- Swipe right → No next property loaded
- Swipe left → No next property loaded
- Expected: Should automatically load next property from queue
- Actual: Panel stays on same property or closes

---

## 🔍 Root Causes

### Issue #1: Queue Not Reinitializing on New Selection

**File**: `src/app/map/page.tsx`
**Line**: 251

The queue initialization logic only ran when `queueLength` was 0:

```tsx
// ❌ BEFORE (Broken)
if (swipeQueue.isReady && !swipeQueue.queueLength) {
  console.log("🎬 Initializing swipe queue for:", listing.address);
  await swipeQueue.initializeQueue(listing);
}
```

**Problem Flow**:
1. User clicks Property A in Palm Desert
2. Queue initializes with 100 nearby properties (queueLength = 100)
3. User swipes through 5 properties (queueLength = 95)
4. User clicks Property B in different location (e.g., Riverside)
5. ❌ Queue does NOT reinitialize because queueLength (95) is not 0
6. User swipes on Property B
7. ❌ Gets properties from Palm Desert area, not Riverside!

**Why This Happened**:
The condition `!swipeQueue.queueLength` prevented queue reinitialization when manually selecting a different property if the queue still had items. This meant the queue was still serving properties from the old location.

---

### Issue #2: Race Condition in getNext()

**File**: `src/app/utils/map/useSwipeQueue.ts`
**Line**: 556

The `getNext()` function had a race condition when removing items from the queue:

```tsx
// ❌ BEFORE (Race condition)
const validQueue = queue.filter(item => !excludeKeys.has(item.listingKey));
// ... select next item from validQueue ...
setQueue(queue.filter(item => item.listingKey !== next.listingKey)); // ❌ Using stale 'queue'
```

**Problem**:
- Created `validQueue` by filtering `queue`
- Selected next item from `validQueue`
- But then updated state using the original `queue`, not `validQueue`
- This could cause items to not be properly removed or skipped items

---

## ✅ The Fixes

### Fix #1: Always Reset and Reinitialize Queue

**File**: `src/app/map/page.tsx`
**Lines**: 250-256

```tsx
// ✅ AFTER (Fixed)
// Always reset and reinitialize swipe queue when a new listing is selected
// This ensures we get properties near the newly selected listing, not the old one
if (swipeQueue.isReady) {
  console.log("🎬 Resetting and initializing swipe queue for:", listing.address);
  swipeQueue.reset();
  await swipeQueue.initializeQueue(listing);
}
```

**What Changed**:
- Removed the `!swipeQueue.queueLength` condition
- Added `swipeQueue.reset()` to clear old queue
- Always reinitialize queue when a new listing is selected

**Benefits**:
- Queue always contains properties near the currently selected listing
- User gets relevant properties when switching locations
- No stale data from previous selections

---

### Fix #2: Use validQueue for State Update

**File**: `src/app/utils/map/useSwipeQueue.ts`
**Line**: 556

```tsx
// ✅ AFTER (Fixed)
const validQueue = queue.filter(item => !excludeKeys.has(item.listingKey));
// ... select next item from validQueue ...
setQueue(validQueue.slice(1)); // ✅ Remove first item from validQueue
```

**What Changed**:
- Use `validQueue.slice(1)` instead of filtering the original `queue`
- Removes the first item (the one we just returned) from the already-filtered queue
- Avoids race condition with stale state

**Benefits**:
- No race condition with state updates
- Queue properly maintains order
- Items are reliably removed after being shown

---

## 📋 How Swipe Queue Works

### Queue Initialization:
1. User clicks/selects a property
2. `handleSelectListing` is called
3. Queue resets (clears old data)
4. Queue initializes with ONE API request:
   - Fetches up to 100 properties within 5-mile radius
   - Same property type (Residential/Commercial/Land)
   - Same or similar property subtype (SFR, Condo, etc.)
   - Same city
5. Properties are scored client-side based on:
   - Same subdivision (highest priority)
   - Same property subtype
   - Distance from selected property
   - Same zip code
   - Price bracket compatibility (±1 bracket)
6. Queue is sorted by score (lower = higher priority)

### Queue Consumption:
1. User swipes right (like) or left (dislike)
2. `handleSwipeRight` or `handleSwipeLeft` is called
3. Action is recorded (toggleFavorite or swipeLeft)
4. `swipeQueue.getNext()` is called
5. Returns next property from queue
6. Property is loaded and displayed
7. Queue item is removed
8. Repeat until queue is empty

### Queue Depletion:
When queue is empty:
- `swipeQueue.getNext()` returns `{ listing: null }`
- Panel closes with "📭 No more listings in queue" message
- User can select a new property to start fresh

---

## 🧪 Testing

To verify the fix works:

### Test 1: Basic Swipe Flow
1. Click on any property
2. Swipe right or left
3. ✅ Should immediately load next property
4. Continue swiping
5. ✅ Each swipe should load next property
6. ✅ Properties should be near the original property

### Test 2: Different Location Selection
1. Click property in City A (e.g., Palm Desert)
2. Swipe through 2-3 properties
3. Click a completely different property in City B (e.g., Riverside)
4. ✅ Queue should reset and show properties near City B
5. Swipe right/left
6. ✅ Should show properties near City B, not City A

### Test 3: Queue Exhaustion
1. Click a property in a sparse area
2. Swipe through all properties in queue
3. ✅ Panel should close with "No more listings" message
4. Click a new property
5. ✅ Queue should reinitialize with new properties

---

## 🎯 Expected Behavior Now

### When Clicking a Property:
- ✅ Queue always resets
- ✅ Queue initializes with properties near selected listing
- ✅ Queue ready for swiping

### When Swiping:
- ✅ Next property loads immediately
- ✅ Properties are relevant to current location
- ✅ No stale data from previous selections
- ✅ Queue properly depletes

### When Switching Locations:
- ✅ Old queue is cleared
- ✅ New queue is built for new location
- ✅ Swipes serve properties from new location

---

## 🔗 Related Files

### Modified:
1. `src/app/map/page.tsx` (lines 250-256)
   - Always reset and reinitialize queue on selection

2. `src/app/utils/map/useSwipeQueue.ts` (line 556)
   - Fixed race condition in queue state update

### How It Integrates:

```
User Action (Click Property)
  ↓
handleSelectListing (map/page.tsx)
  ↓
swipeQueue.reset() → Clears old queue
  ↓
swipeQueue.initializeQueue(listing) → Fetches nearby properties
  ↓
Queue Ready (100 properties sorted by relevance)
  ↓
User Action (Swipe)
  ↓
handleSwipeLeft/Right (map/page.tsx)
  ↓
swipeQueue.getNext() → Returns next property
  ↓
selectListing(nextProperty) → Loads property details
  ↓
Panel updates with new property
```

---

## 📊 Queue Scoring Tiers

The queue uses intelligent scoring to show most relevant properties first:

| Tier | Criteria | Score Range | Example |
|------|----------|-------------|---------|
| 1 | Same subdivision + type + zipcode | 0-5 | Properties in Trilogy at La Quinta |
| 2 | Same subdivision + type, diff zipcode | 50-55 | Trilogy homes across zipcodes |
| 3 | Same subdivision, diff type, same zip | 100-105 | Condos in same subdivision |
| 4 | Same subdivision, diff type, diff zip | 150-155 | Mixed types in subdivision |
| 5 | Within 2mi + same type + same zipcode | 200-202 | Nearby SFR homes |
| 6 | Within 5mi + same type + same zipcode | 300-305 | 5-mile radius SFR |
| 7 | Same city, within 5mi | 400-405 | Any type in city |

Score = Base Tier Value + Distance in Miles

Lower score = Higher priority

---

## 🎉 Benefits

1. **Correct Queue Content**: Always shows properties near the selected listing
2. **No Stale Data**: Queue resets when switching locations
3. **Reliable State Updates**: No race conditions in queue management
4. **Better UX**: Swipes work consistently every time
5. **Proper Location Targeting**: Properties match current area of interest

---

**Fixed By**: Claude Code
**Date**: December 12, 2025
**Files Changed**:
- `src/app/map/page.tsx` (lines 250-256)
- `src/app/utils/map/useSwipeQueue.ts` (line 556)

**Status**: ✅ Complete - Swipe queue now properly loads next properties
