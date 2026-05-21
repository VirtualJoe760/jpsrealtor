# STATE MANAGEMENT ARCHITECTURE
**Complete System Documentation**
**Created**: December 20, 2025
**Status**: Production System Analysis
**Purpose**: Document all state flow, contexts, and CHAP integration

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Provider Hierarchy](#provider-hierarchy)
3. [State Contexts](#state-contexts)
4. [Application Startup Flow](#application-startup-flow)
5. [View Transitions](#view-transitions)
6. [Chat → Map State Flow](#chat--map-state-flow)
7. [Map → Chat State Flow (MISSING)](#map--chat-state-flow-missing)
8. [CHAP Integration Gaps](#chap-integration-gaps)
9. [Recommendations](#recommendations)

---

## SYSTEM OVERVIEW

The application uses **multiple context layers** for state management, with **NO unified CHAP state bridge**.

### Current State Architecture

```
┌─────────────────────────────────────────────┐
│  RootLayout (layout.tsx)                    │
│  - Server-side theme detection              │
│  - SSR hydration management                 │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  ClientLayoutWrapper                        │
│  ├─ ThemeProvider (outermost)              │
│  ├─ MapStateProvider                       │
│  ├─ NextAuth SessionProvider               │
│  └─ SidebarProvider                        │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│  HomePage (page.tsx)                        │
│  ├─ MLSProvider                            │
│  │  └─ ChatProvider                        │
│  │     └─ HomeContent                      │
│  └─ Components:                             │
│     ├─ ChatWidget                           │
│     ├─ MapLayer                             │
│     ├─ ListingBottomPanel                   │
│     └─ FavoritesPannel                      │
└─────────────────────────────────────────────┘
```

**Key Issue**: MLSProvider and ChatProvider are **siblings** to MapStateContext, creating **isolated state islands**.

---

## PROVIDER HIERARCHY

### 1. **Root Level** (layout.tsx → ClientLayoutWrapper)

```typescript
// Execution Order (outermost to innermost):
ThemeProvider              // ← Theme state (light/dark)
  └─ MapStateProvider      // ← Global map visibility/position
      └─ SessionProvider   // ← NextAuth authentication
          └─ SidebarProvider  // ← Sidebar collapse state
```

**Scope**: Global across entire application
**Persists**: Across all route changes

---

### 2. **Page Level** (page.tsx - Homepage only)

```typescript
// Nested on HOMEPAGE only:
MLSProvider                  // ← MLS data, listings, filters
  └─ ChatProvider            // ← Chat messages, components
      └─ HomeContent         // ← UI components
```

**Scope**: Only on `/` route
**Lifecycle**: Mounts/unmounts when navigating to/from homepage
**Critical**: This means chat/MLS state is **lost** on navigation

---

## STATE CONTEXTS

### Context 1: **ThemeContext** (Global)

**File**: `src/app/contexts/ThemeContext.tsx`
**Scope**: Global
**Purpose**: Theme switching (lightgradient ↔ blackspace)

```typescript
interface ThemeContextType {
  currentTheme: "lightgradient" | "blackspace";
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}
```

**Persistence**:
- Cookie (`site-theme`) for SSR
- localStorage for client-side backup

**State Flow**:
```
Server reads cookie → SSR renders with theme classes
  ↓
Client hydrates → ThemeProvider mounts
  ↓
User clicks theme toggle → Cookie + localStorage updated
  ↓
All components re-render with new theme
```

---

### Context 2: **MapStateContext** (Global)

**File**: `src/app/contexts/MapStateContext.tsx`
**Scope**: Global
**Purpose**: Control map background visibility and position

```typescript
interface MapStateContextType {
  // Visibility
  isMapVisible: boolean;
  setMapVisible: (visible: boolean) => void;

  // Position
  viewState: MapViewState | null;  // { centerLat, centerLng, zoom }
  setViewState: (state: MapViewState) => void;

  // Display
  displayListings: MapListing[];
  setDisplayListings: (listings: MapListing[]) => void;
  selectedListing: MapListing | null;
  setSelectedListing: (listing: MapListing | null) => void;

  // Controls
  flyToLocation: (lat: number, lng: number, zoom?: number) => void;
  setBounds: (bounds: MapBounds) => void;
  mapStyle: 'toner' | 'dark' | 'satellite' | 'bright';
  setMapStyle: (style) => void;
  mapOpacity: number;
  setMapOpacity: (opacity: number) => void;
  isMapInteractive: boolean;
  setMapInteractive: (interactive: boolean) => void;
}
```

**Key Methods**:
- `flyToLocation()`: Sets pending fly-to action for when map mounts
- `setMapVisible(true)`: Triggers wipe animation to reveal map
- `setDisplayListings()`: Stores listings to show on map

**Used By**:
- `useMapControl()` hook (wrapper for convenience)
- ChatWidget (to show map from AI results)
- HomePage (to toggle map visibility)

---

### Context 3: **MLSProvider** (Page-scoped)

**File**: `src/app/components/mls/MLSProvider.tsx`
**Scope**: Homepage only
**Purpose**: Comprehensive MLS data management

```typescript
interface MLSContextValue {
  // Listings
  allListings: MapListing[];
  visibleListings: MapListing[];
  markers: MapMarker[];
  selectedListing: MapListing | null;
  selectedFullListing: IUnifiedListing | null;
  visibleIndex: number | null;

  // Filters
  filters: Filters;
  setFilters: (filters: Filters) => void;
  updateFilter: (key: keyof Filters, value: any) => void;
  resetFilters: () => void;

  // Favorites & Dislikes
  likedListings: MapListing[];
  dislikedListings: any[];
  toggleFavorite: (listing: MapListing) => void;
  removeFavorite: (listing: MapListing) => void;
  clearFavorites: () => void;
  swipeLeft: (listing: IUnifiedListing) => void;
  swipeRight: (listing: IUnifiedListing) => void;
  removeDislike: (listing: MapListing) => void;
  clearDislikes: () => void;

  // Map Controls
  mapStyle: 'toner' | 'dark' | 'satellite' | 'bright';
  setMapStyle: (value) => void;

  // Loading States
  isLoading: boolean;
  isLoadingViewport: boolean;
  isPreloaded: boolean;
  isLoadingListing: boolean;

  // Cache
  listingCache: React.MutableRefObject<Map<string, IUnifiedListing>>;

  // Actions
  loadListings: (bounds: any, filters: Filters, merge?: boolean) => Promise<void>;
  selectListing: (listing: MapListing | null, index?: number) => Promise<void>;
  selectListingBySlug: (slug: string) => Promise<void>;
  closeListing: () => void;

  // Swipe Queue
  swipeQueue: ReturnType<typeof useSwipeQueue>;

  // Total counts
  totalCount: number;
}
```

**Key Features**:
- **Server-side clustering** via `useServerClusters()`
- **Swipe queue** via `useSwipeQueue()`
- **Prefetching** (intelligent caching of next 3 listings)
- **LRU cache** (keeps last 100 listings in memory)

**Critical Methods**:
- `loadListings()`: Fetches clusters/listings from `/api/map-clusters`
- `selectListing()`: Fetches full listing data from `/api/mls-listings/[slug]`
- `swipeQueue.initializeQueue()`: Starts queue for swiping

---

### Context 4: **ChatProvider** (Page-scoped)

**File**: `src/app/components/chat/ChatProvider.tsx`
**Scope**: Homepage only
**Purpose**: Chat state and component data

```typescript
interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (
    content: string,
    role: "user" | "assistant",
    error?: string,
    components?: ComponentData
  ) => void;
  clearMessages: () => void;
  updateMessageComponents: (messageId: string, components: ComponentData) => void;
}

interface ComponentData {
  carousel?: {
    title?: string;
    listings: Listing[];
    location?: { name: string; lat: number; lng: number; zoom: number };
  };
  mapView?: boolean;
  listView?: boolean;
  appreciation?: { /* ... */ };
  comparison?: { /* ... */ };
  marketStats?: { /* ... */ };
  articles?: { /* ... */ };
  neighborhood?: {  // ← NEW in uncommitted changes
    type: "city" | "subdivision" | "county" | "region";
    cityId?: string;
    subdivisionSlug?: string;
    name: string;
    filters?: { /* 40+ filter types */ };
  };
}
```

**Key Feature**: `neighborhood` component enables **queue-based swipe mode**

---

## APPLICATION STARTUP FLOW

Based on the logs you provided, here's the exact initialization sequence:

### **Step 1: Server-Side Rendering (SSR)**

```
1. layout.tsx executes on server
   ├─ Reads theme cookie: "lightgradient"
   ├─ Renders HTML with theme classes
   └─ Injects theme script to prevent flash

2. page.tsx renders on server
   ├─ MLSProvider initializes (no data yet)
   └─ ChatProvider initializes (empty messages)

3. HTML sent to browser with theme pre-applied
```

**Log Output**:
```
✓ Starting...
✓ Ready in 7.9s
○ Compiling / ...
```

---

### **Step 2: Client Hydration**

```
1. Browser loads JavaScript bundle

2. ClientLayoutWrapper mounts
   ├─ ThemeProvider hydrates
   │  └─ Syncs cookie with localStorage
   ├─ MapStateProvider initializes
   │  └─ State: { isMapVisible: false, viewState: null }
   └─ SessionProvider checks auth

3. HomePage mounts
   ├─ MLSProvider initializes
   │  └─ useServerClusters() hook created
   └─ ChatProvider initializes
      └─ Empty message history

4. HomeContent renders
   ├─ Checks URL for ?view=map parameter
   ├─ If present: calls showMapAtLocation()
   └─ If not: shows chat interface
```

**Log Output**:
```
[useServerClusters] Hook initialized
[useServerClusters] Current state: { markersCount: 0, totalCount: undefined, isLoading: false }
🔍 MLSProvider - Total markers: 0, Clusters: 0, Listings: 0
🗺️ [MapLayer] Using default viewState: { centerLat: 37.25, centerLng: -119.25, zoom: 4.8 }
GET / 200 in 16.3s (compile: 16.1s, render: 289ms)
```

**Analysis**: Map starts with default California view (lat: 37.25, lng: -119.25, zoom: 4.8)

---

### **Step 3: Map URL Parameter Detected**

User has `?view=map&lat=36.8308&lng=-119.2500&zoom=4.0` in URL:

```
1. useEffect in HomeContent triggers
   ├─ Reads URL parameters
   ├─ Calls showMapAtLocation(36.8308, -119.2500, 4.0)
   └─ This calls MapStateContext.flyToLocation()

2. MapLayer detects isMapVisible = true
   ├─ Wipe animation plays (1500ms)
   └─ Map reveals with new coordinates

3. MapView's onLoad fires
   └─ Calls handleBoundsChange() with visible bounds
```

**Log Output**:
```
GET /?view=map&lat=36.8308&lng=-119.2500&zoom=4.0 200 in 25ms
🎯 Clustering decision context: {
  zoom: 4,
  source: 'manual',
  intent: 'explore',
  expectedCount: 0,
  actualCount: 0
}
📊 Using region-level clustering for zoom 4
```

---

### **Step 4: API Calls Triggered**

```
1. Map clusters API called
   GET /api/map-clusters?north=44.79&south=28.86&east=-112.94&west=-125.56&zoom=4

2. Swipe exclude keys fetched (for queue system)
   GET /api/swipes/exclude-keys?anonymousId=e7f98e8b48c8458f37b679e272542e2c

3. User favorites/dislikes loaded
   GET /api/user/favorites
   GET /api/user/dislikes

4. California stats loaded (for homepage)
   GET /api/california-stats
```

**Log Output**:
```
GET /api/map-clusters?...&zoom=4 200 in 511ms
💾 Found 3 regions in database
✅ Created 3 region clusters: [
  'Northern California: 1500 listings (with polygon)',
  'Central California: 6017 listings (with polygon)',
  'Southern California: 49691 listings (with polygon)'
]
GET /api/swipes/exclude-keys... 200 in 1772ms
GET /api/user/favorites 200 in 410ms
GET /api/user/dislikes 200 in 373ms
GET /api/california-stats 200 in 1276ms
```

**Result**: Map now shows 3 region polygons with hover states

---

## VIEW TRANSITIONS

### Transition 1: **Chat View → Map View**

**Trigger**: User clicks "View on map" button in chat OR AI provides listings

```
┌──────────────────────────────────────────────────────┐
│ BEFORE: Chat visible, Map hidden                    │
│ - isMapVisible: false                                │
│ - clipPath: inset(50% 0% 50% 0%)  ← Collapsed       │
│ - pointerEvents: 'none'                              │
└──────────────────────────────────────────────────────┘
                       │
                       │ showMapAtLocation(lat, lng, zoom)
                       │
                       ↓
┌──────────────────────────────────────────────────────┐
│ DURING: Wipe animation (1500ms)                      │
│ - isMapVisible: true                                 │
│ - clipPath: inset(50% → 0%)  ← Expanding            │
│ - transition: duration-[1500ms]                      │
└──────────────────────────────────────────────────────┘
                       │
                       │ After animation
                       ↓
┌──────────────────────────────────────────────────────┐
│ AFTER: Map visible, Chat input only                 │
│ - isMapVisible: true                                 │
│ - clipPath: inset(0% 0% 0% 0%)  ← Fully visible     │
│ - pointerEvents: 'auto'                              │
│ - Chat: pointerEvents: 'none' (except input)         │
└──────────────────────────────────────────────────────┘
```

**State Updates**:
1. `MapStateContext.setMapVisible(true)`
2. `MapStateContext.setViewState({ centerLat, centerLng, zoom })`
3. URL updated: `/?view=map&lat=...&lng=...&zoom=...`

**Code Path**:
```
ChatWidget
  └─ AI response includes location
      └─ Calls useMapControl().showMapAtLocation()
          └─ Updates MapStateContext
              └─ MapLayer re-renders (reveals map)
                  └─ MapView flies to location
```

---

### Transition 2: **Map View → Chat View**

**Trigger**: User clicks chat toggle OR navigates to `/` without `?view=map`

```
┌──────────────────────────────────────────────────────┐
│ BEFORE: Map visible                                  │
│ - isMapVisible: true                                 │
│ - clipPath: inset(0% 0% 0% 0%)                       │
└──────────────────────────────────────────────────────┘
                       │
                       │ hideMap()
                       │
                       ↓
┌──────────────────────────────────────────────────────┐
│ DURING: Collapse animation (1500ms)                  │
│ - isMapVisible: false                                │
│ - clipPath: inset(0% → 50%)  ← Collapsing           │
└──────────────────────────────────────────────────────┘
                       │
                       │ After animation
                       ↓
┌──────────────────────────────────────────────────────┐
│ AFTER: Chat visible, Map hidden                     │
│ - isMapVisible: false                                │
│ - clipPath: inset(50% 0% 50% 0%)                    │
│ - Chat: pointerEvents: 'auto'                        │
└──────────────────────────────────────────────────────┘
```

**State Updates**:
1. `MapStateContext.setMapVisible(false)`
2. URL updated: `/` (removes `?view=map`)

**Note**: Map state (listings, position) is **preserved** in MapStateContext

---

## CHAT → MAP STATE FLOW

### Flow 1: **AI Provides Neighborhood Query**

**Example**: User asks "Show me homes in Palm Springs under $500k"

```
1. User types query
   └─ ChatWidget.handleSubmit()
       └─ POST /api/chat-v2
           └─ AI classifies intent: "neighborhood_search"
               └─ Calls searchHomes tool
                   └─ Returns ComponentData with neighborhood
```

**AI Response**:
```json
{
  "text": "I found 147 homes in Palm Springs under $500k...",
  "components": {
    "neighborhood": {
      "type": "city",
      "cityId": "palm-springs",
      "name": "Palm Springs",
      "filters": {
        "maxPrice": 500000
      }
    },
    "carousel": {
      "listings": [ /* 10 sample listings */ ]
    }
  }
}
```

```
2. ChatProvider receives components
   └─ Stores in message.components.neighborhood

3. ChatResultsContainer detects neighborhood component
   └─ useEffect triggers fetchNeighborhoodListings()
       └─ GET /api/cities/palm-springs/listings?maxPrice=500000
           └─ Returns ALL filtered listings (up to 200)

4. User clicks listing in carousel
   └─ ChatResultsContainer.handleOpenListingPanelWithQueue()
       ├─ Converts clicked listing to MapListing
       ├─ Initializes swipeQueue with metadata
       ├─ Sets queue mode: onSetQueueMode(true)
       └─ Opens ListingBottomPanel
```

**Queue Initialization**:
```typescript
// ChatQueueStrategy receives:
{
  referenceListing: clickedListing,
  source: 'ai_chat',
  query: JSON.stringify({
    neighborhoodType: 'city',
    neighborhoodId: 'palm-springs',
    filters: { maxPrice: 500000 }
  })
}

// Strategy fetches all listings and sorts by price
await fetch('/api/cities/palm-springs/listings?maxPrice=500000&limit=200')
```

**Result**: User can swipe through **all matching listings** in order, not just the 10 in carousel!

---

### Flow 2: **Chat Opens Map View** (Traditional)

**Example**: User clicks "View on full map" button

```
1. Chat displays listing carousel
   └─ "Open in Map View" button rendered

2. User clicks button
   └─ ChatWidget calls useMapControl().showMapAtLocation()
       ├─ MapStateContext.setMapVisible(true)
       ├─ MapStateContext.setViewState({ lat, lng, zoom: 12 })
       └─ MapStateContext.setDisplayListings(listings)

3. MapLayer detects isMapVisible = true
   └─ Wipe animation plays
       └─ MapView renders at new location
           └─ Shows markers for listings

4. URL updated
   └─ router.replace('/?view=map&lat=...&lng=...&zoom=12')
```

**State Transfer**:
- Listings array: ChatProvider → MapStateContext
- Location: Calculated from first listing or AI-provided
- Zoom: Fixed at 12 (city-level view)

---

## MAP → CHAT STATE FLOW (MISSING)

### ❌ **Gap 1: Map Panning Doesn't Update Chat**

**Current Behavior**:
```
User pans map to new city
  ↓
MapView.onBoundsChange() fires
  ↓
MLSProvider.loadListings() called
  ↓
New clusters/listings fetched
  ↓
markers state updated in MLSProvider
  ↓
❌ ChatProvider has NO IDEA this happened
```

**What Should Happen** (CHAP vision):
```
User pans map to new city
  ↓
MapView.onBoundsChange() fires
  ↓
CHAPContext detects location change
  ├─ Updates shared location state
  ├─ MLSProvider.loadListings() called
  └─ ChatProvider.updateContext({
      location: { name: "Palm Desert", lat: 33.72, lng: -116.37 }
    })
  ↓
AI can now reference: "I see you're looking at Palm Desert..."
```

**Missing Component**: `CHAPContext` or bidirectional sync

---

### ❌ **Gap 2: Listing Selection Doesn't Add to Chat**

**Current Behavior**:
```
User clicks marker on map
  ↓
MLSProvider.selectListing() called
  ↓
ListingBottomPanel opens
  ↓
❌ No message added to ChatProvider
```

**What Should Happen** (CHAP vision):
```
User clicks marker on map
  ↓
MLSProvider.selectListing() called
  ↓
CHAPContext.handleListingSelected()
  ├─ Opens ListingBottomPanel
  └─ ChatProvider.addMessage({
      role: "assistant",
      content: "📍 123 Main St - $475,000\n\n3bd/2ba in Vista Las Palmas..."
    })
```

---

### ❌ **Gap 3: Filter Changes Don't Sync**

**Current Behavior**:
```
User applies filter in map controls
  ↓
HomeContent.handleApplyFilters() called
  ↓
MLSProvider.setFilters() updates MLS state
  ↓
MLSProvider.loadListings() refetches
  ↓
❌ ChatProvider's last AI context still has old filters
```

**What Should Happen** (CHAP vision):
```
User applies filter in map controls
  ↓
CHAPContext.setFilters()
  ├─ MLSProvider.setFilters()
  ├─ ChatProvider.updateContext({ filters: newFilters })
  └─ Next AI query uses correct filters
```

---

## CHAP INTEGRATION GAPS

### **What Exists** (Partial CHAP)

✅ **Global Map Background** (`MapStateContext`)
- Map can be shown/hidden from anywhere
- Position persists across components

✅ **Chat Can Control Map** (One-way)
- AI responses can trigger map view
- Listings flow from chat to map

✅ **URL State Sync**
- Map position stored in URL
- Restores on page refresh

✅ **Neighborhood Queue System** (New)
- Chat can initialize dynamic swipe queues
- Full filtering support

---

### **What's Missing** (True CHAP)

❌ **No Unified CHAP Context**
- MLSProvider and ChatProvider are isolated
- No shared state bridge

❌ **No Map → Chat Flow**
- Map interactions don't update chat context
- AI can't reference map state

❌ **No Bidirectional Filter Sync**
- Filters in map don't update AI context
- Filters in chat don't persist to map state

❌ **No Location Context Sharing**
- User pans map → AI doesn't know
- AI suggests location → map doesn't auto-follow

❌ **No Conversation-Map Linking**
- Can't share "CHAP session" via URL
- Can't resume conversation with map state

---

## RECOMMENDATIONS

### **Solution 1: Create CHAPContext** (Recommended)

Create a **new global context** that bridges MLSProvider and ChatProvider:

```typescript
// src/app/contexts/CHAPContext.tsx
interface CHAPContextType {
  // Shared location state
  currentLocation: {
    name: string;
    lat: number;
    lng: number;
    zoom: number;
    type: 'city' | 'subdivision' | 'region';
  } | null;
  setLocation: (location: ...) => void;

  // Shared filter state
  activeFilters: Filters;
  updateFilters: (filters: Filters) => void;

  // Interaction state
  mapMode: 'explore' | 'chat_results' | 'neighborhood_queue';
  setMapMode: (mode: ...) => void;

  // Listing context
  contextListings: MapListing[];
  setContextListings: (listings: MapListing[]) => void;

  // Selected listing
  focusedListing: MapListing | null;
  setFocusedListing: (listing: MapListing | null) => void;

  // Bidirectional sync
  syncMapToChat: () => void;
  syncChatToMap: () => void;
}
```

**Provider Hierarchy Change**:
```typescript
// page.tsx
<CHAPProvider>  {/* NEW */}
  <MLSProvider>
    <ChatProvider>
      <HomeContent />
    </ChatProvider>
  </MLSProvider>
</CHAPProvider>
```

**How It Works**:
1. Both MLSProvider and ChatProvider consume CHAPContext
2. When map bounds change → CHAPContext.setLocation() → ChatProvider updates
3. When AI provides location → CHAPContext.setLocation() → MLSProvider updates
4. Filters synced through CHAPContext.activeFilters

---

### **Solution 2: Enhance MapStateContext** (Simpler)

Extend existing `MapStateContext` to include chat-aware state:

```typescript
// Add to MapStateContext:
interface MapStateContextType {
  // ... existing fields ...

  // NEW: Chat context
  chatContext: {
    lastQuery: string;
    currentIntent: string;
    locationContext: { name: string; lat: number; lng: number };
    filters: Filters;
  } | null;
  setChatContext: (context: ...) => void;

  // NEW: Map interaction callbacks
  onLocationChange: ((location: ...) => void) | null;
  setOnLocationChange: (callback: ...) => void;

  onListingSelected: ((listing: MapListing) => void) | null;
  setOnListingSelected: (callback: ...) => void;
}
```

**How It Works**:
1. ChatProvider registers callbacks with MapStateContext
2. Map updates trigger callbacks → chat updates
3. Less code change, reuses existing global context

---

### **Solution 3: Event Bus Pattern** (Most Flexible)

Create a **global event emitter** for CHAP events:

```typescript
// src/lib/chapEvents.ts
import { EventEmitter } from 'events';

export const chapEvents = new EventEmitter();

// Event types
export type CHAPEvent =
  | { type: 'MAP_LOCATION_CHANGED'; location: LocationData }
  | { type: 'LISTING_SELECTED'; listing: MapListing }
  | { type: 'FILTERS_APPLIED'; filters: Filters }
  | { type: 'CHAT_QUERY_SENT'; query: string; intent: string }
  | { type: 'AI_LOCATION_SUGGESTED'; location: LocationData };

// Usage in components:
chapEvents.emit('MAP_LOCATION_CHANGED', { name: 'Palm Desert', ... });
chapEvents.on('CHAT_QUERY_SENT', (event) => { /* handle */ });
```

**How It Works**:
1. Any component can emit/listen to events
2. Decoupled communication
3. Easy to add new event types
4. Can log all events for debugging

---

### **Immediate Next Steps**

#### **🔴 CRITICAL: Refresh State Bug** (URGENT - Added Dec 20, 2025)

**Problem**: After server restart/refresh, page sometimes shows **map view** instead of expected **chat view**.

**Root Cause**:
- `isMapVisible` in MapStateContext is transient (resets to `false`)
- URL parameter `?view=map` persists in browser
- Race condition causes URL/state mismatch
- On mount, URL wins → forces map to show

**Impact**: **High** for developers (every HMR), **Low** for users

**Fix Required**:
1. Persist `isMapVisible` in sessionStorage
2. Add conflict resolution on mount
3. Fix useEffect dependency array
4. Estimated: 1-2 hours

**Full Analysis**: `docs/REFRESH_STATE_BUG.md`

---

#### **Priority 1: Fix Build Blocker**

1. **Fix Build Error** (blocks everything)
   - Create stub for `@/lib/queries/monitoring`
   - Estimated: 5 minutes

---

#### **Priority 2: Test Existing Work**

2. **Test Neighborhood Queue** (verify what works)
   - Manual test: "Show me homes in Palm Springs"
   - Click listing → verify queue initializes
   - Swipe → verify navigation works
   - Estimated: 30 minutes

3. **Test Chat V2 API**
   - Verify tool execution and streaming
   - Estimated: 30 minutes

---

#### **Priority 3: Implement CHAP**

4. **Implement CHAPContext** (recommended approach)
   - Start with location + filter sync
   - Add callbacks for map → chat flow
   - Wire up to existing providers
   - Estimated: 4-6 hours

5. **Connect Bidirectional State Flow**
   - Map panning updates chat context
   - Listing selection adds to chat
   - Filter sync both directions
   - Estimated: 2-3 hours

---

#### **Priority 4: Documentation**

6. **Document Event Flow** (for team)
   - Update this doc with implementation details
   - Add sequence diagrams for each flow
   - Estimated: 1-2 hours

---

## CONCLUSION

The application has **90% of CHAP functionality** but lacks the **critical bidirectional state bridge**.

**What Works**:
- ✅ Global map background system
- ✅ Chat can control map (one-way)
- ✅ Neighborhood queue system
- ✅ URL state persistence

**What's Broken**:
- ❌ Map can't inform chat (no callbacks)
- ❌ No unified location/filter state
- ❌ No conversation-map session linking

**Fix Priority**:
1. **High**: Create CHAPContext or extend MapStateContext
2. **Medium**: Wire up map → chat callbacks
3. **Low**: Add session sharing via URL

**Estimated Effort**: 4-6 hours for full CHAP integration

---

**Last Updated**: December 20, 2025
**Next Review**: After CHAP context implementation
**Maintainer**: Development Team
