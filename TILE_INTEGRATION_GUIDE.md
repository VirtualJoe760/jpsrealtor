# Tile System Integration Guide

## Status: Ready for Integration

The static tile-based clustering system has been fully built and tiles have been generated.

### ✅ Completed Components

1. **Tile Math Utilities** (`src/app/utils/tileMath/tileMath.ts`)
   - Web Mercator projection functions
   - Tile coordinate conversion
   - Bounding box calculations

2. **Tile Generator Script** (`scripts/map-tiling/generate-map-tiles.ts`)
   - Fetches all active listings from MongoDB (GPS + CRMLS)
   - Generates pre-clustered tiles using Supercluster
   - Outputs to `public/tiles/z/x/y.json`
   - **Result**: 22,485 tiles with 75,940 features covering all 34,073 listings

3. **API Route** (`src/app/api/map-tiles/[z]/[x]/[y]/route.ts`)
   - Serves static tile files with immutable caching
   - Returns empty array for missing tiles

4. **Tile Loader** (`src/app/lib/map-tiles/tileLoader.ts`)
   - Client-side tile fetching with caching
   - Deduplication of features across tile boundaries
   - Helper functions for converting features to listings

---

## Integration into MapView.tsx

### Option 1: Replace Existing Clustering System

**Current System**:
- MapView receives `listings[]` prop from parent
- Creates Supercluster instance on every render
- Clusters listings dynamically in browser

**New System**:
- MapView no longer needs `listings[]` prop
- Fetches tiles based on map bounds + zoom
- Tiles are pre-clustered and cached

### Option 2: Hybrid System (Recommended for Testing)

Keep existing system but add tile-based loading as an alternative mode:

```typescript
interface MapViewProps {
  useTileSystem?: boolean; // New prop to toggle between systems
  listings: MapListing[]; // Keep for backward compatibility
  // ... rest of existing props
}
```

---

## Implementation Steps

### Step 1: Import Tile Loader

```typescript
import { loadTilesForView, featureToListing, type TileFeature } from '@/app/lib/map-tiles/tileLoader';
```

### Step 2: Add State for Tile-Based Features

```typescript
const [tileFeatures, setTileFeatures] = useState<TileFeature[]>([]);
const [isLoadingTiles, setIsLoadingTiles] = useState(false);
```

### Step 3: Replace updateClusters() Logic

Instead of:
```typescript
const newClusters = clusterRef.current!.getClusters(bbox, Math.floor(zoomVal));
setClusters(newClusters);
```

Use:
```typescript
const tiles = await loadTilesForView(bbox, Math.floor(zoomVal));
setTileFeatures(tiles);
```

### Step 4: Update Rendering Logic

The tile features follow the same Supercluster format, so most rendering logic stays the same.

**Clusters**:
```typescript
{tileFeatures
  .filter((f) => f.properties.cluster)
  .map((cluster) => (
    <AnimatedCluster
      key={`cluster-${cluster.properties.cluster_id}`}
      // ... rest of props
    />
  ))
}
```

**Individual Markers**:
```typescript
{tileFeatures
  .filter((f) => !f.properties.cluster)
  .map((feature) => {
    const listing = featureToListing(feature as ListingFeature);
    return (
      <AnimatedMarker
        key={feature.properties.listingKey}
        listing={listing}
        // ... rest of props
      />
    );
  })
}
```

---

## Benefits of Tile System

1. **No Listing Limit**: All 34,073 listings are accessible, not just top 1000
2. **Instant Performance**: Pre-computed clusters, no runtime clustering overhead
3. **Aggressive Caching**: Immutable tiles cached forever in browser
4. **Scalability**: System works with 100k+ listings without performance degradation

---

## Testing Checklist

- [ ] Map loads with tiles
- [ ] Clusters appear at low zoom levels
- [ ] Individual markers appear at high zoom (13+)
- [ ] Corona shows all 502 listings (not just subset)
- [ ] Click on clusters expands them
- [ ] Click on markers opens listing detail
- [ ] Performance is fast (no lag when panning/zooming)

---

## Maintenance

### Regenerating Tiles

Run when MLS data updates:
```bash
npx tsx scripts/map-tiling/generate-map-tiles.ts
```

This will:
- Fetch fresh listings from MongoDB
- Clear old tiles
- Generate new tiles
- Takes ~1-2 minutes for 34k listings

### Incremental Updates (Future Enhancement)

Create `scripts/map-tiling/regenerate-changed-tiles.ts` that only regenerates tiles containing changed listings.

---

## Rollback Plan

If issues occur, simply remove `useTileSystem` prop or set to `false` to revert to the original clustering system.
