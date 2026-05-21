# MapLibre Map Frozen/Unresponsive on Page Load - Investigation & Attempted Fixes

**Date**: December 12, 2025
**Issue**: Map appears loaded but is non-interactive until user scrolls/clicks
**Status**: ⚠️ UNRESOLVED - Multiple fix attempts unsuccessful
**Severity**: HIGH - Core user experience issue

---

## 🐛 The Problem

### Symptoms:
1. User refreshes the page or loads `/map` for the first time
2. Map renders visually - tiles load, California boundaries show correctly
3. Map appears fully loaded - no loading spinners
4. **BUT**: Map is completely non-interactive:
   - Hovering over regions/counties/cities shows NO hover effects
   - No outline glow on polygons
   - No stats overlay appears
   - Cursor doesn't change to pointer
   - Map appears "frozen" or "sleeping"
5. **ANY user interaction wakes it up**:
   - Scroll wheel zoom
   - Click and drag
   - Click anywhere on map
6. After first interaction, map works perfectly - all hover effects active

### User Impact:
- Confusing UX - map looks ready but doesn't respond
- Requires user to "discover" they need to interact first
- Appears broken on initial load
- Degrades perceived quality of application

---

## 🔍 Technical Investigation

### Timeline of Discovery:

This issue has existed since **before** we switched to the boundaries-based clustering method. It is a **core MapLibre initialization problem**, not related to:
- ❌ Polygon hover handlers (those work fine after first interaction)
- ❌ Boundary data loading
- ❌ React component lifecycle
- ❌ Data fetching delays

### What We Know:

1. **Map is technically loaded**:
   - `map.isStyleLoaded()` returns `true`
   - `onLoad` event fires correctly
   - All layers are added successfully
   - Event listeners are registered

2. **Event listeners ARE attached**:
   - Console logs show hover handler registration
   - `map.on('mousemove', handler)` executes
   - Handlers exist in memory

3. **First interaction triggers activation**:
   - Even a tiny scroll (1px zoom) activates everything
   - Click on map activates it
   - Any programmatic map movement (jumpTo, flyTo) activates it

4. **Only happens on page refresh/initial load**:
   - Navigation within app works fine
   - Style changes work fine
   - Only fresh page loads exhibit the issue

---

## 🛠️ Fix Attempts (All Failed)

### Attempt 1: Wait for Style Load Before Event Handlers

**Hypothesis**: Event handlers registering before map fully loaded

**Implementation**:
```tsx
useEffect(() => {
  const map = mapRef.current?.getMap?.();
  if (!map) return;

  if (!map.isStyleLoaded()) {
    map.once('load', onLoad);
    return;
  }

  onLoad();
}, []);
```

**Result**: ❌ Failed - Map still frozen on load

---

### Attempt 2: Add `reuseMaps={false}` Prop

**Hypothesis**: Map instance reuse causing stale state

**Implementation**:
```tsx
<Map
  ref={mapRef}
  reuseMaps={false}  // Force fresh instance
  // ... other props
/>
```

**Result**: ❌ Failed - Actually made things worse, removed it

---

### Attempt 3: Force Resize and Repaint

**Hypothesis**: Canvas not properly sized or rendered

**Implementation**:
```tsx
const onLoad = () => {
  updateClusters();

  setTimeout(() => {
    map.resize();
    map.triggerRepaint();
  }, 100);
};
```

**Result**: ❌ Failed - Map still frozen

---

### Attempt 4: Multiple Aggressive Wake-Up Techniques

**Hypothesis**: Need to force multiple rendering passes

**Implementation** (Current):
```tsx
const onLoad = () => {
  updateClusters();

  setTimeout(() => {
    // Technique 1: Resize
    map.resize();

    // Technique 2: Force repaint
    map.triggerRepaint();

    // Technique 3: Tiny zoom change to force render
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom + 0.0001);
    setTimeout(() => {
      map.setZoom(currentZoom);
    }, 10);

    // Technique 4: Force canvas focus
    const canvas = map.getCanvas();
    canvas.focus();

    // Technique 5: Dispatch synthetic mouse event
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: canvas.width / 2,
      clientY: canvas.height / 2
    });
    canvas.dispatchEvent(moveEvent);
  }, 150);
};
```

**Result**: ⏳ Testing - Likely to fail based on pattern

---

## 💡 Current Theories

### Theory 1: WebGL Context Not Activated

MapLibre uses WebGL for rendering. The WebGL context might not be fully activated until there's actual user interaction with the canvas.

**Evidence**:
- Visual tiles render (basic canvas)
- Interactive layers don't paint (WebGL)
- User interaction activates WebGL context

**Potential Solutions**:
- Force WebGL context activation
- Trigger WebGL draw calls
- Investigate MapLibre's internal WebGL state

---

### Theory 2: React 19 / Next.js 16 Hydration Issue

Next.js 16 with React 19 has new hydration behavior. The map might be rendering server-side and client-side hydration is incomplete.

**Evidence**:
- Issue only on page load (hydration time)
- Works fine after hydration complete
- Component marked "use client" but may still pre-render

**Potential Solutions**:
- Force client-side only rendering with dynamic import
- Add hydration boundary
- Check React 19 concurrent rendering conflicts

---

### Theory 3: MapLibre Internal State Machine

MapLibre might have an internal state machine that requires user interaction to transition from "loaded" to "interactive".

**Evidence**:
- `isStyleLoaded()` returns true but map not interactive
- No public API to force "interactive" state
- User interaction triggers state transition

**Potential Solutions**:
- Find MapLibre internal state hooks
- Research MapLibre issues for similar problems
- Check MapLibre GL JS source code for state management

---

### Theory 4: Event Loop / Microtask Queue Issue

The event listeners might be attached in a microtask that hasn't executed when the map appears loaded.

**Evidence**:
- Console logs show handlers registered
- But handlers don't fire until user interaction
- Timing-sensitive issue

**Potential Solutions**:
- Use `requestAnimationFrame` instead of `setTimeout`
- Double-RAF pattern to ensure paint
- Force event loop flush

---

## 📊 Browser Analysis

### What Happens in DevTools:

**On Page Load**:
```
1. Map container renders (visible)
2. MapLibre initializes
3. Style loads
4. Tiles paint
5. 'load' event fires
6. Event listeners register
7. ⚠️ No hover events fire when cursor moves
8. ⚠️ Canvas doesn't respond to mouse
```

**After First Interaction** (e.g., scroll):
```
1. User scrolls wheel
2. Zoom event fires
3. ✅ Map suddenly "wakes up"
4. ✅ Hover events start firing
5. ✅ All interactions work perfectly
```

### Canvas State:

**Before Interaction**:
- Canvas width/height set correctly
- WebGL context exists
- Layers added to map
- BUT: Event listeners don't receive events

**After Interaction**:
- Same canvas
- Same context
- Same layers
- Event listeners NOW receive events

**Something changes internally in MapLibre** - not in our code.

---

## 🔬 Debugging Steps Taken

1. ✅ Verified event handlers register
2. ✅ Verified map.isStyleLoaded() = true
3. ✅ Verified layers exist on map
4. ✅ Verified canvas has correct dimensions
5. ✅ Verified no JavaScript errors
6. ✅ Verified React render cycle completes
7. ✅ Verified data loads correctly
8. ✅ Verified polygon data exists
9. ✅ Tested multiple force-render techniques
10. ✅ Tested focus, repaint, resize

**None of these revealed root cause.**

---

## 🎯 What We Need From Your Team

### Investigation Requests:

1. **MapLibre GL JS Experts**:
   - Have you seen this "frozen on load" issue before?
   - Is there a known workaround or initialization sequence?
   - Are there internal state flags we should check?
   - Could this be a MapLibre GL JS bug?

2. **React 19 / Next.js 16 Experts**:
   - Could this be a hydration issue?
   - Should we use dynamic imports with `ssr: false`?
   - Are there known issues with MapLibre + React 19?
   - Could concurrent rendering be causing this?

3. **WebGL Experts**:
   - How do we force WebGL context activation?
   - Could this be a WebGL state issue?
   - Are there WebGL debug flags we can enable?
   - How to check WebGL readiness state?

4. **Performance/Browser Experts**:
   - Could this be a browser rendering optimization?
   - Are there browser APIs to force paint?
   - Could this be related to requestIdleCallback?
   - Is there a way to debug event listener activation?

---

## 📋 Code References

### Files Involved:

1. **src/app/components/mls/map/MapView.tsx**
   - Lines 316-370: Map initialization and onLoad handler
   - Lines 841-998: Hover event handler setup
   - Lines 1261-1273: Map component render

2. **src/app/map/page.tsx**
   - Lines 434-464: Map rendering conditional
   - Lines 162-208: Initial mount and URL parsing

### Current Workaround:

**None** - Users must interact with map to activate it.

---

## 🚨 Priority & Impact

### Priority: HIGH

**Reasons**:
1. Affects 100% of users on every page load
2. Core functionality appears broken
3. Degrades user experience significantly
4. Reflects poorly on application quality

### User Stories Affected:

- "As a user, I want to browse properties on the map immediately after page load"
- "As a user, I expect hover effects to work without needing to scroll first"
- "As a user, I expect the map to be fully interactive when it appears loaded"

---

## 🔗 Related Resources

### MapLibre GL JS:
- Version: Latest from `@vis.gl/react-maplibre`
- Docs: https://maplibre.org/maplibre-gl-js/docs/
- GitHub: https://github.com/maplibre/maplibre-gl-js

### React MapLibre:
- Package: `@vis.gl/react-maplibre`
- GitHub: https://github.com/visgl/react-maplibre
- Docs: https://visgl.github.io/react-maplibre/

### Similar Issues (Research):
- MapLibre issues with "map not interactive on load"
- React 19 hydration issues with canvas elements
- WebGL context activation timing issues
- Event listener registration timing in React

---

## ✅ Success Criteria

The issue will be considered **RESOLVED** when:

1. ✅ User refreshes `/map` page
2. ✅ Map loads and displays correctly
3. ✅ **Immediately** (without any user interaction):
   - Hovering over regions shows outline glow
   - Stats overlay appears on hover
   - Cursor changes to pointer
   - All interactive features work
4. ✅ Behavior is consistent across browsers
5. ✅ No performance degradation from fix
6. ✅ Fix doesn't introduce new bugs

---

## 📞 Next Steps

1. **Share this document** with frontend team
2. **Collaborative debugging session** with MapLibre experts
3. **Research MapLibre source code** for state management
4. **Test with minimal reproduction** (isolated MapLibre component)
5. **Check MapLibre GitHub issues** for similar reports
6. **Consider alternative map libraries** if unfixable (last resort)

---

## 📝 Additional Notes

### Observations:

- This is NOT a data loading issue
- This is NOT a React component issue
- This is NOT a hover handler issue
- This is a **MapLibre internal state issue**

The map is technically loaded and ready, but something in MapLibre's internal state machine prevents it from being interactive until there's user input.

### Workaround Considered:

**Auto-trigger interaction on load**:
```tsx
// Force a tiny pan on load to wake up map
setTimeout(() => {
  const center = map.getCenter();
  map.panTo([center.lng + 0.0001, center.lat]);
}, 200);
```

**Status**: Not implemented - feels like a hack, might cause visual glitch

---

## 🤝 Help Needed

**We need your expertise to solve this.**

If you've encountered this issue before, or have deep knowledge of MapLibre GL JS, React 19, or WebGL, please:

1. Review this document
2. Test the issue yourself at `/map`
3. Examine the code references
4. Share any insights or solutions
5. Collaborate on debugging

**This is a critical UX issue that affects every user on every page load.**

---

**Document Created**: December 12, 2025
**Created By**: Claude Code
**Last Updated**: December 12, 2025
**Status**: UNRESOLVED - Seeking Frontend Team Input

---

## 🎬 Demo Steps (For Your Team to Reproduce)

1. Open fresh browser window
2. Navigate to `/map`
3. Wait for map to fully load (tiles visible, no spinners)
4. **Do NOT scroll or click**
5. Move mouse over California regions (North/Central/South)
6. **Expected**: Hover glow and stats overlay
7. **Actual**: Nothing happens - map frozen
8. Now scroll wheel or click once
9. **Immediately**: Hover effects work perfectly

**This is the bug we need to fix.**
