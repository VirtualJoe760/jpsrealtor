# JPSREALTOR Master Plan: "Chap" Integration
**Chat + Map Unified Experience**

---

## 1. VISION STATEMENT

### 1.1 The "Chap" Concept
Merge the chat and map pages into a unified, AI-driven property discovery experience where:
- **AI acts as the search bar AND chatbot** - Natural language property search
- **Map responds dynamically to conversation** - AI controls viewport, bounds, zoom, filters
- **Split-screen desktop experience** - Chat (narrow left) + Map (wide right)
- **Overlay mobile experience** - Toggle between chat and map views
- **Zero friction property discovery** - No "View in Map" buttons, everything happens in real-time

### 1.2 Core User Flow

**Desktop:**
```
User types: "Show me 3-bed homes under $500k in Palm Desert"
    ↓
AI interprets intent
    ↓
Map automatically:
    ├─ Pans to Palm Desert
    ├─ Draws city/subdivision bounds
    ├─ Applies filters (beds=3, maxPrice=500k)
    └─ Shows results instantly
    ↓
Chat displays: "Found 47 homes matching your criteria"
    ├─ Listing carousel preview
    └─ Conversational follow-up suggestions
```

**Mobile:**
```
User taps chat icon (top-left)
    ↓
Chat slides up from bottom (over map)
    ↓
User searches naturally
    ↓
Map updates behind chat overlay
    ↓
User swipes down to dismiss chat
    ↓
Icon changes to map icon
    ↓
Toggle between chat-focused and map-focused views
```

### 1.3 Key Principles
1. **Conversational Control** - AI understands complex queries like "homes with pools near good schools"
2. **Visual Feedback** - Map moves/zooms/highlights as AI interprets queries
3. **Contextual Intelligence** - AI remembers conversation history ("show me more like that")
4. **Low Code, High Efficiency** - Leverage existing MLS architecture
5. **Mobile-First Gestures** - Swipe to dismiss, tap to toggle

---

## 2. CURRENT ARCHITECTURE

### 2.1 Core Map Components

#### MapView (`src/app/components/mls/map/MapView.tsx`)
- **Library:** `@vis.gl/react-maplibre`
- **Clustering:** Supercluster (radius: 80, maxZoom: 13)
- **Map Styles:** `dark`, `bright`, `satellite`, `toner`
- **Marker Color Coding:**
  - Green/Emerald: Residential Sale (Type A)
  - Purple/Violet: Residential Lease (Type B)
  - Yellow: Multi-Family (Type C)
  - Different shades for GPS vs CRMLS listings
- **Performance:** Raw markers at zoom ≥13, debounced bounds (250ms)

#### MapPageClient (`src/app/components/mls/map/MapPageClient.tsx`)
- Manages map state (filters, bounds, selections)
- Coordinates MapView ↔ ListingBottomPanel ↔ FavoritesPanel
- URL parameter synchronization
- Swipe queue integration
- Prefetching (first 5 visible + next 3 in queue)
- Responsive tablet/mobile logic

#### ListingBottomPanel (`src/app/components/mls/map/ListingBottomPanel.tsx`)
- Fixed-width centerpiece (500-900px)
- Framer Motion 3D swipe animations
- Swipeable cards (20% threshold or 450px/s velocity)
- Photo carousel (PannelCarousel)
- Disliked badge with countdown timer
- Links to subdivision pages

#### FavoritesPanel (`src/app/components/mls/map/FavoritesPannel.tsx`)
- Three tabs: "In View", "Favorites", "Disliked"
- Grouped by subdivision with priority sorting
- Swipe-to-close gesture
- 30-minute dislike expiration
- 25% width on desktop

#### MLSProvider (`src/app/components/mls/MLSProvider.tsx`)
**Context API:**
```typescript
{
  allListings, visibleListings, selectedListing, selectedFullListing,
  filters, setFilters, updateFilter, resetFilters,
  likedListings, dislikedListings, toggleFavorite, swipeLeft,
  mapStyle, setMapStyle,
  isLoading, isPreloaded, isLoadingListing,
  listingCache, loadListings, selectListing, closeListing,
  swipeQueue
}
```

### 2.2 API Routes

#### `/api/mls-listings` (Main Listings API)
**Dual MLS Architecture:**
- Fetches from **GPS** (`Listing` collection) + **CRMLS** (`CRMLSListing` collection) in parallel
- Merges with `mlsSource` identifier
- GPS uses `listingKey`, CRMLS uses `listingId`

**21+ Query Parameters:**
```typescript
// Geography
north, south, east, west (bounds)
lat, lng, radius (radius search)

// Listing Type
listingType: 'sale' | 'rental' | 'multifamily' → Maps to propertyType A/B/C

// Price
minPrice, maxPrice

// Property
beds, baths, minSqft, maxSqft, minLotSize, maxLotSize
minYear, maxYear, propertyType, propertySubType

// Amenities
pool, spa, view, garage, minGarages

// HOA
hoa (max fee), hasHOA

// Community
gated, senior

// Location
city, subdivision

// Pagination
skip, limit (max 1000), sortBy, sortOrder

// Exclude
excludeKeys (for swipe functionality)
```

**Aggregation Pipeline:**
1. $match: Bounds + status + filters
2. $sort: By listPrice/livingArea/lotSizeSqft
3. $skip/$limit: Pagination
4. $lookup: Photos (primary only)
5. $lookup: OpenHouses
6. $project: Select needed fields

**Response:**
```json
{
  "listings": [
    {
      "_id": "...",
      "listingKey": "...",
      "mlsSource": "GPS" | "CRMLS",
      "slugAddress": "...",
      "listPrice": 450000,
      "bedsTotal": 3,
      "bathroomsTotalInteger": 2,
      "livingArea": 1500,
      "latitude": 33.72,
      "longitude": -116.37,
      "primaryPhotoUrl": "...",
      "city": "Palm Desert",
      "subdivisionName": "...",
      "propertyType": "A",
      "poolYn": true,
      "openHouses": [...]
    }
  ]
}
```

**Performance:** 60s cache with 120s stale-while-revalidate

#### `/api/mls-listings/[slugAddress]` (Individual Listing)
- Tries GPS first, falls back to CRMLS
- Joins photos + openHouses
- Returns full IListing with `mlsSource` flag

#### `/api/swipes/batch` (Swipe Persistence)
- Immediate swipe persistence (despite "batch" name)
- Supports authenticated + anonymous users
- Links anonymous sessions to accounts on login
- 30-minute TTL for dislikes
- Updates user analytics (top subdivisions, cities, property types)

#### `/api/swipes/exclude-keys` (Already Swiped)
- Returns array of listing keys user has swiped on
- Used to filter out already-seen properties

### 2.3 Data Flow

**Listing Fetch Flow:**
```
User Interaction (pan, filter)
    ↓
MapPageClient.handleBoundsChange / handleApplyFilters
    ↓
MLSProvider.loadListings(bounds, filters, merge?)
    ↓
useListings.loadListings()
    ↓
Build query params (bounds + 20+ filters)
    ↓
GET /api/mls-listings?north=...&filters...
    ↓
[API] Parallel fetch GPS + CRMLS
    ├─ MongoDB aggregation pipeline
    └─ Merge results with mlsSource tags
    ↓
MLSProvider updates state
    ├─ allListings (replace or merge)
    ├─ visibleListings (replace or merge)
    └─ Prefetch first 5
    ↓
MapView renders markers/clusters
```

**Swipe Queue Flow:**
```
User selects listing
    ↓
Initialize swipe queue
    ├─ Fetch listings within 5-mile radius
    ├─ Filter by:
    │   ├─ Exclude already-swiped
    │   ├─ Exclude Pacaso (co-ownership)
    │   └─ Price bracket compatibility
    ├─ Score by proximity tiers (7 tiers):
    │   ├─ Same subdivision + type + zip (score: 0-5)
    │   ├─ Same subdivision + type, diff zip (50-55)
    │   ├─ Same subdivision, diff type, same zip (100-105)
    │   ├─ Same subdivision, diff type, diff zip (150-155)
    │   ├─ Within 2mi + same type + zip (200-202)
    │   ├─ Within 5mi + same type + zip (300-305)
    │   └─ Same city, within 5mi (400-405)
    └─ Sort by score (lower = higher priority)
    ↓
User swipes left/right
    ↓
MLSProvider updates local state
    ↓
POST /api/swipes/batch (immediate)
    ↓
Advance to next listing in queue
```

### 2.4 Groq AI Integration

**Models:**
- **FREE Tier:** `llama-3.1-8b-instant` (840 TPS, ~$0.013/month/user)
- **PREMIUM Tier:** `openai/gpt-oss-120b` (500 TPS, 131K context, function calling)

**Configuration:**
```typescript
{
  temperature: 0.3,    // Conservative for accuracy
  maxTokens: 500,      // Context-aware
  tools: [...],        // Function calling support
  tool_choice: "auto"  // AI decides when to use tools
}
```

**Chat API:** `/api/chat/stream`

**Tool Functions:**
1. **matchLocation** - Resolve subdivision/community to geo data
2. **searchCity** - Search all properties in a city

**AI Response Format:**
```
[LISTING_CAROUSEL]
{ "title": "31 homes in Palm Desert Country Club",
  "listings": [...] }
[/LISTING_CAROUSEL]

[MAP_VIEW]
{ "center": {"lat": 33.72, "lng": -116.37},
  "zoom": 13,
  "listings": [...] }
[/MAP_VIEW]
```

**System Prompt Includes:**
- Investment analysis formulas (Cap Rate, CoC, DSCR)
- CMA generation guidance
- Real-time market context
- API endpoint documentation
- Listing data schema reference

### 2.5 Current Chat Implementation

**ChatWidget (`src/app/components/chat/ChatWidget.tsx`):**
- Landing view with logo + centered input bar
- Conversation view with message history
- Text streaming reveal effect (20ms per character)
- Bouncing dot loading indicator
- Theme-aware styling (light/dark)
- No map integration yet

**ChatProvider (`src/app/components/chat/ChatProvider.tsx`):**
- Manages message history
- Simple add/clear messages API
- localStorage persistence

---

## 3. IDENTIFIED ISSUES & LIMITATIONS

### 3.1 Current Inefficiencies

**1. Dual Collection Complexity**
- Every query hits both GPS and CRMLS collections
- Results must be merged and re-sorted
- Potential for duplicate listings

**2. No Server-Side Caching**
- Every bounds change triggers fresh DB queries
- No Redis/Memcached layer
- 60s HTTP cache insufficient for high-traffic

**3. Prefetching Limitations**
- Only prefetches first 5 visible listings
- No spatial prefetching (neighboring areas)
- No predictive prefetching based on pan direction

**4. Filter State Sync Issues**
- Filters stored in 3 places: Context, URL, localStorage
- Potential for desync between MLSProvider and MapPageClient
- URL can become very long with all filters

**5. Swipe Queue Limitations**
- 5-mile radius may miss matches in sparse areas
- 100 listing limit may exhaust quickly
- No backfill mechanism when queue is empty

**6. Mobile Performance**
- Large JSON payloads (1000 listings max) on cellular
- No progressive loading or pagination
- Heavy Framer Motion animations on older devices

**7. Analytics Gaps**
- No tracking of map interactions (zoom, pan)
- No funnel analysis (map → listing → details → contact)
- Swipe analytics limited to counts

**8. Chat-Map Disconnection**
- Chat and map are separate pages
- No real-time map control from AI
- No viewport synchronization

---

## 4. MASTER PLAN: "CHAP" IMPLEMENTATION

### 4.1 Phase 1: Unified Page Architecture (Week 1-2)

#### 4.1.1 Create New `/chap` Route
**File:** `src/app/chap/page.tsx`

```typescript
export default function ChapPage() {
  return (
    <MLSProvider>
      <ChapLayout />
    </MLSProvider>
  )
}
```

#### 4.1.2 Desktop Split-Screen Layout
**File:** `src/app/components/chap/ChapLayout.tsx`

```typescript
<div className="h-screen w-screen flex">
  {/* Chat Panel - Narrow Left */}
  <div className="w-[380px] border-r border-neutral-700">
    <ChapChatPanel />
  </div>

  {/* Map Panel - Wide Right */}
  <div className="flex-1">
    <ChapMapPanel />
  </div>
</div>
```

**Key Features:**
- Chat: 380px fixed width (enough for 1-2 listing cards)
- Map: Flexible remaining width
- No resize handle (Phase 1 - keep it simple)
- Vertical scrolling chat, fixed map viewport

#### 4.1.3 Mobile Overlay Layout
```typescript
<div className="h-screen w-screen relative">
  {/* Full-Screen Map Base Layer */}
  <ChapMapPanel />

  {/* Overlay Toggle Icon - Top Left */}
  <button className="absolute top-4 left-4 z-50">
    {isChatOpen ? <MapIcon /> : <MessageSquare />}
  </button>

  {/* Chat Overlay - Slides from Bottom */}
  <AnimatePresence>
    {isChatOpen && (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleSwipeDown}
        className="absolute inset-x-0 bottom-0 h-[85vh] bg-black rounded-t-3xl"
      >
        <ChapChatPanel />
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

**Key Features:**
- Map always visible beneath
- Chat slides up on icon tap
- Swipe down to dismiss (Framer Motion drag)
- Icon morphs: Chat ↔ Map
- 85vh height (leaves map visible at top)

### 4.2 Phase 2: AI-Controlled Map API (Week 2-3)

#### 4.2.1 New Chat Context Extension
**File:** `src/app/components/chap/ChapProvider.tsx`

```typescript
interface ChapContextType extends ChatContextType {
  // Map Control
  mapController: {
    panTo: (lat: number, lng: number, zoom: number) => void
    drawBounds: (bounds: Bounds, label?: string) => void
    clearBounds: () => void
    applyFilters: (filters: Partial<Filters>) => void
    highlightListings: (listingKeys: string[]) => void
    selectListing: (listingKey: string) => void
  }

  // Map State (read-only for chat)
  currentViewport: { lat, lng, zoom, bounds }
  visibleListingCount: number
  activeFilters: Filters
}
```

#### 4.2.2 Enhanced Tool Functions
**File:** `src/app/api/chat/stream/route.ts`

**New Tools:**
```typescript
const tools: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "controlMap",
      description: "Control the map viewport and filters based on user intent",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["panTo", "drawBounds", "applyFilters", "highlightListings"]
          },

          // For panTo
          location: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
              zoom: { type: "number", default: 13 }
            }
          },

          // For drawBounds
          bounds: {
            type: "object",
            properties: {
              north: { type: "number" },
              south: { type: "number" },
              east: { type: "number" },
              west: { type: "number" },
              label: { type: "string" }
            }
          },

          // For applyFilters
          filters: {
            type: "object",
            properties: {
              minPrice: { type: "number" },
              maxPrice: { type: "number" },
              beds: { type: "number" },
              baths: { type: "number" },
              // ... all 21 filter fields
            }
          },

          // For highlightListings
          listingKeys: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["action"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "searchProperties",
      description: "Search for properties with natural language query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          location: { type: "string" }, // "Palm Desert", "San Diego County", etc.
          autoApplyToMap: { type: "boolean", default: true }
        }
      }
    }
  }
]
```

**Example AI Workflow:**
```
User: "Show me 3-bed homes under $500k in Palm Desert"
    ↓
AI reasoning:
  1. User wants to see homes (search intent)
  2. Location: Palm Desert
  3. Filters: beds=3, maxPrice=500000
  4. Should control map automatically
    ↓
AI calls searchProperties({
  query: "3-bed homes under $500k",
  location: "Palm Desert",
  autoApplyToMap: true
})
    ↓
Backend:
  1. Resolve "Palm Desert" to coordinates
  2. Calculate city bounds
  3. Fetch listings with filters
  4. Return: { listings, bounds, center, zoom }
    ↓
AI returns structured response:
  {
    mapControl: {
      action: "panTo",
      location: { lat: 33.72, lng: -116.37, zoom: 12 }
    },
    filters: { beds: 3, maxPrice: 500000 },
    message: "I found 47 homes in Palm Desert...",
    listings: [...]
  }
    ↓
Frontend:
  1. ChapProvider receives mapControl instructions
  2. Calls mapController.panTo() + applyFilters()
  3. Map smoothly animates to location
  4. Chat displays results with carousel
```

#### 4.2.3 Map Control Communication
**File:** `src/app/components/chap/useMapSync.ts`

```typescript
export function useMapSync() {
  const { mapController } = useChapContext()
  const { loadListings, setFilters } = useMLSContext()

  useEffect(() => {
    // Listen for AI map control events
    const handleMapCommand = (command: MapControlCommand) => {
      switch (command.action) {
        case "panTo":
          // Animate map viewport
          mapRef.current?.flyTo({
            center: [command.location.lng, command.location.lat],
            zoom: command.location.zoom,
            duration: 2000,
            essential: true
          })
          break

        case "applyFilters":
          // Apply filters and reload listings
          setFilters(command.filters)
          loadListings(currentBounds, command.filters)
          break

        case "drawBounds":
          // Draw polygon overlay on map
          setBoundsOverlay(command.bounds)
          // Zoom to fit bounds
          mapRef.current?.fitBounds([
            [command.bounds.west, command.bounds.south],
            [command.bounds.east, command.bounds.north]
          ], { padding: 50, duration: 2000 })
          break

        case "highlightListings":
          // Pulse/highlight specific markers
          setHighlightedKeys(command.listingKeys)
          break
      }
    }

    mapController.subscribe(handleMapCommand)
    return () => mapController.unsubscribe(handleMapCommand)
  }, [])
}
```

### 4.3 Phase 3: Chat UI Integration (Week 3-4)

#### 4.3.1 Embedded Listing Cards in Chat
**File:** `src/app/components/chap/ChapChatPanel.tsx`

```typescript
function renderMessage(message: Message) {
  // Parse AI response for component markers
  const parts = parseMessageParts(message.content)

  return parts.map((part, i) => {
    switch (part.type) {
      case "text":
        return <p key={i}>{part.content}</p>

      case "listing_carousel":
        return (
          <div key={i} className="my-4">
            <h3>{part.data.title}</h3>
            <div className="flex gap-2 overflow-x-auto">
              {part.data.listings.map(listing => (
                <ListingCard
                  key={listing.listingKey}
                  listing={listing}
                  onClick={() => {
                    // Select on map + open panel
                    mapController.selectListing(listing.listingKey)
                  }}
                />
              ))}
            </div>
          </div>
        )

      case "map_view":
        // Show "Viewing on map" status
        return (
          <div key={i} className="bg-emerald-500/20 p-3 rounded">
            <p>📍 Showing {part.data.listings.length} properties on map</p>
          </div>
        )

      case "cma_display":
        return <CMADisplay key={i} data={part.data} />
    }
  })
}
```

#### 4.3.2 Synchronized Selection State
```typescript
// When user clicks listing in chat
<ListingCard
  onClick={() => {
    mapController.selectListing(listing.listingKey)
    // Map automatically:
    // 1. Centers on listing
    // 2. Opens ListingBottomPanel
    // 3. Highlights marker
  }}
/>

// When user clicks marker on map
<Marker
  onClick={() => {
    chatController.notifyListingSelected(listing)
    // Chat automatically:
    // 1. Scrolls to relevant message
    // 2. Highlights listing card
    // 3. Shows "Viewing this property" status
  }}
/>
```

### 4.4 Phase 4: Queryable Map API Optimization (Week 4-5)

#### 4.4.1 New Unified API Endpoint
**File:** `src/app/api/listings/query/route.ts`

```typescript
POST /api/listings/query
{
  "geo": {
    "type": "bounds" | "radius" | "city" | "subdivision",

    // For bounds
    "bounds": { north, south, east, west },

    // For radius
    "radius": { lat, lng, miles },

    // For city/subdivision
    "locationSlug": "palm-desert",
    "locationType": "city" | "subdivision"
  },

  "filters": {
    "price": { min, max },
    "beds": { min },
    "baths": { min },
    "sqft": { min, max },
    "lotSize": { min, max },
    "yearBuilt": { min, max },
    "propertyTypes": ["A", "B"],
    "amenities": ["pool", "spa", "view"],
    "hoa": { max },
    "community": ["gated", "senior"]
  },

  "fields": ["listingKey", "price", "beds", "lat", "lng", "photo"],
  "sort": { field: "listPrice", order: "asc" },
  "page": { limit: 50, offset: 0 },
  "excludeKeys": ["123-456", "789-012"]
}

Response:
{
  "listings": [...],
  "total": 1247,
  "bounds": { north, south, east, west },
  "center": { lat, lng },
  "suggestedZoom": 12,
  "facets": {
    "avgPrice": 650000,
    "priceRange": { min: 200000, max: 2500000 },
    "propertyTypes": { "A": 800, "B": 350, "C": 97 }
  }
}
```

**Benefits:**
- Single source of truth
- Field selection reduces payload
- Flexible geo queries
- Built-in aggregations
- Faceted search support

#### 4.4.2 Geospatial Index Implementation
**File:** `src/models/listings.ts`

```typescript
// Add to schema
ListingSchema.index({ location: "2dsphere" })

// Migration script to populate location field
await Listing.updateMany({}, [{
  $set: {
    location: {
      type: "Point",
      coordinates: ["$longitude", "$latitude"]
    }
  }
}])

// Query example
const listings = await Listing.find({
  location: {
    $geoWithin: {
      $box: [[west, south], [east, north]]
    }
  }
})
```

#### 4.4.3 Redis Tile Caching
**File:** `src/lib/tileCache.ts`

```typescript
import { createClient } from 'redis'

const redis = createClient({ url: process.env.REDIS_URL })

export async function getCachedTile(
  zoom: number,
  x: number,
  y: number,
  filterHash: string
) {
  const key = `tile:z${zoom}:x${x}:y${y}:f${filterHash}`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export async function setCachedTile(
  zoom: number,
  x: number,
  y: number,
  filterHash: string,
  data: any
) {
  const key = `tile:z${zoom}:x${x}:y${y}:f${filterHash}`
  await redis.setEx(key, 300, JSON.stringify(data)) // 5 min TTL
}
```

**Tile Strategy:**
```
Zoom 8-10: Large area tiles (cities/regions)
Zoom 11-12: Neighborhood tiles
Zoom 13+: Street-level tiles (no caching, raw markers)
```

#### 4.4.4 Smart Prefetching
**File:** `src/app/components/chap/usePrefetch.ts`

```typescript
export function usePrefetch() {
  const mapRef = useRef<MapRef>()

  useEffect(() => {
    let panDirection: 'north' | 'south' | 'east' | 'west' | null = null
    let lastCenter = mapRef.current?.getCenter()

    const handleMoveEnd = () => {
      const currentCenter = mapRef.current?.getCenter()

      // Detect pan direction
      if (currentCenter.lat > lastCenter.lat) panDirection = 'north'
      else if (currentCenter.lat < lastCenter.lat) panDirection = 'south'

      // Prefetch adjacent tiles in pan direction
      const currentTile = lngLatToTile(currentCenter, mapRef.current.getZoom())
      const adjacentTiles = getAdjacentTiles(currentTile, panDirection)

      prefetchTiles(adjacentTiles)
      lastCenter = currentCenter
    }

    mapRef.current?.on('moveend', handleMoveEnd)
  }, [])
}
```

### 4.5 Phase 5: Mobile Gesture Optimization (Week 5)

#### 4.5.1 Chat Swipe Dismiss
```typescript
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(e, info) => {
    // Dismiss if swiped down > 100px or velocity > 500px/s
    if (info.offset.y > 100 || info.velocity.y > 500) {
      closeChatPanel()
    }
  }}
  className="chat-panel"
>
  {/* Chat content */}
</motion.div>
```

#### 4.5.2 Icon Morph Animation
```typescript
<AnimatePresence mode="wait">
  {isChatOpen ? (
    <motion.div
      key="map-icon"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
    >
      <Map className="w-6 h-6" />
    </motion.div>
  ) : (
    <motion.div
      key="chat-icon"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
    >
      <MessageSquare className="w-6 h-6" />
    </motion.div>
  )}
</AnimatePresence>
```

#### 4.5.3 Prevent Map Gesture Conflicts
```typescript
<div
  onTouchStart={(e) => {
    // If chat is open and user touches chat area, disable map gestures
    if (isChatOpen && isTouchInsideChat(e)) {
      mapRef.current?.setOptions({ gestureHandling: 'none' })
    }
  }}
  onTouchEnd={() => {
    mapRef.current?.setOptions({ gestureHandling: 'auto' })
  }}
>
  <ChatPanel />
</div>
```

### 4.6 Phase 6: Analytics & Optimization (Week 6)

#### 4.6.1 Comprehensive Event Tracking
```typescript
// Map interactions
trackEvent('map:pan', { from: oldBounds, to: newBounds })
trackEvent('map:zoom', { level: zoomLevel })
trackEvent('map:style_change', { from: 'dark', to: 'satellite' })

// Chat interactions
trackEvent('chat:message_sent', { intent: 'property_search', location: 'Palm Desert' })
trackEvent('chat:listing_clicked', { listingKey, source: 'chat_carousel' })
trackEvent('chat:map_sync', { action: 'panTo', success: true })

// Funnel tracking
trackEvent('funnel:map_view', { listingKey })
trackEvent('funnel:details_view', { listingKey, source: 'map' | 'chat' })
trackEvent('funnel:favorite', { listingKey })
trackEvent('funnel:contact', { listingKey })
```

#### 4.6.2 Performance Monitoring
```typescript
// Measure AI response time
const startTime = performance.now()
const aiResponse = await fetch('/api/chat/stream', { ... })
trackMetric('ai:response_time', performance.now() - startTime)

// Measure map load time
trackMetric('map:initial_load', mapLoadTime)
trackMetric('map:listings_fetch', listingsFetchTime)
trackMetric('map:render_time', renderTime)

// Measure chat-map sync latency
trackMetric('sync:map_control_latency', syncLatency)
```

---

## 5. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation ✅
- [ ] Create `/chap` route
- [ ] Build `ChapLayout` component (desktop split-screen)
- [ ] Build mobile overlay layout with swipe gestures
- [ ] Migrate `ChatWidget` to `ChapChatPanel`
- [ ] Integrate `MapView` into `ChapMapPanel`
- [ ] Wire up `ChapProvider` combining chat + MLS contexts

### Phase 2: AI Control ✅
- [ ] Extend Groq tools with `controlMap` function
- [ ] Extend Groq tools with `searchProperties` function
- [ ] Implement `mapController` API in ChapProvider
- [ ] Build `useMapSync` hook for AI → Map communication
- [ ] Add bounds drawing overlay component
- [ ] Add listing highlight/pulse animations

### Phase 3: Chat Integration ✅
- [ ] Parse AI response for component markers
- [ ] Build embedded `ListingCard` component for chat
- [ ] Implement chat → map selection sync
- [ ] Implement map → chat selection sync
- [ ] Add "Viewing on map" status indicators
- [ ] Scroll-to-message on external listing selection

### Phase 4: API Optimization ✅
- [ ] Build new `/api/listings/query` endpoint
- [ ] Add geospatial indexes to Listing schema
- [ ] Migrate GPS + CRMLS to unified collection (or keep dual with smart merging)
- [ ] Implement Redis tile caching
- [ ] Build tile → bounds calculation utilities
- [ ] Add faceted search aggregations

### Phase 5: Mobile Polish ✅
- [ ] Implement chat swipe-to-dismiss gesture
- [ ] Build icon morph animation (chat ↔ map)
- [ ] Fix map gesture conflicts when chat is open
- [ ] Optimize mobile payload size (field selection)
- [ ] Test on iOS/Android (prevent double-tap zoom)

### Phase 6: Analytics ✅
- [ ] Add comprehensive event tracking
- [ ] Build analytics dashboard (internal)
- [ ] Set up funnel visualization
- [ ] Monitor performance metrics
- [ ] A/B test chat position (left vs right)

---

## 6. SUCCESS METRICS

### User Engagement
- **Chat Usage Rate:** % of map sessions that use chat
- **Messages per Session:** Average conversation depth
- **Map Control Success Rate:** % of AI commands that successfully control map
- **Chat → Map Click-Through:** % of chat listing cards clicked

### Discovery Efficiency
- **Time to First Favorite:** How quickly users find interesting properties
- **Properties Viewed per Session:** Engagement depth
- **Swipe Queue Completion Rate:** % of users who swipe through queue
- **Return Visit Rate:** % of users who come back within 7 days

### AI Performance
- **Query Understanding Accuracy:** % of queries correctly interpreted
- **Tool Call Success Rate:** % of tool calls that execute correctly
- **Response Time:** P50/P95/P99 latency for AI responses
- **Map Sync Latency:** Time from AI response to map update

### Technical Performance
- **Initial Load Time:** Time to interactive
- **Listings Fetch Time:** API response time
- **Map Render Time:** Time to display all markers
- **Cache Hit Rate:** % of tile requests served from Redis

---

## 7. RISK MITIGATION

### Technical Risks
1. **AI Hallucination:** AI provides incorrect location data
   - **Mitigation:** Validate all coordinates against known cities/subdivisions
   - **Fallback:** Show disambiguation dialog if location is ambiguous

2. **Map Performance Degradation:** Too many markers crash mobile devices
   - **Mitigation:** Aggressive clustering, viewport culling, field selection
   - **Fallback:** Reduce max listings on mobile (500 instead of 1000)

3. **Chat-Map Desync:** Map state diverges from chat conversation
   - **Mitigation:** Single source of truth in ChapProvider
   - **Fallback:** "Refresh Map" button to re-sync

4. **Redis Cache Invalidation:** Stale data shown to users
   - **Mitigation:** 5-minute TTL, background revalidation
   - **Fallback:** Cache miss gracefully falls back to DB

### UX Risks
1. **Mobile Chat Obscures Map:** Users can't see map updates
   - **Mitigation:** Semi-transparent chat background, smaller height (85vh)
   - **Fallback:** Add "View on Map" button to force toggle

2. **Desktop Split Too Narrow:** Chat feels cramped
   - **Mitigation:** A/B test widths (380px vs 420px vs 500px)
   - **Fallback:** Add resize handle in Phase 2

3. **AI Over-Control:** Map moves unexpectedly, disorienting users
   - **Mitigation:** Smooth 2-second animations, clear feedback messages
   - **Fallback:** Add "Stop Map Auto-Pilot" button

---

## 8. FUTURE ENHANCEMENTS (Post-Launch)

### Voice Input
- Voice-to-text property search
- Hands-free browsing while driving

### Collaborative Filtering
- "Users who liked X also liked Y"
- ML-based property recommendations

### AR Map View
- Point phone at neighborhood, see property overlays
- Street-level AR property cards

### Real-Time Notifications
- WebSocket updates for new listings
- Price drop alerts
- Open house reminders

### Social Features
- Share favorite lists with partner/agent
- Collaborative property search sessions
- Comments on listings

---

## 9. CONCLUSION

The **"Chap" (Chat + Map)** integration represents a paradigm shift in property discovery:
- **Conversational search** replaces complex filter UIs
- **AI-driven map control** eliminates manual navigation
- **Unified experience** reduces friction and cognitive load
- **Mobile-first gestures** make browsing natural and intuitive

By leveraging our existing MLS architecture and Groq AI integration, we can deliver this experience with **low code and high efficiency**, focusing on:
1. Smart component composition (reuse MapView, MLSProvider, swipe queue)
2. AI tool orchestration (extend existing Groq setup)
3. State synchronization (single ChapProvider truth source)
4. Performance optimization (Redis caching, geospatial indexes)

**Timeline:** 6 weeks from start to launch
**Technical Debt:** Minimal (builds on existing architecture)
**User Impact:** Transformational (10x faster property discovery)

---

## 10. NEXT STEPS

**Immediate Actions:**
1. Review and approve this master plan
2. Set up Redis instance (development + production)
3. Create `/chap` branch in Git
4. Begin Phase 1: Foundation (ChapLayout components)
5. Schedule weekly progress reviews

**Awaiting Your Instruction:**
- Any architectural changes to the plan?
- Priority adjustments (which phases to accelerate)?
- Specific implementation details to explore deeper?
- Begin coding Phase 1?

---

**Document Version:** 1.0
**Last Updated:** 2025-01-25
**Author:** Claude Code + Joseph Sardella
**Status:** Awaiting Approval