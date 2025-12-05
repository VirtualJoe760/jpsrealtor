# Unified MLS Collection Architecture Proposal

**Date**: December 4, 2025
**Purpose**: Consolidate fragmented MLS data into a single, AI-optimized collection
**Problem**: Multiple collections (listings, crmls-listings, gps-listings, cities, subdivisions) create complex querying and maintenance overhead

---

## 🎯 Current Problem

### Fragmented Data Structure

```
Current Collections (15+):
├── listings (GPS MLS) - 115K records
├── crmls-listings (CRMLS) - 28K records
├── gps-closed-listings
├── crmls-closed-listings
├── cities - Aggregated stats
├── subdivisions - Aggregated stats
├── photos - Spark CDN URLs
├── openHouses
├── documents
├── media
└── rooms

AI Query Challenge:
❌ Chat needs to query multiple collections
❌ Tool use must know which collection to query
❌ GPS vs CRMLS logic duplicated everywhere
❌ Synchronization issues between aggregated stats
❌ Complex joins for comprehensive data
```

### API Route Fragmentation

```typescript
/api/mls-listings       // Queries both GPS + CRMLS, returns unified
/api/cities/[id]/...    // Aggregated from listings
/api/subdivisions/...   // Aggregated from listings
/api/schools            // Separate collection
```

**AI Confusion**:
- Which endpoint returns what data?
- When to use cities vs subdivisions vs listings?
- How to get complete property context?

---

## ✅ Proposed Solution: Unified MLS Collection

### Single Source of Truth

```
unified_listings (Collection)
├── Core Listing Data (from both GPS + CRMLS)
├── Location Context (embedded city/subdivision data)
├── Media References (photos, videos, virtual tours)
├── Market Context (neighborhood stats, trends)
├── AI-Optimized Fields (search vectors, summaries)
└── Source Tracking (mlsSource: "GPS" | "CRMLS")
```

---

## 📐 Unified Schema Design

### Core Structure

```typescript
interface IUnifiedListing {
  // ===== IDENTITY =====
  _id: ObjectId;
  listingId: string;                    // GPS-123456 or CV-25247916
  listingKey: string;                   // Unique key (slug)
  slug: string;                         // URL-friendly
  slugAddress: string;                  // For SEO
  mlsSource: "GPS" | "CRMLS";          // Source MLS
  sourceId: string;                     // Original ID in source MLS

  // ===== CORE PROPERTY DATA =====
  status: "Active" | "Pending" | "Closed" | "Expired";
  standardStatus: string;
  listPrice: number;
  currentPrice: number;
  originalListPrice: number;

  // Property Details
  propertyType: "A" | "B" | "C" | "D";  // A=Residential, B=Lease, etc.
  propertySubType: string;              // Condo, SFR, Townhouse, etc.
  bedsTotal: number;
  bathroomsTotalInteger: number;
  bathroomsTotalDecimal: number;
  livingArea: number;
  lotSizeArea: number;
  yearBuilt: number;

  // ===== LOCATION (Embedded City/Subdivision Context) =====
  location: {
    // Address
    unparsedAddress: string;
    unparsedFirstLineAddress: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    county: string;

    // Coordinates
    latitude: number;
    longitude: number;

    // City Context (embedded from cities collection)
    cityData: {
      name: string;
      slug: string;
      region: string;                   // "Coachella Valley"
      avgPrice: number;                 // City average for comparison
      listingCount: number;             // Total listings in city
      coordinates: { lat: number; lng: number };
    };

    // Subdivision Context (embedded from subdivisions collection)
    subdivisionData: {
      name: string;
      slug: string;
      avgPrice: number;                 // Neighborhood average
      listingCount: number;             // Listings in subdivision
      priceRange: { min: number; max: number };
      seniorCommunity: boolean;
      communityFeatures: string;
      // Community Facts (for AI context)
      walkScore?: number;
      transitScore?: number;
      schoolRatings?: {
        elementary: number;
        middle: number;
        high: number;
      };
    };
  };

  // ===== MEDIA (References to external CDNs) =====
  media: {
    // Primary Photo (for quick display)
    primaryPhotoUrl: string;            // Spark CDN URL
    primaryPhotoId: string;

    // Photo Count (no need to store all URLs)
    photoCount: number;
    hasPhotos: boolean;

    // Photo API endpoint (dynamic loading)
    photosEndpoint: string;             // /api/listing/[id]/photos

    // Videos & Virtual Tours
    videoCount: number;
    hasVideos: boolean;
    hasVirtualTour: boolean;
    virtualTourUrl?: string;

    // Documents
    documentCount: number;
  };

  // ===== FEATURES & AMENITIES =====
  features: {
    pool: boolean;
    spa: boolean;
    view: boolean;
    waterfront: boolean;
    golfCourse: boolean;
    gated: boolean;
    seniorCommunity: boolean;

    // HOA
    hasHOA: boolean;
    associationFee?: number;
    associationFeeFrequency?: string;

    // Parking
    garageSpaces: number;
    parkingTotal: number;

    // Stories
    stories?: number;

    // Architecture
    architecturalStyle?: string;
    construction?: string;
  };

  // ===== LISTING DETAILS =====
  listing: {
    publicRemarks: string;              // Description
    privateRemarks?: string;            // Agent notes (if authorized)

    listingDate: Date;
    listingContractDate?: Date;
    expirationDate?: Date;
    modificationTimestamp: Date;

    daysOnMarket: number;
    cumulativeDaysOnMarket?: number;
  };

  // ===== AGENT/OFFICE INFO =====
  agent: {
    listAgentFullName?: string;
    listOfficeName?: string;
    listAgentEmail?: string;
    listAgentPhone?: string;
    buyerAgentFullName?: string;
    buyerOfficeName?: string;
  };

  // ===== OPEN HOUSES =====
  openHouses: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    comments?: string;
  }>;

  // ===== MARKET CONTEXT (for AI insights) =====
  market: {
    // Price Analytics
    pricePerSqFt: number;               // Calculated
    priceVsCityAvg: number;             // % diff from city avg
    priceVsSubdivisionAvg: number;      // % diff from subdivision avg

    // Demand Indicators
    viewCount?: number;                 // If tracking
    favoriteCount?: number;
    inquiryCount?: number;

    // Historical (if available)
    previousListPrice?: number;
    priceChanges?: Array<{
      date: Date;
      price: number;
      changePercent: number;
    }>;
  };

  // ===== AI-OPTIMIZED FIELDS =====
  ai: {
    // Search Optimization
    searchVector?: number[];            // For vector search (future)

    // Generated Summary (for AI context)
    aiSummary?: string;                 // 1-2 sentence AI-generated summary

    // Key Highlights (extracted by AI)
    highlights?: string[];              // ["Ocean view", "Recently remodeled", "Near schools"]

    // Natural Language Tags
    nlpTags?: string[];                 // ["luxury", "family-friendly", "investment"]

    // Buyer Persona Match
    idealFor?: string[];                // ["first-time-buyer", "retiree", "investor"]
  };

  // ===== METADATA =====
  meta: {
    createdAt: Date;
    updatedAt: Date;
    lastSyncedAt: Date;                 // Last sync from MLS
    dataQuality: number;                // 0-100 completeness score
    verified: boolean;                  // Manual verification flag
  };

  // ===== INDEXES =====
  // Geospatial index on location.latitude, location.longitude
  // Text index on publicRemarks, ai.highlights
  // Compound index on mlsSource + status
  // Index on location.city, location.subdivisionData.slug
}
```

---

## 🔄 Data Migration Strategy

### Phase 1: Schema Creation (Week 1)

```typescript
// 1. Create new unified_listings collection with schema
// 2. Set up indexes for optimal querying
// 3. Test schema with sample data

Indexes to Create:
- Geospatial: { "location.latitude": "2dsphere" }
- Text Search: { "listing.publicRemarks": "text", "ai.highlights": "text" }
- Status: { "status": 1, "mlsSource": 1 }
- Location: { "location.city": 1, "location.subdivisionData.slug": 1 }
- Price: { "listPrice": 1, "pricePerSqFt": 1 }
- Compound: { "mlsSource": 1, "status": 1, "location.city": 1 }
```

### Phase 2: Data Consolidation (Week 2)

```javascript
// Migration script pseudocode

async function migrateToUnified() {
  // 1. Fetch all listings from GPS + CRMLS
  const gpsListings = await GPSListing.find({ status: "Active" });
  const crmlsListings = await CRMLSListing.find({ status: "Active" });

  // 2. For each listing, enrich with context
  for (const listing of [...gpsListings, ...crmlsListings]) {
    // Get city context
    const cityData = await City.findOne({
      normalizedName: listing.city.toLowerCase()
    });

    // Get subdivision context
    const subdivisionData = await Subdivision.findOne({
      normalizedName: listing.subdivisionName?.toLowerCase()
    });

    // Get primary photo
    const primaryPhoto = await Photo.findOne({
      listingId: listing.listingId,
      primary: true
    });

    // Calculate derived fields
    const pricePerSqFt = listing.listPrice / listing.livingArea;
    const priceVsCityAvg = ((listing.listPrice - cityData.avgPrice) / cityData.avgPrice) * 100;

    // Create unified document
    await UnifiedListing.create({
      listingId: listing.listingId,
      listingKey: listing.slug,
      mlsSource: listing.mlsSource,

      // ... map all fields to new schema

      location: {
        city: listing.city,
        cityData: {
          name: cityData.name,
          slug: cityData.slug,
          avgPrice: cityData.avgPrice,
          // ...
        },
        subdivisionData: subdivisionData ? {
          name: subdivisionData.name,
          // ...
        } : null,
      },

      media: {
        primaryPhotoUrl: primaryPhoto?.uri1280 || null,
        photoCount: await Photo.countDocuments({ listingId: listing.listingId }),
        photosEndpoint: `/api/listing/${listing.listingId}/photos`,
      },

      market: {
        pricePerSqFt,
        priceVsCityAvg,
      },
    });
  }
}
```

### Phase 3: API Route Simplification (Week 3)

**Before (Multiple Routes)**:
```typescript
/api/mls-listings          // Queries GPS + CRMLS separately, merges
/api/cities/[id]/listings  // Filters by city
/api/subdivisions/[slug]/listings  // Filters by subdivision
```

**After (Single Unified Route)**:
```typescript
/api/listings              // Queries unified_listings
  ?city=palm-desert       // Filter by city
  &subdivision=indian-wells-country-club  // Filter by subdivision
  &mlsSource=GPS,CRMLS    // Filter by source
  &minPrice=500000
  &maxPrice=1000000
  &beds=3
  &status=Active
  &sortBy=price
  &include=cityContext,subdivisionContext,media
```

### Phase 4: AI Tool Integration (Week 4)

**Simplified AI Function Calling**:

```typescript
// OLD: Multiple tool calls needed
const listings = await getListings({ city: "Palm Desert" });
const cityInfo = await getCityInfo("palm-desert");
const subdivisions = await getSubdivisions({ city: "Palm Desert" });
const schools = await getSchools({ lat, lng });

// NEW: Single comprehensive query
const results = await queryUnifiedListings({
  city: "Palm Desert",
  include: ["cityContext", "subdivisionContext", "schoolRatings"],
  limit: 10
});

// Results include EVERYTHING needed:
{
  listings: [...],
  cityContext: {
    name: "Palm Desert",
    avgPrice: 750000,
    listingCount: 500,
    // ...
  },
  subdivisions: [
    { name: "Indian Wells Country Club", avgPrice: 1200000, ... }
  ],
  aggregations: {
    priceRange: { min: 200000, max: 5000000 },
    avgPricePerSqFt: 350,
    propertyTypeDistribution: { residential: 80, lease: 20 }
  }
}
```

---

## 🤖 AI Benefits

### 1. Simplified Tool Definitions

**Before**:
```typescript
const tools = [
  { name: "get_listings", description: "Get MLS listings..." },
  { name: "get_city_info", description: "Get city statistics..." },
  { name: "get_subdivision_info", description: "Get neighborhood data..." },
  { name: "get_gps_listings", description: "Get GPS MLS only..." },
  { name: "get_crmls_listings", description: "Get CRMLS only..." },
];
```

**After**:
```typescript
const tools = [
  {
    name: "query_listings",
    description: "Comprehensive MLS listing search with embedded context",
    parameters: {
      filters: {
        location: { city, subdivision, coordinates, radius },
        property: { beds, baths, price, sqft, type },
        features: { pool, view, gated },
        mlsSource: ["GPS", "CRMLS", "ALL"],
      },
      include: ["cityContext", "subdivisionContext", "mediaUrls", "openHouses"],
      sort: { by: "price" | "date" | "relevance", order: "asc" | "desc" },
      limit: 50,
    }
  }
];
```

### 2. Contextual Responses

```
User: "Show me affordable homes in Palm Desert"

OLD AI Flow:
1. Call get_listings({ city: "Palm Desert", maxPrice: 500000 })
2. Call get_city_info("palm-desert") to know what "affordable" means
3. Compare results
4. Format response

NEW AI Flow:
1. Call query_listings({
     city: "Palm Desert",
     maxPrice: 500000,
     include: ["cityContext"]
   })
2. AI receives:
   - Listings below $500K
   - City average price: $750K
   - Automatically knows $500K is 33% below average
3. Response: "I found 15 homes in Palm Desert under $500K, which is 33%
    below the city average of $750K. These are great values!"
```

### 3. Vector Search Ready

```typescript
// Future: Semantic property search
interface AIOptimization {
  searchVector: number[];  // Embedding from property description

  // Natural language queries become possible:
  // "Modern home with mountain views near golf courses"
  // → Vector similarity search finds best matches
}
```

---

## 📊 Performance Benefits

### Current (Fragmented)

```javascript
// Complex query requiring multiple DB calls
async function getPropertyWithContext(listingId) {
  const listing = await Listing.findById(listingId);  // Query 1
  const city = await City.findOne({
    normalizedName: listing.city.toLowerCase()
  });  // Query 2
  const subdivision = await Subdivision.findOne({
    normalizedName: listing.subdivisionName.toLowerCase()
  });  // Query 3
  const photos = await Photo.find({ listingId });  // Query 4
  const openHouses = await OpenHouse.find({ listingId });  // Query 5

  return { listing, city, subdivision, photos, openHouses };
  // 5 database queries, 5 network round trips
}
```

### Unified (Single Query)

```javascript
async function getPropertyWithContext(listingId) {
  const unified = await UnifiedListing.findOne({ listingId });

  return unified;  // Everything included!
  // 1 database query, 1 network round trip
  // 5x faster, 5x less database load
}
```

### Index Optimization

```javascript
// Geospatial + Filter Query (OLD)
const nearbyListings = await Listing.find({
  latitude: { $gte: lat - 0.1, $lte: lat + 0.1 },
  longitude: { $gte: lng - 0.1, $lte: lng + 0.1 },
  status: "Active",
  listPrice: { $gte: 500000, $lte: 1000000 }
}).limit(50);
// Slow: No geospatial index, full collection scan

// Geospatial + Filter Query (NEW with 2dsphere index)
const nearbyListings = await UnifiedListing.find({
  "location": {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 16000  // 10 miles in meters
    }
  },
  status: "Active",
  listPrice: { $gte: 500000, $lte: 1000000 }
}).limit(50);
// Fast: Uses 2dsphere index, ~10ms query time
```

---

## 🗂️ Photo Storage Strategy

### Current (Correct Approach)

```typescript
// Photos collection stores Spark CDN URLs
interface IPhoto {
  listingId: string;
  photoId: string;
  uri1024: string;  // https://photos.harstatic.com/.../photo.jpg
  uri1280: string;
  uri2048: string;
  primary: boolean;
}

// ✅ This is CORRECT - no need to store photos in Cloudflare R2
// Spark API already provides CDN-optimized URLs
```

### Unified Collection Approach

```typescript
// unified_listings: Store photo REFERENCES, not URLs
interface UnifiedListing {
  media: {
    primaryPhotoUrl: string;      // For quick display
    photoCount: number;           // How many photos exist
    photosEndpoint: string;       // Dynamic API: /api/listing/[id]/photos

    // Don't embed all photo URLs (bloats document)
    // Load photos on-demand via separate API call
  }
}

// Separate photos collection remains as-is
// Load photos only when needed:
const photos = await fetch(`/api/listing/${listingId}/photos`);
```

### Cloudflare Image Worker Use Case

```typescript
// Current: Spark CDN URLs work great
primaryPhotoUrl: "https://photos.harstatic.com/gps_mlsimg/GpsPhotos_1024/000/024/074/024074569-1.jpg"

// Future (Optional): Cloudflare Images for user-uploaded photos
// (e.g., agent photos, neighborhood photos, blog images)
userPhotos: {
  url: "https://jpsrealtor.com/images/[cloudflare-id]",
  variants: {
    thumbnail: "?width=300",
    card: "?width=600",
    hero: "?width=1200"
  }
}

// Conclusion: Keep Spark URLs as-is for MLS listings
//             Use Cloudflare Images only for custom content
```

---

## 🚀 Implementation Roadmap

### Week 1: Schema Design & Testing
- [ ] Create `unified_listings` schema
- [ ] Set up indexes (geospatial, text, compound)
- [ ] Test with 1000 sample listings
- [ ] Validate query performance
- [ ] Document field mapping GPS → Unified, CRMLS → Unified

### Week 2: Data Migration
- [ ] Write migration scripts
- [ ] Migrate GPS listings (115K records)
- [ ] Migrate CRMLS listings (28K records)
- [ ] Embed city context data
- [ ] Embed subdivision context data
- [ ] Validate data integrity
- [ ] Run comparison queries (old vs new)

### Week 3: API Route Consolidation
- [ ] Create `/api/listings` unified route
- [ ] Deprecate (but keep) old routes for backward compatibility
- [ ] Update frontend components to use new route
- [ ] Test map integration
- [ ] Test chat integration
- [ ] Performance benchmarking

### Week 4: AI Tool Integration
- [ ] Update AI tool definitions
- [ ] Simplify function calling logic
- [ ] Test with Groq LLM
- [ ] Add contextual enrichment
- [ ] Generate AI summaries for listings
- [ ] Deploy to production

### Week 5: Monitoring & Optimization
- [ ] Monitor query performance
- [ ] Optimize slow queries
- [ ] Set up Cloudflare cache for unified route
- [ ] Document new API
- [ ] Train team on new structure

---

## 📈 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **AI Tool Count** | 6-8 tools | 1-2 tools | 75% reduction |
| **Database Queries** | 5-7 per property | 1 per property | 85% reduction |
| **API Response Time** | 500-1000ms | 50-150ms | 80% faster |
| **Cache Hit Rate** | ~60% | ~85% | 42% improvement |
| **AI Context Tokens** | 2000-3000 | 800-1200 | 60% reduction |
| **Code Complexity** | High | Low | Much simpler |

---

## ✅ Next Steps

1. **Review & Approve** this proposal
2. **Create Trello card** with Week 1-5 checklists
3. **Start with Week 1** schema design
4. **Test migration** with 100 sample listings first
5. **Iterative rollout** to avoid disruption

---

## 🔗 Related Documentation

- `docs/DATABASE_MODELS.md` - Current schema reference
- `docs/MLS_DATA_ARCHITECTURE.md` - Multi-tenant MLS design
- `docs/CLOUDFLARE_DEPLOYMENT_COMPLETE.md` - Caching infrastructure
- `master-plan.md` - Overall platform roadmap

---

**Status**: Proposal
**Next Action**: Review & approve schema design
**Timeline**: 5 weeks (phased rollout)
**Risk**: Low (backward-compatible migration)
