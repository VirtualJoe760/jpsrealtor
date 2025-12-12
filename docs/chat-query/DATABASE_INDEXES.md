# Database Index Recommendations

**Phase 4 - Performance Optimization**

This document provides recommended MongoDB indexes to optimize query performance for the Chat Query System.

---

## Overview

Proper indexing is critical for query performance. The indexes below are optimized for common query patterns in our system.

---

## Recommended Indexes

### 1. Active Listings (`unified_listings`)

#### Location Indexes

```javascript
// City-based queries (most common)
db.unified_listings.createIndex({ city: 1, listPrice: 1 })
db.unified_listings.createIndex({ city: 1, propertyType: 1, listPrice: 1 })
db.unified_listings.createIndex({ city: 1, daysOnMarket: 1 })

// Subdivision-based queries
db.unified_listings.createIndex({ subdivisionName: 1, listPrice: 1 })
db.unified_listings.createIndex({ subdivisionName: 1, propertyType: 1 })

// ZIP code queries
db.unified_listings.createIndex({ zip: 1, listPrice: 1 })

// County queries
db.unified_listings.createIndex({ county: 1, listPrice: 1 })

// MLS source queries
db.unified_listings.createIndex({ mlsSource: 1, city: 1 })
```

#### Property Filter Indexes

```javascript
// Bedroom/bathroom queries
db.unified_listings.createIndex({ beds: 1, baths: 1, listPrice: 1 })
db.unified_listings.createIndex({ city: 1, beds: 1, listPrice: 1 })

// Price range queries (compound)
db.unified_listings.createIndex({ listPrice: 1, livingArea: 1 })
db.unified_listings.createIndex({ city: 1, listPrice: 1, beds: 1 })

// Square footage queries
db.unified_listings.createIndex({ livingArea: 1, listPrice: 1 })

// Year built queries
db.unified_listings.createIndex({ yearBuilt: 1, city: 1 })

// Property type/subtype
db.unified_listings.createIndex({ propertyType: 1, propertySubType: 1 })
db.unified_listings.createIndex({ propertySubType: 1, city: 1, listPrice: 1 })
```

#### Amenity Indexes

```javascript
// Pool/spa queries
db.unified_listings.createIndex({ hasPool: 1, city: 1, listPrice: 1 })
db.unified_listings.createIndex({ hasSpa: 1, city: 1 })

// View properties
db.unified_listings.createIndex({ hasView: 1, city: 1, listPrice: 1 })

// Gated communities
db.unified_listings.createIndex({ isGated: 1, city: 1 })

// Senior communities
db.unified_listings.createIndex({ isSenior: 1, city: 1 })

// Garage queries
db.unified_listings.createIndex({ garages: 1, city: 1 })
```

#### Time-based Indexes

```javascript
// Days on market (for trend analysis)
db.unified_listings.createIndex({ daysOnMarket: 1, city: 1 })
db.unified_listings.createIndex({ daysOnMarket: 1, listPrice: 1 })

// Listing date queries
db.unified_listings.createIndex({ listingDate: -1, city: 1 })
db.unified_listings.createIndex({ listingDate: -1 })

// Status queries
db.unified_listings.createIndex({ status: 1, city: 1, listingDate: -1 })
```

#### Geospatial Indexes

```javascript
// Radius-based searches (use 2dsphere for GeoJSON)
db.unified_listings.createIndex({ location: "2dsphere" })
```

---

### 2. Closed Listings (`unified_closed_listings`)

#### Historical Analysis Indexes

```javascript
// Close date (for time-series analysis)
db.unified_closed_listings.createIndex({ closeDate: -1, city: 1 })
db.unified_closed_listings.createIndex({ closeDate: -1 })

// City + close date (most common)
db.unified_closed_listings.createIndex({ city: 1, closeDate: -1, closePrice: 1 })

// Subdivision + close date
db.unified_closed_listings.createIndex({ subdivisionName: 1, closeDate: -1 })

// Price analysis
db.unified_closed_listings.createIndex({ closePrice: 1, closeDate: -1 })

// Property type analysis
db.unified_closed_listings.createIndex({ propertyType: 1, city: 1, closeDate: -1 })
```

#### Appreciation Analysis Indexes

```javascript
// Year-over-year comparisons
db.unified_closed_listings.createIndex({
  city: 1,
  propertySubType: 1,
  closeDate: -1
})

// Neighborhood appreciation
db.unified_closed_listings.createIndex({
  subdivisionName: 1,
  closeDate: -1,
  closePrice: 1
})

// Beds/baths comparison
db.unified_closed_listings.createIndex({
  beds: 1,
  baths: 1,
  city: 1,
  closeDate: -1
})
```

---

## Index Usage Guidelines

### 1. Query Patterns

MongoDB will use indexes most effectively when queries match the index prefix:

```javascript
// ✅ Will use index: { city: 1, listPrice: 1 }
{ city: "Orange", listPrice: { $lte: 800000 } }

// ✅ Will use index: { city: 1, listPrice: 1 } (prefix match)
{ city: "Orange" }

// ❌ Will NOT use index: { city: 1, listPrice: 1 }
{ listPrice: { $lte: 800000 } }
```

### 2. Compound Index Order

Order matters! Put equality filters first, then range filters:

```javascript
// ✅ Good order (equality → range)
{ city: 1, listPrice: 1, livingArea: 1 }

// ❌ Poor order (range → equality)
{ listPrice: 1, city: 1 }
```

### 3. Covered Queries

Include frequently requested fields in the index for "covered queries" (no document lookup needed):

```javascript
// Covered query (all fields in index)
db.unified_listings.createIndex({
  city: 1,
  listPrice: 1,
  beds: 1,
  baths: 1
})

// Query that can be satisfied entirely from index:
db.unified_listings.find(
  { city: "Orange", listPrice: { $lte: 800000 } },
  { city: 1, listPrice: 1, beds: 1, baths: 1, _id: 0 }
)
```

---

## Performance Monitoring

### Check Index Usage

```javascript
// Explain query to see index usage
db.unified_listings.find({ city: "Orange" }).explain("executionStats")

// Look for:
// - "IXSCAN" (index scan) ✅ Good
// - "COLLSCAN" (collection scan) ❌ Missing index
// - "totalDocsExamined" should be close to "nReturned"
```

### Monitor Slow Queries

```javascript
// Enable profiling (level 1 = slow queries only)
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()
```

---

## Index Maintenance

### Create All Indexes (Script)

```javascript
// unified_listings indexes
db.unified_listings.createIndex({ city: 1, listPrice: 1 })
db.unified_listings.createIndex({ city: 1, propertyType: 1, listPrice: 1 })
db.unified_listings.createIndex({ subdivisionName: 1, listPrice: 1 })
db.unified_listings.createIndex({ listPrice: 1, livingArea: 1 })
db.unified_listings.createIndex({ beds: 1, baths: 1, listPrice: 1 })
db.unified_listings.createIndex({ daysOnMarket: 1, city: 1 })
db.unified_listings.createIndex({ listingDate: -1, city: 1 })
db.unified_listings.createIndex({ location: "2dsphere" })

// unified_closed_listings indexes
db.unified_closed_listings.createIndex({ closeDate: -1, city: 1 })
db.unified_closed_listings.createIndex({ city: 1, closeDate: -1, closePrice: 1 })
db.unified_closed_listings.createIndex({ subdivisionName: 1, closeDate: -1 })
```

### Remove Unused Indexes

```javascript
// Find unused indexes
db.unified_listings.aggregate([{ $indexStats: {} }])

// Drop unused index
db.unified_listings.dropIndex("index_name")
```

---

## Expected Performance Improvements

### Before Indexes
- City query: ~2000ms (collection scan)
- Complex filter: ~5000ms
- Stats aggregation: ~3000ms

### After Indexes
- City query: **~50ms** (98% improvement)
- Complex filter: **~150ms** (97% improvement)
- Stats aggregation: **~200ms** (93% improvement)

---

## TTL Indexes (Auto-deletion)

### Closed Listings (Optional)

If you want to auto-delete old closed listings:

```javascript
// Delete listings older than 10 years
db.unified_closed_listings.createIndex(
  { closeDate: 1 },
  { expireAfterSeconds: 315360000 } // 10 years
)
```

---

## Conclusion

These indexes are optimized for the query patterns in our Chat Query System. Monitor performance and adjust as usage patterns evolve.

**Key Takeaways:**
1. Always index by location (city, subdivision, zip)
2. Compound indexes should match query patterns
3. Use geospatial indexes for radius searches
4. Monitor slow queries and adjust indexes accordingly
5. Keep index count reasonable (15-20 per collection max)

---

**Document Version**: 1.0
**Last Updated**: December 10, 2025
**Phase**: 4 (Performance Optimization)
