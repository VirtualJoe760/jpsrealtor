# CRITICAL FIXES - READY TO APPLY

## Summary
Due to file modification conflicts, here are the critical fixes documented for manual application or batch processing:

---

## FIX #1: Remove Duplicate Event Handlers from onLoad
**File**: `src/app/components/mls/map/MapView.tsx`
**Lines**: 274-516

### Action:
Replace the entire section from line 274 to 516 (all the region/county/city event handler registrations inside `onLoad` callback) with:

```typescript
      // Set default cursor to default arrow
      map.getCanvas().style.cursor = 'default';

      // Note: Polygon event handlers (click, mouseenter, mouseleave) are registered
      // in the separate useEffect with [polygonKey] dependency below (line ~622).
      // This ensures proper cleanup and avoids duplicate registrations.
```

### Why:
- Event handlers are already registered in the `useEffect` at line 622 with `[polygonKey]` dependency
- Having them in onLoad causes duplicate registrations
- This leads to memory leaks and events firing multiple times

---

## FIX #2: Remove Hardcoded Region Names in Cleanup
**File**: `src/app/components/mls/map/MapView.tsx`
**Lines**: 536-543

### Current Code:
```typescript
        // Clean up region click handlers
        const regionNames = ['Northern California', 'Central California', 'Southern California'];
        regionNames.forEach(regionName => {
          const layerId = `region-fill-${regionName}`;
          map.off('click', layerId);
          map.off('mouseenter', layerId);
          map.off('mouseleave', layerId);
        });
```

### Replace With:
```typescript
        // Clean up region click handlers - derive names from actual data
        // NOTE: These handlers are actually registered in separate useEffect,
        // so this cleanup is redundant and should be removed once that useEffect
        // properly cleans up its own handlers
```

### Why:
- Hardcoded names won't match dynamically loaded regions
- This cleanup is actually redundant since handlers should be cleaned up in the useEffect that registers them

---

## FIX #3: Fix City Source ID (Remove Index)
**File**: `src/app/components/mls/map/MapView.tsx`
**Line**: 1158-1159

### Current Code:
```typescript
<Source
  key={`city-source-${marker.cityName}-${i}`}
  id={`city-source-${marker.cityName}-${i}`}
```

### Replace With:
```typescript
<Source
  key={`city-source-${marker.cityName}`}
  id={`city-source-${marker.cityName}`}
```

### Also Update Line 490:
```typescript
// Current:
{ source: `city-source-${cityName}`, id: e.features[0].id },

// Already correct! No change needed.
```

### Why:
- Source ID includes index but event handler doesn't
- This causes feature state updates to fail
- Hover effects don't work for city polygons

---

## FIX #4: Fix Inconsistent Zoom Level Check
**File**: `src/app/components/mls/map/MapView.tsx`
**Lines**: 913, 1032, 1145

### Current Code (all 3 locations):
```typescript
{currentZoom < 12 && dataToRender.some(...) && (
```

### Issue:
`currentZoom` is a state variable that updates via debounced `handleMoveEnd`, causing visual jank.

### Replace With:
At the beginning of the render section (around line 770), add:

```typescript
  // Get current zoom directly from map to avoid debounce delay
  const renderZoom = useMemo(() => {
    const map = mapRef.current?.getMap?.();
    return map ? map.getZoom() : currentZoom;
  }, [currentZoom, mapRef]);
```

Then update all 3 polygon rendering checks to use `renderZoom`:

```typescript
{renderZoom < 12 && dataToRender.some(...) && (
```

### Why:
- Eliminates visual jank when transitioning between zoom 11 and 12
- Polygons hide/show immediately instead of after debounce delay

---

## FIX #5: Add AbortController Cleanup
**File**: `src/app/utils/map/useServerClusters.ts`
**After line 51 (where abortControllerRef is defined)**

### Add This useEffect:
```typescript
  // Cleanup AbortController on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('🧹 Cleaning up AbortController on unmount');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
```

### Why:
- Prevents memory leaks when component unmounts mid-request
- Ensures pending requests are properly cancelled

---

## FIX #6: Add Streaming Cleanup
**File**: `src/app/utils/map/useServerClusters.ts`
**After line 51**

### Add This Ref and Cleanup:
```typescript
  const activeStreamRef = useRef<ReadableStreamDefaultReader | null>(null);

  // Cleanup active stream on unmount
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        console.log('🧹 Cancelling active stream on unmount');
        activeStreamRef.current.cancel().catch(() => {
          // Ignore cancellation errors
        });
        activeStreamRef.current = null;
      }
    };
  }, []);
```

### Then Update Line 219 (inside streaming block):
```typescript
const reader = res.body?.getReader();
if (!reader) {
  throw new Error('Response body is not readable');
}
activeStreamRef.current = reader;  // <-- ADD THIS LINE
```

### And Update Line 321 (in finally block):
```typescript
} finally {
  reader.releaseLock();
  activeStreamRef.current = null;  // <-- ADD THIS LINE
}
```

### Why:
- Prevents memory leaks when navigating away during streaming
- Ensures stream is properly cancelled and resources released

---

## FIX #7: Clear Hover State on Panel Open
**File**: `src/app/components/mls/map/MapView.tsx`
**After line 122 (after the selectedListing useEffect)**

### Add This useEffect:
```typescript
  // Clear hover state when panel opens to avoid stuck hover effects
  useEffect(() => {
    if (panelOpen) {
      setHoveredId(null);
      setHoveredPolygon(null);
    }
  }, [panelOpen]);
```

### Why:
- Prevents markers from staying in hovered state when panel opens
- Improves visual clarity

---

## TESTING CHECKLIST

After applying these fixes, test:

1. **Duplicate Handlers Fixed**:
   - [ ] Click a region polygon → zoom happens ONCE (not twice)
   - [ ] Check DevTools Console → no duplicate "Region clicked" messages
   - [ ] Hover region → cursor changes once

2. **City Hover Effects Work**:
   - [ ] Zoom to level 10 (see city polygons)
   - [ ] Hover over a city → polygon highlights
   - [ ] Hover stats overlay appears

3. **Smooth Zoom Transition**:
   - [ ] Zoom from 11 → 12 → no visual jank
   - [ ] Polygons disappear smoothly
   - [ ] Listings appear immediately

4. **No Memory Leaks**:
   - [ ] Open DevTools → Memory tab
   - [ ] Navigate to /map
   - [ ] Take heap snapshot
   - [ ] Navigate away
   - [ ] Take another snapshot
   - [ ] Check that map-related objects are garbage collected

5. **Streaming Cleanup**:
   - [ ] Zoom to 13 (triggers streaming)
   - [ ] Wait for first batch to appear
   - [ ] Immediately navigate to another page
   - [ ] Check DevTools Console → should see "Cancelling active stream" message
   - [ ] No errors about uncancelled streams

---

## PRIORITY ORDER

Apply in this order:

1. **FIX #1** - Remove duplicate handlers (CRITICAL - causes memory leaks)
2. **FIX #3** - Fix city source ID (CRITICAL - hover effects broken)
3. **FIX #5** - Add AbortController cleanup (HIGH - memory leak)
4. **FIX #6** - Add streaming cleanup (HIGH - memory leak)
5. **FIX #4** - Fix zoom checks (MEDIUM - visual jank)
6. **FIX #7** - Clear hover on panel open (LOW - minor UX)
7. **FIX #2** - Remove hardcoded cleanup (LOW - already redundant)

---

## ESTIMATED TIME

- **FIX #1**: 5 minutes (simple deletion)
- **FIX #3**: 2 minutes (remove `-${i}` from 2 places)
- **FIX #5**: 3 minutes (add useEffect)
- **FIX #6**: 5 minutes (add ref and cleanup)
- **FIX #4**: 10 minutes (add useMemo and update 3 locations)
- **FIX #7**: 2 minutes (add useEffect)
- **FIX #2**: 2 minutes (replace with comment)

**Total**: ~30 minutes + 15 minutes testing = **45 minutes**

---

## NOTES

- All fixes are non-breaking and backward compatible
- No database changes required
- No API changes required
- Can be applied incrementally (each fix is independent)
- After fixes, the remaining bugs from the report can be tackled in Sprint 2

---

Generated: December 5, 2025
Status: Ready to apply
