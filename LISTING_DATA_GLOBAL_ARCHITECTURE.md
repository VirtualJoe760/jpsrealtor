# Listing Data Global Architecture

**Complete MLS Data Ecosystem Documentation**

This document provides a comprehensive map of the entire MLS listing data system, from ingestion to user display. This is a diagnostic reference for understanding how listing data flows through the application.

---

## Table of Contents

1. [Data Sources](#data-sources)
2. [Database Architecture](#database-architecture)
3. [Ingestion Pipeline](#ingestion-pipeline)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Utilities & Helpers](#utilities--helpers)
7. [Data Models & Types](#data-models--types)
8. [Tile System](#tile-system)
9. [Integration Points](#integration-points)

---

## Data Sources

### 1. GPS MLS (Primary Source)
- **Provider:** GPS Real Estate MLS
- **API:** Spark API (OData protocol)
- **Coverage:** Greater Palm Springs area
- **Data Type:** Residential listings (Property Type A)
- **Collection:** `listings` (MongoDB)
- **Field Indicator:** No `mlsSource` field (or `mlsSource: "GPS"` in API)

### 2. CRMLS (Secondary Source)
- **Provider:** California Regional MLS
- **API:** Spark API (OData protocol)
- **MLS ID:** `20200218121507636729000000`
- **Coverage:** Southern California (broader coverage)
- **Data Type:** All property types (A=Sale, B=Rental, C=Multi-Family)
- **Collection:** `crmls_listings` (MongoDB)
- **Field Indicator:** `mlsSource: "CRMLS"` (set during seed)

### 3. Photos Collection (Shared)
- **Collection:** `photos` (MongoDB)
- **Links To:** Both GPS and CRMLS listings
- **Key Field:** `listingId` (short ID, not listingKey)
- **Structure:** Multiple photos per listing, primary flag
- **Resolution Priority:** uri1600 > uri1280 > uri1024 > uri800 > uri640 > uri300 > uriThumb

---

## Database Architecture

### Collections

#### 1. `listings` Collection (GPS Data)
**File:** `src/models/listings.ts`

**Primary Fields:**
- `listingId` - Short MLS ID (e.g., "20200218121507636729000000")
- `listingKey` - Long unique identifier (for URLs)
- `slug` - URL-safe identifier
- `slugAddress` - URL-safe address (preferred for routing)
- `unparsedAddress` - Full street address
- `city` - City name
- `latitude` / `longitude` - Coordinates (required for map)
- `listPrice` - Current listing price
- `bedsTotal` / `bedroomsTotal` - Bedroom count (dual field names)
- `bathsTotal` / `bathroomsTotalInteger` / `bathroomsFull` - Bath count (multiple field names)
- `livingArea` - Square footage
- `yearBuilt` - Construction year
- `propertyType` - A=Sale, B=Rental, C=Multi-Family
- `propertySubType` - Specific type (e.g., "Single Family Residence")
- `standardStatus` - "Active", "Closed", "Pending", etc.
- `primaryPhotoUrl` - Fallback photo URL
- `subdivisionName` - Subdivision/community name

**Missing Fields:**
- ❌ No `mlsSource` field set during seed (GPS listings)

**Line Reference:** `src/models/listings.ts:~300`

#### 2. `crmls_listings` Collection (CRMLS Data)
**File:** `src/models/crmls-listings.ts`

**Primary Fields:** (Same structure as `listings`)
- All standard listing fields
- ✅ `mlsSource: "CRMLS"` - Set during seed process

**Seed Location:** `src/scripts/mls/backend/crmls/seed.py:80`
```python
raw["mlsSource"] = "CRMLS"  # Explicitly set
```

**Line Reference:** `src/models/crmls-listings.ts` (similar to listings.ts)

#### 3. `photos` Collection
**File:** `src/models/photos.ts`

**Primary Fields:**
- `photoId` - Unique photo identifier
- `listingId` - Links to listing (SHORT ID, not listingKey!)
- `primary` - Boolean flag for primary photo
- `uri800`, `uri1024`, `uri1280`, `uri1600`, `uri2048` - Photo URLs at various resolutions
- `caption` - Photo description
- `order` - Display order

**Critical Note:** Photos link via `listingId` (short ID), NOT `listingKey` (long ID)

**Line Reference:** `src/models/photos.ts`

#### 4. `subdivisions` Collection
**File:** `src/models/subdivisions.ts` (inferred)

**Primary Fields:**
- `name` - Subdivision name
- `slug` - URL-safe identifier
- `city` - Parent city
- `listingCount` - Number of active listings
- Calculated fields for market stats

---

## Ingestion Pipeline

### Architecture Overview

**Orchestration:** `src/scripts/mls/backend/main.py`

The ingestion pipeline runs in sequential phases for each MLS source:

```
CRMLS Pipeline:
  1. fetch.py      → Download from Spark API
  2. flatten.py    → Normalize JSON structure
  3. seed.py       → Insert into MongoDB
  4. cache_photos.py → Download/cache images
  5. update.py     → Update existing records

GPS Pipeline:
  1. fetch.py      → Download from Spark API
  2. flatten.py    → Normalize JSON structure
  3. seed.py       → Insert into MongoDB
  4. cache_photos.py → Download/cache images
  5. update.py     → Update existing records
```

**Line Reference:** `src/scripts/mls/backend/main.py:13-27`

### Phase 1: Fetch (Spark API)

#### CRMLS Fetch
**File:** `src/scripts/mls/backend/crmls/fetch.py`

**Filters Applied:**
```python
# Line 49-54
mls_filter = "MlsId Eq '20200218121507636729000000'"  # CRMLS MLS ID
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Active'"
combined_filter = f"{mls_filter} And ({property_filter}) And {status_filter}"
```

**Pagination:**
- Uses Spark API `skiptoken` parameter
- Token from last record's `Id` field
- Fetches in batches until no more records

**Line Reference:** Lines 49-54, 71

#### GPS Fetch
**File:** `src/scripts/mls/backend/fetch.py`

**Filters Applied:**
```python
# Similar structure to CRMLS
property_filter = "PropertyType Eq 'A'"  # Only for-sale residential
status_filter = "StandardStatus Eq 'Active'"
```

**Line Reference:** `src/scripts/mls/backend/fetch.py` (similar pattern)

### Phase 2: Flatten
**Files:**
- `src/scripts/mls/backend/crmls/flatten.py`
- `src/scripts/mls/backend/flatten.py`

**Purpose:** Convert nested Spark API JSON to flat structure for MongoDB

### Phase 3: Seed (Database Insert)

#### CRMLS Seed
**File:** `src/scripts/mls/backend/crmls/seed.py`

**Key Operations:**
```python
# Line 30
collection = db.crmls_listings  # Separate collection!

# Line 80
raw["mlsSource"] = "CRMLS"  # SET SOURCE IDENTIFIER
```

**Insert Strategy:** Bulk write with upsert (listingId as key)

**Line Reference:** Lines 30, 80

#### GPS Seed
**File:** `src/scripts/mls/backend/seed.py`

**Key Operations:**
```python
# Line 31
collection = db.listings  # GPS collection

# NO mlsSource field set! ← Missing identifier
```

**Issue:** GPS listings don't get `mlsSource` field during seed

**Line Reference:** Line 31

### Phase 4: Cache Photos
**Files:**
- `src/scripts/mls/backend/crmls/cache_photos.py`
- `src/scripts/mls/backend/cache_photos.py`

**Purpose:** Download high-resolution photos to local storage

### Phase 5: Update
**Files:**
- `src/scripts/mls/backend/crmls/update.py`
- `src/scripts/mls/backend/update.py`

**Purpose:** Update existing records with fresh data

### Error Handling

**Pipeline Behavior:** `src/scripts/mls/backend/main.py:46-49`

```python
# ❌ CRITICAL: Pipeline aborts on ANY script failure
# No partial success - entire pipeline must complete
if exit_code != 0:
    print(f"❌ Script {script} failed with exit code {exit_code}. Aborting.")
    sys.exit(exit_code)
```

**Risk Factors:**
1. Rate limits count as retries (fail after 3)
2. Silent bulk write errors don't abort
3. No active status filter in tile generation
4. Entire pipeline fails if any phase fails

---

## API Endpoints

### Map & Bounds-Based Listings

#### 1. GET/POST `/api/mls-listings`
**File:** `src/app/api/mls-listings/route.ts`

**Purpose:** Main listing endpoint for map view (bounds-based)

**Query Params:**
- `north`, `south`, `east`, `west` - Map bounds
- `minPrice`, `maxPrice` - Price range
- `minBeds`, `maxBeds` - Bedroom range
- `minBaths`, `maxBaths` - Bathroom range
- `propertyType` - A/B/C
- `hasPool`, `hasView` - Feature filters
- `subdivisionSlug` - Filter by subdivision
- `cityId` - Filter by city

**Data Sources:** Queries BOTH collections
```typescript
// Lines 322-337
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.aggregate(gpsPipeline),        // GPS
  CRMLSListing.aggregate(crmlsPipeline), // CRMLS
]);

// Merge and add mlsSource
const gpsWithSource = gpsListings.map(listing => ({
  ...listing,
  mlsSource: listing.mlsSource || "GPS"  // ← Fallback
}));

const crmlsWithSource = crmlsListings.map(listing => ({
  ...listing,
  mlsSource: listing.mlsSource || "CRMLS",
  listingKey: listing.listingKey || listing.listingId
}));

const allListings = [...gpsWithSource, ...crmlsWithSource];
```

**Line Reference:** Lines 322-337

**Current Usage:** Used by `useListings.ts:73-74` for map loading

#### 2. GET `/api/map-tiles/[z]/[x]/[y]`
**File:** `src/app/api/map-tiles/[z]/[x]/[y]/route.ts`

**Purpose:** Serve pre-generated tile data for map

**Response:** Static JSON file from `public/tiles/{z}/{x}/{y}.json`

**Caching:**
```typescript
// Lines 15-27
headers: {
  'Cache-Control': 'public, max-age=31536000, immutable',
}
```

**Line Reference:** Lines 15-27

**Current Usage:** ❌ NOT USED (tile system disconnected)

### Chat & AI Search

#### 3. POST `/api/chat/search-listings`
**File:** `src/app/api/chat/search-listings/route.ts`

**Purpose:** AI-powered listing search with filters

**Data Source:** CRMLS ONLY (Line 155)
```typescript
// Line 155
const listingsQuery = CRMLSListing.find(query)
```

**Filters Supported:**
- `minBeds`, `maxBeds`, `minBaths`, `maxBaths`
- `minPrice`, `maxPrice`, `minSqft`, `maxSqft`
- `cities[]` - Array of cities
- `subdivisions[]` - Array of subdivisions (fuzzy matching)
- `propertyTypes[]` - Property subtypes
- `hasPool`, `hasView` - Feature flags
- `limit` - Optional result limit

**Rental Filtering:**
```typescript
// Lines 40-54 - Exclude rentals by default unless searching by subdivision
if (!subdivisions || subdivisions.length === 0) {
  query.$and = [
    {
      $or: [
        { propertySubType: { $nin: ["Rental", "Lease", "For Lease", "Residential Lease"] } },
        { propertySubType: { $exists: false } },
      ],
    },
    { listPrice: { $gte: 50000 } } // Safeguard: rentals typically < $50k
  ];
}
```

**Photo Handling:**
```typescript
// Lines 169-181 - Fetch from photos collection using listingId
const listingIds = listings.map((l: any) => l.listingId);
const photos = await Photo.find({
  listingId: { $in: listingIds },
  primary: true
}).lean();
```

**Line Reference:** Lines 155, 169-181

**Used By:** Chat widget AI function calling

#### 4. POST `/api/chat/match-location`
**File:** `src/app/api/chat/match-location/route.ts` (inferred)

**Purpose:** Match user queries to subdivisions/cities/counties

**Implementation:** Uses `location-matcher.ts` utility

**Returns:**
```typescript
{
  type: 'subdivision' | 'city' | 'county',
  name: string,
  confidence: number,
  data: any
}
```

**Line Reference:** Inferred from `groq-functions.ts:334`

### City-Specific

#### 5. GET `/api/cities/[cityId]/listings`
**File:** `src/app/api/cities/[cityId]/listings/route.ts`

**Purpose:** Get all listings in a specific city

**Query Params:**
- `propertyType` - "all" | "sale" | "rental"
- `limit` - Default 100
- `minPrice`, `maxPrice`, `minBeds`, `maxBeds`, `minBaths`, `maxBaths`

**Data Sources:** Queries BOTH collections
```typescript
// Lines 99-115
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.find(baseQuery).select(...).limit(limit).lean().exec(),
  CRMLSListing.find(baseQuery).select(...).limit(limit).lean().exec(),
]);

// Merge with mlsSource tags
const listings = [
  ...gpsListings.map((l: any) => ({ ...l, mlsSource: "GPS" })),
  ...crmlsListings.map((l: any) => ({ ...l, mlsSource: "CRMLS" })),
];
```

**Photo Handling:** Same pattern as search-listings (fetch by listingId)

**Line Reference:** Lines 99-115, 138-189

#### 6. GET `/api/cities/[cityId]/stats`
**File:** `src/app/api/cities/[cityId]/stats/route.ts` (inferred)

**Purpose:** Get market statistics for a city

**Returns:**
- Median price
- Average price
- Total listings
- Average days on market
- Price per sqft

**Used By:** City stats components (inferred)

#### 7. GET `/api/cities/[cityId]/hoa`
**File:** `src/app/api/cities/[cityId]/hoa/route.ts` (inferred)

**Purpose:** Get HOA fee statistics for a city

**Returns:**
- Average HOA fee
- Min/Max HOA fees
- Count of properties with HOA

#### 8. GET `/api/cities/[cityId]/subdivisions`
**File:** `src/app/api/cities/[cityId]/subdivisions/route.ts` (inferred)

**Purpose:** Get all subdivisions in a city

**Returns:** Array of subdivisions with listing counts

### Subdivision-Specific

#### 9. GET `/api/subdivisions/[slug]/listings`
**File:** `src/app/api/subdivisions/[slug]/listings/route.ts`

**Purpose:** Get all listings in a subdivision

**Query Params:**
- `minPrice`, `maxPrice`
- `beds`, `baths`
- `page`, `limit` - Pagination

**Data Source:** Likely queries both collections by subdivisionName

**Line Reference:** `src/app/api/subdivisions/[slug]/listings/route.ts`

#### 10. GET `/api/subdivisions/[slug]/stats`
**File:** `src/app/api/subdivisions/[slug]/stats/route.ts` (inferred)

**Purpose:** Get market statistics for a subdivision

**Returns:** Similar to city stats + HOA ranges

#### 11. GET `/api/subdivisions?search=...`
**File:** `src/app/api/subdivisions/route.ts` (inferred)

**Purpose:** Search subdivisions by name (fuzzy matching)

**Query Params:**
- `search` - Search query
- `limit` - Max results (default 10)

**Used By:** `location-matcher.ts:153`

### CMA (Comparative Market Analysis)

#### 12. POST `/api/cma/generate`
**File:** `src/app/api/cma/generate/route.ts`

**Purpose:** Generate CMA report for a property

**Request Body:**
```typescript
{
  listingKey: string,
  filters?: {
    radius?: number,        // Miles (default: 2)
    timeframe?: number,     // Months (default: 6)
    minBeds?: number,
    maxBeds?: number,
    minSqft?: number,
    maxSqft?: number,
    requirePool?: boolean,
    maxComps?: number       // Max comparables (default: 10)
  }
}
```

**Data Source:** `listings` collection ONLY (GPS)
```typescript
// Line 34
const listingsCollection = db.collection("listings");
```

**Algorithm:**
1. Fetch subject property by listingKey
2. Calculate bounding box (lat/lon delta)
3. Query comparables within radius
4. Filter by Active OR Closed (within timeframe)
5. Calculate distance using Haversine formula
6. Score similarity (beds, baths, sqft, pool, year built)
7. Sort by similarity, take top N
8. Calculate market statistics
9. Estimate value using average price per sqft

**Line Reference:** Lines 34, 61-112

**Used By:** Chat AI function calling (`generateCMA`)

### Chat System

#### 13. POST `/api/chat/stream`
**File:** `src/app/api/chat/stream/route.ts`

**Purpose:** Streaming AI chat with function calling

**Integration:** Calls other APIs via function execution
- `matchLocation` → `/api/chat/match-location`
- `searchListings` → `/api/chat/search-listings`
- `getCityStats` → `/api/cities/[cityId]/stats`
- `getSubdivisionStats` → `/api/subdivisions/[slug]/stats`
- `generateCMA` → `/api/cma/generate`

**Line Reference:** `src/app/api/chat/stream/route.ts`

#### 14. POST `/api/chat/research-community`
**File:** `src/app/api/chat/research-community/route.ts` (inferred)

**Purpose:** Auto-discover community info using MLS data

**Used By:** Chat AI function calling (`researchCommunity`)

---

## Frontend Components

### Map Components

#### 1. MapView
**File:** `src/app/components/mls/map/MapView.tsx`

**Purpose:** Core MapLibre GL map component

**Data Flow:**
```
Props: listings[] (from parent)
  ↓
Client-side Supercluster (Lines 276-300)
  ↓
Render clusters or markers based on zoom
```

**Clustering:**
```typescript
// Lines 276-300
clusterRef.current = new Supercluster({
  radius: 80,
  maxZoom: RAW_MARKER_ZOOM, // 13
  minPoints: 2,
});

const points = listings
  .filter((l) => l.longitude != null && l.latitude != null)
  .map((listing) => ({
    type: "Feature" as const,
    properties: { cluster: false, listing },
    geometry: {
      type: "Point" as const,
      coordinates: [listing.longitude!, listing.latitude!],
    },
  }));

clusterRef.current.load(points);
```

**Issue:** Redundant clustering (tiles already contain clustered data)

**Line Reference:** Lines 276-300

**Used By:** MapPageClient

#### 2. MapPageClient
**File:** `src/app/components/mls/map/MapPageClient.tsx`

**Purpose:** Map page container with state management

**Data Flow:**
```
useListings() hook (Line 146)
  ↓
loadListings(bounds, filters) - calls /api/mls-listings
  ↓
allListings state updated
  ↓
Passed to MapView
```

**Bounds Change Handler:**
```typescript
// Line 688
const handleBoundsChange = (bounds: MapBounds) => {
  loadListings(bounds, filters); // ❌ Uses bounds API, not tiles
};
```

**Line Reference:** Lines 146, 688

**Issue:** Uses bounds-based API instead of tile system

### Chat Components

#### 3. IntegratedChatWidget
**File:** `src/app/components/chatwidget/IntegratedChatWidget.tsx`

**Purpose:** Main chat interface with AI assistant

**Data Flow:**
```
User message
  ↓
POST /api/chat/stream
  ↓
AI function calling (e.g., searchListings)
  ↓
ListingCarousel displays results
```

**Line Reference:** `src/app/components/chatwidget/IntegratedChatWidget.tsx`

**Used By:** All pages (global sidebar)

#### 4. ListingCarousel (Chat)
**File:** `src/app/components/chat/ListingCarousel.tsx`

**Purpose:** Display search results in chat

**Props:**
```typescript
interface ListingCarouselProps {
  listings: Listing[];  // From AI search
  title?: string;
}

interface Listing {
  id: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  city: string;
  address: string;
  image?: string;
  subdivision?: string;
  url?: string;
  slug?: string;
  slugAddress?: string;
}
```

**Features:**
- Auto-scroll carousel (Lines 78-152)
- Duplicate listings for infinite scroll (Line 167)
- Favorite toggle integration (Lines 44-75)
- Opens listing detail in new tab (Line 263)

**Line Reference:** Lines 14-30, 78-152, 167

**Used By:** IntegratedChatWidget

### Listing Display Components

#### 5. ListingClient
**File:** `src/app/components/mls/ListingClient.tsx`

**Purpose:** Main listing detail page

**Data Source:** Server-side props (from listing detail page)

**Line Reference:** `src/app/components/mls/ListingClient.tsx`

#### 6. Listings
**File:** `src/app/components/mls/Listings.tsx`

**Purpose:** Grid display of listings

**Line Reference:** `src/app/components/mls/Listings.tsx`

#### 7. ListingCarousel (MLS)
**File:** `src/app/components/mls/ListingCarousel.tsx`

**Purpose:** Carousel for related/nearby listings

**Different from:** Chat ListingCarousel (different component)

**Line Reference:** `src/app/components/mls/ListingCarousel.tsx`

### City & Subdivision Components

#### 8. CityPageClient
**File:** `src/app/cities/[cityId]/CityPageClient.tsx` (inferred)

**Purpose:** City overview page

**Data Sources:**
- `/api/cities/[cityId]/listings`
- `/api/cities/[cityId]/stats`
- `/api/cities/[cityId]/subdivisions`

#### 9. SubdivisionPageClient
**File:** `src/app/neighborhoods/[cityId]/[slug]/SubdivisionPageClient.tsx`

**Purpose:** Subdivision overview page

**Data Sources:**
- `/api/subdivisions/[slug]/listings`
- `/api/subdivisions/[slug]/stats`

**Line Reference:** `src/app/neighborhoods/[cityId]/[slug]/SubdivisionPageClient.tsx`

### Provider Components

#### 10. MLSProvider
**File:** `src/app/components/mls/MLSProvider.tsx`

**Purpose:** Global MLS state management

**State:**
- `likedListings` - Favorited listings
- `dislikedListings` - Swiped left listings
- `visibleListings` - Currently visible on map
- `listingCache` - Prefetched listing details

**Effects (6 total):**
1. **Line 144** - Theme sync
2. **Line 184** - Save favorites to localStorage
3. **Line 195** - Fetch disliked listings from API
4. **Line 227** - **Prefetch first 5 visible listings** (performance issue)
5. **Line 266** - Prefetch next 3 swipe queue items
6. **Line 306** - Clear stale cache

**Prefetch Issue:**
```typescript
// Lines 227-263
useEffect(() => {
  const prefetchListings = async () => {
    const slugsToFetch = visibleListings
      .slice(0, 5) // ❌ Prefetch 5 listings on EVERY change
      .map((listing) => listing.slugAddress ?? listing.slug)
      // ...

    for (const slug of slugsToFetch) {
      const res = await fetch(`/api/mls-listings/${slug}`); // 5 API calls!
      // ...
    }
  };
  prefetchListings();
}, [visibleListings]); // ❌ Runs on EVERY visibleListings change
```

**Impact:** Floods network when map updates with new listings

**Line Reference:** Lines 144-313

**Used By:** All components (global context)

---

## Utilities & Helpers

### Location Matching

#### 1. location-matcher.ts
**File:** `src/lib/location-matcher.ts`

**Purpose:** Intelligently match user queries to locations

**Priority Order:**
1. Subdivisions (most specific)
2. Cities
3. Counties (least specific)

**Main Functions:**

**`matchLocation(query: string)`** - Lines 31-60
- Checks subdivisions first (prevents "Palm Desert Country Club" matching city "Palm Desert")
- Falls back to city, then county
- Returns best match with confidence score

**`matchSubdivision(query: string)`** - Lines 131-266
- Queries `/api/subdivisions?search=...` endpoint
- Tries multiple variations (with/without spaces, suffixes)
- Removes common words ("country club", "golf club", "estates")
- Scores matches by similarity
- Returns null if confidence < 0.4

**`searchSubdivisionsWithDisambiguation(query: string)`** - Lines 323-443
- Handles ambiguous queries (multiple similar matches)
- Returns disambiguation UI data if needed
- Filters for confidence >= 0.6

**`locationToSearchParams(match: LocationMatch)`** - Lines 293-317
- Converts location match to API search parameters
- County → cities array
- City → cities array
- Subdivision → subdivisions array

**Line Reference:** Lines 31-60, 131-266, 323-443, 293-317

**Used By:**
- `/api/chat/match-location` (API wrapper)
- AI function calling

### API Helpers

#### 2. api.ts
**File:** `src/lib/api.ts`

**Purpose:** Client-side API utilities

**Main Function:**
```typescript
// Lines 9-42
export async function getListingsWithCoords(): Promise<MapListing[]> {
  // Fetches from /api/mls-listings
  // Filters for propertyType === "A" (for sale)
  // Filters for valid lat/lng
  // Adds placeholder photos
}
```

**Line Reference:** Lines 9-42

**Used By:** SSR pages for initial data

### Groq Function Definitions

#### 3. groq-functions.ts
**File:** `src/lib/groq-functions.ts`

**Purpose:** Define all AI-callable functions for Groq

**Functions Available:**
1. `matchLocation` - Match location queries
2. `searchListings` - Search with filters
3. `getSubdivisionListings` - Subdivision listings
4. `getCitySubdivisions` - List subdivisions in city
5. `getCityListings` - City listings
6. `getCityStats` - City market stats
7. `getSubdivisionStats` - Subdivision market stats
8. `getCityHOA` - HOA statistics
9. `researchCommunity` - Auto-discover community info
10. `generateCMA` - Comparative market analysis

**Endpoint Mapping:**
```typescript
// Lines 333-344
export const FUNCTION_ENDPOINT_MAP: Record<string, { endpoint: string; method: string }> = {
  matchLocation: { endpoint: "/api/chat/match-location", method: "POST" },
  searchListings: { endpoint: "/api/chat/search-listings", method: "POST" },
  getSubdivisionListings: { endpoint: "/api/subdivisions/:slug/listings", method: "GET" },
  getCitySubdivisions: { endpoint: "/api/cities/:cityId/subdivisions", method: "GET" },
  getCityListings: { endpoint: "/api/cities/:cityId/listings", method: "GET" },
  getCityStats: { endpoint: "/api/cities/:cityId/stats", method: "GET" },
  getSubdivisionStats: { endpoint: "/api/subdivisions/:slug/stats", method: "GET" },
  getCityHOA: { endpoint: "/api/cities/:cityId/hoa", method: "GET" },
  researchCommunity: { endpoint: "/api/chat/research-community", method: "POST" },
  generateCMA: { endpoint: "/api/cma/generate", method: "POST" }
};
```

**Line Reference:** Lines 10-344

**Used By:** `/api/chat/stream` for function calling

### Map Hooks

#### 4. useListings.ts
**File:** `src/app/utils/map/useListings.ts`

**Purpose:** Hook for fetching listings based on map bounds

**Main Function:**
```typescript
// Lines 73-74
const queryString = new URLSearchParams(params).toString();
const apiUrl = `/api/mls-listings?${queryString}`; // ❌ BOUNDS API
```

**Issue:** Uses bounds-based API instead of tile API

**Line Reference:** Lines 73-74

**Used By:** MapPageClient

### CMA Utilities

#### 5. cma/calculator.ts
**File:** `src/utils/cma/calculator.ts` (inferred)

**Purpose:** CMA calculation utilities

**Functions:**
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
- `calculateSimilarityScore(subject, comp)` - Score 0-100
- `calculatePricePerSqFt(price, sqft)` - Price per square foot

**Used By:** `/api/cma/generate`

---

## Data Models & Types

### TypeScript Types

#### 1. listing.ts
**File:** `src/types/listing.ts`

**Main Types:**

**`Photo`** - Lines 3-15
```typescript
export type Photo = {
  photoId: string;
  uri800: string;
  caption?: string;
  primary?: boolean;
  listingId?: string;
  uriThumb?: string;
  uriLarge?: string;
  uri1024?: string;
  uri1280?: string;
  uri1600?: string;
  uri2048?: string;
};
```

**`StandardFields`** - Lines 18-46
- Core listing fields (beds, baths, price, address, etc.)
- Used for Spark API response parsing

**Line Reference:** Lines 3-46

#### 2. types.ts
**File:** `src/types/types.ts` (inferred)

**Main Types:**
- `MapListing` - Listing data for map display
- `MapBounds` - Map viewport bounds
- `ListingFilters` - Filter state

#### 3. cma.ts
**File:** `src/types/cma.ts`

**Main Types:**
- `CMAReport` - Full CMA report structure
- `CMAFilters` - CMA generation filters
- `SubjectProperty` - Property being analyzed
- `ComparableProperty` - Comparable listing
- `MarketStatistics` - Market metrics

**Used By:** `/api/cma/generate`, CMA components

#### 4. chat.ts
**File:** `src/types/chat.ts` (inferred)

**Main Types:**
- `ChatMessage` - Message structure
- `FunctionCall` - AI function call data
- `ListingCarouselData` - Carousel props

---

## Tile System

### Generation

#### 1. generate-map-tiles.ts
**File:** `src/scripts/mls/map/generate-map-tiles.ts`

**Purpose:** Pre-generate map tiles with clustering

**Data Source:**
```typescript
// Lines 27-30
const listings = (await Listing.find({
  latitude: { $exists: true },
  longitude: { $exists: true },
}).lean()) as IListing[];
```

**Issue:** Only queries `listings` collection (GPS), NOT `crmls_listings`

**Clustering:**
- Uses Supercluster library
- Zoom levels 5-13
- Output: `public/tiles/{z}/{x}/{y}.json`

**Tile Properties:**
```typescript
// Lines 40-51
properties: {
  slug: listing.slug,
  listingKey: listing.listingKey,
  listPrice: listing.listPrice,
  city: listing.city,
  beds: listing.bedsTotal ?? listing.bedroomsTotal ?? null,
  baths: listing.bathroomsTotalDecimal ?? listing.bathroomsTotalInteger ?? null,
  photo: listing.primaryPhotoUrl ?? null,
  subdivision: listing.subdivisionName ?? null,
  yearBuilt: listing.yearBuilt ?? null,
  cluster: false,
  // ← NO mlsSource in code!
}
```

**Mystery:** Tiles contain `mlsSource: "CRMLS"` even though:
1. Generator only queries `listings` collection
2. Generator doesn't include `mlsSource` in properties
3. GPS seed doesn't set `mlsSource` field

**Conclusion:** Tiles were generated from historically merged data before architectural split to separate collections (Nov 2024).

**Line Reference:** Lines 27-30, 40-51

**Current State:**
- ✅ 22,485 tiles exist in `public/tiles/`
- ❌ Tiles contain stale CRMLS data (not updated since collection split)
- ❌ New CRMLS listings not in tiles

### Loading

#### 2. tileLoader.ts
**File:** `src/app/lib/map-tiles/tileLoader.ts`

**Purpose:** Load tiles for current map view

**Main Functions:**

**`loadTilesForView(bounds, zoom)`** - Lines 87-115
```typescript
export async function loadTilesForView(
  bounds: [number, number, number, number],
  zoom: number
): Promise<TileFeature[]> {
  const tiles = getTilesForBounds(bounds, Math.floor(zoom));
  const tilePromises = tiles.map(({ x, y }) => fetchTile(Math.floor(zoom), x, y));
  const tileResults = await Promise.all(tilePromises);

  // Deduplicate features
  const allFeatures = tileResults.flat();
  const uniqueFeatures = new Map<string, TileFeature>();

  allFeatures.forEach((feature) => {
    const key = feature.properties.cluster
      ? `cluster-${feature.properties.cluster_id}`
      : `listing-${feature.properties.listingKey}`;
    if (!uniqueFeatures.has(key)) {
      uniqueFeatures.set(key, feature);
    }
  });

  return Array.from(uniqueFeatures.values());
}
```

**`fetchTile(z, x, y)`** - Lines 75-85
- Fetches `/api/map-tiles/{z}/{x}/{y}`
- Caches in memory

**`getTilesForBounds(bounds, zoom)`** - Uses `tileMath.ts`
- Converts lat/lng bounds to tile coordinates

**Line Reference:** Lines 75-115

**Current Status:** ❌ NEVER IMPORTED OR USED

**Grep Results:** Zero imports found across entire codebase

### Tile Math

#### 3. tileMath.ts
**File:** `src/app/lib/map-tiles/tileMath.ts`

**Purpose:** Web Mercator projection math

**Main Functions:**
- `latLngToTile(lat, lng, zoom)` - Convert coordinates to tile
- `getTilesForBounds(bounds, zoom)` - Get all tiles in view
- `tileToLatLng(x, y, zoom)` - Reverse conversion

**Line Reference:** `src/app/lib/map-tiles/tileMath.ts`

---

## Integration Points

### 1. Home Page → Map
**Flow:**
```
User clicks "View Map" button
  ↓
Navigate to /map?bounds=...
  ↓
MapPageClient mounts
  ↓
useListings() hook
  ↓
POST /api/mls-listings (bounds-based)
  ↓
MapView renders
```

**Current Issue:** LoadingProvider blocks for 1.5 seconds before map renders

### 2. Chat → Listings
**Flow:**
```
User: "Show me homes in Palm Desert Country Club"
  ↓
POST /api/chat/stream
  ↓
AI calls matchLocation("palm desert country club")
  ↓
POST /api/chat/match-location
  ↓
Returns: { type: "subdivision", name: "Palm Desert Country Club", slug: "..." }
  ↓
AI calls searchListings({ subdivisions: ["Palm Desert Country Club"] })
  ↓
POST /api/chat/search-listings
  ↓
Queries CRMLSListing collection
  ↓
Returns listings array
  ↓
Chat renders ListingCarousel
```

**Data Path:** CRMLS collection ONLY (GPS listings not included in chat search)

### 3. City Page → Listings
**Flow:**
```
User visits /cities/palm-desert
  ↓
CityPageClient mounts
  ↓
GET /api/cities/palm-desert/listings
  ↓
Queries BOTH GPS and CRMLS collections
  ↓
Merges results with mlsSource tags
  ↓
Displays listing grid
```

**Data Path:** Both collections (complete coverage)

### 4. Subdivision Page → Listings
**Flow:**
```
User visits /neighborhoods/palm-desert/palm-desert-country-club
  ↓
SubdivisionPageClient mounts
  ↓
GET /api/subdivisions/palm-desert-country-club/listings
  ↓
Queries by subdivisionName
  ↓
Returns listings
  ↓
Displays listing grid + stats
```

**Data Path:** Likely queries both collections

### 5. Listing Detail → CMA
**Flow:**
```
User clicks "Generate CMA" on listing detail
  ↓
POST /api/cma/generate { listingKey: "..." }
  ↓
Queries listings collection (GPS ONLY)
  ↓
Finds comparables within radius
  ↓
Calculates market stats
  ↓
Returns CMA report
  ↓
Displays CMAReport component
```

**Data Path:** GPS collection ONLY (CRMLS comps not included)

---

## Critical Issues Identified

### 1. Dual Collection Architecture Inconsistency

**Problem:** Some APIs query both collections, others query only one

**Breakdown:**
- ✅ `/api/mls-listings` - Queries BOTH (correct)
- ✅ `/api/cities/[cityId]/listings` - Queries BOTH (correct)
- ❌ `/api/chat/search-listings` - CRMLS ONLY (incomplete)
- ❌ `/api/cma/generate` - GPS ONLY (incomplete)
- ❌ Tile generation - GPS ONLY (incomplete)

**Impact:** Chat search and CMA miss GPS listings, tiles miss new CRMLS listings

### 2. Tile System Completely Disconnected

**Problem:** 22,485 pre-generated tiles exist but are never used

**Evidence:**
- ❌ `tileLoader.ts` has zero imports (grep confirmed)
- ❌ MapPageClient uses bounds-based API (`/api/mls-listings`)
- ❌ MapView uses client-side Supercluster (redundant)

**Impact:** Slow map loading, missing performance optimization

### 3. LoadingProvider Blocking Map Initialization

**Problem:** 1.5-second forced delay on ALL pages including /map

**File:** `src/app/components/LoadingProvider.tsx:17-29`

**Impact:**
- Delays map render by 1.5 seconds
- Delays tile loading by 1.5 seconds
- Double loader UX (GlobalLoader → MapGlobeLoader)

### 4. MLSProvider Prefetch Flooding Network

**Problem:** Prefetches 5 listings on EVERY `visibleListings` change

**File:** `src/app/components/mls/MLSProvider.tsx:227-263`

**Impact:**
- 15+ API calls in 200ms when map loads multiple tiles
- Saturates browser connection pool
- Slows down tile loading

### 5. Missing mlsSource Field in GPS Listings

**Problem:** GPS seed script doesn't set `mlsSource` field

**File:** `src/scripts/mls/backend/seed.py:31`

**Impact:**
- GPS listings have undefined `mlsSource`
- API must use fallback: `mlsSource || "GPS"`
- Inconsistent data model

### 6. Stale Tile Data

**Problem:** Tiles were generated before collection split (Nov 2024)

**Evidence:**
- Tiles contain CRMLS data despite generator only querying GPS
- Tiles contain `mlsSource` field despite generator not including it
- Timeline: Tiles generated from merged `listings` collection

**Impact:**
- Tiles increasingly stale for CRMLS data
- New CRMLS listings not in tiles
- Tile system can't be used until regenerated

---

## Summary

This MLS data ecosystem has:

**✅ Strengths:**
- Dual MLS source coverage (GPS + CRMLS)
- Complete photo management system
- Sophisticated AI chat integration
- City and subdivision organization
- CMA generation capability
- Pre-generated tile system (unused but exists)

**❌ Weaknesses:**
- Inconsistent dual collection querying across APIs
- Tile system completely disconnected from live map
- Missing `mlsSource` field in GPS listings
- Stale tile data (pre-collection-split)
- Performance issues (LoadingProvider, prefetching)
- Redundant client-side clustering

**🔧 Next Steps (from STEP 4):**
1. Update tile generator to query both collections
2. Add `mlsSource` to GPS seed script
3. Regenerate all 22,485 tiles with current data
4. Wire tile system into MapPageClient
5. Remove client-side Supercluster (redundant)
6. Fix LoadingProvider to skip /map pages
7. Defer MLSProvider prefetching

---

**Document Version:** 1.0
**Generated:** 2025-01-22
**Purpose:** Pre-implementation diagnostic for STEP 4 (Tile System Wiring)
