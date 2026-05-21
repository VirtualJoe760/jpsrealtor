# Map Infinite Loop - Fixed

**Date**: December 12, 2025
**Issue**: Map continuously moving south in infinite loop
**Root Cause**: Circular dependency between URL updates and map movement
**Status**: ✅ Fixed

---

## 🐛 The Problem

After implementing URL bounds parsing, the map got stuck in an infinite loop:

### Symptom:
- Map loads normally
- Immediately starts panning/moving south continuously
- Never stops moving
- Console spams with update messages
- Map becomes unusable

### The Infinite Loop:

```
User moves map
  ↓
handleBoundsChange() called
  ↓
Updates URL with router.replace()
  ↓
searchParams changes
  ↓
useEffect([searchParams]) runs
  ↓
Parses new lat/lng/zoom from URL
  ↓
Calls setMapBounds()
  ↓
MapView receives new props
  ↓
MapView useEffect detects prop change
  ↓
Calls map.jumpTo()
  ↓
Map moves
  ↓
onMoveEnd/onDragEnd fired
  ↓
handleBoundsChange() called AGAIN
  ↓
🔁 LOOP REPEATS FOREVER
```

---

## 🔍 Root Cause Analysis

The circular dependency was created by:

1. **handleBoundsChange** updates URL when map moves
2. **searchParams watcher** parses URL and updates mapBounds
3. **mapBounds change** triggers MapView prop update
4. **MapView prop change** triggers map.jumpTo()
5. **map.jumpTo()** triggers movement events
6. **Movement events** call handleBoundsChange
7. **Back to step 1** → Infinite loop

### Why It Kept Moving South:

Each iteration of the loop:
- URL reconstruction from bounds slightly changes coordinates
- Floating point rounding errors accumulate
- Each `jumpTo()` moves map slightly
- Direction was consistently southward due to coordinate calculation

---

## ✅ The Fix

### Strategy: Loop Breaking with Flag

Use a ref to track whether URL update came from the map itself:

1. When map moves → Set flag to `true`
2. Update URL
3. searchParams watcher sees flag
4. Skips parsing and resets flag
5. Loop broken!

For manual URL edits, flag is `false`, so parsing happens normally.

---

### Implementation

**File**: `src/app/map/page.tsx`

#### Step 1: Add Tracking Ref

**Lines**: 83-84

```tsx
// Track if URL update was caused by map movement (to prevent loops)
const isUpdatingFromMapRef = useRef(false);
```

**What This Does**:
- `useRef` persists across renders without causing re-renders
- Stores boolean flag
- `false` = external URL change (user edit)
- `true` = internal URL change (map movement)

---

#### Step 2: Check Flag in searchParams Watcher

**Lines**: 103-113

```tsx
// ✅ FIXED - Check flag before parsing
useEffect(() => {
  // Skip if this URL update came from handleBoundsChange
  if (isUpdatingFromMapRef.current) {
    console.log('⏭️ Skipping URL parse - update came from map movement');
    isUpdatingFromMapRef.current = false; // Reset flag
    return; // Exit early, don't parse
  }

  console.log('🔍 URL search params changed (external):', searchParams.toString());

  // ... rest of URL parsing logic
}, [searchParams]);
```

**What This Does**:
- First thing: Check if flag is true
- If true: Skip entire parsing logic and reset flag
- If false: Proceed with normal URL parsing
- Prevents self-triggered updates

---

#### Step 3: Set Flag in handleBoundsChange

**Lines**: 245-246

```tsx
const handleBoundsChange = useCallback(
  async (bounds: {...}) => {
    console.log("🗺️ Map bounds changed:", bounds);
    await loadListings(bounds, filters, true);

    // Build URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set("lat", centerLat.toFixed(6));
    params.set("lng", centerLng.toFixed(6));
    params.set("zoom", bounds.zoom.toString());

    console.log("🔗 Updating URL to:", `/map?${params.toString()}`);

    // ✅ Set flag BEFORE updating URL
    isUpdatingFromMapRef.current = true;

    router.replace(`?${params.toString()}`, { scroll: false });
  },
  [filters, loadListings, router, searchParams]
);
```

**What This Does**:
- Sets flag to `true` RIGHT BEFORE URL update
- Next searchParams trigger will see flag and skip
- Prevents circular update chain

---

## 📋 Flow Diagrams

### Normal Map Movement (No Loop):

```
User drags map
  ↓
onMoveEnd/onDragEnd fired
  ↓
handleBoundsChange() called
  ↓
isUpdatingFromMapRef.current = true ✅
  ↓
router.replace() updates URL
  ↓
searchParams changes
  ↓
useEffect([searchParams]) runs
  ↓
Checks flag: TRUE ✅
  ↓
Skips parsing
  ↓
Resets flag to false
  ↓
✅ Loop broken - stops here
```

### Manual URL Edit (Still Works):

```
User edits URL and presses Enter
  ↓
Full page reload
  ↓
Component mounts
  ↓
isUpdatingFromMapRef.current = false (initial)
  ↓
searchParams has new values
  ↓
useEffect([searchParams]) runs
  ↓
Checks flag: FALSE ✅
  ↓
Parses URL
  ↓
Calls setMapBounds()
  ↓
MapView receives new props
  ↓
map.jumpTo() moves map
  ↓
✅ Map shows correct location
  ↓
onMoveEnd fires
  ↓
handleBoundsChange() called
  ↓
Sets flag to true
  ↓
Updates URL (no change, same values)
  ↓
searchParams watcher skips
  ↓
✅ Done - no loop
```

---

## 🧪 Testing

### Test 1: Normal Map Movement
1. Navigate to `/map`
2. Drag map to new location
3. ✅ Map should move smoothly and stop
4. ✅ Console should show:
   ```
   🗺️ Map bounds changed: {...}
   🔗 Updating URL to: /map?lat=...
   ⏭️ Skipping URL parse - update came from map movement
   ```
5. ✅ Map should NOT continue moving
6. ✅ URL should update with new coordinates

### Test 2: Manual URL Edit
1. Navigate to `/map` with zoom=8
2. Edit URL to zoom=12 and press Enter
3. ✅ Console should show:
   ```
   🔍 URL search params changed (external): ...
   ✅ Constructed bounds from lat/lng/zoom: {..., zoom: 12}
   ```
4. ✅ Map should jump to zoom 12
5. ✅ Map should stop after moving
6. ✅ No infinite loop

### Test 3: Zoom In/Out
1. Navigate to `/map`
2. Use +/- buttons or scroll to zoom
3. ✅ Map should zoom smoothly
4. ✅ Console should show skip message
5. ✅ No loop, no continuous movement

### Test 4: Click Polygon
1. Navigate to `/map`
2. Click on a region/county/city
3. ✅ Map should fly to location
4. ✅ Should stop at destination
5. ✅ No infinite loop

---

## 🎯 What's Fixed

### Issue: Infinite Loop
- ✅ Map no longer continuously moves
- ✅ URL updates don't trigger re-parsing when from map
- ✅ Manual URL edits still work correctly
- ✅ All map interactions work normally

### How:
1. **Flag-Based Loop Breaking**: Track update source
2. **Selective Parsing**: Skip when update is internal
3. **Preserved Functionality**: Manual edits still work

---

## 🔗 Related Code

### Files Modified:
1. **src/app/map/page.tsx**
   - Line 84: Added `isUpdatingFromMapRef` ref
   - Lines 107-110: Added flag check in searchParams watcher
   - Lines 245-246: Set flag in handleBoundsChange

### How They Work Together:

```tsx
// Ref declaration (persists across renders)
const isUpdatingFromMapRef = useRef(false);

// Flag check in watcher
useEffect(() => {
  if (isUpdatingFromMapRef.current) {
    isUpdatingFromMapRef.current = false;
    return; // Break loop
  }
  // ... parse URL
}, [searchParams]);

// Flag set in handler
const handleBoundsChange = useCallback((...) => {
  // ... update listings
  isUpdatingFromMapRef.current = true; // Mark as internal
  router.replace(...); // Update URL
}, [...]);
```

---

## 🎉 Benefits

1. **No More Loops**: Map stays still when it should
2. **URL Still Updates**: Browser history tracks map position
3. **Manual Edits Work**: Users can type coordinates in URL
4. **Clean Console**: No spam from loop iterations
5. **Better UX**: Map behaves as expected

---

## 📚 Technical Notes

### Why `useRef` Instead of `useState`?

```tsx
// ❌ useState would cause re-render
const [isUpdatingFromMap, setIsUpdatingFromMap] = useState(false);

// ✅ useRef doesn't cause re-render
const isUpdatingFromMapRef = useRef(false);
```

**Reasons**:
1. **No Re-renders**: Changing ref value doesn't trigger render
2. **Immediate Updates**: Value changes synchronously
3. **Persists**: Value maintained across renders
4. **Perfect for Flags**: Ideal for internal tracking

### Alternative Approaches Considered:

1. **Debouncing**: Would delay all updates, poor UX
2. **Comparison**: Compare old vs new values - unreliable with floating point
3. **Disable Events**: Temporarily disable onMoveEnd - complex, error-prone
4. **Flag-Based**: ✅ Simple, reliable, no side effects

---

## ⚠️ Important Notes

### Flag Reset is Critical:

```tsx
if (isUpdatingFromMapRef.current) {
  isUpdatingFromMapRef.current = false; // ✅ MUST reset here
  return;
}
```

If you forget to reset the flag, ALL subsequent URL changes will be skipped, including manual edits!

### Timing Matters:

Flag must be set BEFORE `router.replace()`:

```tsx
// ✅ CORRECT order
isUpdatingFromMapRef.current = true;
router.replace(...);

// ❌ WRONG order - too late!
router.replace(...);
isUpdatingFromMapRef.current = true;
```

---

## 🔄 Related Issues

This fix resolves:
- ✅ Infinite loop on map movement
- ✅ Map continuously panning/drifting
- ✅ Console spam from repeated updates
- ✅ Poor performance from constant re-renders

This maintains:
- ✅ URL updates on map movement
- ✅ Manual URL editing
- ✅ Browser back/forward navigation
- ✅ Shareable URLs with coordinates

---

**Fixed By**: Claude Code
**Date**: December 12, 2025
**Files Changed**:
- `src/app/map/page.tsx` (lines 84, 107-110, 245-246)

**Status**: ✅ Complete - Infinite loop eliminated with flag-based loop breaking
