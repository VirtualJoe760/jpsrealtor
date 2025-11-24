# Carousel Auto-Scroll & Map Zoom Debug Report
**Date**: November 23, 2025
**Issues**:
1. Carousel panels not auto-scrolling
2. Map loads blank, zooms out, then zooms in (incorrect initial state)

---

## Issue 1: Carousel Auto-Scroll Not Working

### What Was Attempted

#### Attempt 1: Initial Smooth Scroll Implementation
**File**: `src/app/components/chat/ListingCarousel.tsx:221-252`

**What was done**:
- Replaced interval-based scroll (every 4 seconds) with `requestAnimationFrame`
- Used continuous pixel-by-pixel scrolling (0.5px per frame, then changed to 1px)
- Added loop logic: when `scrollLeft >= maxScroll`, reset to 0

**Code implemented**:
```typescript
useEffect(() => {
  if (!isAutoScrollEnabled || visibleListings.length <= 1) return;

  const scrollSpeed = 1; // pixels per frame

  const smoothScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;

      container.scrollLeft += scrollSpeed;

      if (container.scrollLeft >= maxScroll - 1) {
        container.scrollLeft = 0;
      }
    }

    animationFrameRef.current = requestAnimationFrame(smoothScroll);
  };

  animationFrameRef.current = requestAnimationFrame(smoothScroll);

  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, [isAutoScrollEnabled, visibleListings.length]);
```

**Why it might not be working**:
1. `scrollContainerRef.current` might be null when effect runs
2. CSS `scroll-smooth` class might be interfering with programmatic scroll
3. Snap scrolling (`snap-x snap-mandatory`) might be preventing continuous scroll
4. Browser may be preventing scroll changes during render
5. Effect dependencies might be causing re-initialization too frequently

#### Attempt 2: Event Handler Updates
**File**: `src/app/components/chat/ListingCarousel.tsx:253-293, 322-331`

**What was done**:
- Changed state refs from `autoScrollIntervalRef` to `animationFrameRef` and `pauseTimeoutRef`
- Implemented pause/resume logic:
  - `handleMouseEnter`: Pauses scroll
  - `handleMouseLeave`: Resumes immediately
  - `handleWheel`: Pauses scroll, resumes after 3s
  - `handleTouchStart/End`: Pauses scroll, resumes after 3s

**Event handlers on scroll container**:
```tsx
<div
  ref={scrollContainerRef}
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
  onWheel={handleWheel}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

**Potential issues**:
1. No verification that handlers are actually being called
2. State updates (`setIsAutoScrollEnabled`) might not trigger re-render properly
3. Timeout logic might be clearing scroll before it starts

### Related Files

#### Primary File
- **`src/app/components/chat/ListingCarousel.tsx`**
  - Lines 79-83: State declarations
  - Lines 221-252: Auto-scroll useEffect
  - Lines 253-293: Event handlers
  - Lines 322-331: Scroll container div with event handlers
  - Lines 347-354: Individual card elements

#### CSS Classes That Might Interfere
- Line 324: `scroll-smooth` - might prevent programmatic scrolling
- Line 324: `snap-x snap-mandatory snap-center` - snap points might interfere
- Line 324: `overflow-x-auto` - scroll behavior settings

#### Dependencies
- React hooks: `useState`, `useRef`, `useEffect`
- Browser APIs: `requestAnimationFrame`, `cancelAnimationFrame`

### Diagnostic Questions Needed

1. **Is the effect running?**
   - Add console.log in useEffect to verify execution
   - Check if `scrollContainerRef.current` is null

2. **Is scrollLeft actually changing?**
   - Log `container.scrollLeft` value each frame
   - Verify maxScroll calculation is correct

3. **Are CSS classes preventing scroll?**
   - Try removing `scroll-smooth`
   - Try removing snap scrolling classes

4. **Is state management working?**
   - Log `isAutoScrollEnabled` value
   - Check if state changes trigger effect re-run

---

## Issue 2: Map Zoom Loading Incorrectly

### What Was Attempted

#### Attempt 1: Increased MaxZoom and Reduced Padding
**File**: `src/app/components/chat/ChatMapView.tsx:128-138`

**What was done**:
- Changed `maxZoom` from 12 → 15 → **17**
- Changed `padding` from 40 → **20**

**Code**:
```typescript
map.fitBounds(
  [
    [mapBounds.west, mapBounds.south],
    [mapBounds.east, mapBounds.north],
  ],
  {
    padding: 20,
    maxZoom: 17,
    duration: 0, // Instant fit (no animation)
  }
);
```

**Why it's not working**:
1. `fitBounds` is called AFTER map is already rendered
2. Initial map render uses different zoom settings
3. Multiple renders causing zoom state changes

### The Real Problem

**Map loads in this sequence**:
1. **Blank** - Map component mounts but tiles not loaded
2. **Zoomed out** - Initial viewport from `initialViewState` (lines 233-237)
3. **Zooms in** - fitBounds effect runs (lines 124-141)

**Root cause**: Two competing zoom sources

#### Source 1: initialViewState (Line 233-237)
```typescript
initialViewState={{
  latitude: centerLat,
  longitude: centerLng,
  zoom: 11, // ← This is used first
}}
```

#### Source 2: fitBounds useEffect (Line 124-141)
```typescript
useEffect(() => {
  if (mapRef.current && mapBounds) {
    const map = mapRef.current.getMap();
    if (map) {
      map.fitBounds(...);  // ← This runs AFTER initial render
    }
  }
}, [mapBounds]);
```

**The sequence**:
1. Map mounts with zoom: 11 (initialViewState)
2. Effect runs and calls fitBounds with maxZoom: 17
3. Visual result: Zoom transition from 11 → 17

### Related Files

#### Primary File
- **`src/app/components/chat/ChatMapView.tsx`**
  - Lines 94-119: `calculateBounds` function
  - Lines 122: `mapBounds` calculation
  - Lines 124-141: fitBounds useEffect
  - Lines 205-206: Center lat/lng calculation
  - Lines 231-256: Map component with initialViewState
  - Lines 233-237: initialViewState configuration

#### Map Component Props
- Line 238: `mapStyle` - Light/dark map tiles
- Line 239: `mapLib` - MapLibre GL import
- Lines 242-248: Interaction disabled (scrollZoom, dragPan, etc.)

#### Bounds Calculation
- Lines 94-119: Determines map viewport
- Line 110: Padding calculation (15% of bounds)
- Issues:
  - Padding added to bounds might conflict with fitBounds padding
  - Bounds calculated before map exists

### Potential Solutions Not Yet Tried

#### For Carousel Auto-Scroll:
1. **Remove CSS conflicts**:
   - Remove `scroll-smooth` class
   - Remove `snap-x snap-mandatory` classes
   - Test with basic `overflow-x-auto` only

2. **Simplify scroll logic**:
   - Use setInterval instead of requestAnimationFrame
   - Increase scroll speed to make it more obvious
   - Remove all pause/resume logic temporarily to test basic scroll

3. **Add debugging**:
   - Console.log every frame
   - Log ref availability
   - Log scroll position changes

4. **Alternative approach**:
   - Use CSS animations instead of JS
   - Use transform: translateX instead of scrollLeft
   - Duplicate listings at end to create infinite loop effect

#### For Map Zoom:
1. **Remove initialViewState zoom**:
   - Don't set initial zoom at all
   - Let fitBounds handle everything from start

2. **Calculate zoom before render**:
   - Pre-calculate appropriate zoom level from bounds
   - Set initialViewState to that zoom
   - Don't use fitBounds effect

3. **Wait for map ready**:
   - Listen for map 'load' event
   - Only call fitBounds after map is fully loaded
   - Might prevent blank/transition states

4. **Use bounds in initialViewState**:
   - Use `bounds` prop instead of `zoom`
   - Let MapLibre calculate zoom from bounds
   - Might eliminate transition

---

## All Related Files

### Carousel System
1. **`src/app/components/chat/ListingCarousel.tsx`** (Primary)
   - Main carousel component with auto-scroll logic
   - Lines of interest: 79-83, 221-252, 253-293, 322-331, 347-354

2. **`src/app/components/chatwidget/IntegratedChatWidget.tsx`**
   - Parent component that renders ListingCarousel
   - Line 1355-1369: Where ListingCarousel is invoked with listings data
   - Passes listings from chat response

3. **`src/types/types.ts`**
   - Listing type definitions
   - Defines structure of listing objects in carousel

### Map System
1. **`src/app/components/chat/ChatMapView.tsx`** (Primary)
   - Mini-map component for chat
   - Lines of interest: 94-119, 122-141, 205-237

2. **`@vis.gl/react-maplibre`** (External library)
   - Map component being used
   - Documentation: https://visgl.github.io/react-maplibre/

3. **MapLibre GL JS** (External library)
   - Underlying map engine
   - Documentation: https://maplibre.org/maplibre-gl-js/docs/

### Shared Dependencies
1. **`src/app/contexts/ThemeContext.tsx`**
   - Theme state used by both components
   - Affects styling but not core functionality

2. **Framer Motion**
   - Used for card animations in carousel
   - Could potentially interfere with scroll

---

## Next Steps for Debugging

### Carousel Auto-Scroll
1. Add console.log statements to verify:
   ```typescript
   console.log('Effect running, isAutoScrollEnabled:', isAutoScrollEnabled);
   console.log('scrollContainerRef.current:', scrollContainerRef.current);
   console.log('scrollLeft:', container.scrollLeft, 'maxScroll:', maxScroll);
   ```

2. Test with minimal CSS:
   - Remove `scroll-smooth`
   - Remove `snap-x snap-mandatory snap-center`
   - See if basic scrolling works

3. Test scroll manually:
   - Open browser console
   - Run: `document.querySelector('.listing-card').parentElement.scrollLeft += 100`
   - Verify manual scroll works

### Map Zoom
1. Add console.log to track render sequence:
   ```typescript
   console.log('Map rendering with center:', centerLat, centerLng);
   console.log('fitBounds called with maxZoom:', 17);
   ```

2. Try removing initialViewState zoom entirely:
   ```typescript
   initialViewState={{
     latitude: centerLat,
     longitude: centerLng,
     // Don't set zoom - let fitBounds handle it
   }}
   ```

3. Try using bounds in initialViewState:
   ```typescript
   initialViewState={{
     bounds: [
       [mapBounds.west, mapBounds.south],
       [mapBounds.east, mapBounds.north],
     ],
     fitBoundsOptions: { padding: 20, maxZoom: 17 }
   }}
   ```

---

**End of Report**
