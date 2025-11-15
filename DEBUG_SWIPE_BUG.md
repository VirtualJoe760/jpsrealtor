# 🐛 Swipe Bug Debug Guide

## The Problem
When you swipe right on Willow Street listing:
1. Panel flies off screen ✅
2. Panel reappears showing SAME listing (Willow Street) for ~1 second ❌
3. Then changes to a different listing (not same subdivision) ❌

## Root Cause Analysis

### File 1: `src/app/components/mls/map/ListingBottomPanel.tsx`

**Lines 220-245: The Swipe Animation**
```typescript
const swipeOut = async (dir: "left" | "right") => {
  // ... animation code ...
  await Promise.all([animOther, animX.finished]); // Line 239

  dir === "left" ? onSwipeLeft?.() : onSwipeRight?.();  // Line 241 - CALLS PARENT

  dragX.set(0); // Line 243 - RESETS POSITION
}
```

**Problem:** After animation completes (line 239), it immediately calls the parent callback (line 241), which updates state. Then line 243 resets the dragX position.

---

**Lines 192-214: Entrance Animation**
```typescript
useEffect(() => {
  // Reset instantly
  controls.set({ opacity: 0, y: 28, scale: 0.985 }); // Line 196
  dragX.set(0); // Line 197

  // Animate in
  setTimeout(() => {
    controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      ...
    });
  }, 0);

}, [mounted, fullListing.listingKey]); // Line 214 - TRIGGERS ON KEY CHANGE
```

**Problem:** This effect runs EVERY TIME `fullListing.listingKey` changes. When parent updates `selectedFullListing` after swipe, this triggers!

---

### File 2: `src/app/components/mls/map/MapPageClient.tsx`

**Lines 714-802: Panel Rendering**
```typescript
{selectedListing && selectedFullListing && (
  <ListingBottomPanel
    key={selectedFullListing.listingKey}  // Line 716 - NEW KEY = NEW COMPONENT
    listing={selectedListing}
    fullListing={selectedFullListing}
    ...
    onSwipeRight={() => {
      swipeQueue.markAsLiked(selectedFullListing.listingKey, selectedFullListing);
      setLikedListings(...);
      advanceToNextListing(); // Line 797 - UPDATES STATE IMMEDIATELY
    }}
  />
)}
```

**Problem:** When you swipe:
1. `onSwipeRight` is called from ListingBottomPanel after animation
2. It immediately calls `advanceToNextListing()` (line 797)
3. This updates `selectedFullListing` to next listing
4. React sees new `key` prop (line 716) and **unmounts old panel + mounts new panel**
5. New panel mounts with new data and entrance animation plays

---

**Lines 498-563: advanceToNextListing()**
```typescript
const advanceToNextListing = async () => {
  const { listing: nextListing } = swipeQueue.getNext();

  if (nextListing) {
    const nextSlug = nextListing.slugAddress ?? nextListing.slug;

    // Find in visibleListings
    const nextIndex = visibleListings.findIndex((l) => l._id === nextListing._id);
    if (nextIndex !== -1) {
      setVisibleIndex(nextIndex); // Updates selectedListing
    } else {
      setVisibleIndex(null); // selectedListing becomes NULL!
    }

    selectedSlugRef.current = nextSlug;

    // Check cache
    if (listingCache.current.has(nextSlug)) {
      setSelectedFullListing(cached); // Line 529 - IMMEDIATE UPDATE
      setIsLoadingListing(false);
    } else {
      fetchFullListing(nextSlug); // Line 535 - ASYNC FETCH
    }
  }
};
```

**Problem:**
1. If next listing is NOT in `visibleListings` (off-screen), `selectedListing` becomes NULL (line 520)
2. This should hide the panel (`selectedListing && selectedFullListing` check)
3. But `selectedFullListing` is updated immediately if cached (line 529)
4. There's a brief moment where state is inconsistent

---

## The Race Condition

```
Timeline of what happens:

T=0ms:   User swipes right on Willow Street
T=10ms:  swipeOut("right") starts animation
T=200ms: Animation completes
T=201ms: onSwipeRight() is called
T=202ms: advanceToNextListing() runs
         → swipeQueue.getNext() returns next listing
         → Next listing NOT in visibleListings (different area)
         → setVisibleIndex(null)
         → selectedListing = null
         → BUT selectedFullListing is in cache
         → setSelectedFullListing(nextListing)
T=203ms: React re-renders
         → selectedListing is null
         → Panel should hide... but what if there's a delay?
         → OR what if selectedListing updates async?
```

---

## Specific Issues to Investigate

### Issue #1: Why does same listing reappear?

**Check:** Does `listingCache` have stale data?
- **File:** `MapPageClient.tsx`, lines 66, 387-415
- **Look for:** Cache invalidation logic
- **Hypothesis:** Cache might store the current listing again instead of next listing

### Issue #2: Why is next listing not in same subdivision?

**Check:** Queue sorting in `useSwipeQueue.ts`
- **File:** `src/app/utils/map/useSwipeQueue.ts`, lines 304-314
- **Look for:** Scoring and filtering logic
- **Hypothesis:** Queue might not be properly prioritizing same subdivision

---

## What To Check in Browser Console

When you swipe, look for these logs:

### From `useSwipeQueue.ts`:
```
💚💚💚... (80 times)
❤️  SWIPED RIGHT (LIKED)
💚💚💚... (80 times)
Address: [address]
Price: $[price]
💚💚💚... (80 times)

✅ Swipe saved: like [listingKey]

▼▼▼▼... (40 times)
➡️  NEXT LISTING
▼▼▼▼... (40 times)
Address: [next address]
City: [city]
Subdivision: [subdivision]
SubType: [subtype]
Tier: [which tier?]
Score: [what score?]
Remaining: [how many left?]
▼▼▼▼... (40 times)
```

### From `MapPageClient.tsx`:
```
🎯 Showing next listing (Tier name)
⚡ Used prefetched data for [slug]
```

---

## The Fix Strategy

**Option 1: Delay state update until panel unmounts**
- Add exit animation before calling `onSwipeRight()`
- Wait for panel to fully disappear before updating state

**Option 2: Prevent entrance animation during swipe**
- Add a flag `isTransitioning` to skip entrance animation
- Only run entrance animation on initial mount, not on swipe

**Option 3: Better state synchronization**
- Ensure `selectedListing` and `selectedFullListing` update atomically
- Don't allow mismatched state

---

## Next Steps

1. **Add console logs** to track exact timing:
   ```typescript
   // In advanceToNextListing()
   console.log("🔍 ADVANCING - Current:", selectedFullListing?.listingKey);
   console.log("🔍 ADVANCING - Next:", nextListing?.listingKey);
   console.log("🔍 ADVANCING - In visible:", nextIndex !== -1);
   ```

2. **Check cache contents**:
   ```typescript
   console.log("📦 Cache keys:", Array.from(listingCache.current.keys()));
   ```

3. **Verify queue order**:
   - Check if Tier 1 listings are actually being returned first
   - Verify subdivision matching logic

4. **Paste browser console output** so I can see exact sequence of events

