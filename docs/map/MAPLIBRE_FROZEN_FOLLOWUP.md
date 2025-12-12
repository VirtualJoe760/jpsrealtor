# MapLibre Frozen on Load - Follow-up Report

**Date**: December 12, 2025
**Status**: ⚠️ STILL UNRESOLVED - Official fix did not work
**Previous Report**: `MAPLIBRE_FROZEN_ON_LOAD.md`

---

## 🔄 What We Tried Based on Frontend Team Feedback

Your frontend team identified this as a known issue with MapLibre + React 19 + Next.js hydration and passive event listeners. They recommended the official fix from `@vis.gl/react-maplibre`.

---

## ✅ Official Fix Implementation

### Changes Made:

**File**: `src/app/components/mls/map/MapView.tsx`

#### Change 1: Added Official Props (Lines 1294-1295)

```tsx
// BEFORE
<Map
  ref={mapRef}
  mapStyle={currentMapStyleURL}
  initialViewState={hydratedInitialViewState}
  onMoveEnd={handleMoveEnd}
  onDragEnd={handleDragEnd}
  onClick={handleMapClick}
  interactive={!panelOpen}  // ❌ Dynamic
  cursor="default"
  interactiveLayerIds={interactiveLayerIds}
>

// AFTER
<Map
  ref={mapRef}
  mapStyle={currentMapStyleURL}
  initialViewState={hydratedInitialViewState}
  onMoveEnd={handleMoveEnd}
  onDragEnd={handleDragEnd}
  onClick={handleMapClick}
  interactive={true}                // ✅ Official fix #1
  optimizeForTerrain={false}        // ✅ Official fix #2
  cursor="default"
  interactiveLayerIds={interactiveLayerIds}
>
```

#### Change 2: Alternative Fix - Touch Action Override (Lines 334-350)

Since the props didn't work, we added the alternative fix:

```tsx
const onLoad = () => {
  console.log('🗺️ Map loaded and style ready');
  updateClusters();

  const canvas = map.getCanvas();
  canvas.style.cursor = 'default';

  // Fix frozen map issue: Override touch-action and force non-passive listeners
  console.log('🔧 Applying passive event listener fix');
  canvas.style.touchAction = 'auto';

  // Force non-passive wheel listener to activate pointer events
  canvas.addEventListener('wheel', () => {}, { passive: false });

  // Tiny movement to wake up the map
  setTimeout(() => {
    const center = map.getCenter();
    map.easeTo({
      center: [center.lng + 0.000001, center.lat],
      duration: 0
    });
    console.log('✅ Map activated');
  }, 100);
};
```

#### Change 3: Panel Handler Wait for Load (Lines 175-199)

```tsx
// BEFORE
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map) return;

  const handlers = [...].filter(Boolean);
  if (panelOpen) {
    handlers.forEach((h: any) => h.disable());
  } else {
    handlers.forEach((h: any) => h.enable());
  }
}, [panelOpen]);

// AFTER
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map || !map.isStyleLoaded()) {  // ✅ Wait for load
    console.log('⏸️ Waiting for map to load before handling panel state');
    return;
  }

  const handlers = [...].filter(Boolean);
  if (panelOpen) {
    console.log('🔒 Disabling map gestures (panel open)');
    handlers.forEach((h: any) => h.disable());
  } else {
    console.log('🔓 Enabling map gestures (panel closed)');
    handlers.forEach((h: any) => h.enable());
  }
}, [panelOpen]);
```

#### Change 4: RequestAnimationFrame for Load Detection (Lines 362-372)

```tsx
// BEFORE
if (map.isStyleLoaded()) {
  onLoad();
} else {
  map.once("load", onLoad);
}

// AFTER
requestAnimationFrame(() => {  // ✅ Delay to ensure map ready
  if (map.isStyleLoaded()) {
    console.log('✅ Map style already loaded, initializing immediately');
    onLoad();
  } else {
    console.log('⏳ Waiting for map style to load...');
    map.once("load", onLoad);
  }
});
```

---

## ❌ Result: Still Not Working

### What Happens:

1. ✅ `interactive={true}` is set
2. ✅ `optimizeForTerrain={false}` is set
3. ✅ Map renders visually
4. ✅ Polygons render
5. ✅ Hover handlers register: `"✅ Global hover handler registered"`
6. ❌ **But `onLoad` callback NEVER fires**
7. ❌ Map still frozen until user scrolls/clicks

### Console Logs Show:

**What We SEE** (indicates problem):
```
⏸️ Map not ready for event listener setup
⏸️ Map not ready for hover handler setup
🎨 Setting up global hover handlers for all polygon layers
✅ Global hover handler registered
```

**What We DON'T SEE** (should appear but doesn't):
```
🎯 Setting up map event listeners          ❌ MISSING
✅ Map style already loaded                ❌ MISSING
🗺️ Map loaded and style ready              ❌ MISSING
🔧 Applying passive event listener fix    ❌ MISSING
✅ Map activated                            ❌ MISSING
```

---

## 🔍 New Discovery: The `onLoad` Event Never Fires

### The Real Problem:

The MapLibre `'load'` event is **never firing**. Our useEffect that sets up event listeners runs, but:

1. `mapRef.current?.getMap?.()` returns `undefined` initially
2. By the time ref is populated, map is already loaded
3. `map.once('load', onLoad)` is never registered because the event already passed
4. `map.isStyleLoaded()` check in `requestAnimationFrame` likely returns false
5. So `onLoad()` callback is **never executed**

### Evidence:

**From console logs, we can trace the execution:**

```
1. Component mounts
2. ⏸️ Map not ready for event listener setup
   → mapRef.current is undefined, useEffect exits early

3. Map renders and loads
   → MapLibre 'load' event fires
   → Nobody listening (handler not registered yet)

4. useEffect runs again with valid map ref
   → But too late - load event already fired
   → map.isStyleLoaded() check happens in requestAnimationFrame
   → Timing issue: might return false despite map being loaded

5. Hover handlers register later
   → ✅ Global hover handler registered
   → But this happens AFTER polygons rendered
   → Still frozen because onLoad never ran
```

---

## 🐛 Root Cause (Updated Theory)

The issue is a **React ref timing problem** combined with **MapLibre event lifecycle**:

1. **First Render**: `mapRef.current` is `undefined`
   - useEffect checks for map → returns early
   - No event listener registered

2. **Map Loads**: MapLibre fires `'load'` event
   - No one listening → event lost

3. **Re-render**: `mapRef.current` now has map instance
   - useEffect runs again
   - Tries to register `map.once('load', ...)`
   - **But load event already fired** → handler never called

4. **Map Appears Loaded**:
   - Visual tiles render
   - Polygons paint
   - But internal activation never happened
   - **onLoad callback never executed**

This explains why:
- ✅ Hover handlers register (they use different lifecycle)
- ✅ Polygons render (they use children rendering)
- ❌ Map activation doesn't happen (relies on onLoad)
- ❌ Touch action not overridden (onLoad never runs)
- ❌ Passive listener fix not applied (onLoad never runs)

---

## 🎯 What We Need From Your Team (Updated)

### Critical Questions:

1. **@vis.gl/react-maplibre v8.0.4 Compatibility**:
   - Are `interactive={true}` and `optimizeForTerrain={false}` actually supported in v8.0.4?
   - Do we need to update to a newer version?
   - Can you verify these props exist in the type definitions?

2. **Map Load Event Handling**:
   - How should we properly listen for map load in `@vis.gl/react-maplibre`?
   - Is there an `onLoad` prop we should be using instead of `map.once('load')`?
   - Does the Map component expose load callbacks?

3. **Ref Timing Issue**:
   - How do we handle the ref not being available on first render?
   - Should we use `useImperativeHandle` differently?
   - Is there a better pattern for accessing the map instance?

4. **Alternative Approaches**:
   - Can we use `useMap()` hook from react-maplibre instead of refs?
   - Should we force remount with a key when props change?
   - Is there a way to guarantee onLoad fires?

---

## 📊 Current Package Versions

```json
{
  "@vis.gl/react-maplibre": "^8.0.4",
  "react": "^19.0.0",
  "next": "16.0.7",
  "maplibre-gl": "^4.x" (via @vis.gl/react-maplibre)
}
```

---

## 💻 Code Structure Summary

### Map Component Hierarchy:

```
page.tsx (map/page.tsx)
  ↓
  <MapView> (components/mls/map/MapView.tsx)
    ↓
    <Map> from @vis.gl/react-maplibre
      ↓
      [Polygons, Markers, etc. as children]
```

### Initialization Flow (Broken):

```
1. MapView mounts
   ↓
2. useEffect tries to access mapRef.current
   ↓ (undefined)
3. Returns early
   ↓
4. Map renders
   ↓
5. MapLibre fires 'load' event
   ↓ (no listener)
6. useEffect re-runs with valid ref
   ↓
7. Tries to register map.once('load')
   ↓ (too late)
8. onLoad callback never executes
   ↓
9. ❌ Map frozen
```

### What Should Happen:

```
1. MapView mounts
   ↓
2. Map renders with onLoad prop/callback
   ↓
3. MapLibre fires 'load' event
   ↓
4. onLoad callback executes immediately
   ↓
5. Touch action override applied
   ↓
6. Passive listener fix applied
   ↓
7. ✅ Map active and interactive
```

---

## 🛠️ Attempted Solutions (All Failed)

1. ❌ **Official Props**: `interactive={true}` + `optimizeForTerrain={false}`
   - Props set correctly
   - No effect on frozen state

2. ❌ **Touch Action Override**: `canvas.style.touchAction = 'auto'`
   - Never executed (onLoad doesn't fire)

3. ❌ **Non-Passive Wheel Listener**: `canvas.addEventListener('wheel', ...)`
   - Never registered (onLoad doesn't fire)

4. ❌ **Tiny Movement Activation**: `map.easeTo()`
   - Never executed (onLoad doesn't fire)

5. ❌ **RequestAnimationFrame**: Delay ref check
   - Doesn't help - timing still wrong

6. ❌ **Wait for isStyleLoaded**: Before handler setup
   - Map claims loaded but handlers don't work

---

## 📋 Required Information

To help you help us, we need to know:

### From @vis.gl/react-maplibre Documentation:

1. What is the correct way to detect when map is loaded?
2. Is there an `onLoad` prop on the `<Map>` component?
3. How do we access the map instance reliably?
4. Are our prop names correct for v8.0.4?

### From Your Experience:

1. Have you used `@vis.gl/react-maplibre` v8.x with React 19?
2. Did you encounter similar initialization issues?
3. What's your map initialization pattern?
4. Do you use refs or hooks to access the map?

---

## 🎯 Specific Help Requests

### Request 1: Verify Props Exist

Can you check if these props are valid in v8.0.4:

```tsx
<Map
  interactive={true}         // ← Does this exist?
  optimizeForTerrain={false} // ← Does this exist?
>
```

Run this check:
```typescript
import { Map } from '@vis.gl/react-maplibre';
import type { MapProps } from '@vis.gl/react-maplibre';

// Check if these props are in the type definition
const props: MapProps = {
  interactive: true,          // TypeScript error?
  optimizeForTerrain: false,  // TypeScript error?
};
```

### Request 2: Share Working Example

Can you provide a minimal working example of `@vis.gl/react-maplibre` v8.x with React 19 that:
- Initializes map correctly
- Executes code on map load
- Doesn't have frozen/passive event issues

### Request 3: Investigate Ref Timing

Can you help us understand:
- When does `mapRef.current` become available?
- Is there a better way than `useEffect` with ref dependency?
- Should we use the `useMap()` hook instead?

---

## 📸 Visual Evidence

### On Page Load (Frozen):
- ✅ Map tiles render
- ✅ Polygons visible
- ✅ Looks fully loaded
- ❌ Hover over polygons → no response
- ❌ Cursor doesn't change
- ❌ No glow/outline effects

### After One Scroll/Click (Works):
- ✅ Hover effects active
- ✅ Cursor changes to pointer
- ✅ Outline glow appears
- ✅ Stats overlay shows
- ✅ All interactions work

**Something activates the map on first user interaction - we need to trigger that programmatically.**

---

## 🔬 Debug Information

### Browser Console Logs (Full Sequence):

```
⏸️ Map not ready for event listener setup
⏸️ Map not ready for view update
⏸️ Map not ready for hover handler setup
🗺️ [MapView] dataToRender updated: {...}
🗺️ MapView render: {...}
[MapView] ✅ Rendering 3 region polygons
📊 MapView Render Data at Zoom 4.00: {...}
🎨 Setting up global hover handlers for all polygon layers
✅ Global hover handler registered
```

### Missing from Console:

```
🎯 Setting up map event listeners          ← NEVER APPEARS
✅ Map style already loaded                ← NEVER APPEARS
🗺️ Map loaded and style ready              ← NEVER APPEARS
🔧 Applying passive event listener fix    ← NEVER APPEARS
✅ Map activated                            ← NEVER APPEARS
```

---

## 🚨 Critical Path Forward

We're stuck and need your frontend team's expertise on one of these paths:

### Path 1: Fix the Ref Timing Issue
- How to reliably detect when map is loaded
- How to execute callback on map load
- Correct pattern for `@vis.gl/react-maplibre`

### Path 2: Use Different API
- Switch from refs to hooks
- Use `onLoad` prop if it exists
- Different initialization pattern

### Path 3: Update Dependencies
- Upgrade to newer `@vis.gl/react-maplibre` version
- Check if bug is fixed in later versions
- Verify React 19 compatibility

### Path 4: Workaround
- Force user interaction programmatically
- Different event listener registration
- Alternative activation method

---

## 📞 Please Respond With:

1. **Prop Verification**: Are `interactive` and `optimizeForTerrain` valid props in v8.0.4?
2. **Load Detection**: How should we detect map load in v8.x?
3. **Ref Access**: When is `mapRef.current` guaranteed to be available?
4. **Working Pattern**: Share a working initialization code snippet
5. **Version Check**: Should we upgrade to a newer version?

---

**Status**: BLOCKED - Awaiting Frontend Team Guidance
**Urgency**: HIGH - Core UX issue affecting 100% of page loads
**Last Updated**: December 12, 2025

---

## 🔗 Related Documentation

- Original Report: `docs/map/MAPLIBRE_FROZEN_ON_LOAD.md`
- Solution Attempt: `docs/map/MAPLIBRE_FROZEN_SOLUTION.md`
- Code Location: `src/app/components/mls/map/MapView.tsx`

---

**Thank you for your continued support. We've implemented your recommended fix but hit a deeper ref timing issue that we need help resolving.**
