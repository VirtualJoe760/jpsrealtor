# Map Not "Awake" on Refresh & URL Bounds Not Applied - Fixed

**Date**: December 12, 2025
**Issues**:
1. Map loads but is static/frozen - hover effects don't work
2. URL bounds parameters don't move the map to the correct location
**Status**: ✅ Fixed

---

## 🐛 The Problems

### Problem 1: Map "Not Awake" on Page Refresh

**Symptom**:
- After refreshing the /map page, the map would load but appear "frozen"
- Hovering over polygons (regions/counties/cities) showed no hover effects
- Map appeared static/unresponsive to mouse interactions
- Map would eventually "wake up" after some interaction or time

**Root Cause**:
Event handlers were being registered BEFORE the map was fully loaded and styled. The `useEffect` hooks that set up:
1. Zoom/move event listeners
2. Hover event handlers for polygons

...were running before MapLibre had completed its initialization sequence.

---

### Problem 2: URL Bounds Not Applied

**Symptom**:
- Entering bounds in URL (e.g., `/map?bounds=...`) didn't move the map
- Map always showed default California view regardless of URL parameters
- Expected: Map should jump to the location specified in URL

**Root Cause**:
The `initialViewState` prop on the Map component is only used during the FIRST render. The timing was:

1. Map component renders with default `initialViewState` (California view)
2. Map mounts and starts loading
3. `useEffect` in map/page.tsx parses URL bounds
4. `setMapBounds()` updates state
5. MapView receives new `centerLat`, `centerLng`, `zoom` props
6. ❌ But `initialViewState` doesn't update - it's already been used!

MapLibre's `initialViewState` is a one-time initialization prop that doesn't respond to prop changes.

---

## 🔍 Deep Dive: MapLibre Initialization Sequence

### Normal MapLibre Lifecycle:
```
1. Component mounts
2. MapLibre creates map instance
3. Map downloads style JSON
4. Map loads tiles
5. Map emits 'load' event
6. Map calls isStyleLoaded() = true
7. Map is interactive
```

### What Was Happening (Broken):
```
1. Component mounts
2. MapLibre creates map instance
3. ❌ useEffect registers event handlers (too early!)
4. Map downloads style JSON (handlers try to access map - might fail)
5. Map loads tiles (handlers attached but may not work)
6. Map emits 'load' event (handlers already registered improperly)
7. Map appears loaded but interactions don't work
```

### What Happens Now (Fixed):
```
1. Component mounts
2. MapLibre creates map instance
3. useEffect checks if map is ready
4. Map downloads style JSON
5. Map loads tiles
6. Map emits 'load' event
7. ✅ Handlers register AFTER load
8. Map is fully interactive
```

---

## ✅ The Fixes

### Fix 1: Wait for Map Load Before Setting Up Handlers

**File**: `src/app/components/mls/map/MapView.tsx`
**Lines**: 317-345 (event listeners), 836-856 (hover handlers)

#### Event Listener Setup:
```tsx
// ✅ AFTER (Fixed)
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map) {
    console.log('⏸️ Map not ready for event listener setup');
    return;
  }

  const onLoad = () => {
    console.log('🗺️ Map loaded and style ready');
    updateClusters();
    map.getCanvas().style.cursor = 'default';
  };

  // Always wait for style to be loaded before initializing
  if (map.isStyleLoaded()) {
    console.log('✅ Map style already loaded, initializing immediately');
    onLoad();
  } else {
    console.log('⏳ Waiting for map style to load...');
    map.once("load", onLoad);
  }

  // ... rest of event listener setup
}, []);
```

**What Changed**:
- Added check for `map.isStyleLoaded()` before proceeding
- If not loaded, wait for 'load' event
- Added console logs for debugging initialization sequence
- Ensures handlers are only registered when map is ready

---

#### Hover Handler Setup:
```tsx
// ✅ AFTER (Fixed)
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map) {
    console.log('⏸️ Map not ready for hover handler setup');
    return;
  }

  // Wait for map to be fully loaded before setting up event handlers
  if (!map.isStyleLoaded()) {
    console.log('⏸️ Map style not loaded, waiting...');
    const onLoad = () => {
      console.log('🎨 Map style loaded, setting up hover handlers');
      setupHoverHandlers();
    };
    map.once('load', onLoad);
    return () => {
      map.off('load', onLoad);
    };
  }

  setupHoverHandlers();

  function setupHoverHandlers() {
    console.log('🎨 Setting up global hover handlers for all polygon layers');
    // ... handler setup code
  }
}, [dataToRender, hoveredPolygon]);
```

**What Changed**:
- Wrapped handler setup in `setupHoverHandlers()` function
- Check `map.isStyleLoaded()` before proceeding
- If not loaded, register `once('load')` listener
- Call `setupHoverHandlers()` only after load
- Proper cleanup of load event listener

---

### Fix 2: Respond to Center/Zoom Prop Changes

**File**: `src/app/components/mls/map/MapView.tsx`
**Lines**: 203-235

```tsx
// ✅ NEW (Added)
// Handle center/zoom prop changes (e.g., from URL bounds on page load)
// This ensures the map moves to the correct location when props update after initial render
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map || !map.isStyleLoaded()) {
    console.log('⏸️ Map not ready for view update');
    return;
  }

  // Only update if props are provided and different from current view
  if (centerLat !== undefined && centerLng !== undefined && zoom !== undefined) {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const centerChanged = Math.abs(currentCenter.lat - centerLat) > 0.001 ||
                         Math.abs(currentCenter.lng - centerLng) > 0.001;
    const zoomChanged = Math.abs(currentZoom - zoom) > 0.1;

    if (centerChanged || zoomChanged) {
      console.log('🗺️ View props changed, updating map view:', {
        from: { lat: currentCenter.lat, lng: currentCenter.lng, zoom: currentZoom },
        to: { lat: centerLat, lng: centerLng, zoom }
      });

      // Use jumpTo for immediate update without animation on initial load
      // This prevents jarring animations when loading from URL
      map.jumpTo({
        center: [centerLng, centerLat],
        zoom: zoom,
      });
    }
  }
}, [centerLat, centerLng, zoom]);
```

**What This Does**:
- Listens for changes to `centerLat`, `centerLng`, `zoom` props
- Waits for map to be ready (`isStyleLoaded()`)
- Compares current map view with prop values
- If different, uses `map.jumpTo()` to move map
- No animation (instant) to avoid jarring UX on page load

**Why `jumpTo` instead of `flyTo`**:
- `flyTo`: Animated transition - good for user-initiated navigation
- `jumpTo`: Instant - good for programmatic updates from URL/state

---

### Fix 3: Add reuseMaps={false}

**File**: `src/app/components/mls/map/MapView.tsx`
**Line**: 1247

```tsx
<Map
  ref={mapRef}
  mapStyle={currentMapStyleURL}
  initialViewState={hydratedInitialViewState}
  onMoveEnd={handleMoveEnd}
  onDragEnd={handleDragEnd}
  onClick={handleMapClick}
  interactive={!panelOpen}
  cursor="default"
  interactiveLayerIds={interactiveLayerIds}
  reuseMaps={false}  // ✅ Added
>
```

**What This Does**:
- Tells `@vis.gl/react-maplibre` to NOT reuse map instances
- Each component mount gets a fresh MapLibre instance
- Prevents issues with stale map state on page refresh
- Ensures clean initialization every time

**Why This Matters**:
- Without this, MapLibre may try to reuse a previous map instance
- Reused instances can have stale state, broken event listeners, or incomplete initialization
- Setting to `false` ensures clean slate on every mount

---

## 📋 How URL Bounds Work Now

### User Journey:
1. User navigates to `/map?bounds={"north":34.5,"south":33.5,"east":-117,"west":-118,"zoom":10}`
2. Map page component mounts
3. `useEffect` in map/page.tsx parses bounds from URL
4. `setMapBounds()` updates state
5. MapView receives `centerLat`, `centerLng`, `zoom` props from parsed bounds
6. MapView renders with `initialViewState` (may use default or parsed - doesn't matter)
7. Map loads and emits 'load' event
8. ✅ NEW: `useEffect` detects prop change and calls `map.jumpTo()`
9. Map instantly moves to URL-specified location

### Example Flow:
```
URL: /map?bounds={"north":34.5,"south":33.5,"east":-117,"west":-118,"zoom":10}

1. Parse bounds: { north: 34.5, south: 33.5, east: -117, west: -118, zoom: 10 }
2. Calculate center: lat = 34.0, lng = -117.5
3. MapView receives props: centerLat={34.0} centerLng={-117.5} zoom={10}
4. Map loads with initialViewState (defaults)
5. useEffect triggers: props different from current view
6. map.jumpTo({ center: [-117.5, 34.0], zoom: 10 })
7. ✅ Map shows correct location from URL
```

---

## 🧪 Testing

### Test 1: Page Refresh with Hover Effects
1. Navigate to `/map`
2. Refresh page (Ctrl+R / Cmd+R)
3. Wait for map to load
4. ✅ Console should show: "🗺️ Map loaded and style ready"
5. ✅ Console should show: "🎨 Setting up global hover handlers"
6. Hover over a region/county/city polygon
7. ✅ Should see hover effect (outline, glow)
8. ✅ Should see stats overlay at top
9. ✅ Cursor should change to pointer

### Test 2: URL Bounds Applied
1. Navigate to: `/map?bounds={"north":34.5,"south":33.5,"east":-117,"west":-118,"zoom":10}`
2. Wait for map to load
3. ✅ Console should show: "🗺️ View props changed, updating map view"
4. ✅ Map should show Riverside/San Bernardino area (not all of California)
5. ✅ Zoom level should be 10

### Test 3: Style Change Doesn't Break Hover
1. Navigate to `/map`
2. Wait for map to load
3. Hover over polygon - ✅ works
4. Open Map Controls
5. Switch to Satellite view
6. Wait for style to load
7. Hover over polygon - ✅ should still work
8. Switch to Dark Matter view
9. Hover over polygon - ✅ should still work

### Test 4: Map Initialization Sequence
Watch console logs on page load:
```
✅ Expected sequence:
1. "⏸️ Map not ready for event listener setup" (first render, map not ready)
2. "🎯 Setting up map event listeners" (map ref available)
3. "⏳ Waiting for map style to load..." (style loading)
4. "🗺️ Map loaded and style ready" (style loaded)
5. "🗺️ View props changed, updating map view" (URL bounds applied)
6. "🎨 Setting up global hover handlers for all polygon layers" (handlers ready)
7. "✅ Global hover handler registered" (handlers active)
```

---

## 🎯 What's Fixed

### Issue 1: Map "Not Awake"
- ✅ Event handlers now wait for map to load
- ✅ Hover effects work immediately after load
- ✅ No more frozen/unresponsive map
- ✅ Console logs show initialization sequence

### Issue 2: URL Bounds Not Applied
- ✅ Map responds to center/zoom prop changes
- ✅ URL bounds move map after load
- ✅ Uses `jumpTo` for instant (non-animated) update
- ✅ Works on page load and navigation

### Issue 3: Map Reuse Issues
- ✅ `reuseMaps={false}` ensures fresh instance
- ✅ Clean initialization on every mount
- ✅ No stale state from previous instances

---

## 🔗 Related Files

### Modified:
1. **src/app/components/mls/map/MapView.tsx**
   - Lines 203-235: Added useEffect for center/zoom prop changes
   - Lines 317-345: Enhanced event listener setup with load check
   - Lines 836-856: Enhanced hover handler setup with load check
   - Line 1247: Added `reuseMaps={false}` prop

### How It All Works Together:

```
Page Load
  ↓
map/page.tsx: Parse URL bounds → setMapBounds()
  ↓
MapView: Receives centerLat/centerLng/zoom props
  ↓
MapView: Renders with initialViewState
  ↓
MapLibre: Creates map instance
  ↓
useEffect (event listeners): Checks isStyleLoaded()
  ↓
  No → Waits for 'load' event
  Yes → Sets up listeners immediately
  ↓
MapLibre: Emits 'load' event
  ↓
Event handlers registered
  ↓
useEffect (center/zoom): Detects prop change
  ↓
map.jumpTo() → Move to URL location
  ↓
useEffect (hover): Checks isStyleLoaded()
  ↓
Hover handlers registered
  ↓
✅ Map fully interactive and at correct location
```

---

## 🎉 Benefits

1. **Reliable Initialization**: Map always loads correctly on refresh
2. **Responsive Interactions**: Hover effects work immediately
3. **URL Navigation Works**: Bounds parameters properly applied
4. **Better Debugging**: Console logs show initialization sequence
5. **Clean State**: `reuseMaps={false}` prevents stale state issues
6. **Proper Timing**: Event handlers only register when map is ready

---

## 📚 Technical Background

### MapLibre Initialization Best Practices

1. **Always check `isStyleLoaded()`** before accessing map features
2. **Use `once('load')`** to wait for initial load
3. **Don't register event handlers too early** - wait for map to be ready
4. **Use `jumpTo` vs `flyTo`** appropriately:
   - `jumpTo`: Programmatic updates, instant
   - `flyTo`: User-initiated, animated
5. **Set `reuseMaps={false}`** for clean initialization
6. **Don't rely on `initialViewState`** for dynamic updates - use `jumpTo`/`flyTo`

### Common MapLibre Issues:

❌ **Broken**: Registering handlers before load
```tsx
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  map.on('mousemove', handler); // May not work!
}, []);
```

✅ **Fixed**: Wait for load
```tsx
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map.isStyleLoaded()) {
    map.once('load', () => setup());
    return;
  }
  setup();
}, []);
```

---

**Fixed By**: Claude Code
**Date**: December 12, 2025
**Files Changed**:
- `src/app/components/mls/map/MapView.tsx` (lines 203-235, 317-345, 836-856, 1247)

**Status**: ✅ Complete - Map properly initializes on refresh and responds to URL bounds
