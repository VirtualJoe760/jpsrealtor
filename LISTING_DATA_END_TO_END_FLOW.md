# Listing Data End-to-End Flow

**Complete Lifecycle: MLS Source → User Display**

This document traces listing data through every stage of its lifecycle, from Spark API ingestion to frontend display. Each flow is documented step-by-step with file references and data transformations.

---

## Table of Contents

1. [Ingestion Flow](#ingestion-flow)
2. [Map View Flow](#map-view-flow)
3. [Chat Search Flow](#chat-search-flow)
4. [City Page Flow](#city-page-flow)
5. [Subdivision Page Flow](#subdivision-page-flow)
6. [Listing Detail Flow](#listing-detail-flow)
7. [CMA Generation Flow](#cma-generation-flow)
8. [Tile Generation Flow](#tile-generation-flow)
9. [Data Transformation Map](#data-transformation-map)

---

## Ingestion Flow

**Complete pipeline from Spark API to MongoDB**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SPARK API (OData)                                │
│  MLS Source: GPS MLS or CRMLS                                       │
│  Endpoint: https://sparkapi.com/v1/                                 │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  │ Pagination: $skiptoken
                  │ Filter: PropertyType, StandardStatus, MlsId
                  │
        ┌─────────▼─────────┐
        │   PHASE 1: FETCH  │
        │   fetch.py        │
        └─────────┬─────────┘
                  │
                  │ Output: raw_data/Property-YYYYMMDD-HHMMSS.json
                  │ Format: Array of Spark API Property objects
                  │
        ┌─────────▼─────────┐
        │  PHASE 2: FLATTEN │
        │   flatten.py      │
        └─────────┬─────────┘
                  │
                  │ Output: flattened/Property-YYYYMMDD-HHMMSS.json
                  │ Format: Flat objects (nested fields → top-level)
                  │
        ┌─────────▼─────────┐
        │   PHASE 3: SEED   │
        │   seed.py         │
        └─────────┬─────────┘
                  │
                  │ Collection: listings (GPS) or crmls_listings (CRMLS)
                  │ Operation: Bulk upsert (listingId as key)
                  │
        ┌─────────▼─────────┐
        │    MONGODB        │
        │  jpsrealtor DB    │
        └───────────────────┘
```

### Step-by-Step Flow

#### Step 1: Fetch from Spark API

**File:** `src/scripts/mls/backend/crmls/fetch.py` (CRMLS) or `src/scripts/mls/backend/fetch.py` (GPS)

**Trigger:** Manual execution via `main.py` or cron job

**Process:**

1. **Build OData Filter**
   ```python
   # CRMLS Example (Lines 49-54)
   mls_filter = "MlsId Eq '20200218121507636729000000'"
   property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
   status_filter = "StandardStatus Eq 'Active'"
   combined_filter = f"{mls_filter} And ({property_filter}) And {status_filter}"
   ```

2. **Make Initial Request**
   ```python
   url = f"{SPARK_API_ENDPOINT}/Property"
   params = {
       "$filter": combined_filter,
       "$expand": "Photos,Media",
       "$top": 500  # Batch size
   }
   response = requests.get(url, headers=headers, params=params)
   ```

3. **Extract Batch + Pagination Token**
   ```python
   # Line 71
   batch = response.json()["value"]
   skiptoken = batch[-1].get("Id")  # Last record ID for next page
   ```

4. **Loop Until Complete**
   ```python
   while skiptoken:
       params["$skiptoken"] = skiptoken
       response = requests.get(url, headers=headers, params=params)
       batch = response.json()["value"]
       all_listings.extend(batch)
       skiptoken = batch[-1].get("Id") if batch else None
   ```

5. **Save Raw Data**
   ```python
   filename = f"raw_data/Property-{timestamp}.json"
   with open(filename, "w") as f:
       json.dump(all_listings, f, indent=2)
   ```

**Output:** `raw_data/Property-20250122-143022.json` (example)

**Data Format:**
```json
{
  "Id": "20200218121507636729000000",
  "ListingId": "SW23456789",
  "StandardFields": {
    "ListPrice": 850000,
    "UnparsedAddress": "123 Main St",
    "City": "Palm Desert",
    "BedroomsTotal": 3,
    "BathroomsFull": 2
  },
  "Photos": [
    { "Id": "photo1", "Uri800": "https://...", "Primary": true },
    { "Id": "photo2", "Uri800": "https://..." }
  ]
}
```

#### Step 2: Flatten Nested Structure

**File:** `src/scripts/mls/backend/crmls/flatten.py` or `src/scripts/mls/backend/flatten.py`

**Trigger:** Automatic after fetch (called by `main.py`)

**Process:**

1. **Read Raw Data**
   ```python
   with open("raw_data/Property-20250122-143022.json") as f:
       raw_listings = json.load(f)
   ```

2. **Flatten StandardFields**
   ```python
   flattened = []
   for listing in raw_listings:
       flat_listing = {
           "listingId": listing["ListingId"],
           "listingKey": listing["Id"],
           "listPrice": listing["StandardFields"]["ListPrice"],
           "unparsedAddress": listing["StandardFields"]["UnparsedAddress"],
           "city": listing["StandardFields"]["City"],
           "bedroomsTotal": listing["StandardFields"]["BedroomsTotal"],
           "bathroomsFull": listing["StandardFields"]["BathroomsFull"],
           # ... all other fields
       }
       flattened.append(flat_listing)
   ```

3. **Save Flattened Data**
   ```python
   with open("flattened/Property-20250122-143022.json", "w") as f:
       json.dump(flattened, f, indent=2)
   ```

**Output:** `flattened/Property-20250122-143022.json`

**Data Format:**
```json
{
  "listingId": "SW23456789",
  "listingKey": "20200218121507636729000000",
  "listPrice": 850000,
  "unparsedAddress": "123 Main St",
  "city": "Palm Desert",
  "bedroomsTotal": 3,
  "bathroomsFull": 2
}
```

#### Step 3: Seed into MongoDB

**File:** `src/scripts/mls/backend/crmls/seed.py` (CRMLS) or `src/scripts/mls/backend/seed.py` (GPS)

**Trigger:** Automatic after flatten

**Process:**

1. **Connect to MongoDB**
   ```python
   client = MongoClient(MONGODB_URI)
   db = client.jpsrealtor

   # CRMLS → crmls_listings collection
   # GPS → listings collection
   collection = db.crmls_listings  # Line 30 (CRMLS)
   ```

2. **Add Source Identifier (CRMLS Only)**
   ```python
   # Line 80 (CRMLS seed.py)
   for raw in flattened_listings:
       raw["mlsSource"] = "CRMLS"  # ← CRITICAL: Only CRMLS does this
   ```

3. **Build Bulk Operations**
   ```python
   bulk_operations = []
   for listing in flattened_listings:
       bulk_operations.append(
           UpdateOne(
               {"listingId": listing["listingId"]},  # Match on listingId
               {"$set": listing},                     # Update or insert
               upsert=True
           )
       )
   ```

4. **Execute Bulk Write**
   ```python
   result = collection.bulk_write(bulk_operations)
   print(f"✅ Inserted: {result.upserted_count}")
   print(f"✅ Modified: {result.modified_count}")
   ```

**Output:** Data in MongoDB collections

**GPS Seed Issue:**
```python
# GPS seed.py (Line 31)
collection = db.listings  # ← GPS collection
# ❌ NO mlsSource SET! Missing source identifier
```

#### Step 4: Cache Photos (Optional)

**File:** `src/scripts/mls/backend/crmls/cache_photos.py` or `src/scripts/mls/backend/cache_photos.py`

**Purpose:** Download high-res photos to local storage

**Process:**
1. Query listings without cached photos
2. Download from Spark API photo URLs
3. Save to `public/photos/` directory
4. Update listing with local photo path

---

## Map View Flow

**User visits /map → Listings displayed on map**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER VISITS /map                                  │
│  URL: https://jpsrealtor.com/map?bounds=...                         │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────┐
     │  LoadingProvider        │
     │  Shows GlobalLoader     │
     │  ❌ BLOCKS for 1.5s     │
     └────────────┬────────────┘
                  │ 1500ms delay
     ┌────────────▼────────────┐
     │  MapPageClient          │
     │  src/app/map/page.tsx   │
     └────────────┬────────────┘
                  │
                  │ useEffect: Parse URL params
                  │ Decode bounds from URL
                  │
     ┌────────────▼────────────────┐
     │  useListings() Hook         │
     │  src/app/utils/map/         │
     │  useListings.ts             │
     └────────────┬────────────────┘
                  │
                  │ loadListings(bounds, filters)
                  │
     ┌────────────▼────────────────┐
     │  API CALL                   │
     │  POST /api/mls-listings     │
     │  Query: { north, south,     │
     │           east, west,       │
     │           minPrice, ...}    │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  API Route Handler          │
     │  src/app/api/mls-listings/  │
     │  route.ts                   │
     └────────────┬────────────────┘
                  │
                  │ Build MongoDB aggregation pipelines
                  │
     ┌────────────▼────────────────────────────────────────┐
     │  DUAL DATABASE QUERY                                │
     │  ┌────────────────┐     ┌──────────────────────┐   │
     │  │ GPS Pipeline   │     │ CRMLS Pipeline       │   │
     │  │ Collection:    │     │ Collection:          │   │
     │  │ "listings"     │     │ "crmls_listings"     │   │
     │  └────────┬───────┘     └──────┬───────────────┘   │
     │           │                     │                    │
     │  ┌────────▼─────────────────────▼───────────┐      │
     │  │ Promise.all([gpsPipeline, crmlsPipeline])│      │
     │  └────────┬─────────────────────────────────┘      │
     │           │                                          │
     │  ┌────────▼─────────────────────────────────┐      │
     │  │ Merge results + add mlsSource tags       │      │
     │  │ GPS: mlsSource = "GPS" (fallback)        │      │
     │  │ CRMLS: mlsSource = "CRMLS"               │      │
     │  └────────┬─────────────────────────────────┘      │
     └───────────┼──────────────────────────────────────────┘
                  │
                  │ Return: { listings: [...], totalCount: N }
                  │
     ┌────────────▼────────────────┐
     │  MapPageClient              │
     │  allListings state updated  │
     └────────────┬────────────────┘
                  │
                  │ Pass listings to MapView
                  │
     ┌────────────▼────────────────┐
     │  MapView Component          │
     │  src/app/components/mls/    │
     │  map/MapView.tsx            │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────────────────────┐
     │  CLIENT-SIDE SUPERCLUSTER                   │
     │  ❌ REDUNDANT: Clusters listings on client  │
     │  Lines 276-300                              │
     │  ┌──────────────────────────────────────┐   │
     │  │ clusterRef.current = new Supercluster│   │
     │  │ clusterRef.current.load(points)      │   │
     │  │ clusters = getClusters(bounds, zoom) │   │
     │  └──────────────────────────────────────┘   │
     └────────────┬────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  RENDER MAP                 │
     │  Zoom < 13: Cluster markers │
     │  Zoom >= 13: All markers    │
     └─────────────────────────────┘
```

### Step-by-Step Flow

#### Step 1: User Navigates to /map

**URL:** `https://jpsrealtor.com/map?bounds={"north":33.8,"south":33.7,"east":-116.4,"west":-116.5,"zoom":12}`

**Initial Render:**

1. **LoadingProvider Check** (`src/app/components/LoadingProvider.tsx`)
   ```typescript
   // Lines 17-29
   const [isLoading, setIsLoading] = useState(true); // ❌ TRUE for ALL pages

   useEffect(() => {
     if (isInitialLoad) {
       const timer = setTimeout(() => {
         setIsLoading(false);
         setIsInitialLoad(false);
       }, 1500); // ❌ FORCED 1.5s DELAY
       return () => clearTimeout(timer);
     }
   }, [isInitialLoad]);

   return (
     <LoadingContext.Provider value={value}>
       {isLoading && <GlobalLoader />} {/* Blocks entire screen */}
       {children}
     </LoadingContext.Provider>
   );
   ```

   **Impact:** Map page can't render for 1.5 seconds

2. **MapPageClient Mounts** (after 1.5s)
   ```typescript
   // src/app/map/page.tsx:77-127
   useEffect(() => {
     setMounted(true);

     // Parse URL bounds
     const urlParams = new URLSearchParams(window.location.search);
     const boundsParam = urlParams.get('bounds');

     let initialBounds = DEFAULT_BOUNDS;
     if (boundsParam) {
       const parsedBounds = JSON.parse(decodeURIComponent(boundsParam));
       initialBounds = parsedBounds;
     }

     // Load listings for initial bounds
     if (!isPreloaded && !isLoading) {
       loadListings(initialBounds, filters);
     }

     // Dispatch resize event (redundant)
     const timer = setTimeout(() => {
       window.dispatchEvent(new Event('resize'));
     }, 100);
   }, []);
   ```

#### Step 2: Load Listings via useListings Hook

**File:** `src/app/utils/map/useListings.ts`

**Hook Call:**
```typescript
// MapPageClient.tsx:146
const { allListings, visibleListings, loadListings } = useListings();
```

**loadListings Function:**
```typescript
// useListings.ts:73-74
const queryString = new URLSearchParams(params).toString();
const apiUrl = `/api/mls-listings?${queryString}`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bounds, filters })
});

const data = await response.json();
setAllListings(data.listings);
```

**API Request:**
```
POST /api/mls-listings
Body: {
  "bounds": {
    "north": 33.8,
    "south": 33.7,
    "east": -116.4,
    "west": -116.5,
    "zoom": 12
  },
  "filters": {
    "minPrice": 0,
    "maxPrice": 10000000,
    "propertyType": "A"
  }
}
```

#### Step 3: API Route Queries Both Collections

**File:** `src/app/api/mls-listings/route.ts`

**Process:**

1. **Build MongoDB Pipelines**
   ```typescript
   // Lines 100-320 (simplified)
   const gpsPipeline = [
     {
       $match: {
         latitude: { $gte: south, $lte: north },
         longitude: { $gte: west, $lte: east },
         listPrice: { $gte: minPrice, $lte: maxPrice },
         propertyType: "A"
       }
     },
     {
       $project: {
         listingId: 1,
         listingKey: 1,
         slug: 1,
         slugAddress: 1,
         listPrice: 1,
         unparsedAddress: 1,
         city: 1,
         latitude: 1,
         longitude: 1,
         bedsTotal: 1,
         bathroomsTotalInteger: 1,
         livingArea: 1,
         primaryPhotoUrl: 1,
         subdivisionName: 1
       }
     }
   ];

   const crmlsPipeline = [...gpsPipeline]; // Same structure
   ```

2. **Execute Dual Query**
   ```typescript
   // Lines 322-337
   const [gpsListings, crmlsListings] = await Promise.all([
     Listing.aggregate(gpsPipeline),        // GPS collection
     CRMLSListing.aggregate(crmlsPipeline), // CRMLS collection
   ]);
   ```

3. **Merge Results with Source Tags**
   ```typescript
   const gpsWithSource = gpsListings.map(listing => ({
     ...listing,
     mlsSource: listing.mlsSource || "GPS"  // Fallback (since GPS seed doesn't set it)
   }));

   const crmlsWithSource = crmlsListings.map(listing => ({
     ...listing,
     mlsSource: listing.mlsSource || "CRMLS", // Should already exist
     listingKey: listing.listingKey || listing.listingId
   }));

   const allListings = [...gpsWithSource, ...crmlsWithSource];
   ```

4. **Return Response**
   ```typescript
   return NextResponse.json({
     listings: allListings,
     totalCount: allListings.length,
     bounds: { north, south, east, west, zoom }
   });
   ```

#### Step 4: MapView Renders with Client-Side Clustering

**File:** `src/app/components/mls/map/MapView.tsx`

**Process:**

1. **Receive Listings from Parent**
   ```typescript
   // Props
   interface MapViewProps {
     listings: MapListing[];
     onBoundsChange: (bounds: MapBounds) => void;
   }
   ```

2. **Initialize Supercluster (Client-Side)**
   ```typescript
   // Lines 276-300
   clusterRef.current = new Supercluster({
     radius: 80,
     maxZoom: RAW_MARKER_ZOOM, // 13
     minPoints: 2,
   });

   // Convert listings to GeoJSON points
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

   **Issue:** This is redundant! Tiles already contain pre-clustered data.

3. **Get Clusters for Current View**
   ```typescript
   const bounds = map.getBounds();
   const zoom = map.getZoom();

   const clusters = clusterRef.current.getClusters(
     [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
     Math.floor(zoom)
   );
   ```

4. **Render Markers**
   ```typescript
   {clusters.map((cluster) =>
     cluster.properties.cluster ? (
       <AnimatedCluster key={cluster.id} cluster={cluster} />
     ) : (
       <AnimatedMarker key={cluster.properties.listing.listingKey} listing={cluster.properties.listing} />
     )
   )}
   ```

---

## Chat Search Flow

**User: "Show me 3 bed homes under $500k in Palm Desert Country Club"**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                  USER SENDS CHAT MESSAGE                             │
│  "Show me 3 bed homes under $500k in Palm Desert Country Club"      │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  IntegratedChatWidget       │
     │  src/app/components/        │
     │  chatwidget/                │
     │  IntegratedChatWidget.tsx   │
     └────────────┬────────────────┘
                  │
                  │ POST /api/chat/stream
                  │ Body: { messages: [...], userId, userTier }
                  │
     ┌────────────▼────────────────────────────────────────┐
     │  API Route: /api/chat/stream                        │
     │  src/app/api/chat/stream/route.ts                   │
     │  ┌────────────────────────────────────────────────┐ │
     │  │ Groq LLM with Function Calling                 │ │
     │  │ Model: llama-3.3-70b-versatile                 │ │
     │  │ Tools: GROQ_FUNCTIONS (10 available)           │ │
     │  └────────────────────────────────────────────────┘ │
     └────────────┬────────────────────────────────────────┘
                  │
                  │ AI decides to call functions
                  │
     ┌────────────▼──────────────────────────────────────────┐
     │  FUNCTION 1: matchLocation                            │
     │  ┌──────────────────────────────────────────────────┐ │
     │  │ POST /api/chat/match-location                    │ │
     │  │ Body: { query: "palm desert country club" }     │ │
     │  │                                                   │ │
     │  │ matchLocation() utility (location-matcher.ts)    │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ Priority check:                            │   │ │
     │  │ │ 1. Subdivisions (most specific)            │   │ │
     │  │ │ 2. Cities                                  │   │ │
     │  │ │ 3. Counties (least specific)               │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ matchSubdivision("palm desert country club")     │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ GET /api/subdivisions?search=...           │   │ │
     │  │ │ Try variations:                            │   │ │
     │  │ │ - "palm desert country club"               │   │ │
     │  │ │ - "palmdesertcountryclub"                  │   │ │
     │  │ │ - "palm desert" (remove "country club")    │   │ │
     │  │ │                                            │   │ │
     │  │ │ Score matches by similarity               │   │ │
     │  │ │ Return best match if confidence >= 0.4    │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ Response: {                                      │ │
     │  │   type: "subdivision",                           │ │
     │  │   name: "Palm Desert Country Club",              │ │
     │  │   slug: "palm-desert-country-club",              │ │
     │  │   city: "Palm Desert",                           │ │
     │  │   confidence: 0.95                               │ │
     │  │ }                                                 │ │
     │  └──────────────────────────────────────────────────┘ │
     └────────────┬──────────────────────────────────────────┘
                  │
                  │ AI receives matchLocation result
                  │ Extracts: subdivisions = ["Palm Desert Country Club"]
                  │
     ┌────────────▼──────────────────────────────────────────┐
     │  FUNCTION 2: searchListings                           │
     │  ┌──────────────────────────────────────────────────┐ │
     │  │ POST /api/chat/search-listings                   │ │
     │  │ Body: {                                          │ │
     │  │   subdivisions: ["Palm Desert Country Club"],   │ │
     │  │   minBeds: 3,                                    │ │
     │  │   maxPrice: 500000                               │ │
     │  │ }                                                 │ │
     │  │                                                   │ │
     │  │ Build MongoDB Query:                             │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ query = {                                  │   │ │
     │  │ │   standardStatus: "Active",                │   │ │
     │  │ │   mlsStatus: "Active",                     │   │ │
     │  │ │   bedsTotal: { $gte: 3 },                  │   │ │
     │  │ │   listPrice: { $lte: 500000 },             │   │ │
     │  │ │   subdivisionName: {                       │   │ │
     │  │ │     $in: [/^Palm Desert Country Club/i]    │   │ │
     │  │ │   }                                        │   │ │
     │  │ │ }                                          │   │ │
     │  │ │                                            │   │ │
     │  │ │ NOTE: Searching by subdivision, so        │   │ │
     │  │ │ DON'T exclude rentals (Lines 40-54)       │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ Query CRMLS Collection ONLY:                     │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ const listings =                           │   │ │
     │  │ │   await CRMLSListing.find(query)           │   │ │
     │  │ │     .sort({ listPrice: 1 })                │   │ │
     │  │ │     .select("listingId listingKey ...")    │   │ │
     │  │ │     .lean();                                │   │ │
     │  │ │                                            │   │ │
     │  │ │ ❌ GPS listings NOT included!              │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ Fetch Photos:                                    │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ const listingIds = listings.map(           │   │ │
     │  │ │   l => l.listingId                         │   │ │
     │  │ │ );                                         │   │ │
     │  │ │                                            │   │ │
     │  │ │ const photos = await Photo.find({         │   │ │
     │  │ │   listingId: { $in: listingIds },          │   │ │
     │  │ │   primary: true                            │   │ │
     │  │ │ }).lean();                                 │   │ │
     │  │ │                                            │   │ │
     │  │ │ photoMap = Map(listingId -> photoUrl)     │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ Format Results:                                  │ │
     │  │ ┌────────────────────────────────────────────┐   │ │
     │  │ │ results = listings.map(listing => ({       │   │ │
     │  │ │   id: listing.listingKey,                  │   │ │
     │  │ │   price: listing.listPrice,                │   │ │
     │  │ │   beds: listing.bedsTotal,                 │   │ │
     │  │ │   baths: listing.bathroomsTotalInteger,    │   │ │
     │  │ │   image: photoMap.get(listing.listingId),  │   │ │
     │  │ │   subdivision: listing.subdivisionName,    │   │ │
     │  │ │   url: `/mls-listings/${slugAddress}`,     │   │ │
     │  │ │   latitude: listing.latitude,              │   │ │
     │  │ │   longitude: listing.longitude             │   │ │
     │  │ │ }));                                       │   │ │
     │  │ └────────────────────────────────────────────┘   │ │
     │  │                                                   │ │
     │  │ Response: {                                      │ │
     │  │   success: true,                                 │ │
     │  │   count: 14,                                     │ │
     │  │   listings: [...]                                │ │
     │  │ }                                                 │ │
     │  └──────────────────────────────────────────────────┘ │
     └────────────┬──────────────────────────────────────────┘
                  │
                  │ AI receives search results
                  │ Generates response text
                  │
     ┌────────────▼────────────────┐
     │  Stream Response            │
     │  Text: "I found 14 homes    │
     │  in Palm Desert Country     │
     │  Club with 3+ beds under    │
     │  $500k. Here they are:"     │
     │                              │
     │  Metadata: {                │
     │    type: "listing_carousel" │
     │    listings: [...]          │
     │  }                           │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  IntegratedChatWidget       │
     │  Renders:                   │
     │  - Message bubble with text │
     │  - ListingCarousel with     │
     │    14 listing cards         │
     └─────────────────────────────┘
```

### Step-by-Step Flow

#### Step 1: User Sends Message

**Component:** `IntegratedChatWidget.tsx`

**Action:**
```typescript
const handleSubmit = async (message: string) => {
  const userMessage = {
    role: "user",
    content: message
  };

  setMessages([...messages, userMessage]);

  // Stream AI response
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messages, userMessage],
      userId: currentUserId,
      userTier: currentUserTier
    })
  });

  // Handle streaming response...
};
```

#### Step 2: AI Analyzes Query & Calls Functions

**API Route:** `src/app/api/chat/stream/route.ts`

**Process:**

1. **Send to Groq**
   ```typescript
   const groqResponse = await groq.chat.completions.create({
     model: "llama-3.3-70b-versatile",
     messages: conversationHistory,
     tools: GROQ_FUNCTIONS, // All 10 available functions
     tool_choice: "auto",
     stream: true
   });
   ```

2. **AI Decides to Call matchLocation**
   ```json
   {
     "tool_calls": [{
       "id": "call_abc123",
       "type": "function",
       "function": {
         "name": "matchLocation",
         "arguments": "{\"query\":\"palm desert country club\"}"
       }
     }]
   }
   ```

3. **Execute Function**
   ```typescript
   const functionName = toolCall.function.name;
   const functionArgs = JSON.parse(toolCall.function.arguments);

   const endpoint = FUNCTION_ENDPOINT_MAP[functionName];
   const response = await fetch(endpoint.endpoint, {
     method: endpoint.method,
     body: JSON.stringify(functionArgs)
   });

   const result = await response.json();
   ```

4. **matchLocation Returns**
   ```json
   {
     "type": "subdivision",
     "name": "Palm Desert Country Club",
     "slug": "palm-desert-country-club",
     "city": "Palm Desert",
     "confidence": 0.95,
     "data": {
       "_id": "...",
       "name": "Palm Desert Country Club",
       "slug": "palm-desert-country-club",
       "city": "Palm Desert",
       "listingCount": 24
     }
   }
   ```

5. **AI Calls searchListings**
   ```json
   {
     "tool_calls": [{
       "id": "call_def456",
       "type": "function",
       "function": {
         "name": "searchListings",
         "arguments": "{\"subdivisions\":[\"Palm Desert Country Club\"],\"minBeds\":3,\"maxPrice\":500000}"
       }
     }]
   }
   ```

6. **searchListings Returns**
   ```json
   {
     "success": true,
     "count": 14,
     "listings": [
       {
         "id": "20200218121507636729000001",
         "price": 425000,
         "beds": 3,
         "baths": 2,
         "sqft": 1850,
         "city": "Palm Desert",
         "address": "123 Fairway Dr",
         "image": "https://photos.listhub.net/...",
         "subdivision": "Palm Desert Country Club",
         "url": "/mls-listings/123-fairway-dr-palm-desert-ca-92211",
         "latitude": 33.7435,
         "longitude": -116.3762
       },
       // ... 13 more listings
     ]
   }
   ```

7. **AI Generates Response**
   ```typescript
   const aiResponse = {
     role: "assistant",
     content: "I found 14 homes in Palm Desert Country Club with 3+ bedrooms under $500k. Here they are:",
     metadata: {
       type: "listing_carousel",
       listings: result.listings
     }
   };
   ```

#### Step 3: Chat Widget Renders Results

**Component:** `ListingCarousel.tsx` (Chat version)

**Render:**
```typescript
<ListingCarousel
  listings={aiResponse.metadata.listings}
  title="Found 14 Properties"
/>
```

**Output:** Horizontal scrolling carousel with 14 listing cards

---

## City Page Flow

**User visits /cities/palm-desert**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│              USER VISITS /cities/palm-desert                         │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Next.js Page Route         │
     │  src/app/cities/[cityId]/   │
     │  page.tsx                   │
     └────────────┬────────────────┘
                  │
                  │ Server-Side Rendering (SSR)
                  │
     ┌────────────▼────────────────────────────────┐
     │  SERVER: Fetch City Data                    │
     │  ┌────────────────────────────────────────┐ │
     │  │ GET /api/cities/palm-desert/stats      │ │
     │  │ GET /api/cities/palm-desert/listings   │ │
     │  │ GET /api/cities/palm-desert/           │ │
     │  │     subdivisions                        │ │
     │  └────────────────────────────────────────┘ │
     └────────────┬────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Render CityPageClient      │
     │  with SSR props             │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  CLIENT: CityPageClient     │
     │  Interactive UI             │
     │  - Filter controls          │
     │  - Listing grid             │
     │  - Market stats             │
     │  - Subdivision list         │
     └─────────────────────────────┘
```

### Step-by-Step Flow

#### Step 1: Page Load (SSR)

**File:** `src/app/cities/[cityId]/page.tsx` (inferred)

**Server-Side:**
```typescript
export async function generateMetadata({ params }: { params: { cityId: string } }) {
  const cityName = params.cityId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${cityName} Real Estate | Homes for Sale`,
    description: `Browse homes for sale in ${cityName}. View listings, market stats, and neighborhoods.`
  };
}

export default async function CityPage({ params }: { params: { cityId: string } }) {
  const cityId = params.cityId;

  // Fetch city data server-side
  const [stats, initialListings, subdivisions] = await Promise.all([
    fetch(`${baseUrl}/api/cities/${cityId}/stats`).then(r => r.json()),
    fetch(`${baseUrl}/api/cities/${cityId}/listings?limit=20`).then(r => r.json()),
    fetch(`${baseUrl}/api/cities/${cityId}/subdivisions`).then(r => r.json())
  ]);

  return (
    <CityPageClient
      cityId={cityId}
      initialStats={stats}
      initialListings={initialListings}
      subdivisions={subdivisions}
    />
  );
}
```

#### Step 2: API Queries

**API 1: GET /api/cities/palm-desert/stats**

**File:** `src/app/api/cities/[cityId]/stats/route.ts` (inferred)

**Query:**
```typescript
const cityName = "Palm Desert";

const pipeline = [
  {
    $match: {
      city: { $regex: new RegExp(`^${cityName}$`, 'i') },
      listPrice: { $gt: 0 },
      standardStatus: "Active"
    }
  },
  {
    $group: {
      _id: null,
      medianPrice: { $median: "$listPrice" },
      avgPrice: { $avg: "$listPrice" },
      totalListings: { $sum: 1 },
      avgDaysOnMarket: { $avg: "$daysOnMarket" },
      avgPricePerSqft: { $avg: { $divide: ["$listPrice", "$livingArea"] } }
    }
  }
];

const [gpsStats, crmlsStats] = await Promise.all([
  Listing.aggregate(pipeline),
  CRMLSListing.aggregate(pipeline)
]);

// Merge stats (combine totals, average the averages weighted by count)
```

**Response:**
```json
{
  "medianPrice": 625000,
  "avgPrice": 682340,
  "totalListings": 342,
  "avgDaysOnMarket": 45,
  "avgPricePerSqft": 289
}
```

**API 2: GET /api/cities/palm-desert/listings?limit=20**

**File:** `src/app/api/cities/[cityId]/listings/route.ts`

**Process:** (Already documented in Global Architecture)

1. Query both GPS and CRMLS collections
2. Filter by city name (case-insensitive)
3. Apply filters (propertyType, price, beds, baths)
4. Limit to 20 (or specified limit)
5. Fetch primary photos from photos collection
6. Merge and return

**Response:**
```json
{
  "listings": [
    {
      "listingKey": "20200218121507636729000001",
      "listPrice": 850000,
      "address": "123 Main St",
      "slugAddress": "123-main-st-palm-desert-ca-92211",
      "beds": 3,
      "baths": 2,
      "yearBuilt": 2005,
      "livingArea": 2400,
      "photoUrl": "https://photos.listhub.net/...",
      "mlsSource": "CRMLS"
    },
    // ... 19 more
  ]
}
```

**API 3: GET /api/cities/palm-desert/subdivisions**

**File:** `src/app/api/cities/[cityId]/subdivisions/route.ts` (inferred)

**Query:**
```typescript
const subdivisions = await Subdivision.find({
  city: { $regex: new RegExp(`^Palm Desert$`, 'i') }
})
  .sort({ listingCount: -1 })
  .limit(50)
  .lean();
```

**Response:**
```json
{
  "subdivisions": [
    {
      "name": "Palm Desert Country Club",
      "slug": "palm-desert-country-club",
      "city": "Palm Desert",
      "listingCount": 24
    },
    {
      "name": "Ironwood Country Club",
      "slug": "ironwood-country-club",
      "city": "Palm Desert",
      "listingCount": 18
    },
    // ... more
  ]
}
```

#### Step 3: Client-Side Rendering

**Component:** `CityPageClient.tsx` (inferred)

**Render:**
```typescript
export default function CityPageClient({
  cityId,
  initialStats,
  initialListings,
  subdivisions
}: Props) {
  const [listings, setListings] = useState(initialListings);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const handleFilterChange = async (newFilters: Filters) => {
    setFilters(newFilters);

    // Fetch updated listings
    const params = new URLSearchParams({
      ...newFilters,
      propertyType: newFilters.propertyType || 'all'
    });

    const response = await fetch(`/api/cities/${cityId}/listings?${params}`);
    const data = await response.json();
    setListings(data.listings);
  };

  return (
    <div>
      <CityHeader city={cityId} stats={initialStats} />
      <FilterControls onChange={handleFilterChange} />
      <ListingGrid listings={listings} />
      <SubdivisionList subdivisions={subdivisions} />
    </div>
  );
}
```

---

## Subdivision Page Flow

**User visits /neighborhoods/palm-desert/palm-desert-country-club**

### Step-by-Step Flow

Very similar to City Page Flow, but uses subdivision-specific APIs:

1. **SSR:** Fetch subdivision stats and listings
   - `GET /api/subdivisions/palm-desert-country-club/stats`
   - `GET /api/subdivisions/palm-desert-country-club/listings?limit=20`

2. **API Queries:** Filter by `subdivisionName` instead of `city`

3. **Client-Side:** Same pattern as city page with filters

---

## Listing Detail Flow

**User clicks on a listing card**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER CLICKS LISTING CARD                                            │
│  URL: /mls-listings/123-main-st-palm-desert-ca-92211                │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Next.js Dynamic Route      │
     │  src/app/mls-listings/      │
     │  [slug]/page.tsx            │
     └────────────┬────────────────┘
                  │
                  │ Server-Side Rendering
                  │
     ┌────────────▼──────────────────────────────┐
     │  SERVER: Fetch Listing Data               │
     │  ┌──────────────────────────────────────┐ │
     │  │ Query: { slugAddress: "123-main..." }│ │
     │  │                                      │ │
     │  │ Search both collections:             │ │
     │  │ - Listing.findOne({ slugAddress })   │ │
     │  │ - CRMLSListing.findOne({ ... })      │ │
     │  │                                      │ │
     │  │ Fetch all photos for listing:        │ │
     │  │ Photo.find({ listingId })            │ │
     │  │   .sort({ order: 1 })                │ │
     │  └──────────────────────────────────────┘ │
     └────────────┬──────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Render ListingClient       │
     │  with full listing data     │
     │  + photo gallery             │
     └─────────────────────────────┘
```

---

## CMA Generation Flow

**User clicks "Generate CMA" button on listing detail page**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER CLICKS "GENERATE CMA"                                          │
│  listingKey: "20200218121507636729000001"                           │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Frontend CMA Request       │
     │  POST /api/cma/generate     │
     │  {                           │
     │    listingKey: "...",        │
     │    filters: {                │
     │      radius: 2,              │
     │      timeframe: 6,           │
     │      requirePool: false      │
     │    }                         │
     │  }                           │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────────────────────┐
     │  API Route: /api/cma/generate               │
     │  src/app/api/cma/generate/route.ts          │
     │  ┌────────────────────────────────────────┐ │
     │  │ 1. Fetch Subject Property              │ │
     │  │    collection.findOne({ listingKey })  │ │
     │  │    ❌ GPS collection ONLY               │ │
     │  │                                        │ │
     │  │ 2. Calculate Bounding Box              │ │
     │  │    latDelta = radius / 69 miles        │ │
     │  │    lonDelta = radius / (69 * cos(lat)) │ │
     │  │                                        │ │
     │  │ 3. Query Comparables                   │ │
     │  │    query = {                           │ │
     │  │      listingKey: { $ne: subject },     │ │
     │  │      latitude: { $gte, $lte },         │ │
     │  │      longitude: { $gte, $lte },        │ │
     │  │      $or: [                            │ │
     │  │        { standardStatus: "Active" },   │ │
     │  │        {                               │ │
     │  │          standardStatus: "Closed",     │ │
     │  │          closeDate: { $gte: cutoff }   │ │
     │  │        }                               │ │
     │  │      ]                                 │ │
     │  │    }                                   │ │
     │  │    .limit(100)                         │ │
     │  │                                        │ │
     │  │ 4. Score Each Comparable               │ │
     │  │    For each comp:                      │ │
     │  │    - Distance (Haversine formula)      │ │
     │  │    - Similarity score (0-100):         │ │
     │  │      * Beds match: +30                 │ │
     │  │      * Baths match: +20                │ │
     │  │      * Sqft within 20%: +30            │ │
     │  │      * Pool match: +10                 │ │
     │  │      * Year built within 10y: +10      │ │
     │  │                                        │ │
     │  │ 5. Sort by Similarity                  │ │
     │  │    comparables.sort(                   │ │
     │  │      (a,b) => b.similarity - a.similarity │
     │  │    ).slice(0, 10)                      │ │
     │  │                                        │ │
     │  │ 6. Calculate Market Stats              │ │
     │  │    - Average list price                │ │
     │  │    - Median list price                 │ │
     │  │    - Average sold price                │ │
     │  │    - Median sold price                 │ │
     │  │    - Average price per sqft            │ │
     │  │    - List-to-sold ratio                │ │
     │  │                                        │ │
     │  │ 7. Estimate Subject Value              │ │
     │  │    estimatedValue =                    │ │
     │  │      subjectSqft * avgPricePerSqft     │ │
     │  │    valueLow = estimatedValue * 0.95    │ │
     │  │    valueHigh = estimatedValue * 1.05   │ │
     │  └────────────────────────────────────────┘ │
     └────────────┬────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Return CMA Report          │
     │  {                           │
     │    subjectProperty: {...},   │
     │    comparableProperties: [], │
     │    marketStatistics: {...},  │
     │    generatedAt: Date         │
     │  }                           │
     └────────────┬────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Frontend Renders           │
     │  CMAReport Component        │
     │  - Subject property card    │
     │  - 10 comparable cards      │
     │  - Market statistics        │
     │  - Estimated value range    │
     └─────────────────────────────┘
```

**Critical Issue:** CMA only queries GPS collection, so CRMLS comps are excluded from analysis.

---

## Tile Generation Flow

**Manual execution of tile generation script**

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  MANUAL EXECUTION                                                    │
│  $ npm run generate-tiles                                           │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
     ┌────────────▼────────────────────────────────┐
     │  Script: generate-map-tiles.ts              │
     │  src/scripts/mls/map/generate-map-tiles.ts  │
     │  ┌────────────────────────────────────────┐ │
     │  │ 1. Connect to MongoDB                  │ │
     │  │    await connectDB()                   │ │
     │  │                                        │ │
     │  │ 2. Query Listings (GPS ONLY!)          │ │
     │  │    const listings = await Listing.find │ │
     │  │      latitude: { $exists: true },      │ │
     │  │      longitude: { $exists: true }      │ │
     │  │    }).lean()                           │ │
     │  │                                        │ │
     │  │    ❌ Does NOT query crmls_listings!   │ │
     │  │                                        │ │
     │  │ 3. Initialize Supercluster             │ │
     │  │    const index = new Supercluster({    │ │
     │  │      radius: 80,                       │ │
     │  │      maxZoom: 13,                      │ │
     │  │      minPoints: 2                      │ │
     │  │    })                                  │ │
     │  │                                        │ │
     │  │ 4. Convert to GeoJSON                  │ │
     │  │    const points = listings.map(l => ({ │ │
     │  │      type: "Feature",                  │ │
     │  │      geometry: {                       │ │
     │  │        type: "Point",                  │ │
     │  │        coordinates: [lng, lat]         │ │
     │  │      },                                │ │
     │  │      properties: {                     │ │
     │  │        slug: l.slug,                   │ │
     │  │        listingKey: l.listingKey,       │ │
     │  │        listPrice: l.listPrice,         │ │
     │  │        city: l.city,                   │ │
     │  │        beds: l.bedsTotal,              │ │
     │  │        baths: l.bathsTotal,            │ │
     │  │        photo: l.primaryPhotoUrl,       │ │
     │  │        subdivision: l.subdivisionName, │ │
     │  │        cluster: false                  │ │
     │  │        // ❌ NO mlsSource included!    │ │
     │  │      }                                 │ │
     │  │    }))                                 │ │
     │  │                                        │ │
     │  │ 5. Load into Supercluster              │ │
     │  │    index.load(points)                  │ │
     │  │                                        │ │
     │  │ 6. Generate Tiles (Zoom 5-13)          │ │
     │  │    for (zoom = 5; zoom <= 13; zoom++){ │ │
     │  │      const tiles = getAllTilesForZoom  │ │
     │  │      for (tile of tiles) {             │ │
     │  │        const clusters = index.getTile  │ │
     │  │        const filePath =                │ │
     │  │          `public/tiles/${z}/${x}/${y}` │ │
     │  │        fs.writeFileSync(               │ │
     │  │          filePath,                     │ │
     │  │          JSON.stringify(clusters)      │ │
     │  │        )                               │ │
     │  │      }                                 │ │
     │  │    }                                   │ │
     │  └────────────────────────────────────────┘ │
     └────────────┬────────────────────────────────┘
                  │
     ┌────────────▼────────────────┐
     │  Output: 22,485 Tile Files  │
     │  public/tiles/{z}/{x}/{y}.json
     │                              │
     │  Example tile structure:     │
     │  {                           │
     │    "type": "Feature",        │
     │    "id": 1,                  │
     │    "properties": {           │
     │      "cluster": true,        │
     │      "cluster_id": 123,      │
     │      "point_count": 50       │
     │    },                        │
     │    "geometry": {             │
     │      "type": "Point",        │
     │      "coordinates": [...]    │
     │    }                         │
     │  }                           │
     │                              │
     │  OR (individual marker):     │
     │  {                           │
     │    "type": "Feature",        │
     │    "properties": {           │
     │      "cluster": false,       │
     │      "slug": "...",          │
     │      "listPrice": 850000,    │
     │      "mlsSource": "CRMLS"    │
     │      // ↑ Mystery field!     │
     │    }                         │
     │  }                           │
     └─────────────────────────────┘
```

**Mystery Explained:**

Despite tile generator only querying GPS collection and not including `mlsSource` in properties, tiles contain `mlsSource: "CRMLS"`.

**Reason:** Tiles were generated before Nov 2024 architectural split, when both GPS and CRMLS data existed in single `listings` collection. At that time, CRMLS records had `mlsSource: "CRMLS"` from seed script, which was captured in tile properties automatically by Supercluster.

---

## Data Transformation Map

**How listing data transforms at each stage**

### Stage 1: Spark API Response

```json
{
  "Id": "20200218121507636729000001",
  "ListingId": "SW23456789",
  "StandardFields": {
    "ListPrice": 850000,
    "UnparsedAddress": "123 Main St",
    "City": "Palm Desert",
    "StateOrProvince": "CA",
    "PostalCode": "92211",
    "BedroomsTotal": 3,
    "BathroomsFull": 2,
    "BathroomsHalf": 0,
    "LivingArea": 2400,
    "YearBuilt": 2005,
    "PropertyType": "A",
    "PropertySubType": "Single Family Residence",
    "StandardStatus": "Active",
    "Latitude": 33.7435,
    "Longitude": -116.3762,
    "SubdivisionName": "Palm Desert Country Club"
  },
  "Photos": [...]
}
```

### Stage 2: Flattened (After flatten.py)

```json
{
  "listingId": "SW23456789",
  "listingKey": "20200218121507636729000001",
  "listPrice": 850000,
  "unparsedAddress": "123 Main St",
  "city": "Palm Desert",
  "stateOrProvince": "CA",
  "postalCode": "92211",
  "bedroomsTotal": 3,
  "bathroomsFull": 2,
  "bathroomsHalf": 0,
  "livingArea": 2400,
  "yearBuilt": 2005,
  "propertyType": "A",
  "propertySubType": "Single Family Residence",
  "standardStatus": "Active",
  "latitude": 33.7435,
  "longitude": -116.3762,
  "subdivisionName": "Palm Desert Country Club"
}
```

### Stage 3: MongoDB (After seed.py)

**CRMLS Collection:**
```json
{
  "_id": ObjectId("..."),
  "listingId": "SW23456789",
  "listingKey": "20200218121507636729000001",
  "listPrice": 850000,
  "unparsedAddress": "123 Main St",
  "city": "Palm Desert",
  "stateOrProvince": "CA",
  "postalCode": "92211",
  "bedroomsTotal": 3,
  "bathroomsFull": 2,
  "bathroomsHalf": 0,
  "livingArea": 2400,
  "yearBuilt": 2005,
  "propertyType": "A",
  "propertySubType": "Single Family Residence",
  "standardStatus": "Active",
  "latitude": 33.7435,
  "longitude": -116.3762,
  "subdivisionName": "Palm Desert Country Club",
  "mlsSource": "CRMLS"  // ← Added by seed script
}
```

**GPS Collection:** (Same but without `mlsSource` field)

### Stage 4: API Response (/api/mls-listings)

```json
{
  "listings": [
    {
      "_id": "...",
      "listingId": "SW23456789",
      "listingKey": "20200218121507636729000001",
      "slug": "sw23456789",
      "slugAddress": "123-main-st-palm-desert-ca-92211",
      "listPrice": 850000,
      "unparsedAddress": "123 Main St",
      "city": "Palm Desert",
      "latitude": 33.7435,
      "longitude": -116.3762,
      "bedsTotal": 3,
      "bathroomsTotalInteger": 2,
      "livingArea": 2400,
      "yearBuilt": 2005,
      "primaryPhotoUrl": "https://photos.listhub.net/...",
      "subdivisionName": "Palm Desert Country Club",
      "mlsSource": "CRMLS"  // ← Preserved from DB
    }
  ],
  "totalCount": 342
}
```

### Stage 5: Frontend (MapListing type)

```typescript
{
  _id: "...",
  listingId: "SW23456789",
  listingKey: "20200218121507636729000001",
  slug: "sw23456789",
  slugAddress: "123-main-st-palm-desert-ca-92211",
  listPrice: 850000,
  unparsedAddress: "123 Main St",
  address: "123 Main St",
  city: "Palm Desert",
  latitude: 33.7435,
  longitude: -116.3762,
  bedsTotal: 3,
  bathroomsTotalInteger: 2,
  livingArea: 2400,
  yearBuilt: 2005,
  primaryPhotoUrl: "https://photos.listhub.net/...",
  subdivisionName: "Palm Desert Country Club",
  mlsSource: "CRMLS"
}
```

### Stage 6: Chat Response (Listing interface)

```typescript
{
  id: "20200218121507636729000001",
  price: 850000,
  beds: 3,
  baths: 2,
  sqft: 2400,
  city: "Palm Desert",
  address: "123 Main St",
  image: "https://photos.listhub.net/...",
  subdivision: "Palm Desert Country Club",
  type: "Single Family Residence",
  url: "/mls-listings/123-main-st-palm-desert-ca-92211",
  slug: "123-main-st-palm-desert-ca-92211",
  slugAddress: "123-main-st-palm-desert-ca-92211",
  latitude: 33.7435,
  longitude: -116.3762
}
```

### Stage 7: Tile Data (GeoJSON Feature)

```json
{
  "type": "Feature",
  "id": 12345,
  "properties": {
    "cluster": false,
    "slug": "sw23456789",
    "listingKey": "20200218121507636729000001",
    "listPrice": 850000,
    "city": "Palm Desert",
    "beds": 3,
    "baths": 2,
    "photo": "https://photos.listhub.net/...",
    "subdivision": "Palm Desert Country Club",
    "yearBuilt": 2005,
    "mlsSource": "CRMLS"  // ← Historical field (from pre-split data)
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-116.3762, 33.7435]
  }
}
```

---

## Summary

This document maps the complete journey of listing data through the application:

1. **Ingestion:** Spark API → Python scripts → MongoDB (dual collections)
2. **Map View:** Bounds query → Dual DB query → Client clustering → Render
3. **Chat Search:** AI functions → Location matching → CRMLS query → Carousel
4. **City Page:** SSR → Dual DB query → Grid display
5. **Subdivision Page:** SSR → Subdivision filter → Grid display
6. **Listing Detail:** Slug lookup → Single record + photos → Full page
7. **CMA Generation:** GPS query → Similarity scoring → Market analysis
8. **Tile Generation:** GPS query → Supercluster → Static JSON files

**Key Insights:**

- Data flows through multiple transformations (Spark API → Flat → MongoDB → API → Frontend)
- Dual collection architecture requires careful querying at API layer
- Some APIs query both collections (complete), others query one (incomplete)
- Tile system exists but is completely disconnected from live map
- Chat search uses CRMLS only, excluding GPS listings
- CMA uses GPS only, excluding CRMLS comps
- Historical tile data contains CRMLS records from pre-split architecture

---

**Document Version:** 1.0
**Generated:** 2025-01-22
**Purpose:** Pre-implementation flow analysis for STEP 4 (Tile System Wiring)
