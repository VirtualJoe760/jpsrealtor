# Region Boundaries Implementation

## Overview

This document describes the implementation of accurate California region boundaries for the map clustering system. Instead of using simple rectangular approximations, the map now displays actual county-based polygon boundaries when zoomed out to region level (zoom 6 and below).

## Files Created/Modified

### New Files

1. **`ca_counties.json`** (gitignored)
   - Downloaded California county GeoJSON data from Code for America's GitHub repository
   - Contains 58 California counties with MultiPolygon boundaries
   - Source: https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson

2. **`scripts/generate-region-boundaries.py`**
   - Python script to merge county polygons into 3 main regions
   - Uses shapely library for geometry operations
   - Maps all 58 counties to Northern, Central, or Southern California
   - Outputs TypeScript file with accurate GeoJSON boundaries
   - Includes geometry validation and simplification

3. **`src/data/region-boundaries.ts`**
   - Auto-generated TypeScript file containing region polygons
   - Exported as `REGION_BOUNDARIES` constant
   - Contains 3 regions:
     - Northern California: Single polygon (~114 coordinates)
     - Central California: MultiPolygon (~419 coordinates)
     - Southern California: MultiPolygon (~310 coordinates)

4. **`docs/REGION_BOUNDARIES_IMPLEMENTATION.md`** (this file)
   - Documentation of implementation details

### Modified Files

1. **`src/app/api/map-clusters/route.ts`**
   - Added import for `REGION_BOUNDARIES`
   - Replaced hardcoded rectangular boundaries with accurate county-based polygons
   - Lines 12, 306-308

2. **`.gitignore`**
   - Added `ca_counties.json` to prevent committing large intermediate GeoJSON file

## Region Mapping

All 58 California counties are mapped to three main regions:

### Northern California (18 counties)
Del Norte, Siskiyou, Modoc, Humboldt, Trinity, Shasta, Lassen, Tehama, Plumas, Glenn, Butte, Sierra, Mendocino, Lake, Colusa, Sutter, Yuba, Nevada

### Central California (31 counties)
**Bay Area:** Sonoma, Napa, Marin, San Francisco, San Mateo, Santa Clara, Alameda, Contra Costa, Solano

**Sacramento Valley:** Yolo, Sacramento, Placer, El Dorado

**Sierra Nevada:** Alpine, Amador, Calaveras, Tuolumne, Mariposa, Mono

**Central Valley:** San Joaquin, Stanislaus, Merced, Madera, Fresno, Kings, Tulare, Kern

**Central Coast:** San Benito, Monterey, San Luis Obispo, Santa Cruz

### Southern California (9 counties)
Santa Barbara, Ventura, Los Angeles, Orange, San Bernardino, Riverside, Imperial, San Diego, Inyo

## Technical Implementation

### Geometry Processing

1. **Download**: Fetch official California county GeoJSON data
2. **Validation**: Fix invalid geometries using `buffer(0)` trick
3. **Grouping**: Assign each county to its main region
4. **Merging**: Use shapely's `unary_union` to combine county polygons
5. **Simplification**: Reduce coordinate count using `simplify(0.01)` while preserving topology
6. **Export**: Convert to TypeScript/JavaScript format

### Map Rendering

The map uses MapLibre GL JS's `Source` and `Layer` components to render the polygons:

- **Source Type**: GeoJSON with Polygon/MultiPolygon geometry
- **Layer Types**:
  - Fill layer with 15% opacity for region overlay
  - Line layer with 60% opacity for region outlines
- **Colors**:
  - Northern California: Blue (#3b82f6)
  - Central California: Emerald (#10b981)
  - Southern California: Amber (#f59e0b)

### Zoom Levels

- **Zoom ≤ 6**: Show 3 region clusters with polygon overlays
- **Zoom 7-8**: Show all county clusters
- **Zoom 9-10**: Show city clusters (10-mile radius distribution)
- **Zoom 11**: Show all cities in viewport
- **Zoom 12+**: Show individual listing markers

## Running the Generator Script

To regenerate region boundaries (if county mapping changes):

```bash
cd F:/web-clients/joseph-sardella/jpsrealtor

# Download county GeoJSON (if not present)
curl -L "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson" -o ca_counties.json

# Generate region boundaries
python scripts/generate-region-boundaries.py
```

Output:
```
Generating California region boundaries...

Loading county GeoJSON...
   Loaded 58 counties

Merging counties by region...
Merging 18 counties for Northern California...
  Result: Polygon with 114 coordinates
Merging 31 counties for Central California...
  Result: MultiPolygon with multiple coordinates
Merging 9 counties for Southern California...
  Result: MultiPolygon with multiple coordinates

Generating TypeScript output...
SUCCESS: Region boundaries saved to src/data/region-boundaries.ts

Summary:
   Northern California: Polygon, ~114 coordinates
   Central California: MultiPolygon, ~419 coordinates
   Southern California: MultiPolygon, ~310 coordinates
```

## Dependencies

- **shapely**: Python library for geometry operations
  ```bash
  pip install shapely
  ```

## Benefits

1. **Accuracy**: Real county boundaries instead of rectangular approximations
2. **Professional appearance**: Matches actual California geography
3. **User experience**: Users can clearly see which region they're viewing
4. **Consistency**: Uses same boundary definitions as official county data
5. **Maintainability**: Auto-generated from source data, easy to update

## Cluster-Only Mode (December 2025)

### Architecture Change

The map now uses a **cluster-only loading strategy** instead of fetching full listing data on page load:

**Old Behavior:**
- Loaded all listings in viewport using `useListings` hook
- Pre-fetched full listing data for visible markers
- Heavy initial data load
- Bottom panel showed pre-loaded listing data

**New Behavior:**
- Loads only cluster/count data using `useServerClusters` hook
- Shows region polygons, county clusters, city clusters, and listing markers
- Full listing data fetched **on-demand** when user clicks a marker
- Significantly reduced initial load time and bandwidth

### User Flow

1. **Initial Load (Zoom 7)**: User sees 3 region polygons with clickable labels
2. **Click Region Label**: Map zooms to region bounds (e.g., Southern California)
3. **Zoom 7-8**: County clusters appear with listing counts
4. **Zoom 9-10**: City clusters appear with 10-mile radius distribution
5. **Zoom 11**: Individual city markers appear
6. **Zoom 12+**: Individual listing markers appear
7. **Click Listing Marker**: Full listing data fetched, bottom panel opens with swipe queue

### Implementation Details

**Hook Change:**
- `MapPageClient.tsx` now uses `useServerClusters` instead of `useListings`
- Returns: `{ markers, totalCount, isLoading, loadMarkers, clearMarkers }`
- `markers` contains clusters (regions, counties, cities) or individual listings
- `loadMarkers(bounds, filters)` fetches cluster data for current viewport

**Props Change:**
- `MapView` receives `markers` prop instead of `listings`
- `listings={[]}` passed as empty array (backward compatibility)
- `selectedListing={null}` until user clicks a marker

**On-Demand Fetching:**
- When user clicks a listing marker, `handleListingSelect()` is called
- Fetches full listing data via `/api/mls-listings/[slug]`
- Initializes swipe queue with similar listings
- Opens bottom panel with full listing details

### Performance Benefits

1. **Faster Initial Load**: Only loads cluster/count data (~10-50 KB) instead of full listings (~500 KB - 2 MB)
2. **Reduced Bandwidth**: Users only download data for listings they interact with
3. **Scalable**: Handles 100K+ listings efficiently through server-side clustering
4. **Better UX**: Map is interactive immediately, no waiting for listing data

### Files Modified

- `src/app/components/mls/map/MapPageClient.tsx`: Removed listing prefetch logic, uses cluster data only
- `src/app/utils/map/useServerClusters.ts`: Returns cluster/count data from `/api/map-clusters`
- `src/app/api/map-clusters/route.ts`: Server-side clustering endpoint with region boundary support

## Future Enhancements

Potential improvements:

1. **County-level overlays**: Show individual county boundaries at zoom 7-8 ✅ (Implemented via clustering)
2. **Interactive polygons**: Click region overlay to filter listings ✅ (Implemented - zooms to region)
3. **Hover effects**: Highlight region on hover with tooltip
4. **Custom styling**: Allow users to choose different map styles/colors
5. **Performance optimization**: Use vector tiles for very complex polygons

## References

- GeoJSON Specification: https://geojson.org/
- MapLibre GL JS Documentation: https://maplibre.org/maplibre-gl-js-docs/
- Shapely Documentation: https://shapely.readthedocs.io/
- California County Data: https://github.com/codeforamerica/click_that_hood
