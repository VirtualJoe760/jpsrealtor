# MapView.tsx Cursor and Hover Fixes

## Issue 1: Map cursor showing drag/grab hand instead of pointer

### Changes needed in MapView.tsx:

#### 1. Add `useMemo` to React imports (line 4-10):
```typescript
import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,  // ADD THIS LINE
} from "react";
```

#### 2. Change default cursor from 'pointer' to 'default' (line 261):
**Find:**
```typescript
      // Set default cursor to pointer instead of grab/grabbing
      map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
      // Set default cursor to default arrow
      map.getCanvas().style.cursor = 'default';
```

#### 3. Update region mouseenter handler (line 311):
**Find:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'grab';
```

#### 4. Update region mouseleave handler (line 333):
**Find:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'default';
```

#### 5. Update county mouseenter handler (line 392):
**Find:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'grab';
```

#### 6. Update county mouseleave handler (line 414):
**Find:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'default';
```

#### 7. Update city mouseenter handler (line 474):
**Find:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseenter', layerId, (e: any) => {
          map.getCanvas().style.cursor = 'grab';
```

#### 8. Update city mouseleave handler (line 496):
**Find:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
```

**Replace with:**
```typescript
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'default';
```

---

## Issue 2: Hover events aren't firing

### Add interactiveLayerIds before the return statement (around line 622):

**Add this code BEFORE the `return (` statement:**

```typescript
  // Build list of interactive polygon layer IDs for hover events
  const interactiveLayerIds = useMemo(() => {
    if (!dataToRender) return [];

    const layerIds: string[] = [];

    dataToRender.forEach((marker: any) => {
      if (marker.clusterType === 'region' && marker.polygon) {
        layerIds.push(`region-fill-${marker.regionName}`);
      } else if (marker.clusterType === 'county' && marker.polygon) {
        layerIds.push(`county-fill-${marker.countyName}`);
      } else if (marker.clusterType === 'city' && marker.polygon) {
        layerIds.push(`city-fill-${marker.cityName}`);
      }
    });

    return layerIds;
  }, [dataToRender]);
```

### Add cursor and interactiveLayerIds props to Map component (line 625-633):

**Find:**
```typescript
      <Map
        ref={mapRef}
        mapStyle={currentMapStyleURL}
        key={`map-${mapStyle}`}
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
        interactive={!panelOpen}
      >
```

**Replace with:**
```typescript
      <Map
        ref={mapRef}
        mapStyle={currentMapStyleURL}
        key={`map-${mapStyle}`}
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
        interactive={!panelOpen}
        cursor="default"
        interactiveLayerIds={interactiveLayerIds}
      >
```

---

## Summary of Changes:

1. **Cursor behavior**: Default arrow → grab hand on polygon hover → default arrow on leave
2. **Hover events**: Added `interactiveLayerIds` prop to tell MapLibre which layers should respond to mouse events
3. **Issue 3 (Fullerton)**: Already fixed in database - coordinates updated from (-116.39) to (-117.92)

## Testing:

After applying these changes:
1. Map should show default arrow cursor when not hovering over polygons
2. Cursor should change to grab hand when hovering over region/county/city polygons
3. Polygon hover effects (glow, stats overlay) should work correctly
4. Fullerton should now appear on the map at zoom level 9-11
