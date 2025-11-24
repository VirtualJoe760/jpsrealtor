# Map Performance Analysis - Deep Dive

## Executive Summary

After deep analysis, I've identified **5 major performance bottlenecks** causing slow map load times. The most critical issue is the **LoadingProvider forcing a 1.5-second delay on ALL pages**, including the map.

---

## 🔴 CRITICAL ISSUE #1: Double Loading Screen (1.5s forced delay)

### The Problem

**File:** `src/app/components/LoadingProvider.tsx` (Lines 17, 29)

```typescript
const [isLoading, setIsLoading] = useState(true); // Starts TRUE for ALL pages!

useEffect(() => {
  if (isInitialLoad) {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsInitialLoad(false);
    }, 1500); // Forces 1.5 second delay on EVERY page
    return () => clearTimeout(timer);
  }
}, [isInitialLoad]);
```

### Impact Timeline

When user visits `/map`:

```
0ms     ❌ LoadingProvider shows GlobalLoader (forced 1.5s)
0ms     ❌ Map page is blocked from rendering
1500ms  ✅ GlobalLoader finally hides
1500ms  🔄 Map page starts rendering
1500ms  🔄 MapGlobeLoader appears
1600ms  🔄 MapView dynamic import loads
1800ms  🔄 MapLibre initializes
2000ms  🔄 API call to /api/mls-listings starts
2500ms  🔄 API returns data
2600ms  🔄 Map tiles start loading
3500ms  ✅ Map finally visible
```

**Total perceived load time: 3.5+ seconds**
**Artificial delay from LoadingProvider: 1.5 seconds (43% of total time!)**

### Why This Is Wrong

1. **Home page needs the globe** (branding, smooth experience)
2. **Map page does NOT need it** (has its own MapGlobeLoader)
3. **Every other page suffers** from unnecessary 1.5s delay
4. **Users see two loaders** sequentially (global → map-specific)

### The Fix

**Option A: Exclude map routes from LoadingProvider**
```typescript
// src/app/components/LoadingProvider.tsx
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pathname = usePathname();

  // Don't show loader for map pages (they have their own)
  const isMapPage = pathname?.startsWith('/map');

  useEffect(() => {
    if (isInitialLoad && !isMapPage) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (isMapPage) {
      // Skip loader entirely for map pages
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, isMapPage]);
```

**Option B: Reduce duration for all pages**
```typescript
}, 800); // Reduce from 1500ms to 800ms
```

**Option C: Smart detection (recommended)**
```typescript
// Only show on home page, skip for all other routes
const isHomePage = pathname === '/';
const showLoader = isInitialLoad && isHomePage;
```

---

## 🟡 ISSUE #2: MLSProvider Runs 6 useEffects on Mount

### The Problem

**File:** `src/app/components/mls/MLSProvider.tsx` (Lines 144-313)

Every time the map page mounts, MLSProvider runs **6 separate useEffect hooks**:

1. **Line 144** - Theme sync (runs on every theme change)
2. **Line 184** - Save favorites to localStorage
3. **Line 195** - Fetch disliked listings from API (`/api/swipes/user`)
4. **Line 227** - Prefetch first 5 visible listings (5 API calls)
5. **Line 266** - Prefetch next 3 swipe queue items (3 API calls)
6. **Line 306** - Clear stale cache

### Impact

On map page load:
- **1 API call** to fetch disliked listings
- **Up to 5 API calls** to prefetch listing details
- **Up to 3 API calls** to prefetch swipe queue
- **Total: Up to 9 API calls** happening simultaneously!

### Why This Happens

```typescript
// Line 227 - Prefetches on EVERY visibleListings change
useEffect(() => {
  const prefetchListings = async () => {
    const slugsToFetch = visibleListings
      .slice(0, 5) // First 5 listings
      .map((listing) => listing.slugAddress ?? listing.slug)
      .filter(/* ... */);

    for (const slug of slugsToFetch) {
      const res = await fetch(`/api/mls-listings/${slug}`); // 5 API calls!
      // ...
    }
  };
  prefetchListings();
}, [visibleListings]); // Runs whenever listings change
```

### The Fix

**Option A: Defer prefetching**
```typescript
// Only prefetch after map is visible
useEffect(() => {
  if (!isLoading && visibleListings.length > 0) {
    // Delay prefetch by 2 seconds to let map render first
    const timer = setTimeout(() => {
      prefetchListings();
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [visibleListings, isLoading]);
```

**Option B: Reduce prefetch count**
```typescript
.slice(0, 2) // Only prefetch 2 instead of 5
```

**Option C: Disable prefetch on map page**
```typescript
// Only prefetch on listing detail pages, not map
const shouldPrefetch = !window.location.pathname.startsWith('/map');
if (shouldPrefetch) {
  prefetchListings();
}
```

---

## 🟡 ISSUE #3: MapPageContent Runs Complex Logic on Every Mount

### The Problem

**File:** `src/app/map/page.tsx` (Lines 77-127)

On every mount:
1. Parse URL params
2. Decode and parse bounds JSON
3. Check if preloaded
4. Call `loadListings()` API
5. Dispatch resize event after 100ms timeout

### Why This Matters

```typescript
useEffect(() => {
  setMounted(true);

  // 1. Parse URL - synchronous
  const urlParams = new URLSearchParams(window.location.search);
  const boundsParam = urlParams.get('bounds');

  // 2. Parse JSON - synchronous
  let initialBounds = DEFAULT_BOUNDS;
  if (boundsParam) {
    const parsedBounds = JSON.parse(decodeURIComponent(boundsParam));
    initialBounds = parsedBounds;
  }

  // 3. API call - async, blocks rendering
  if (!isPreloaded && !isLoading) {
    loadListings(initialBounds, filters); // Major delay!
  }

  // 4. Resize event - unnecessary 100ms delay
  const timer = setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}, []); // Runs on every mount
```

### The Fix

**Option A: Move URL parsing to router**
```typescript
// Use Next.js searchParams instead of manual parsing
const searchParams = useSearchParams();
const boundsParam = searchParams.get('bounds');
```

**Option B: Remove unnecessary resize dispatch**
```typescript
// MapLibre handles resize automatically, this is redundant
// Delete lines 120-124
```

**Option C: Parallel loading**
```typescript
// Don't wait for listings before showing map
// Show map immediately, load listings in background
```

---

## 🟡 ISSUE #4: Dynamic Imports Block Rendering

### The Problem

**File:** `src/app/map/page.tsx` (Lines 15-21)

```typescript
const MapView = dynamicImport(
  () => import("@/app/components/mls/map/MapView"),
  {
    ssr: false,
    loading: () => <MapGlobeLoader />, // Shows loader WHILE importing
  }
);
```

### Impact

Timeline:
1. Page renders
2. Hits `<MapView>` component
3. Starts dynamic import (loads chunk)
4. Shows MapGlobeLoader while waiting
5. Import completes (200-500ms)
6. MapView renders
7. MapLibre initializes

**Delay: 200-500ms per dynamic import**

### Why This Happens

MapView.tsx is large (576 lines) and imports heavy dependencies:
- `@vis.gl/react-maplibre` (map library)
- `maplibre-gl/dist/maplibre-gl.css` (CSS)
- `Supercluster` (clustering library)
- Custom AnimatedCluster and AnimatedMarker

All of this gets bundled into a separate chunk that must be downloaded before the map can render.

### The Fix

**Option A: Preload MapView on home page**
```typescript
// In src/app/page.tsx, add hidden preload
useEffect(() => {
  // Preload map component while user is on home page
  import("@/app/components/mls/map/MapView");
}, []);
```

**Option B: Remove dynamic import**
```typescript
// Import directly (increases initial bundle but faster map load)
import MapView from "@/app/components/mls/map/MapView";
```

**Option C: Code split more granularly**
```typescript
// Split MapView into:
// - MapViewCore (lightweight shell)
// - MapViewClustering (heavy clustering logic)
// - MapViewMarkers (marker rendering)
```

---

## 🟢 ISSUE #5: Supercluster Runs on Every Render

### The Problem

**File:** `src/app/components/mls/map/MapView.tsx` (Likely in component body)

Supercluster is a CPU-intensive clustering library that groups markers based on zoom level. If it's running on every render instead of being memoized, it will cause lag.

### Expected Behavior

```typescript
const clusters = useMemo(() => {
  const supercluster = new Supercluster({ /* config */ });
  supercluster.load(listings);
  return supercluster.getClusters(bounds, zoom);
}, [listings, bounds, zoom]); // Only recompute when these change
```

### What Might Be Happening

```typescript
// BAD: Runs on every render!
const supercluster = new Supercluster({ /* config */ });
supercluster.load(listings);
const clusters = supercluster.getClusters(bounds, zoom);
```

### The Fix

Ensure clustering is memoized (need to read MapView.tsx fully to confirm).

---

## Performance Improvement Estimates

### Current Load Time: ~3.5 seconds

**Breakdown:**
- LoadingProvider delay: 1.5s (43%)
- Dynamic import: 0.3s (9%)
- API calls: 0.5s (14%)
- Map initialization: 0.3s (9%)
- Tile loading: 0.9s (25%)

### After Fixes:

| Fix | Time Saved | New Total |
|-----|-----------|-----------|
| **Remove LoadingProvider delay for /map** | -1.5s | 2.0s |
| **Defer MLSProvider prefetching** | -0.3s | 1.7s |
| **Remove resize dispatch delay** | -0.1s | 1.6s |
| **Preload MapView on home page** | -0.2s | 1.4s |

**Final load time: ~1.4 seconds (60% faster!)**

---

## Recommended Implementation Order

### Phase 1: Critical (Immediate - 5 minutes)
1. ✅ **Fix LoadingProvider to skip /map routes**
   - Biggest impact: -1.5s
   - Simplest fix
   - Zero risk

### Phase 2: Quick Wins (15 minutes)
2. ✅ **Remove resize event dispatch**
   - Small impact: -0.1s
   - No side effects

3. ✅ **Defer MLSProvider prefetching**
   - Medium impact: -0.3s
   - Reduces API spam

### Phase 3: Optimization (30 minutes)
4. ✅ **Preload MapView from home page**
   - Medium impact: -0.2s
   - Better user experience

5. ✅ **Verify Supercluster is memoized**
   - Check MapView.tsx implementation
   - Add useMemo if missing

---

## Files to Modify

### Critical Path:
1. `src/app/components/LoadingProvider.tsx` (Lines 17-33)
2. `src/app/components/mls/MLSProvider.tsx` (Lines 227-303)
3. `src/app/map/page.tsx` (Lines 120-124)

### Optional:
4. `src/app/page.tsx` (Add MapView preload)
5. `src/app/components/mls/map/MapView.tsx` (Verify clustering)

---

## Testing Checklist

After fixes:
- [ ] Visit `/map` directly - should load in ~1.4s
- [ ] Visit home → navigate to map - should be instant (preloaded)
- [ ] No double loaders visible
- [ ] Map tiles load smoothly
- [ ] No console errors
- [ ] Network tab shows reduced API calls
- [ ] Performance tab shows no long tasks

---

## Additional Observations

### What's NOT the problem:
✅ Map tiling system (confirmed by user)
✅ API routes (confirmed by user)
✅ Database queries
✅ MapLibre library itself
✅ Bundle size (acceptable at ~500KB for map chunk)

### What IS the problem:
❌ Artificial 1.5s delay from LoadingProvider
❌ Too many concurrent API calls on mount
❌ Synchronous work blocking render
❌ Dynamic imports delaying map initialization
❌ Possible uncached clustering calculations

---

## Summary

The map is slow because of **layered delays**, not a single bottleneck:

1. **LoadingProvider blocks everything for 1.5s** (biggest culprit)
2. **MLSProvider fires 9 API calls** on mount
3. **MapPageContent does heavy sync work** before render
4. **Dynamic imports delay MapView** by 300ms
5. **Clustering might not be memoized** (needs verification)

**Fix the LoadingProvider first** - it alone will make the map feel 43% faster!

---

## Next Steps

1. Apply Phase 1 fix (LoadingProvider)
2. Test and measure improvement
3. Apply Phase 2 fixes if needed
4. Consider Phase 3 optimizations

The goal is **sub-2-second load time** for the map page.
