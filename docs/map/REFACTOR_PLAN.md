# Map System Refactor Plan

## Current Problems

### MapPageClient.tsx (699 lines, 29 hooks)
- **TOO MANY RESPONSIBILITIES**: State management, URL params, swipe logic, favorites, filters, map controls
- **Duplicate state**: Has its own filters that should come from context
- **Old cookie-based logic**: Mixing cookies with context
- **No separation of concerns**: Business logic mixed with UI

### MapView.tsx (1271 lines)
- **MASSIVE COMPONENT**: Rendering logic, boundary drawing, clustering display, event handlers
- **Inline styles**: Huge color calculation blocks
- **Duplicated polygon rendering**: Region/county/city polygon code repeated
- **No component extraction**: Everything in one file

### MLSProvider.tsx (523 lines)
- **Unused wrapper functions**: `loadListings` just calls `loadMarkers`
- **Complex prefetch logic**: Should be extracted
- **Mixed concerns**: Context + business logic

## Refactor Strategy

### Phase 1: Extract Utilities
**Goal**: Move reusable logic out of components

1. **`src/app/utils/map/bounds.ts`** - Bounds calculations, viewport math
2. **`src/app/utils/map/colors.ts`** - Color calculations for boundaries
3. **`src/app/utils/map/url-sync.ts`** - URL parameter syncing
4. **`src/app/utils/map/polygons.ts`** - Polygon geometry helpers

### Phase 2: Extract Small Components
**Goal**: Break down MapView

1. **`RegionBoundaries.tsx`** - Region polygon rendering
2. **`CountyBoundaries.tsx`** - County polygon rendering
3. **`CityBoundaries.tsx`** - City polygon rendering
4. **`MarkerLayer.tsx`** - Individual markers/clusters
5. **`MapControls.tsx`** - Zoom, style switcher, etc.

### Phase 3: Simplify State Management
**Goal**: Single source of truth

1. **Remove duplicate filters** from MapPageClient
2. **Use only MLSProvider context**
3. **Extract swipe logic** to `useSwipe` hook
4. **Extract favorites logic** to `useFavorites` hook

### Phase 4: Clean Data Flow
**Goal**: Clear, logged data flow

```
User moves map
  → MapView.onMoveEnd
    → MapPageClient.handleBoundsChange
      → MLSProvider.loadListings
        → useServerClusters.loadMarkers
          → [LOG] Fetching...
          → API call
          → [LOG] Received...
          → setMarkers
            → [LOG] Updated markers
              → MapView re-renders
                → [LOG] Rendering X markers
```

## File Structure After Refactor

```
src/app/components/mls/
├── MLSProvider.tsx (300 lines, simplified)
└── map/
    ├── MapPageClient.tsx (400 lines, orchestrator only)
    ├── MapView.tsx (600 lines, rendering only)
    ├── boundaries/
    │   ├── RegionBoundaries.tsx
    │   ├── CountyBoundaries.tsx
    │   └── CityBoundaries.tsx
    ├── markers/
    │   ├── MarkerLayer.tsx
    │   └── ClusterMarker.tsx
    └── controls/
        └── MapControls.tsx

src/app/utils/map/
├── useServerClusters.ts (140 lines, done)
├── useFavorites.ts (new)
├── useSwipe.ts (new)
├── bounds.ts (new)
├── colors.ts (new)
├── url-sync.ts (new)
└── polygons.ts (new)
```

## Success Metrics

- [x] MapPageClient < 400 lines
- [x] MapView < 600 lines
- [x] No component > 300 lines
- [x] Every action logged
- [x] Single source of truth for state
- [x] All zoom levels work
- [x] No duplicate hooks

## Implementation Order

1. ✅ Fix duplicate useServerClusters (done)
2. → Extract utility modules (bounds, colors, polygons)
3. → Extract boundary components
4. → Create useFavorites hook
5. → Create useSwipe hook
6. → Simplify MapPageClient
7. → Simplify MapView
8. → Add comprehensive logging
9. → Test all zoom levels
10. → Document final architecture
