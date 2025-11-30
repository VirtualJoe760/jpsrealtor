# Map System
**Interactive Property Discovery with MapLibre GL**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

The map system provides an interactive way to discover properties with:
- **MapLibre GL** - Open-source map rendering
- **Supercluster** - Efficient marker clustering
- **Dual MLS** - GPS + CRMLS listings combined
- **Real-time filtering** - 21+ filter parameters
- **Swipe integration** - Direct connection to swipe queue

---

## 🛠️ TECHNOLOGY STACK

```yaml
Map Library: MapLibre GL 4.7.1
  - @vis.gl/react-maplibre wrapper
  - Vector tiles from MapTiler
  - GeoJSON support
  - Custom marker rendering

Clustering: Supercluster
  - Radius: 80px
  - Max zoom: 13
  - Efficient spatial indexing

Map Styles:
  - dark (default)
  - bright (light mode)
  - satellite (aerial imagery)
  - toner (high contrast B&W)
```

---

## 🏗️ ARCHITECTURE

### Component Hierarchy

```
MapClientWrapper (Server Component with Suspense)
    ↓
MapPageClient (Client Component - State Management)
    ├─ MapView (Map Rendering)
    │   ├─ MapLibre GL Instance
    │   ├─ AnimatedMarker (×1000-5000)
    │   └─ AnimatedCluster (×50-200)
    ├─ ListingBottomPanel (Selected Listing Details)
    ├─ FavoritesPanel (Liked/Disliked)
    └─ FilterPanel (Search Filters)
```

### Data Flow

```
User pans/zooms map
    ↓
handleBoundsChange (debounced 250ms)
    ↓
loadListings(bounds, filters)
    ↓
GET /api/mls-listings?north=...&south=...&filters...
    ↓
Parallel MongoDB queries (GPS + CRMLS)
    ↓
Merge results with mlsSource tag
    ↓
Update visibleListings state
    ↓
Supercluster indexes points
    ↓
MapView renders markers/clusters
```

---

## 🗺️ CORE COMPONENTS

### 1. MapView.tsx
**Location:** `src/app/components/mls/map/MapView.tsx`

**Responsibilities:**
- Initialize MapLibre GL map
- Handle viewport changes
- Manage map styles
- Render markers and clusters

**Key Features:**
- Zoom-based clustering (clusters below zoom 13, individual markers at 13+)
- Theme-aware styling
- Custom controls
- Debounced bounds updates (250ms)

**Props:**
```typescript
interface MapViewProps {
  listings: IListing[];
  selectedListing: IListing | null;
  onListingClick: (listing: IListing) => void;
  onBoundsChange: (bounds: Bounds) => void;
  mapStyle: string;
}
```

### 2. AnimatedMarker.tsx
**Location:** `src/app/components/mls/map/AnimatedMarker.tsx`

**Performance Optimized:**
- ❌ Removed continuous `requestAnimationFrame` loop
- ✅ Static canvas rendering (redraws only on prop changes)
- ✅ CSS-only shimmer effect (GPU accelerated)
- ✅ `useMemo` + `useCallback` optimizations
- **Result:** 90-95% CPU reduction!

**Visual Styling:**
- Property Type A (Sale): Emerald/green
- Property Type B (Rental): Purple
- Property Type C (Multi-family): Yellow
- MLS Source: GPS (vibrant), CRMLS (muted)
- Theme-aware: Light mode uses softer tones

**Marker States:**
```typescript
- default: Small circle with price
- hover: Larger with shimmer effect
- selected: Highlighted with border
```

### 3. AnimatedCluster.tsx
**Location:** `src/app/components/mls/map/AnimatedCluster.tsx`

**Features:**
- Pulsing animation
- Rotating ring segments (3 arcs)
- Size scales with point count
- Theme-aware colors:
  - Light: Blue gradient (blue-300 to blue-500)
  - Dark: Emerald with glow

**Size Calculation:**
```typescript
const baseSize = 40;
const maxSize = 60;
const size = Math.min(baseSize + (point_count / 10), maxSize);
```

### 4. MapPageClient.tsx
**Location:** `src/app/components/mls/map/MapPageClient.tsx`

**State Management:**
```typescript
{
  visibleListings: IListing[],
  selectedListing: IListing | null,
  filters: Filters,
  mapStyle: string,
  likedListings: string[],
  dislikedListings: string[],
  swipeQueue: IListing[]
}
```

**Key Functions:**
- `handleBoundsChange()` - Fetch listings for new viewport
- `handleListingClick()` - Open listing panel
- `handleSwipeLeft/Right()` - Swipe actions
- `handleApplyFilters()` - Apply search filters
- Prefetching: First 5 visible + next 3 in swipe queue

### 5. ListingBottomPanel.tsx
**Location:** `src/app/components/mls/map/ListingBottomPanel.tsx`

**Features:**
- Glassmorphism design
- Framer Motion swipe animations
- Photo carousel (PannelCarousel)
- Price, beds, baths, sqft display
- Disliked badge with countdown
- Links to subdivision pages

**Swipe Gestures:**
```typescript
dragX threshold: 20% of panel width
velocity threshold: 450px/s
animations: rotZ, skewY, opacity
```

### 6. FavoritesPanel.tsx
**Location:** `src/app/components/mls/map/FavoritesPannel.tsx`

**Tabs:**
1. **In View** - Listings currently visible on map
2. **Favorites** - Liked listings (localStorage + future API)
3. **Disliked** - Swiped left (expires after 30 min)

**Grouping:**
- By subdivision with priority sorting
- Shows count per group
- Click to select listing

---

## 🌐 API INTEGRATION

### Main Listings Endpoint

**Route:** `GET /api/mls-listings`

**Query Parameters (21+):**
```typescript
// Geography
north, south, east, west: number  // Viewport bounds
lat, lng, radius: number          // Radius search (alternative)

// Listing Type
listingType: "sale" | "rental" | "multifamily"  // Maps to propertyType A/B/C

// Price
minPrice, maxPrice: number

// Property Specs
beds, baths: number
minSqft, maxSqft: number
minLotSize, maxLotSize: number
minYear, maxYear: number
propertyType, propertySubType: string

// Amenities
pool, spa, view, garage: boolean
minGarages: number

// HOA
hoa: number                       // Max HOA fee
hasHOA: boolean

// Community
gated, senior: boolean

// Location
city, subdivision: string

// Pagination & Sorting
skip, limit: number               // Max limit: 1000 normal, 5000 at zoom 12+
sortBy: "listPrice" | "livingArea" | "lotSizeSqft"
sortOrder: "asc" | "desc"

// Exclude (for swipe)
excludeKeys: string               // Comma-separated listing keys
```

**Response:**
```typescript
{
  listings: IListing[],
  totalCount: {
    gps: number,
    crmls: number,
    total: number
  }
}
```

**Caching:**
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=120
```

### Dual MLS Architecture

```typescript
// Parallel queries to both MLSs
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.find(query).lean(),          // GPS MLS
  CRMLSListing.find(query).lean()      // CRMLS
]);

// Merge with source tags
const merged = [
  ...gpsListings.map(l => ({ ...l, mlsSource: "GPS" })),
  ...crmlsListings.map(l => ({ ...l, mlsSource: "CRMLS" }))
];

// Sort combined results
merged.sort((a, b) => b.listPrice - a.listPrice);
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 1. Viewport-Based Loading
- **Regular zoom (8-11):** Load 1000 listings
- **High zoom (12+):** Load 5000 listings
- **Debounced:** 250ms delay on pan/zoom
- **Memory cap:** 2000 listings max in cache

### 2. Clustering Strategy
```typescript
zoom < 13: Show clusters (Supercluster)
zoom >= 13: Show individual markers
```

**Benefits:**
- Reduced DOM nodes (50-200 clusters vs 5000 markers)
- Faster rendering
- Better mobile performance

### 3. Marker Optimization
**Before:** ~100,000 canvas operations/second
**After:** ~0 operations when idle, <1000 on interaction
**Savings:** 90-95% CPU reduction!

### 4. Prefetching
- First 5 visible listings (full data)
- Next 3 in swipe queue
- Background photo loading

### 5. Geospatial Indexes
```typescript
// MongoDB indexes
listings.createIndex({ latitude: 1, longitude: 1, standardStatus: 1 });
crmlsListings.createIndex({ latitude: 1, longitude: 1, standardStatus: 1 });
```

---

## 🚀 FUTURE: CHAP INTEGRATION

### Vision

The **"Chap" (Chat + Map)** experience will allow AI to control the map:

**User:** "Show me homes in Palm Desert"
**AI:** Controls map viewport, applies filters, highlights results

### Architecture

```typescript
// ChapProvider
interface ChapContextType {
  mapController: {
    panTo: (lat, lng, zoom) => void,
    drawBounds: (bounds, label) => void,
    applyFilters: (filters) => void,
    highlightListings: (listingKeys) => void
  }
}
```

### AI Tool: controlMap

```typescript
{
  type: "function",
  function: {
    name: "controlMap",
    description: "Control map viewport and filters",
    parameters: {
      action: "panTo" | "drawBounds" | "applyFilters" | "highlightListings",
      location?: { lat, lng, zoom },
      bounds?: { north, south, east, west },
      filters?: Partial<Filters>,
      listingKeys?: string[]
    }
  }
}
```

**User Flow:**
```
User: "Zoom into Palm Desert Country Club"
    ↓
AI calls: controlMap({ action: "panTo", location: {...}, zoom: 14 })
    ↓
Frontend: Map smoothly animates to location
    ↓
AI: "Here are the homes in this area" [shows carousel]
```

---

## 📊 CURRENT METRICS

**Load Times:**
- Map initialization: <500ms
- Listing fetch (1000): 150-300ms
- Marker rendering: 100-200ms
- **Total:** 750-1000ms

**Memory Usage:**
- 1000 listings: ~5-10MB
- 5000 listings: ~20-40MB
- Map tiles: ~10-20MB (cached)

**Network:**
- Listing API: 2-5MB per viewport
- Map tiles: 500KB-2MB per zoom level

---

## 📚 RELATED DOCUMENTATION

- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - Component details
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) - AI map control (future)
- [SWIPE_SYSTEM.md](./SWIPE_SYSTEM.md) - Swipe queue integration
- [master-plan.md](../master-plan.md) - Chap vision

---

**Last Updated:** January 29, 2025
