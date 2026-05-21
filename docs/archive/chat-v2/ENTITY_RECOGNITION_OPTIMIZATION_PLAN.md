# Chat Entity Recognition Optimization Plan

**Date**: January 2, 2026
**Problem**: Vercel timeout on Vacaville query (15 second limit)
**Root Cause**: Loading 1600+ subdivisions + 1000+ cities on every chat request
**Solution**: Use pre-computed models like the map system does

---

## Current Performance Issues

### The Problem
```
User searches: "show me homes in Vacaville"
  ↓
identifyEntityType() called
  ↓
Loads ALL entities from database:
  - UnifiedListing.distinct("subdivisionName") → 1600+ results
  - UnifiedListing.distinct("city") → 1000+ results
  ↓
10-15 seconds later... ⏱️
  ↓
❌ Vercel Timeout (15 second limit)
```

### Why It's Slow
1. **Cold starts**: Vercel serverless functions lose cache
2. **Full table scan**: `distinct()` scans millions of documents
3. **No indexes**: subdivisionName/city fields aren't indexed for distinct queries
4. **Every request**: No persistent cache between requests

### Evidence
- ✅ Works on localhost (warm cache)
- ✅ PDCC worked (cached from previous query)
- ❌ Vacaville timeout (cache miss + full reload)

---

## Map System Architecture (What Works)

### Pre-Computed Models

**File**: `src/models/City.ts`
```typescript
{
  _id: ObjectId,
  cityName: "Vacaville",
  latitude: 38.3566,
  longitude: -121.9877,
  listingCount: 18,
  avgPrice: 650000,
  minPrice: 450000,
  maxPrice: 850000,
  // ... other stats
}
```

**File**: `src/models/County.ts`
```typescript
{
  _id: ObjectId,
  countyName: "Solano County",
  region: "Northern California",
  listingCount: 245,
  avgPrice: 675000,
  // ... other stats
}
```

### Fast Lookups
```typescript
// ❌ SLOW: Current approach
const cities = await UnifiedListing.distinct("city");  // 10-15 seconds

// ✅ FAST: Map approach
const city = await City.findOne({ cityName: "Vacaville" });  // <50ms
```

### Why It's Fast
1. **Indexed**: `cityName` field has index
2. **Small documents**: Only ~100 cities, not millions of listings
3. **Single query**: Not scanning full collection
4. **Pre-aggregated**: Stats already calculated

---

## Proposed Solution: LocationIndex Model

### Create New Model: `src/models/LocationIndex.ts`

```typescript
import mongoose from 'mongoose';

const locationIndexSchema = new mongoose.Schema({
  // Entity identification
  name: { type: String, required: true, index: true },
  normalizedName: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['city', 'subdivision', 'county', 'region'],
    required: true,
    index: true
  },

  // Geographic data
  latitude: Number,
  longitude: Number,
  bounds: {
    north: Number,
    south: Number,
    east: Number,
    west: Number
  },

  // Hierarchy
  city: String,          // For subdivisions
  county: String,        // For cities
  region: String,        // For counties

  // Stats (cached for autocomplete)
  listingCount: { type: Number, default: 0 },
  activeListingCount: { type: Number, default: 0 },

  // Metadata
  slug: { type: String, index: true },
  aliases: [String],     // ["PDCC", "Palm Desert Country Club"]

  // Timestamps
  lastUpdated: { type: Date, default: Date.now }
}, {
  collection: 'location_index'
});

// Compound indexes
locationIndexSchema.index({ type: 1, normalizedName: 1 });
locationIndexSchema.index({ type: 1, listingCount: -1 });

export default mongoose.models.LocationIndex ||
  mongoose.model('LocationIndex', locationIndexSchema);
```

### Sample Data
```json
[
  {
    "name": "Vacaville",
    "normalizedName": "vacaville",
    "type": "city",
    "latitude": 38.3566,
    "longitude": -121.9877,
    "county": "Solano County",
    "region": "Northern California",
    "listingCount": 18,
    "activeListingCount": 18,
    "slug": "vacaville-ca",
    "aliases": []
  },
  {
    "name": "Palm Desert Country Club",
    "normalizedName": "palm desert country club",
    "type": "subdivision",
    "latitude": 33.7222,
    "longitude": -116.3745,
    "city": "Palm Desert",
    "county": "Riverside County",
    "region": "Southern California",
    "listingCount": 32,
    "activeListingCount": 32,
    "slug": "palm-desert-country-club",
    "aliases": ["PDCC", "PD Country Club"]
  },
  {
    "name": "San Francisco",
    "normalizedName": "san francisco",
    "type": "city",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "county": "San Francisco County",
    "region": "Northern California",
    "listingCount": 1245,
    "activeListingCount": 892,
    "slug": "san-francisco-ca",
    "aliases": ["SF", "San Fran"]
  }
]
```

---

## New Entity Recognition (Fast)

### Updated: `src/lib/chat/utils/entity-recognition.ts`

```typescript
import LocationIndex from "@/models/LocationIndex";
import dbConnect from "@/lib/mongodb";

export async function identifyEntityType(query: string): Promise<EntityRecognitionResult> {
  console.log("[Entity Recognition] Query:", query);

  await dbConnect();

  const normalized = query.toLowerCase().trim();

  // Try exact match first (fastest - uses index)
  let match = await LocationIndex.findOne({
    $or: [
      { normalizedName: normalized },
      { slug: normalized },
      { aliases: normalized }
    ]
  }).lean();

  // If no exact match, try fuzzy search
  if (!match) {
    match = await LocationIndex.findOne({
      $or: [
        { normalizedName: { $regex: `^${normalized}`, $options: 'i' } },
        { name: { $regex: `^${normalized}`, $options: 'i' } }
      ]
    })
    .sort({ listingCount: -1 })  // Prefer high-count locations
    .limit(1)
    .lean();
  }

  if (match) {
    console.log(`[Entity Recognition] ✅ Found ${match.type}: ${match.name} (${match.listingCount} listings)`);

    return {
      type: match.type as EntityType,
      value: match.name,
      confidence: 0.9,
      original: query,
      metadata: {
        latitude: match.latitude,
        longitude: match.longitude,
        listingCount: match.listingCount
      }
    };
  }

  // Fallback to general query
  console.log("[Entity Recognition] No match, treating as general query");
  return {
    type: 'general',
    value: query,
    confidence: 0.3,
    original: query
  };
}
```

### Performance Comparison

| Approach | Query Time | Database Operations |
|----------|------------|-------------------|
| **Current** (distinct) | 10-15 seconds | Full collection scan × 2 |
| **New** (indexed lookup) | **<50ms** | ✅ Single indexed query |

**Speed Improvement**: **200-300x faster**

---

## Migration Strategy

### Phase 1: Build LocationIndex (One-Time)

**Script**: `scripts/build-location-index.js`

```javascript
import dbConnect from '../src/lib/mongodb.js';
import UnifiedListing from '../src/models/unified-listing.js';
import LocationIndex from '../src/models/LocationIndex.js';

async function buildLocationIndex() {
  await dbConnect();

  console.log('Building location index...');

  // Clear existing index
  await LocationIndex.deleteMany({});

  // 1. Build city index
  console.log('Indexing cities...');
  const cityAgg = await UnifiedListing.aggregate([
    {
      $match: {
        city: { $exists: true, $ne: null, $nin: ["", "Unknown"] },
        standardStatus: "Active"
      }
    },
    {
      $group: {
        _id: "$city",
        count: { $sum: 1 },
        avgLat: { $avg: "$latitude" },
        avgLng: { $avg: "$longitude" }
      }
    }
  ]);

  const cityDocs = cityAgg.map(city => ({
    name: city._id,
    normalizedName: city._id.toLowerCase(),
    type: 'city',
    latitude: city.avgLat,
    longitude: city.avgLng,
    listingCount: city.count,
    activeListingCount: city.count,
    slug: city._id.toLowerCase().replace(/\s+/g, '-'),
    lastUpdated: new Date()
  }));

  await LocationIndex.insertMany(cityDocs);
  console.log(`✅ Indexed ${cityDocs.length} cities`);

  // 2. Build subdivision index
  console.log('Indexing subdivisions...');
  const subdivAgg = await UnifiedListing.aggregate([
    {
      $match: {
        subdivisionName: {
          $exists: true,
          $ne: null,
          $nin: ["", "Not Applicable", "N/A", "None"]
        },
        standardStatus: "Active"
      }
    },
    {
      $group: {
        _id: "$subdivisionName",
        count: { $sum: 1 },
        avgLat: { $avg: "$latitude" },
        avgLng: { $avg: "$longitude" },
        city: { $first: "$city" }
      }
    }
  ]);

  const subdivDocs = subdivAgg.map(subdiv => ({
    name: subdiv._id,
    normalizedName: subdiv._id.toLowerCase(),
    type: 'subdivision',
    latitude: subdiv.avgLat,
    longitude: subdiv.avgLng,
    city: subdiv.city,
    listingCount: subdiv.count,
    activeListingCount: subdiv.count,
    slug: subdiv._id.toLowerCase().replace(/\s+/g, '-'),
    // Add common abbreviations
    aliases: getAbbreviations(subdiv._id),
    lastUpdated: new Date()
  }));

  await LocationIndex.insertMany(subdivDocs);
  console.log(`✅ Indexed ${subdivDocs.length} subdivisions`);

  console.log('✅ Location index built successfully!');
  process.exit(0);
}

function getAbbreviations(name) {
  const aliases = [];

  // Common patterns
  if (name.includes('Country Club')) {
    const abbrev = name.replace(/Country Club/gi, 'CC').trim();
    aliases.push(abbrev);
  }

  // Add more patterns as needed
  return aliases;
}

buildLocationIndex().catch(console.error);
```

**Run once**:
```bash
node scripts/build-location-index.js
```

### Phase 2: Update Chat Entity Recognition

1. Replace `loadEntitiesFromDatabase()` with `LocationIndex` lookups
2. Remove in-memory caching (not needed anymore)
3. Update tests

### Phase 3: Add Cron Job (Keep Index Fresh)

**File**: `scripts/update-location-index.js`

```javascript
// Run daily via Vercel Cron or VPS cron
// Updates listing counts, adds new locations

async function updateLocationIndex() {
  await dbConnect();

  // Update counts for existing locations
  const locations = await LocationIndex.find({});

  for (const location of locations) {
    const query = location.type === 'city'
      ? { city: location.name, standardStatus: "Active" }
      : { subdivisionName: location.name, standardStatus: "Active" };

    const count = await UnifiedListing.countDocuments(query);

    await LocationIndex.updateOne(
      { _id: location._id },
      {
        activeListingCount: count,
        lastUpdated: new Date()
      }
    );
  }

  console.log('✅ Location index updated');
}
```

**Add to `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-location-index",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Expected Performance After Optimization

### Before
```
🐌 Vacaville Query Timeline:
T+0ms:    User sends "show me homes in Vacaville"
T+100ms:  identifyEntityType() called
T+150ms:  DB: distinct("subdivisionName") starts
T+8000ms: DB: subdivisionName results (1600 items)
T+8100ms: DB: distinct("city") starts
T+15000ms: ❌ TIMEOUT (Vercel 15s limit)
```

### After
```
⚡ Vacaville Query Timeline:
T+0ms:    User sends "show me homes in Vacaville"
T+100ms:  identifyEntityType() called
T+110ms:  DB: LocationIndex.findOne({ normalizedName: "vacaville" })
T+135ms:  ✅ Found city: Vacaville (18 listings)
T+200ms:  Query UnifiedListing for stats
T+450ms:  ✅ Response sent to user
```

**Total time**: 15 seconds → **0.45 seconds** (33x faster!)

---

## Additional Optimizations

### 1. Add Autocomplete Support

**API**: `/api/locations/autocomplete?q=vacav`

```typescript
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');

  const results = await LocationIndex.find({
    $or: [
      { normalizedName: { $regex: `^${query}`, $options: 'i' } },
      { aliases: { $regex: `^${query}`, $options: 'i' } }
    ]
  })
  .sort({ listingCount: -1 })  // Popular first
  .limit(10)
  .select('name type listingCount latitude longitude')
  .lean();

  return Response.json(results);
}
```

**Response time**: <30ms (vs 10-15s currently)

### 2. Add Geographic Bounds Caching

```typescript
locationIndexSchema.add({
  bounds: {
    north: Number,
    south: Number,
    east: Number,
    west: Number
  }
});
```

**Benefit**: Instant map centering without calculating from listings

### 3. Add Synonym Support

```typescript
{
  name: "San Francisco",
  aliases: ["SF", "San Fran", "Frisco", "The City"]
}
```

**Benefit**: Better entity recognition accuracy

---

## Migration Checklist

- [ ] Create `src/models/LocationIndex.ts`
- [ ] Create `scripts/build-location-index.js`
- [ ] Run index build script once
- [ ] Update `src/lib/chat/utils/entity-recognition.ts`
- [ ] Test with Vacaville, PDCC, San Francisco
- [ ] Create `/api/locations/autocomplete` endpoint
- [ ] Add cron job to keep index fresh
- [ ] Update chat autocomplete to use new API
- [ ] Remove old `loadEntitiesFromDatabase()` function
- [ ] Monitor Vercel logs for performance improvements
- [ ] Document in README

---

## Success Metrics

**Before**:
- ❌ Vacaville: Timeout (15s+)
- ❌ Cold starts: 10-15s
- ❌ Cache misses: Full reload required

**After**:
- ✅ Vacaville: <500ms
- ✅ Cold starts: <500ms (no cache needed!)
- ✅ Cache misses: N/A (always fast)

---

**Created**: January 2, 2026
**Status**: Ready to implement
**Priority**: 🔥 **CRITICAL** (blocking production usage)
