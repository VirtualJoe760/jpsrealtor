# Map Background Feature

## Overview

The **Map Background** feature allows the interactive map to render as a background layer on specific pages, controlled programmatically from anywhere in the app (especially useful for chat integration).

## Architecture

### Key Components

1. **MapStateProvider** (`src/app/contexts/MapStateContext.tsx`)
   - Global state management for map
   - Controls visibility, position, listings, and opacity
   - Persists map state even when component unmounts

2. **MapBackground** (`src/app/components/backgrounds/MapBackground.tsx`)
   - Renders map as fixed background layer
   - Theme-aware styling
   - Proper pointer-events management
   - Smooth opacity transitions

3. **useMapControl** (`src/app/hooks/useMapControl.ts`)
   - Convenient hook for controlling map from any component
   - Methods: `showMapWithListings()`, `showMapAtLocation()`, `hideMap()`

4. **ClientLayoutWrapper** (Updated)
   - Conditionally renders MapBackground based on route
   - Manages z-index layering
   - Integrates MapStateProvider

### Z-Index Layering

```
z-0:  Spatial Background (stars/gradients)
z-1:  Map Background (when enabled)
z-10: Page Content
z-30: Sidebar / Navigation
z-40: Modals / Overlays
```

## Usage

### Enable Map Background on a Route

Edit `ClientLayoutWrapper.tsx`:

```typescript
const pagesWithMapBackground = [
  '/map-demo',
  '/dashboard',
  '/',  // Homepage
];
```

### Control Map from Components

```typescript
import { useMapControl } from "@/app/hooks/useMapControl";

function MyComponent() {
  const { showMapAtLocation, showMapWithListings, hideMap } = useMapControl();

  // Show map at a specific location
  const handleShowCity = () => {
    showMapAtLocation(33.8303, -116.5453, 12); // Palm Desert
  };

  // Show map with listings
  const handleShowListings = (listings) => {
    showMapWithListings(listings, {
      centerLat: 33.8303,
      centerLng: -116.5453,
      zoom: 12
    });
  };

  // Hide map
  const handleHideMap = () => {
    hideMap();
  };

  return (
    <button onClick={handleShowCity}>Show Palm Desert</button>
  );
}
```

### Chat Integration Example

```typescript
// In ChatWidget or chat handler
import { useMapControl } from "@/app/hooks/useMapControl";

function ChatWidget() {
  const { showMapWithListings } = useMapControl();

  const handleAIResponse = (response) => {
    // If AI found properties, show them on map
    if (response.components?.carousel?.listings) {
      showMapWithListings(
        response.components.carousel.listings,
        {
          centerLat: response.components.mapView?.center?.lat,
          centerLng: response.components.mapView?.center?.lng,
          zoom: response.components.mapView?.zoom || 12
        }
      );
    }
  };

  return (
    // ... chat UI
  );
}
```

## Demo Page

Visit `/map-demo` to see the feature in action:
- Interactive location buttons
- Opacity slider
- Usage examples
- Technical documentation

## Benefits

✅ **No Page Navigation**: Chat can show map without redirecting to /map
✅ **Seamless UX**: Map animates smoothly in background
✅ **State Persistence**: Map position/selection persists across component unmounts
✅ **Theme Integration**: Automatically adapts to light/dark themes
✅ **Performance**: Only renders on designated routes
✅ **Flexible Control**: Any component can control the map via hook

## Technical Details

### Pointer Events

- **Map Container**: `pointer-events: none` when hidden, `auto` when visible
- **Content Layer**: Always `pointer-events: auto` for clickability
- **Gradient Overlay**: Always `pointer-events: none` (decorative)

### Opacity Control

Map opacity is adjustable (0-1):
- `0.6-0.8`: Good balance for content readability
- `1.0`: Full visibility (may obscure content)
- `0.0`: Hidden (use `hideMap()` instead)

### Route Configuration

**Pages with Map Background**:
- Map renders as background
- Controlled via `useMapControl()`

**Pages without Map**:
- Standard spatial background (stars/gradients)
- Listed in `pagesWithoutBackground`

**/map Route**:
- Excluded from background map
- Has its own dedicated map instance
- Full interactive map page

## Future Enhancements

- [ ] Auto-show map when chat references locations
- [ ] Synchronized map state between /map page and background
- [ ] Mobile-specific behavior (reduced opacity, limited interaction)
- [ ] Map clustering integration with background map
- [ ] Listing panel integration with background map

## Troubleshooting

### Map not showing
1. Check route is in `pagesWithMapBackground` array
2. Verify `MapStateProvider` is in component tree
3. Call `setMapVisible(true)` or use `showMapAtLocation()`

### Content not clickable
1. Ensure content has `pointer-events: auto`
2. Check z-index is greater than map (z-1)
3. Verify map has `pointer-events: none` when not visible

### Performance issues
1. Limit routes with map background
2. Use `hideMap()` when not needed
3. Reduce map opacity for less GPU usage
4. Consider lazy loading map on first use

## Related Files

- `src/app/contexts/MapStateContext.tsx` - Global map state
- `src/app/components/backgrounds/MapBackground.tsx` - Map rendering
- `src/app/hooks/useMapControl.ts` - Control hook
- `src/app/components/ClientLayoutWrapper.tsx` - Integration
- `src/app/map-demo/page.tsx` - Demo page
