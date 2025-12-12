# CHAP Architecture - Chat + Map Unified Experience

**Created**: December 10, 2025
**Status**: In Development
**Goal**: Seamless integration of AI chat with full map system

---

## Vision

**CHAP** = **CH**at + M**AP** — A unified interface where AI conversation and map visualization work together seamlessly.

### User Experience Flow

```
User: "Show me homes in Orange under $500k"
  ↓
AI searches → Returns listings
  ↓
Chat displays results + "Open in Map View" button
  ↓
User clicks button
  ↓
Map expands (smooth animation)
  ↓
Split screen: 30% Chat | 70% Full Map
  ↓
Map shows all listings with clustering
Zoom level 12, centered on Orange
  ↓
Chat history preserved
User can continue conversation while viewing map
```

---

## Desktop/MacBook Layout

### Before (Chat Only)
```
┌─────────────────────────────────┐
│                                 │
│         ChatWidget              │
│         (Full width)            │
│                                 │
│  - Messages                     │
│  - Listing carousel             │
│  - Mini map preview             │
│  - "Open in Map View" button    │
│                                 │
└─────────────────────────────────┘
```

### After (CHAP Mode)
```
┌──────────────┬──────────────────────────────────────┐
│   30% Chat   │        70% Full Map System           │
│              │                                      │
│ ChatWidget   │ Complete /map page:                  │
│              │ - Hierarchical clustering            │
│ Preserved:   │ - Region/County/City boundaries      │
│ - History    │ - Filters panel                      │
│ - Context    │ - Swipe interface                    │
│ - Input      │ - Listing details panel              │
│              │ - All map features enabled           │
│              │                                      │
│ Continues    │ Zoom: 12                             │
│ conversation │ Center: Search location              │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

---

## Mobile Layout

### Toggle Behavior
```
┌─────────────────┐         ┌─────────────────┐
│   Chat View     │  Swap   │    Map View     │
│                 │  ←────→ │                 │
│  ChatWidget     │         │  Full Map       │
│                 │         │                 │
│  [Search Icon]  │         │  [Chat Icon]    │
└─────────────────┘         └─────────────────┘
```

**Interaction**:
- Tap search icon (magnifying glass) → Slide to map
- Tap chat icon → Slide back to chat
- Chat history preserved
- Map state preserved (zoom, pan, markers)
- Smooth slide animation (400ms)

---

## Technical Architecture

### State Management

**Shared State Context** (`CHAPContext`):
```typescript
interface CHAPState {
  // View mode
  mode: 'chat' | 'map' | 'split'; // split = desktop CHAP mode

  // Search context
  searchLocation?: {
    query: string;
    lat: number;
    lng: number;
    zoom: number;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };

  // Listings data
  listings: any[];
  totalCount: number;
  priceRange: { min: number; max: number };
  avgPrice: number;

  // Filters (synced between chat and map)
  filters: {
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    maxBeds?: number;
    minBaths?: number;
    maxBaths?: number;
  };

  // Chat state
  chatHistory: Message[];

  // Map state
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  selectedListing?: any;
}
```

### Component Structure

```
src/app/
├── chap/
│   ├── page.tsx                    # CHAP page (desktop split / mobile toggle)
│   └── CHAPLayout.tsx              # Layout component
│
├── components/
│   ├── chap/
│   │   ├── CHAPContainer.tsx       # Main container with state
│   │   ├── CHAPSplitView.tsx       # Desktop split layout
│   │   ├── CHAPMobileToggle.tsx    # Mobile toggle component
│   │   └── CHAPContext.tsx         # Shared state context
│   │
│   ├── chat/
│   │   ├── ChatWidget.tsx          # Existing chat (enhanced)
│   │   ├── ChatProvider.tsx        # Chat state provider
│   │   └── OpenMapButton.tsx       # NEW: Trigger CHAP mode
│   │
│   └── mls/map/
│       └── MapView.tsx             # Existing full map system
│
└── contexts/
    └── CHAPContext.tsx             # Global CHAP state
```

---

## Animation Specifications

### Desktop: Map Expansion Animation

**Trigger**: User clicks "Open in Map View" button in chat

**Animation Sequence** (600ms total):
```
Step 1 (0ms → 200ms):
  - Fade out mini map preview
  - Chat container width: 100% → 30%

Step 2 (200ms → 400ms):
  - Map container appears at right
  - Map container width: 0% → 70%
  - Map loads with fade-in

Step 3 (400ms → 600ms):
  - Map zooms to level 12
  - Map pans to search location
  - Markers appear with scale animation
```

**Implementation**:
```tsx
// Framer Motion variants
const chatVariants = {
  full: { width: '100%' },
  split: { width: '30%', transition: { duration: 0.6, ease: 'easeInOut' } }
};

const mapVariants = {
  hidden: { width: '0%', opacity: 0 },
  visible: {
    width: '70%',
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeInOut', delay: 0.2 }
  }
};
```

### Mobile: Slide Toggle Animation

**Trigger**: User taps search/chat icon

**Animation** (400ms):
```
Chat → Map:
  - Chat slides left (translateX: 0 → -100%)
  - Map slides in from right (translateX: 100% → 0)

Map → Chat:
  - Map slides right (translateX: 0 → 100%)
  - Chat slides in from left (translateX: -100% → 0)
```

**Implementation**:
```tsx
const slideVariants = {
  chat: { x: 0 },
  map: { x: '-100%' },
  transition: { duration: 0.4, ease: 'easeInOut' }
};
```

---

## Data Flow

### Opening Map from Chat

```
1. User asks: "Show me homes in Orange"
   ↓
2. AI calls matchLocation/searchCity
   ↓
3. Chat stream auto-fetches listings
   ├─ /api/subdivisions/[slug]/listings?limit=100
   └─ Returns listings + summary stats
   ↓
4. Chat displays:
   - Text response
   - Listing carousel (10 samples)
   - Mini map (3-10 markers)
   - "Open in Map View" button ← KEY TRIGGER
   ↓
5. User clicks "Open in Map View"
   ↓
6. CHAPContainer.openMapView() triggered
   ├─ Store chat context (location, filters, listings)
   ├─ Set mode to 'split' (desktop) or 'map' (mobile)
   ├─ Trigger animation
   └─ Mount full MapView component
   ↓
7. MapView receives props:
   {
     initialCenter: { lat: 33.78, lng: -117.85 }, // Orange, CA
     initialZoom: 12,
     filters: { city: 'Orange' },
     highlightedListings: [list of search results]
   }
   ↓
8. MapView loads:
   ├─ Calls /api/map-clusters with bounds at zoom 12
   ├─ Shows hierarchical clusters
   ├─ Highlights search results
   └─ Enables all map features
   ↓
9. User can:
   - Continue chatting (chat history preserved)
   - Explore map (pan, zoom, cluster clicks)
   - Apply filters (synced to both chat and map)
   - Swipe through listings
   - Close map view (return to chat-only)
```

### Syncing State Between Chat and Map

**Scenario 1: User applies filter in chat**
```
User: "Show me only 3+ bedroom homes"
  ↓
AI updates filters
  ↓
CHAPContext.updateFilters({ minBeds: 3 })
  ↓
MapView receives updated filters
  ↓
Map refetches with new filters
```

**Scenario 2: User pans map to new area**
```
User pans map to "Anaheim"
  ↓
MapView.onBoundsChange()
  ↓
CHAPContext.updateSearchLocation({ city: 'Anaheim', ... })
  ↓
Chat context updated
  ↓
AI can reference new location in responses
```

---

## "Open in Map View" Button

### Location in Chat

The button appears in chat after listing search results:

```
[AI Response Text]
"I found 100 homes in Orange! Here are the top listings..."

[Listing Carousel - 10 samples]

[Mini Map Preview - shows 3-10 markers]

┌─────────────────────────────────────┐
│  📍 Open in Map View                │  ← NEW BUTTON
│  See all 100 properties on full map │
└─────────────────────────────────────┘

Let me know if you'd like details on any property...
```

### Button Implementation

```tsx
// src/app/components/chat/OpenMapButton.tsx
export function OpenMapButton({
  location,
  zoom = 12,
  listings
}: OpenMapButtonProps) {
  const { openMapView } = useCHAPContext();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <motion.button
      onClick={() => openMapView({ location, zoom, listings })}
      className={`w-full p-4 rounded-xl flex items-center justify-center gap-2 ${
        isLight
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <MapPin className="w-5 h-5" />
      <span className="font-semibold">Open in Map View</span>
      <span className="text-sm opacity-80">
        See all {listings.length} properties
      </span>
    </motion.button>
  );
}
```

---

## Route Structure

### Option A: Dedicated /chap Route (RECOMMENDED)

```
/chap
  ├─ Desktop: Split view (chat 30% | map 70%)
  └─ Mobile: Toggle view (chat ←→ map)

/chat (existing)
  └─ Chat-only view (no map integration)

/map (existing)
  └─ Map-only view (full screen)
```

**Benefits**:
- Clean separation of concerns
- Doesn't break existing chat/map pages
- Easy to A/B test
- Can progressively enhance

### Option B: Enhanced /chat Route

```
/chat?view=chap
  ├─ Desktop: Starts in CHAP split mode
  └─ Mobile: Starts in chat, can toggle to map

/chat (default)
  └─ Chat-only (current behavior)
```

**Benefits**:
- Single route
- URL parameter controls mode
- Easier state management

**Recommendation**: Use Option A (/chap route) for cleaner architecture

---

## Mobile Considerations

### Icon Placement

**Chat View**:
```
┌─────────────────────────┐
│ ← Back    🔍 Search     │  ← Search icon triggers map
│                         │
│   ChatWidget            │
│   (Full screen)         │
│                         │
└─────────────────────────┘
```

**Map View**:
```
┌─────────────────────────┐
│ 💬 Chat    Filters 🔧  │  ← Chat icon returns to chat
│                         │
│   MapView               │
│   (Full screen)         │
│                         │
└─────────────────────────┘
```

### Gestures

- **Swipe left** on chat → Show map
- **Swipe right** on map → Show chat
- **Tap icon** → Toggle view

### State Preservation

Both views remain mounted in DOM but hidden:
```tsx
<div className="relative overflow-hidden">
  {/* Chat - slides left when map shown */}
  <motion.div
    animate={viewMode === 'chat' ? 'visible' : 'hidden'}
  >
    <ChatWidget />
  </motion.div>

  {/* Map - slides in from right */}
  <motion.div
    animate={viewMode === 'map' ? 'visible' : 'hidden'}
  >
    <MapView />
  </motion.div>
</div>
```

This preserves:
- ✅ Chat history and scroll position
- ✅ Map zoom, pan, and markers
- ✅ No re-mounting/re-fetching
- ✅ Instant toggle

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create CHAPContext for shared state
- [ ] Create /chap route
- [ ] Build CHAPContainer component
- [ ] Add "Open in Map View" button to chat
- [ ] Basic desktop split view (no animation)

### Phase 2: Desktop Experience (Week 1-2)
- [ ] Implement smooth expansion animation
- [ ] Integrate full MapView component
- [ ] Sync filters between chat and map
- [ ] Pass search context to map (center, zoom)
- [ ] Highlight search results on map
- [ ] Add close/minimize map button

### Phase 3: Mobile Experience (Week 2)
- [ ] Build mobile toggle component
- [ ] Add search/chat icons
- [ ] Implement slide animations
- [ ] Add swipe gestures
- [ ] Preserve state during toggle
- [ ] Optimize for mobile performance

### Phase 4: Polish (Week 3)
- [ ] Refine animations
- [ ] Add loading states
- [ ] Error handling
- [ ] Responsive breakpoints
- [ ] Performance optimization
- [ ] User testing

---

## Technical Specifications

### Breakpoints

```css
/* Mobile: Toggle mode */
@media (max-width: 768px) {
  .chap-container {
    display: flex;
    overflow-x: hidden;
  }

  .chat-panel,
  .map-panel {
    width: 100vw;
    flex-shrink: 0;
  }
}

/* Desktop/MacBook: Split mode */
@media (min-width: 769px) {
  .chap-container {
    display: flex;
  }

  .chat-panel {
    width: 30%;
    min-width: 400px;
  }

  .map-panel {
    width: 70%;
  }
}
```

### Performance Considerations

1. **Lazy load map** until "Open in Map View" clicked
2. **Debounce** filter/bounds changes (300ms)
3. **Throttle** map move events (100ms)
4. **Cache** API responses (60s)
5. **Virtual scrolling** for chat history if >100 messages
6. **Progressive enhancement** - works without JS

### Accessibility

- [ ] Keyboard navigation (Tab, Arrow keys)
- [ ] Screen reader announcements
- [ ] Focus management when toggling views
- [ ] ARIA labels for all interactive elements
- [ ] High contrast mode support

---

## API Changes Needed

### Fix Chat Stats Endpoint

**Problem**: Current implementation calculates stats from only first 100 listings

**Current**:
```typescript
// /api/subdivisions/[slug]/listings
const listings = await UnifiedListing.find(query).limit(100);
const avgPrice = listings.reduce(...) / listings.length; // ❌ Wrong!
```

**Fixed**:
```typescript
// Get total count and stats FIRST
const totalCount = await UnifiedListing.countDocuments(query);
const stats = await UnifiedListing.aggregate([
  { $match: query },
  { $group: {
    _id: null,
    avgPrice: { $avg: '$listPrice' },
    minPrice: { $min: '$listPrice' },
    maxPrice: { $max: '$listPrice' }
  }}
]);

// Then get sample listings
const listings = await UnifiedListing.find(query).limit(100);

return {
  listings,
  pagination: { total: totalCount },
  stats: stats[0]
};
```

### New CHAP-Specific Endpoint

**Endpoint**: `GET /api/chap/search`

**Purpose**: Optimized endpoint for CHAP mode that returns:
- Accurate total count
- Accurate price stats (from ALL listings)
- Sample listings for carousel
- Map center coordinates
- Cluster counts by zoom level

**Response**:
```json
{
  "location": {
    "query": "Orange",
    "city": "Orange",
    "center": { "lat": 33.78, "lng": -117.85 },
    "bounds": { ... }
  },
  "stats": {
    "totalCount": 1523,
    "avgPrice": 987654,
    "medianPrice": 850000,
    "priceRange": { "min": 3900, "max": 5950000 }
  },
  "sampleListings": [...], // 10-20 for carousel
  "mapData": {
    "zoom12Clusters": [...],  // Pre-calculated clusters for initial view
    "totalMarkers": 1523
  },
  "filters": {
    "propertyTypes": ["Residential": 1200, "Condo": 323],
    "bedRanges": ["1-2": 200, "3-4": 800, "5+": 523]
  }
}
```

---

## Success Metrics

### User Experience
- [ ] Animation feels smooth (60fps)
- [ ] No layout shift during expansion
- [ ] Map loads in <2 seconds
- [ ] Chat history instantly accessible
- [ ] Mobile toggle feels native

### Technical
- [ ] State syncs correctly 100% of time
- [ ] No memory leaks during toggle
- [ ] Works on Safari, Chrome, Firefox, Edge
- [ ] Responsive down to 375px width
- [ ] Passes accessibility audit

### Business
- [ ] Increased time on site
- [ ] Higher property view count
- [ ] More map interactions
- [ ] Better conversion rate

---

## Future Enhancements

### V2 Features
- [ ] Picture-in-picture map while chatting
- [ ] Voice command to open map
- [ ] Share CHAP session via URL
- [ ] Collaborative CHAP sessions (multiple users)
- [ ] AR map overlay on mobile camera

### V3 Features
- [ ] Multi-location comparison (split map view)
- [ ] Time-travel (see price changes over time)
- [ ] 3D building view integration
- [ ] Street view integration

---

## Documentation Status

- [x] Architecture defined
- [x] User flows documented
- [x] Technical specs written
- [x] Animation specs detailed
- [ ] Component API docs
- [ ] Testing strategy
- [ ] Deployment guide

---

**Next Steps**:
1. Create CHAPContext
2. Build basic /chap route
3. Add "Open in Map View" button
4. Implement desktop split animation
5. Integrate full MapView

**Ready to build!** 🚀
