# Swipe Queue System V2 - Complete Redesign

## 🎯 What Changed

### Old System Problems
- ❌ Made 4+ API requests per queue initialization (phases)
- ❌ Complex batching with timers causing race conditions
- ❌ Hundreds of empty requests
- ❌ Difficult to debug and maintain

### New System Benefits
- ✅ **ONE API request** per queue initialization
- ✅ **Immediate swipe persistence** (no batching complexity)
- ✅ **Client-side scoring** (smart prioritization without server load)
- ✅ **Simple state management** (no timers, no refs, no race conditions)
- ✅ **Predictable behavior** (easy to debug)

---

## 🏗️ Architecture

### Single Request Strategy
When user clicks a listing:
1. Make **ONE** API call: Get all listings within 5 miles, same property type, same city
2. Score all results **client-side** using priority tiers
3. Sort by score (lower = higher priority)
4. Show them in order

### Priority Tiers (Client-Side Scoring)

| Tier | Score Range | Criteria |
|------|-------------|----------|
| 1 | 0-99 | Same subdivision + same property subtype |
| 2 | 100-199 | Same subdivision + different subtype |
| 3 | 200-299 | Same city + within 2 miles + same subtype |
| 4 | 300-399 | Same city + within 5 miles + same subtype |
| 5 | 400-499 | Same city + within 5 miles + different subtype |

**Distance is added to base tier** (e.g., 0.5 miles away in Tier 1 = score of 0.5)

### Immediate Swipe Tracking
No batching! Each swipe:
1. Updates local state immediately (instant UI feedback)
2. Sends POST to `/api/swipes/batch` right away
3. No timers, no pending refs, no race conditions

---

## 📊 Performance Improvements

| Metric | Old System | New System | Improvement |
|--------|-----------|-----------|-------------|
| API Requests per Init | 4-8 | 1 | **75-87% reduction** |
| Empty Requests | Common | None | **100% elimination** |
| Client-Side Logic | Minimal | Smart scoring | Better UX |
| Batching Complexity | High (timers) | None | Simpler code |

---

## 🔧 Usage (No Changes for Parent Components)

The API is identical, so `MapPageClient.tsx` doesn't need changes:

```typescript
const swipeQueue = useSwipeQueue();

// Initialize with clicked listing
swipeQueue.initializeQueue(listing);

// Get next listing
const { listing: next } = swipeQueue.getNext();

// Track swipes
swipeQueue.markAsLiked(listingKey, listingData);
swipeQueue.markAsDisliked(listingKey, listingData);
```

---

## 🐛 Debugging

Check console logs for detailed output:

```
🎬 INITIALIZING QUEUE (NEW SIMPLE VERSION)
🌐 Fetching listings with ONE request...
📦 Received 47 listings from API

📊 Queue Distribution:
  Tier 1 (Same subdivision + type): 12
  Tier 2 (Same subdivision, diff type): 5
  Tier 3 (Within 2mi + same type): 8
  Tier 4 (Within 5mi + same type): 15
  Tier 5 (Within 5mi + diff type): 7
  Total: 47

➡️  NEXT LISTING
Tier: Exact Match
Score: 0.34
Remaining: 46
```

---

## 🔄 Rollback Plan

If you need to revert:
```bash
git checkout HEAD~1 -- src/app/utils/map/useSwipeQueue.ts
```

The old system is preserved in git history.

---

## 📝 Notes

- **No more phases** - single intelligent tier system
- **No more batching** - immediate persistence
- **No more timers** - no race conditions
- **Same API contract** - drop-in replacement

**Created:** 2025-11-15
**Status:** Active
