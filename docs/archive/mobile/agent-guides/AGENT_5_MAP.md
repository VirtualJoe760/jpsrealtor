# Agent 5: Map & Geolocation

**Runs:** Parallel (after Agents 1-3 complete)
**Estimated Time:** 3-5 weeks

---

## Mission

Rebuild the interactive property map experience using `react-native-maps` (replacing MapLibre GL). This is the most complex screen in the app — handle clustering, boundary polygons, POI markers, and all map interactions.

---

## Component Inventory (20-30 components)

### Core Map Components

| Component | File | Size | Complexity | Challenge |
|---|---|---|---|---|
| **MapView.tsx** | `components/mls/map/` | 73KB | CRITICAL | Complete rewrite — MapLibre → react-native-maps. Markers, clusters, boundaries, POI, styles. |
| **MapPageClient.tsx** | `components/mls/map/` | — | HIGH | Map page orchestrator. Manages filters, listings, state sync. Port logic, strip Next.js patterns. |
| **AnimatedMarker.tsx** | `components/mls/map/` | — | HIGH | Custom markers with price labels, property-type coloring, staggered animations. Use `<Marker>` with custom view. |
| **AnimatedCluster.tsx** | `components/mls/map/` | — | HIGH | Cluster circles with counts, pulse animation, size scaling. Custom `<Marker>` with animated view. |
| **HoverStatsOverlay.tsx** | `components/mls/map/` | 13.8KB | MEDIUM | Hover-based boundary stats. Convert to tap-based: tap boundary → show stats in bottom sheet. |
| **RegionNavigator.tsx** | `components/mls/map/` | 16.4KB | MEDIUM | Region/city navigation controls. Convert to searchable picker or horizontal ScrollView. |
| **ListingDrawer.tsx** | `components/mls/map/` | — | MEDIUM | Detail drawer from map. Use `@gorhom/bottom-sheet`. |

### Map Search Components (shared with Agent 4)

| Component | Owner | Notes |
|---|---|---|
| **MapSearchBar.tsx** | Agent 5 | Search autocomplete over map. Floating TextInput. |
| **FiltersPannel.tsx** | Agent 4 | Filter panel — Agent 4 builds the bottom sheet. |
| **ActiveFilters.tsx** | Agent 4 | Filter pills. |

### Listing Display on Map (owned by Agent 4)

| Component | Owner |
|---|---|
| **ListingBottomPanel.tsx** | Agent 4 |
| **PannelCarousel.tsx** | Agent 4 |
| **SwipeableListingStack.tsx** | Agent 4 |
| **FavoritesPannel.tsx** | Agent 4 |
| **MortgageCalculator.tsx** | Agent 4 |

### Neighborhood/Subdivision Map Components

| Component | File | Notes |
|---|---|---|
| **CityMap.tsx** | `components/cities/` | City map with boundary |
| **ListingsMap.tsx** | `components/map/` | Generic listings map |
| **MapSearchBar.tsx** | `components/map/` | Generic search bar |
| **MapBackground.tsx** | `components/map/` | Map as decorative background |
| **PinDropMap.tsx** | `components/campaigns/` | Pin drop for location selection |
| **PropertyMap.tsx** | `components/crm/` | Contact property map |
| **ChatMapView.tsx** | `components/chat/` | Map in chat context |
| **NearbyListingsMap.tsx** | `components/mls/` | Small map on listing detail |
| **SubdivisionMapAndListings.tsx** | `components/subdivisions/` | Combined map + list |

---

## MapLibre GL → react-native-maps Migration

### Library Swap

| Web (Current) | Mobile (New) |
|---|---|
| `@vis.gl/react-maplibre` | `react-native-maps` |
| `maplibre-gl` | Google Maps SDK (via react-native-maps) |
| `react-map-gl` | `react-native-maps` |
| `leaflet` / `react-leaflet` | `react-native-maps` |
| `supercluster` | `react-native-maps` clustering OR keep supercluster |

### Map Provider Decision

Use **Google Maps** on both platforms:
- Consistent experience across iOS and Android
- Better marker performance
- Polygon/polyline support built-in
- `PROVIDER_GOOGLE` in react-native-maps config
- Requires Google Maps API key (already have: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

### Map Styles

Current web styles:
| Style | Source |
|---|---|
| Toner | MapTiler / CartoDB Positron |
| Dark | CartoDB Dark Matter |
| Satellite | MapTiler Satellite |
| Bright | CartoDB Voyager |

Mobile equivalents:
| Style | react-native-maps | Config |
|---|---|---|
| Standard | `mapType="standard"` | Default light map |
| Dark | Custom JSON style | Load dark mode JSON |
| Satellite | `mapType="satellite"` | Built-in |
| Hybrid | `mapType="hybrid"` | Satellite + labels |

Use `customMapStyle` prop with Google Maps styling JSON for dark mode. Generate at https://mapstyle.withgoogle.com/.

---

## Feature-by-Feature Conversion

### 1. Map Container (MapView.tsx → MapScreen.tsx)

```typescript
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}
  style={{ flex: 1 }}
  region={region}
  onRegionChangeComplete={handleRegionChange}
  customMapStyle={isDark ? darkStyle : undefined}
  mapType={isSatellite ? 'satellite' : 'standard'}
  showsUserLocation
  showsMyLocationButton
>
  {markers.map(m => <CustomMarker key={m.id} {...m} />)}
  {boundaries.map(b => <Polygon key={b.id} {...b} />)}
</MapView>
```

### 2. Markers (AnimatedMarker.tsx)

Web: Custom HTML overlays positioned on map with motion animations.
Mobile: `<Marker>` with custom `<View>` children.

```typescript
<Marker
  coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
  onPress={() => selectListing(listing)}
  tracksViewChanges={false} // CRITICAL for performance
>
  <View style={[styles.marker, { backgroundColor: getMarkerColor(listing) }]}>
    <Text style={styles.markerPrice}>{formatPrice(listing.listPrice)}</Text>
  </View>
</Marker>
```

**Color coding (preserve from web):**
- Green: For sale
- Purple: Rental
- Yellow: Multifamily
- Blue: Land

**Performance critical:** Set `tracksViewChanges={false}` on all markers. Only set to `true` temporarily when marker content changes, then flip back.

### 3. Clusters (AnimatedCluster.tsx)

**Option A: react-native-map-clustering** (simpler)
```bash
npm install react-native-map-clustering
```
Wraps `MapView` and handles clustering automatically.

**Option B: Keep server-side clustering** (recommended — already built)

The API at `/api/map-clusters` already does server-side clustering with MongoDB geospatial aggregation. This is better for 76k+ listings. Keep using it:

1. On region change → POST to `/api/map-clusters` with bounds + zoom
2. API returns either individual listings or cluster objects
3. Render clusters as `<Marker>` with cluster-styled view
4. Render listings as `<Marker>` with price-styled view

The `useServerClusters` hook works as-is — it's just fetch calls.

### 4. Boundary Polygons

Web: GeoJSON layers with fill/stroke styling.
Mobile: `<Polygon>` components from react-native-maps.

```typescript
import { Polygon } from 'react-native-maps';

// City boundary
<Polygon
  coordinates={cityBoundary.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }))}
  fillColor={getActivityColor(city.listingCount, 0.15)}
  strokeColor={getBoundaryColor('city')}
  strokeWidth={2}
  tappable
  onPress={() => handleBoundaryTap(city)}
/>
```

**Data files to use (from shared package):**
- `city-boundaries.ts` — 483 city polygons
- `county-boundaries.ts` — County polygons
- `region-boundaries.ts` — Region polygons

**Performance note:** Rendering 483 city polygons simultaneously will be heavy. Only render boundaries visible in the current viewport. Filter by bounds before rendering.

### 5. POI Markers

Web: Category-based markers (golf, parks, restaurants, schools) at zoom 15+.
Mobile: Same concept with `<Marker>` and category icons.

```typescript
// Only show POI when zoomed in enough
{zoomLevel >= 15 && pois.map(poi => (
  <Marker
    key={poi._id}
    coordinate={{ latitude: poi.lat, longitude: poi.lng }}
    tracksViewChanges={false}
  >
    <View style={[styles.poiMarker, { backgroundColor: getCategoryColor(poi.category) }]}>
      <Icon name={getCategoryIcon(poi.category)} size={12} />
    </View>
  </Marker>
))}
```

### 6. Hover → Tap Conversion

Web uses hover events extensively. Mobile has no hover. Convert all:

| Web Interaction | Mobile Equivalent |
|---|---|
| Hover on boundary → show stats overlay | Tap boundary → bottom sheet with stats |
| Hover on marker → show tooltip | Tap marker → select + show bottom panel |
| Hover on cluster → show preview | Tap cluster → zoom in or show summary |
| Hover on POI → show name | Tap POI → show callout |

### 7. Map Controls

Web has floating controls. Mobile equivalents:

| Control | Implementation |
|---|---|
| Zoom in/out | Pinch-to-zoom (built-in) + optional buttons |
| Map style toggle | Floating button → cycle through styles |
| Filter toggle | Floating button → opens filter bottom sheet |
| My location | `showsMyLocationButton` prop |
| Search bar | Floating TextInput at top |
| Satellite toggle | Part of style cycling |

Layout:
```
┌─────────────────────┐
│ [🔍 Search bar    ] │
│                     │
│              [🗺️]  │  ← Map style toggle
│              [📍]  │  ← My location
│                     │
│    (map content)    │
│                     │
│                     │
│ [⚙️ Filters (3)]   │  ← Filter button with count
│                     │
│ ┌─────────────────┐ │
│ │ Listing Panel   │ │  ← Bottom panel (Agent 4)
│ └─────────────────┘ │
└─────────────────────┘
```

---

## Hooks to Port

| Hook | Key Changes |
|---|---|
| **useServerClusters** | Works as-is — pure fetch logic. Remove URL sync. |
| **useMapClusters** | Works as-is — AbortController + fetch. |
| **useFilters** | Remove URL param sync. Use React state/context. |
| **useListings** | Works as-is. |
| **useFavorites** | Agent 4 handles (localStorage → AsyncStorage). |
| **useDislikes** | Agent 4 handles. |

---

## Context: MapStateContext

Port `src/app/contexts/MapStateContext.tsx`:

```typescript
interface MapState {
  region: Region;               // replaces viewState
  selectedListing: MapListing | null;
  displayListings: MapListing[];
  mapStyle: 'standard' | 'dark' | 'satellite' | 'hybrid';
  isMapInteractive: boolean;
  totalCount: TotalCount;
  zoomLevel: number;            // derived from region.latitudeDelta
}
```

Remove: `mapOpacity`, `isMapVisible` (map is always visible on map screen).

---

## Geo Utilities (from shared package)

These are already extracted by Agent 2 and work as-is:

| Utility | Status |
|---|---|
| `bounds.ts` (boundsToKey, boundsHaveChanged, etc.) | Pure JS — works in RN |
| `tileMath.ts` (lngLatToTile, tileToBBOX) | Pure JS — works in RN |
| `colors.ts` (formatPrice, getActivityColor, etc.) | Pure JS — works in RN |
| `center-focused-clustering.ts` | Pure JS — works in RN |
| `geo-centers.ts` (CITY_CENTERS) | Pure JS — works in RN |

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/map-clusters` | POST | Server-side clustering (bounds, zoom, filters) |
| `/api/map/flyover` | POST | Get zoom/bounds for flyover animation |
| `/api/geo/search` | GET | Geocoding search (Nominatim proxy) |
| `/api/mls-listings` | GET | Individual listings in bounds |
| `/api/neighborhoods/directory` | GET | Neighborhood hierarchy |
| `/api/neighborhoods/tree` | GET | Navigation tree |
| `/api/subdivisions/[slug]` | GET | Subdivision detail |
| `/api/cities/[cityId]/subdivisions` | GET | Subdivisions in city |
| `/api/search` | GET | Search autocomplete |

---

## Performance Considerations

### Marker Limits
- 76k+ listings exist — NEVER render all as individual markers
- Server-side clustering (already built) handles this
- At zoom levels 1-12: Show clusters only
- At zoom levels 13-15: Mix of clusters and individual markers
- At zoom 16+: Individual markers only (limited by viewport)

### Polygon Rendering
- 483 city boundaries — filter to visible viewport only
- Use `latitudeDelta` to determine which boundary level to show:
  - Wide view (delta > 2): Region boundaries only
  - Medium (delta 0.5-2): County boundaries
  - Close (delta 0.1-0.5): City boundaries
  - Very close (delta < 0.1): No boundaries (show individual listings)

### Marker `tracksViewChanges`
- Default `false` on ALL markers
- Only set `true` when marker content updates (e.g., selection state change)
- Flip back to `false` after update
- This is the #1 performance optimization for react-native-maps

### Memory
- Recycle marker components (FlatList-style approach)
- Clear markers outside viewport on large pan events
- Limit POI rendering to zoom 15+

---

## Animations

Replace Framer Motion with React Native Reanimated:

| Animation | Web (Framer) | Mobile (Reanimated) |
|---|---|---|
| Marker entry | `motion.div` with staggered delay | `withDelay(index * 50, withSpring(1))` on scale |
| Cluster pulse | CSS `@keyframes pulse` | `withRepeat(withTiming(...), -1, true)` |
| Flyover to location | `map.flyTo()` (MapLibre) | `mapRef.current.animateToRegion(region, 1000)` |
| Boundary highlight | Fill color transition | `withTiming` on fill opacity |

---

## Platform-Specific Notes

### iOS
- Google Maps requires `GOOGLE_MAPS_API_KEY` in AppDelegate
- Or use Apple Maps (default, free) — but less consistent with Android
- Recommend Google Maps for feature parity

### Android
- Google Maps requires `GOOGLE_MAPS_API_KEY` in AndroidManifest.xml
- Must enable Maps SDK in Google Cloud Console
- Performance generally good with `tracksViewChanges={false}`

---

## Deliverables Checklist

- [ ] MapScreen with react-native-maps + Google Maps provider
- [ ] Server-side clustering integration (useServerClusters hook)
- [ ] Custom listing markers with price labels + color coding
- [ ] Cluster markers with counts and size scaling
- [ ] City/county/region boundary polygons (viewport-filtered)
- [ ] POI markers at zoom 15+ with category icons
- [ ] Map style cycling (standard, dark, satellite)
- [ ] Search bar with autocomplete
- [ ] Tap-based boundary stats (bottom sheet)
- [ ] Flyover animations to search results
- [ ] MapStateContext ported
- [ ] Region navigator
- [ ] My location button
- [ ] CityMap, PropertyMap, NearbyListingsMap (smaller map instances)
- [ ] PinDropMap for campaign location selection
- [ ] Performance verified with 76k+ listings (clustering)

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Base components, navigation, theme |
| Agent 2 | Geo utilities (bounds, colors, clustering), boundary data, types |
| Agent 3 | Pre-converted files + manual review items |
| Agent 4 | ListingBottomPanel, FiltersPannel (they sit on top of our map) |

| Agent | What They Need From Us |
|---|---|
| Agent 4 | Map integration points for listing detail nearby map |
| Agent 6 | ChatMapView component |
| Agent 7 | PropertyMap for CRM contacts |
| Agent 8 | PinDropMap for campaign radius targeting |
