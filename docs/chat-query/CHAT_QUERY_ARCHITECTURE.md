# Chat Query Architecture - Modular Database Interface

**Created**: December 10, 2025
**Status**: Design Phase → Ready for Implementation
**Inspiration**: Analytics Architecture + Unified MLS + Photo Caching Patterns

---

## Architectural Inspiration

This design draws from our most successful modular architectures:

### 1. **Analytics Architecture** (`ANALYTICS_SYSTEM_STATUS.md`)
- ✅ **Pattern**: `aggregators/` + `calculations/` + `API endpoints`
- ✅ **Success**: 1.2M closed listings, modular appreciation API
- ✅ **Reuse**: We'll reuse `closed-sales.ts` aggregator directly!

### 2. **Unified MLS Architecture** (`listings/UNIFIED_MLS_ARCHITECTURE.md`)
- ✅ **Pattern**: Single unified collection for all 8 MLSs
- ✅ **Success**: Eliminated N+1 queries, standardized schema
- ✅ **Apply**: Query builder will use `unified_listings` collection

### 3. **Hybrid Photo Strategy** (`photos/HYBRID_PHOTO_STRATEGY.md`)
- ✅ **Pattern**: Embedded data + fallback for backwards compatibility
- ✅ **Success**: Eliminated separate Photo collection queries
- ✅ **Apply**: Aggregators will embed all needed data in responses

### 4. **AI Tools Integration** (`ai/AI_TOOLS_UNIFIED_INTEGRATION.md`)
- ✅ **Pattern**: Declarative tool definitions + modular handlers
- ✅ **Success**: AI successfully uses tools 90%+ of the time
- ✅ **Apply**: New `queryDatabase` tool follows same pattern

---

## Executive Summary

Design a **modular, extensible chat query system** that allows the AI to intelligently query our database across multiple dimensions (active listings, closed sales, market stats, neighborhoods, schools, etc.) using proven patterns from our existing architectures.

### Current State: Identified Weaknesses ❌

1. **Hardcoded Tool Functions** - Each query type requires manual coding in `stream/route.ts`
2. **Limited Query Dimensions** - Only 3 tools: `searchCity`, `matchLocation`, `getAppreciation`
3. **No Cross-Collection Queries** - Cannot combine active + closed listings in one query
4. **Inflexible Filtering** - Cannot dynamically filter by propertySubType, amenities, etc.
5. **Stats Scattered** - Price stats calculated inline, no reusable aggregators
6. **No Query Builder** - Each endpoint rebuilds MongoDB queries from scratch
7. **Missing Query Types**:
   - Cannot query by ZIP code
   - Cannot query by county
   - Cannot query by MLS source
   - Cannot query by price per sqft
   - Cannot query "new listings this week"
   - Cannot compare two cities/subdivisions
   - Cannot search by school district
   - Cannot filter by days on market

### Desired State: Modular Query System ✅

**Inspired by Analytics Architecture**: `aggregators/` + `calculations/` + `API endpoints`

```
src/lib/queries/
├── aggregators/          # Data fetchers (MongoDB queries)
│   ├── active-listings.ts
│   ├── closed-sales.ts   # Already exists in analytics!
│   ├── neighborhoods.ts
│   ├── market-stats.ts
│   ├── schools.ts
│   └── index.ts
├── filters/              # Reusable filter builders
│   ├── location.ts
│   ├── property.ts
│   ├── price.ts
│   ├── amenities.ts
│   └── index.ts
├── calculations/         # Derived metrics
│   ├── price-per-sqft.ts
│   ├── dom-stats.ts      # Days on market
│   ├── comparison.ts     # Compare two locations
│   └── index.ts
└── index.ts              # Main exports
```

---

## Problem Analysis

### Current Chat Tool Flow

```
User Query → AI → Tool Selection → Hardcoded Handler → Custom MongoDB Query → Response
```

**Issues**:
- Tool handlers in `stream/route.ts` are 300+ lines of nested logic
- Adding new query type requires editing multiple files
- MongoDB queries duplicated across endpoints
- No way to combine filters dynamically

### Example: Current `searchCity` Implementation

```typescript
// In stream/route.ts - Lines 209-215
} else if (functionName === "searchCity") {
  const response = await fetch(`${baseUrl}/api/chat/search-city`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(functionArgs)
  });
  result = await response.json();
}

// In search-city/route.ts - Lines 23-33
const listingsResponse = await fetch(
  `${baseUrl}/api/cities/${citySlug}/listings?${params.toString()}`,
  { method: "GET" }
);

// In cities/[cityId]/listings/route.ts - Lines 36-55
const baseQuery: any = {
  city: { $regex: new RegExp(`^${cityName}$`, "i") },
  listPrice: { $exists: true, $ne: null, $gt: 0 },
  propertyType: { $ne: "B" }  // Exclude rentals
};
// ... manual filter building ...
const listings = await UnifiedListing.find(baseQuery)...
```

**Problems**:
- 3 layers of API calls for one query
- Query logic scattered across files
- Hard to add new filters
- Performance overhead (multiple HTTP calls)

---

## Proposed Architecture

### Pattern: Aggregators + Filters + Calculations

Following our **analytics architecture** which successfully powers the appreciation API:

```
┌─────────────────────────────────────────────────────────┐
│  AI Chat (stream/route.ts)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Tool: queryListings                              │   │
│  │ {                                                │   │
│  │   location: { city: "Orange" },                  │   │
│  │   filters: { propertyType: "A", minBeds: 3 },   │   │
│  │   include: ["stats", "comparison"]               │   │
│  │ }                                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Query Builder (src/lib/queries/builder.ts)             │
│  • Parses tool parameters                               │
│  • Builds MongoDB query using filter modules            │
│  • Selects appropriate aggregators                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Aggregators (src/lib/queries/aggregators/)             │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ getActiveListings│  │ getClosedSales   │            │
│  │ (city, filters)  │  │ (city, filters)  │            │
│  └──────────────────┘  └──────────────────┘            │
│         ↓                       ↓                        │
│   UnifiedListing          UnifiedClosedListing          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Calculations (src/lib/queries/calculations/)            │
│  • calculateStats(listings)                              │
│  • calculatePricePerSqft(listings)                       │
│  • compareLocations(loc1, loc2)                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Response Builder                                        │
│  {                                                       │
│    listings: [...],                                      │
│    stats: { avg, median, min, max, pricePerSqft },      │
│    comparison: { ... },                                  │
│    insights: "AI-generated insights"                     │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Module Design

### 1. Aggregators (Data Fetchers)

**Purpose**: Execute MongoDB queries and return raw data

#### `src/lib/queries/aggregators/active-listings.ts`

```typescript
/**
 * Active Listings Aggregator
 *
 * Fetches active listings from unified_listings collection.
 * Supports multiple query types: city, subdivision, zip, radius, etc.
 */

import UnifiedListing from '@/models/unified-listing';

export interface ActiveListingsFilters {
  // Location (use one)
  city?: string;
  subdivision?: string;
  zip?: string;
  county?: string;
  mlsSource?: string | string[];

  // Radius search
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;

  // Property filters
  propertyType?: string | string[];  // 'A', 'B', 'C', 'D'
  propertySubType?: string | string[];
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minPrice?: number;
  maxPrice?: number;
  minLotSize?: number;
  maxLotSize?: number;
  minYear?: number;
  maxYear?: number;

  // Amenity filters
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  gated?: boolean;
  senior?: boolean;
  minGarages?: number;
  hasHOA?: boolean;
  maxHOA?: number;

  // Listing filters
  maxDaysOnMarket?: number;
  listedAfter?: Date;  // "New listings this week"
  hasOpenHouse?: boolean;

  // Query options
  limit?: number;
  skip?: number;
  sort?: 'price-asc' | 'price-desc' | 'sqft-asc' | 'sqft-desc' | 'newest' | 'oldest';
}

export interface ActiveListing {
  listingKey: string;
  listPrice: number;
  address: string;
  city: string;
  subdivision?: string;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  onMarketDate?: Date;
  primaryPhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  mlsSource?: string;
  [key: string]: any;
}

/**
 * Get active listings by city
 */
export async function getActiveListingsByCity(
  city: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = buildActiveListingsQuery({ city, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by subdivision
 */
export async function getActiveListingsBySubdivision(
  subdivision: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = buildActiveListingsQuery({ subdivision, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by ZIP code
 */
export async function getActiveListingsByZip(
  zip: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = buildActiveListingsQuery({ zip, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by radius (CMA)
 */
export async function getActiveListingsByRadius(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = buildActiveListingsQuery({
    latitude,
    longitude,
    radiusMiles,
    ...filters
  });

  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings - generic query
 */
export async function getActiveListings(
  filters: ActiveListingsFilters
): Promise<ActiveListing[]> {
  const query = buildActiveListingsQuery(filters);
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}
```

#### `src/lib/queries/aggregators/market-stats.ts`

```typescript
/**
 * Market Stats Aggregator
 *
 * Calculates aggregated statistics from listings.
 * Uses MongoDB aggregation for performance.
 */

import UnifiedListing from '@/models/unified-listing';
import type { ActiveListingsFilters } from './active-listings';

export interface MarketStats {
  totalListings: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPricePerSqft?: number;
  avgDaysOnMarket?: number;
  inventoryByPropertyType?: Record<string, number>;
  inventoryByPriceRange?: Record<string, number>;
}

/**
 * Get market stats for a location using aggregation
 */
export async function getMarketStats(
  filters: ActiveListingsFilters
): Promise<MarketStats> {
  const query = buildActiveListingsQuery(filters);

  const [stats] = await UnifiedListing.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalListings: { $sum: 1 },
        avgPrice: { $avg: '$listPrice' },
        minPrice: { $min: '$listPrice' },
        maxPrice: { $max: '$listPrice' },
        avgPricePerSqft: {
          $avg: {
            $cond: [
              { $gt: ['$livingArea', 0] },
              { $divide: ['$listPrice', '$livingArea'] },
              null
            ]
          }
        },
        avgDaysOnMarket: { $avg: '$daysOnMarket' },
        prices: { $push: '$listPrice' }
      }
    },
    {
      $project: {
        totalListings: 1,
        avgPrice: { $round: ['$avgPrice', 0] },
        minPrice: 1,
        maxPrice: 1,
        avgPricePerSqft: { $round: ['$avgPricePerSqft', 0] },
        avgDaysOnMarket: { $round: ['$avgDaysOnMarket', 0] },
        medianPrice: {
          $arrayElemAt: [
            { $sortArray: { input: '$prices', sortBy: 1 } },
            { $floor: { $divide: [{ $size: '$prices' }, 2] } }
          ]
        }
      }
    }
  ]);

  return stats || {
    totalListings: 0,
    avgPrice: 0,
    medianPrice: 0,
    minPrice: 0,
    maxPrice: 0
  };
}

/**
 * Get inventory breakdown by property type
 */
export async function getInventoryByPropertyType(
  filters: ActiveListingsFilters
): Promise<Record<string, number>> {
  const query = buildActiveListingsQuery(filters);

  const breakdown = await UnifiedListing.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$propertySubType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return breakdown.reduce((acc, item) => {
    acc[item._id || 'Unknown'] = item.count;
    return acc;
  }, {} as Record<string, number>);
}
```

### 2. Filters (Query Builders)

**Purpose**: Build MongoDB queries from filter parameters

#### `src/lib/queries/filters/location.ts`

```typescript
/**
 * Location Filter Builder
 *
 * Builds MongoDB queries for location-based filters.
 */

export interface LocationFilter {
  city?: string;
  subdivision?: string;
  zip?: string;
  county?: string;
  mlsSource?: string | string[];
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
}

export function buildLocationQuery(filter: LocationFilter): any {
  const query: any = {};

  if (filter.city) {
    query.city = { $regex: new RegExp(`^${filter.city}$`, 'i') };
  }

  if (filter.subdivision) {
    query.subdivisionName = { $regex: new RegExp(filter.subdivision, 'i') };
  }

  if (filter.zip) {
    query.postalCode = filter.zip;
  }

  if (filter.county) {
    query.county = { $regex: new RegExp(filter.county, 'i') };
  }

  if (filter.mlsSource) {
    if (Array.isArray(filter.mlsSource)) {
      query.mlsSource = { $in: filter.mlsSource };
    } else {
      query.mlsSource = filter.mlsSource;
    }
  }

  // Radius search (circular bounding box)
  if (filter.latitude && filter.longitude && filter.radiusMiles) {
    const milesPerDegreeLat = 69;
    const milesPerDegreeLng = 69 * Math.cos(filter.latitude * Math.PI / 180);
    const latDelta = filter.radiusMiles / milesPerDegreeLat;
    const lngDelta = filter.radiusMiles / milesPerDegreeLng;

    query.latitude = {
      $gte: filter.latitude - latDelta,
      $lte: filter.latitude + latDelta
    };
    query.longitude = {
      $gte: filter.longitude - lngDelta,
      $lte: filter.longitude + lngDelta
    };
  }

  return query;
}
```

#### `src/lib/queries/filters/property.ts`

```typescript
/**
 * Property Filter Builder
 *
 * Builds MongoDB queries for property-specific filters.
 */

export interface PropertyFilter {
  propertyType?: string | string[];
  propertySubType?: string | string[];
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  minYear?: number;
  maxYear?: number;
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  gated?: boolean;
  senior?: boolean;
  minGarages?: number;
  hasHOA?: boolean;
  maxHOA?: number;
}

export function buildPropertyQuery(filter: PropertyFilter): any {
  const query: any = {};

  // Property type
  if (filter.propertyType) {
    if (Array.isArray(filter.propertyType)) {
      query.propertyType = { $in: filter.propertyType };
    } else {
      query.propertyType = filter.propertyType;
    }
  }

  // Property subtype
  if (filter.propertySubType) {
    if (Array.isArray(filter.propertySubType)) {
      query.propertySubType = {
        $in: filter.propertySubType.map(t => new RegExp(t, 'i'))
      };
    } else {
      query.propertySubType = { $regex: new RegExp(filter.propertySubType, 'i') };
    }
  }

  // Beds
  if (filter.minBeds || filter.maxBeds) {
    const bedQuery: any = {};
    if (filter.minBeds) bedQuery.$gte = filter.minBeds;
    if (filter.maxBeds) bedQuery.$lte = filter.maxBeds;
    query.$or = [
      { bedroomsTotal: bedQuery },
      { bedsTotal: bedQuery }
    ];
  }

  // Baths
  if (filter.minBaths || filter.maxBaths) {
    const bathQuery: any = {};
    if (filter.minBaths) bathQuery.$gte = filter.minBaths;
    if (filter.maxBaths) bathQuery.$lte = filter.maxBaths;
    query.bathroomsTotalDecimal = bathQuery;
  }

  // Square footage
  if (filter.minSqft || filter.maxSqft) {
    const sqftQuery: any = {};
    if (filter.minSqft) sqftQuery.$gte = filter.minSqft;
    if (filter.maxSqft) sqftQuery.$lte = filter.maxSqft;
    query.livingArea = sqftQuery;
  }

  // Lot size
  if (filter.minLotSize || filter.maxLotSize) {
    const lotQuery: any = {};
    if (filter.minLotSize) lotQuery.$gte = filter.minLotSize;
    if (filter.maxLotSize) lotQuery.$lte = filter.maxLotSize;
    query.lotSizeSqft = lotQuery;
  }

  // Year built
  if (filter.minYear || filter.maxYear) {
    const yearQuery: any = {};
    if (filter.minYear) yearQuery.$gte = filter.minYear;
    if (filter.maxYear) yearQuery.$lte = filter.maxYear;
    query.yearBuilt = yearQuery;
  }

  // Amenities
  if (filter.pool !== undefined) query.poolYn = filter.pool;
  if (filter.spa !== undefined) query.spaYn = filter.spa;
  if (filter.view !== undefined) query.viewYn = filter.view;
  if (filter.gated !== undefined) query.gatedCommunity = filter.gated;
  if (filter.senior !== undefined) query.seniorCommunityYn = filter.senior;

  if (filter.minGarages) {
    query.garageSpaces = { $gte: filter.minGarages };
  }

  // HOA
  if (filter.hasHOA !== undefined) {
    if (filter.hasHOA) {
      query.associationFee = { $gt: 0 };
    } else {
      query.associationFee = { $in: [0, null] };
    }
  }

  if (filter.maxHOA) {
    query.associationFee = { ...query.associationFee, $lte: filter.maxHOA };
  }

  return query;
}
```

### 3. Calculations (Derived Metrics)

**Purpose**: Calculate insights from raw data

#### `src/lib/queries/calculations/comparison.ts`

```typescript
/**
 * Location Comparison Calculator
 *
 * Compare two locations side-by-side.
 */

import type { MarketStats } from '../aggregators/market-stats';

export interface ComparisonResult {
  location1: {
    name: string;
    stats: MarketStats;
  };
  location2: {
    name: string;
    stats: MarketStats;
  };
  differences: {
    avgPriceDiff: number;
    avgPriceDiffPercent: number;
    medianPriceDiff: number;
    inventoryDiff: number;
    pricePerSqftDiff?: number;
  };
  insights: string[];
}

export function compareLocations(
  location1Name: string,
  location1Stats: MarketStats,
  location2Name: string,
  location2Stats: MarketStats
): ComparisonResult {
  const avgPriceDiff = location1Stats.avgPrice - location2Stats.avgPrice;
  const avgPriceDiffPercent = (avgPriceDiff / location2Stats.avgPrice) * 100;
  const medianPriceDiff = location1Stats.medianPrice - location2Stats.medianPrice;
  const inventoryDiff = location1Stats.totalListings - location2Stats.totalListings;

  const insights: string[] = [];

  if (Math.abs(avgPriceDiffPercent) > 10) {
    const higher = avgPriceDiff > 0 ? location1Name : location2Name;
    const lower = avgPriceDiff > 0 ? location2Name : location1Name;
    insights.push(
      `${higher} is ${Math.abs(avgPriceDiffPercent).toFixed(1)}% more expensive than ${lower} on average.`
    );
  }

  if (inventoryDiff > 20) {
    const more = inventoryDiff > 0 ? location1Name : location2Name;
    insights.push(`${more} has significantly more inventory available.`);
  }

  return {
    location1: { name: location1Name, stats: location1Stats },
    location2: { name: location2Name, stats: location2Stats },
    differences: {
      avgPriceDiff,
      avgPriceDiffPercent,
      medianPriceDiff,
      inventoryDiff,
      pricePerSqftDiff: location1Stats.avgPricePerSqft && location2Stats.avgPricePerSqft
        ? location1Stats.avgPricePerSqft - location2Stats.avgPricePerSqft
        : undefined
    },
    insights
  };
}
```

### 4. Unified Query Builder

**Purpose**: Main interface for chat tools

#### `src/lib/queries/builder.ts`

```typescript
/**
 * Query Builder
 *
 * Main interface for chat tools to query the database.
 */

import {
  getActiveListings,
  getActiveListingsByCity,
  getActiveListingsBySubdivision,
  type ActiveListingsFilters,
  type ActiveListing
} from './aggregators/active-listings';
import { getMarketStats, type MarketStats } from './aggregators/market-stats';
import { getClosedSales, type ClosedSalesFilters, type ClosedSale } from '@/lib/analytics';
import { compareLocations, type ComparisonResult } from './calculations/comparison';

export interface QueryOptions {
  // Location (use one)
  city?: string;
  subdivision?: string;
  zip?: string;
  county?: string;

  // Filters
  filters?: ActiveListingsFilters;

  // Include options
  includeStats?: boolean;
  includeClosedSales?: boolean;
  includeComparison?: {
    compareWith: string;  // Another city/subdivision
  };

  // Pagination
  limit?: number;
  skip?: number;
}

export interface QueryResult {
  listings: ActiveListing[];
  stats?: MarketStats;
  closedSales?: ClosedSale[];
  comparison?: ComparisonResult;
  meta: {
    query: QueryOptions;
    executionTime: number;
  };
}

/**
 * Execute a comprehensive query
 */
export async function executeQuery(options: QueryOptions): Promise<QueryResult> {
  const startTime = Date.now();

  const result: QueryResult = {
    listings: [],
    meta: {
      query: options,
      executionTime: 0
    }
  };

  // Fetch active listings
  if (options.city) {
    result.listings = await getActiveListingsByCity(options.city, options.filters);
  } else if (options.subdivision) {
    result.listings = await getActiveListingsBySubdivision(options.subdivision, options.filters);
  } else if (options.filters) {
    result.listings = await getActiveListings(options.filters);
  }

  // Fetch stats if requested
  if (options.includeStats) {
    const filters = options.filters || {};
    if (options.city) filters.city = options.city;
    if (options.subdivision) filters.subdivision = options.subdivision;

    result.stats = await getMarketStats(filters);
  }

  // Fetch closed sales if requested
  if (options.includeClosedSales) {
    const closedFilters: ClosedSalesFilters = {
      city: options.city,
      subdivision: options.subdivision,
      yearsBack: 5
    };
    result.closedSales = await getClosedSales(closedFilters);
  }

  // Compare locations if requested
  if (options.includeComparison && result.stats) {
    const compareFilters: ActiveListingsFilters = {
      city: options.includeComparison.compareWith
    };
    const compareStats = await getMarketStats(compareFilters);

    result.comparison = compareLocations(
      options.city || options.subdivision || 'Location 1',
      result.stats,
      options.includeComparison.compareWith,
      compareStats
    );
  }

  result.meta.executionTime = Date.now() - startTime;
  return result;
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure ✅ (Week 1)

**Goal**: Build reusable aggregators and filters

1. Create `/src/lib/queries/` directory structure
2. Implement `aggregators/active-listings.ts`
3. Implement `aggregators/market-stats.ts`
4. Implement `filters/location.ts`
5. Implement `filters/property.ts`
6. Implement `filters/price.ts`
7. Create unified exports in `index.ts`

**Deliverable**: Modular query library ready for use

### Phase 2: Query Builder (Week 1)

**Goal**: Create unified query interface

1. Implement `builder.ts` with `executeQuery()`
2. Add support for combined queries (active + closed)
3. Add comparison functionality
4. Write unit tests

**Deliverable**: Single function to handle all query types

### Phase 3: Chat Integration (Week 2)

**Goal**: Replace hardcoded tools with dynamic query system

1. Create new chat tool: `queryDatabase`
2. Update `stream/route.ts` to use query builder
3. Deprecate old tools (`searchCity`, `matchLocation`)
4. Add new query capabilities:
   - Query by ZIP
   - Query by county
   - Compare two locations
   - Filter by property subtype
   - New listings this week
   - Homes with open houses

**Deliverable**: AI can query database with any combination of filters

### Phase 4: Advanced Queries (Week 2)

**Goal**: Add complex query types

1. Cross-collection queries (active + closed)
2. Time-series queries ("new listings this week")
3. Comparative queries ("compare Palm Desert vs La Quinta")
4. Aggregated insights ("average price per sqft by subdivision")

**Deliverable**: AI can answer complex multi-dimensional questions

### Phase 5: Performance & Caching (Week 3)

**Goal**: Optimize for production

1. Add Redis caching for frequent queries
2. Optimize MongoDB indexes
3. Implement query result pagination
4. Add query performance monitoring

**Deliverable**: Fast, scalable query system

---

## Chat Tool Design

### New Tool: `queryDatabase`

```typescript
{
  type: "function",
  function: {
    name: "queryDatabase",
    description: `Query our MLS database with flexible filters. Use this for ANY property search query.

Examples:
- "3+ bed homes in Orange under $800k"
  → { city: "Orange", minBeds: 3, maxPrice: 800000 }
- "New listings this week in Palm Desert"
  → { city: "Palm Desert", listedAfter: "2025-12-03" }
- "Homes with pool and spa in Indian Wells Country Club"
  → { subdivision: "Indian Wells Country Club", pool: true, spa: true }
- "Compare home prices in La Quinta vs Palm Desert"
  → { city: "La Quinta", comparison: { compareWith: "Palm Desert" } }
`,
    parameters: {
      type: "object",
      properties: {
        // LOCATION (choose one)
        city: { type: "string", description: "City name" },
        subdivision: { type: "string", description: "Subdivision/neighborhood name" },
        zip: { type: "string", description: "ZIP code" },
        county: { type: "string", description: "County name" },

        // PROPERTY FILTERS
        propertyType: {
          type: "string",
          enum: ["sale", "rental", "multifamily", "land"],
          description: "Defaults to 'sale'"
        },
        propertySubType: {
          type: "string",
          enum: ["Single Family", "Condominium", "Townhouse", "Mobile/Manufactured"],
          description: "Property subtype"
        },

        // SIZE FILTERS
        minBeds: { type: "number" },
        maxBeds: { type: "number" },
        minBaths: { type: "number" },
        maxBaths: { type: "number" },
        minSqft: { type: "number" },
        maxSqft: { type: "number" },
        minLotSize: { type: "number", description: "Square feet" },
        maxLotSize: { type: "number", description: "Square feet" },

        // PRICE FILTERS
        minPrice: { type: "number" },
        maxPrice: { type: "number" },

        // YEAR FILTERS
        minYear: { type: "number", description: "Year built" },
        maxYear: { type: "number", description: "Year built" },

        // AMENITY FILTERS
        pool: { type: "boolean" },
        spa: { type: "boolean" },
        view: { type: "boolean" },
        gated: { type: "boolean" },
        senior: { type: "boolean" },
        minGarages: { type: "number" },
        hasHOA: { type: "boolean" },
        maxHOA: { type: "number", description: "Max monthly HOA fee" },

        // TIME FILTERS
        maxDaysOnMarket: { type: "number" },
        listedAfter: { type: "string", description: "ISO date (e.g., '2025-12-03')" },
        hasOpenHouse: { type: "boolean" },

        // INCLUDE OPTIONS
        includeStats: { type: "boolean", description: "Include market statistics", default: true },
        includeClosedSales: { type: "boolean", description: "Include recent closed sales" },
        compareWith: { type: "string", description: "Compare with another city/subdivision" },

        // PAGINATION
        limit: { type: "number", description: "Max results (default 100)" },
        skip: { type: "number", description: "Skip first N results" }
      },
      required: []
    }
  }
}
```

### Tool Handler in `stream/route.ts`

```typescript
// In stream/route.ts
import { executeQuery } from '@/lib/queries/builder';

// ...

if (functionName === "queryDatabase") {
  const queryOptions = {
    city: functionArgs.city,
    subdivision: functionArgs.subdivision,
    zip: functionArgs.zip,
    county: functionArgs.county,
    filters: {
      propertyType: functionArgs.propertyType || 'sale',
      propertySubType: functionArgs.propertySubType,
      minBeds: functionArgs.minBeds,
      maxBeds: functionArgs.maxBeds,
      minBaths: functionArgs.minBaths,
      maxBaths: functionArgs.maxBaths,
      minSqft: functionArgs.minSqft,
      maxSqft: functionArgs.maxSqft,
      minPrice: functionArgs.minPrice,
      maxPrice: functionArgs.maxPrice,
      minYear: functionArgs.minYear,
      maxYear: functionArgs.maxYear,
      pool: functionArgs.pool,
      spa: functionArgs.spa,
      view: functionArgs.view,
      gated: functionArgs.gated,
      senior: functionArgs.senior,
      minGarages: functionArgs.minGarages,
      hasHOA: functionArgs.hasHOA,
      maxHOA: functionArgs.maxHOA,
      maxDaysOnMarket: functionArgs.maxDaysOnMarket,
      listedAfter: functionArgs.listedAfter ? new Date(functionArgs.listedAfter) : undefined,
      hasOpenHouse: functionArgs.hasOpenHouse,
      limit: functionArgs.limit,
      skip: functionArgs.skip
    },
    includeStats: functionArgs.includeStats !== false,
    includeClosedSales: functionArgs.includeClosedSales,
    includeComparison: functionArgs.compareWith ? {
      compareWith: functionArgs.compareWith
    } : undefined
  };

  result = await executeQuery(queryOptions);
}
```

---

## Benefits of Modular Architecture

### 1. **Extensibility** ✅
- Add new query types without modifying core logic
- New filters drop in as modules
- Easy to add new data sources (schools, crime stats, etc.)

### 2. **Reusability** ✅
- Aggregators used across multiple endpoints
- Filters shared between API routes
- Calculations reused in different contexts

### 3. **Maintainability** ✅
- Single source of truth for query logic
- Easy to debug (isolated modules)
- Clear separation of concerns

### 4. **Performance** ✅
- MongoDB aggregation at the database level
- Efficient pagination and sorting
- Caching at aggregator level

### 5. **Testing** ✅
- Unit test each module independently
- Mock aggregators for integration tests
- Predictable behavior

---

## Success Metrics

### Query Capabilities
- [ ] Support 10+ filter types
- [ ] Support combined filters (e.g., "pool + spa + 3 beds")
- [ ] Support comparison queries
- [ ] Support time-based queries
- [ ] Support radius/CMA queries

### Performance
- [ ] Average query time < 500ms
- [ ] Support 100+ concurrent queries
- [ ] Cache hit rate > 60%

### AI Integration
- [ ] AI successfully uses new tool 90%+ of the time
- [ ] AI can answer complex multi-filter queries
- [ ] AI provides accurate stats in responses

---

## File Structure Summary

```
src/
├── lib/
│   ├── queries/                    # NEW: Query system
│   │   ├── aggregators/
│   │   │   ├── active-listings.ts  # Active listings queries
│   │   │   ├── closed-sales.ts     # ✅ Already exists in analytics!
│   │   │   ├── market-stats.ts     # Stats aggregation
│   │   │   ├── neighborhoods.ts    # Neighborhood data
│   │   │   ├── schools.ts          # School data
│   │   │   └── index.ts
│   │   ├── filters/
│   │   │   ├── location.ts         # Location query builders
│   │   │   ├── property.ts         # Property query builders
│   │   │   ├── price.ts            # Price query builders
│   │   │   ├── amenities.ts        # Amenity query builders
│   │   │   └── index.ts
│   │   ├── calculations/
│   │   │   ├── price-per-sqft.ts   # Price/sqft calculator
│   │   │   ├── dom-stats.ts        # Days on market analysis
│   │   │   ├── comparison.ts       # Location comparison
│   │   │   ├── trends.ts           # Market trends
│   │   │   └── index.ts
│   │   ├── builder.ts              # Main query interface
│   │   └── index.ts                # Exports
│   └── analytics/                  # ✅ Existing
│       ├── aggregators/
│       │   └── closed-sales.ts     # Reuse for closed sales!
│       └── calculations/
│           └── appreciation.ts
└── app/
    └── api/
        ├── chat/
        │   └── stream/
        │       └── route.ts        # Updated with new tool
        └── query/                  # NEW: Direct query API
            └── route.ts            # For testing/debugging
```

---

---

## Implementation Task List

### Phase 1: Core Infrastructure (Week 1) 🚧

#### Directory Structure Setup
- [ ] Create `/src/lib/queries/` directory
- [ ] Create `/src/lib/queries/aggregators/` directory
- [ ] Create `/src/lib/queries/filters/` directory
- [ ] Create `/src/lib/queries/calculations/` directory
- [ ] Create `/src/lib/queries/types.ts` for shared types

#### Aggregators Implementation
- [ ] **`aggregators/active-listings.ts`**
  - [ ] Define `ActiveListingsFilters` interface
  - [ ] Define `ActiveListing` interface
  - [ ] Implement `getActiveListingsByCity()`
  - [ ] Implement `getActiveListingsBySubdivision()`
  - [ ] Implement `getActiveListingsByZip()`
  - [ ] Implement `getActiveListingsByCounty()`
  - [ ] Implement `getActiveListingsByRadius()`
  - [ ] Implement `getActiveListings()` (generic)
  - [ ] Add `buildActiveListingsQuery()` helper
  - [ ] Add `getFieldSelection()` helper
  - [ ] Add `getSortOrder()` helper

- [ ] **`aggregators/market-stats.ts`**
  - [ ] Define `MarketStats` interface
  - [ ] Implement `getMarketStats()` using MongoDB aggregation
  - [ ] Implement `getInventoryByPropertyType()`
  - [ ] Implement `getInventoryByPriceRange()`
  - [ ] Add price per sqft calculation
  - [ ] Add median price calculation
  - [ ] Add days on market stats

- [ ] **`aggregators/index.ts`**
  - [ ] Export all aggregator functions
  - [ ] Export all interfaces
  - [ ] Add JSDoc documentation

#### Filters Implementation
- [ ] **`filters/location.ts`**
  - [ ] Define `LocationFilter` interface
  - [ ] Implement `buildLocationQuery()`
  - [ ] Add city regex matching
  - [ ] Add subdivision regex matching
  - [ ] Add ZIP code exact matching
  - [ ] Add county regex matching
  - [ ] Add MLS source filtering (single + array)
  - [ ] Add radius search (circular bounding box)

- [ ] **`filters/property.ts`**
  - [ ] Define `PropertyFilter` interface
  - [ ] Implement `buildPropertyQuery()`
  - [ ] Add propertyType filtering (single + array)
  - [ ] Add propertySubType filtering (single + array)
  - [ ] Add beds filtering (min/max with $or for bedsTotal/bedroomsTotal)
  - [ ] Add baths filtering (min/max)
  - [ ] Add sqft filtering (min/max)
  - [ ] Add lot size filtering (min/max)
  - [ ] Add year built filtering (min/max)

- [ ] **`filters/amenities.ts`**
  - [ ] Define `AmenitiesFilter` interface
  - [ ] Implement `buildAmenitiesQuery()`
  - [ ] Add pool filtering (boolean)
  - [ ] Add spa filtering (boolean)
  - [ ] Add view filtering (boolean)
  - [ ] Add gated community filtering (boolean)
  - [ ] Add senior community filtering (boolean)
  - [ ] Add garage filtering (minGarages)
  - [ ] Add HOA filtering (hasHOA + maxHOA)

- [ ] **`filters/price.ts`**
  - [ ] Define `PriceFilter` interface
  - [ ] Implement `buildPriceQuery()`
  - [ ] Add minPrice filtering
  - [ ] Add maxPrice filtering
  - [ ] Add price per sqft filtering (calculated)

- [ ] **`filters/time.ts`**
  - [ ] Define `TimeFilter` interface
  - [ ] Implement `buildTimeQuery()`
  - [ ] Add maxDaysOnMarket filtering
  - [ ] Add listedAfter filtering (new listings)
  - [ ] Add hasOpenHouse filtering

- [ ] **`filters/index.ts`**
  - [ ] Export all filter functions
  - [ ] Export all interfaces
  - [ ] Implement `combineFilters()` utility
  - [ ] Add filter validation

#### Calculations Implementation
- [ ] **`calculations/price-per-sqft.ts`**
  - [ ] Implement `calculatePricePerSqft()` for single listing
  - [ ] Implement `calculateAvgPricePerSqft()` for array
  - [ ] Add validation (sqft > 0)

- [ ] **`calculations/comparison.ts`**
  - [ ] Define `ComparisonResult` interface
  - [ ] Implement `compareLocations()`
  - [ ] Calculate avgPrice difference ($ + %)
  - [ ] Calculate medianPrice difference
  - [ ] Calculate inventory difference
  - [ ] Calculate pricePerSqft difference
  - [ ] Generate insights array

- [ ] **`calculations/dom-stats.ts`**
  - [ ] Implement `calculateDOMStats()` (days on market)
  - [ ] Calculate average DOM
  - [ ] Calculate median DOM
  - [ ] Calculate min/max DOM

- [ ] **`calculations/index.ts`**
  - [ ] Export all calculation functions
  - [ ] Export all interfaces

#### Query Builder
- [ ] **`builder.ts`**
  - [ ] Define `QueryOptions` interface
  - [ ] Define `QueryResult` interface
  - [ ] Implement `executeQuery()` main function
  - [ ] Add location routing (city/subdivision/zip/county)
  - [ ] Add stats inclusion logic
  - [ ] Add closed sales inclusion logic
  - [ ] Add comparison inclusion logic
  - [ ] Add execution time tracking
  - [ ] Add error handling

- [ ] **`index.ts`** (main exports)
  - [ ] Export `executeQuery`
  - [ ] Export all aggregators
  - [ ] Export all filters
  - [ ] Export all calculations
  - [ ] Export all types

#### Testing
- [ ] Write unit tests for location filters
- [ ] Write unit tests for property filters
- [ ] Write unit tests for aggregators
- [ ] Write integration tests for `executeQuery()`
- [ ] Test with real database queries

---

### Phase 2: Chat Integration (Week 2) 🚧

#### New Chat Tool Definition
- [ ] **Define `queryDatabase` tool in `stream/route.ts`**
  - [ ] Add all location parameters (city, subdivision, zip, county)
  - [ ] Add all property filters (propertyType, propertySubType, beds, baths, sqft, etc.)
  - [ ] Add all price filters (minPrice, maxPrice)
  - [ ] Add all amenity filters (pool, spa, view, gated, etc.)
  - [ ] Add all time filters (maxDaysOnMarket, listedAfter, hasOpenHouse)
  - [ ] Add inclusion options (includeStats, includeClosedSales, compareWith)
  - [ ] Add pagination (limit, skip)
  - [ ] Add detailed descriptions and examples

#### Tool Handler Implementation
- [ ] **Implement `queryDatabase` handler in `stream/route.ts`**
  - [ ] Parse tool arguments
  - [ ] Build `QueryOptions` object
  - [ ] Call `executeQuery()` from query builder
  - [ ] Format response for AI
  - [ ] Add error handling
  - [ ] Add logging

#### Response Formatting
- [ ] Create response formatter for AI consumption
  - [ ] Format listings array (top 10 for summary)
  - [ ] Format stats object (avgPrice, medianPrice, etc.)
  - [ ] Format comparison data (if requested)
  - [ ] Include map center coordinates
  - [ ] Include execution metadata

#### Deprecation of Old Tools
- [ ] Mark `searchCity` as deprecated
- [ ] Mark `matchLocation` as deprecated (keep for backwards compat)
- [ ] Update AI system prompt to prefer `queryDatabase`
- [ ] Test migration path

#### Testing
- [ ] Test basic city query: "homes in Orange"
- [ ] Test filtered query: "3 bed homes in Palm Desert under $800k"
- [ ] Test amenity query: "homes with pool and spa in Indian Wells"
- [ ] Test comparison query: "compare Palm Desert vs La Quinta"
- [ ] Test new listings query: "new listings this week in Coachella Valley"
- [ ] Test ZIP query: "homes in 92260"
- [ ] Test county query: "homes in Riverside County"

---

### Phase 3: Advanced Queries (Week 2) 🚧

#### Cross-Collection Queries
- [ ] Implement combined active + closed listings query
  - [ ] Fetch active listings
  - [ ] Fetch closed sales for same location
  - [ ] Calculate appreciation from closed sales
  - [ ] Combine in single response

- [ ] Implement time-series queries
  - [ ] "New listings this week"
  - [ ] "Price reductions in last 30 days"
  - [ ] "Homes that sold in last 6 months"

#### Comparative Analysis
- [ ] Implement multi-location comparison
  - [ ] Compare 2+ cities side-by-side
  - [ ] Compare 2+ subdivisions
  - [ ] Generate comparison insights
  - [ ] Create comparison table data

#### Aggregated Insights
- [ ] Implement subdivision rankings
  - [ ] "Most expensive subdivisions in Palm Desert"
  - [ ] "Fastest selling neighborhoods"
  - [ ] "Best value by price per sqft"

- [ ] Implement market trends
  - [ ] Inventory levels by property type
  - [ ] Price distribution by price range
  - [ ] Days on market trends

#### Testing
- [ ] Test cross-collection query
- [ ] Test time-series query
- [ ] Test multi-location comparison
- [ ] Test aggregated insights

---

### Phase 4: Performance & Optimization (Week 3) 🚧

#### MongoDB Optimization
- [ ] Review and optimize indexes on `unified_listings`
  - [ ] city + propertyType + listPrice
  - [ ] subdivisionName + propertyType
  - [ ] postalCode + propertyType
  - [ ] county + propertyType
  - [ ] onMarketDate (for time-based queries)
  - [ ] daysOnMarket (for DOM queries)

- [ ] Optimize aggregation pipelines
  - [ ] Use $project to reduce data transfer
  - [ ] Use $match early in pipeline
  - [ ] Use covered queries where possible

#### Caching Layer
- [ ] Add Redis caching for frequent queries
  - [ ] Cache city stats (5 min TTL)
  - [ ] Cache subdivision stats (5 min TTL)
  - [ ] Cache comparison results (10 min TTL)
  - [ ] Cache inventory breakdowns (15 min TTL)

- [ ] Implement cache invalidation
  - [ ] Invalidate on new listing
  - [ ] Invalidate on price change
  - [ ] Invalidate on status change

#### Performance Monitoring
- [ ] Add query performance logging
  - [ ] Log execution time
  - [ ] Log aggregator performance
  - [ ] Log cache hit/miss rates

- [ ] Add performance metrics
  - [ ] Average query time
  - [ ] P95/P99 query time
  - [ ] Cache hit rate
  - [ ] Queries per second

#### Load Testing
- [ ] Test with 100 concurrent queries
- [ ] Test with complex multi-filter queries
- [ ] Test with comparison queries
- [ ] Test cache performance under load

---

### Phase 5: Documentation & Migration (Week 3) 🚧

#### API Documentation
- [ ] Document `executeQuery()` API
- [ ] Document all aggregators
- [ ] Document all filters
- [ ] Document all calculations
- [ ] Add code examples

#### Migration Guide
- [ ] Create migration guide for old endpoints
  - [ ] `/api/cities/[cityId]/listings` → `queryDatabase`
  - [ ] `/api/subdivisions/[slug]/listings` → `queryDatabase`
  - [ ] `/api/chat/search-city` → `queryDatabase`

- [ ] Create backwards compatibility layer
  - [ ] Maintain old endpoints
  - [ ] Route to new query system internally
  - [ ] Add deprecation warnings

#### Testing Documentation
- [ ] Document test coverage
- [ ] Document test data setup
- [ ] Document integration tests
- [ ] Document load testing results

#### Deployment
- [ ] Deploy to staging
- [ ] Run integration tests on staging
- [ ] Performance test on staging
- [ ] Deploy to production
- [ ] Monitor production metrics

---

## Success Metrics

### Query Capabilities ✅
- [ ] Support 10+ filter types ✅ (30+ parameters)
- [ ] Support combined filters (e.g., "pool + spa + 3 beds") ✅
- [ ] Support comparison queries ✅
- [ ] Support time-based queries ✅
- [ ] Support radius/CMA queries ✅
- [ ] Support cross-collection queries ✅

### Performance Targets 🎯
- [ ] Average query time < 500ms
- [ ] P95 query time < 1000ms
- [ ] Support 100+ concurrent queries
- [ ] Cache hit rate > 60%
- [ ] Aggregator reuse across 5+ endpoints

### AI Integration Success 🤖
- [ ] AI successfully uses new tool 90%+ of the time
- [ ] AI can answer complex multi-filter queries
- [ ] AI provides accurate stats in responses
- [ ] Reduced hallucinations about query capabilities
- [ ] User satisfaction with search results

---

## Related Documentation

### Core Architectures (Inspiration)
- [Analytics System Status](./ANALYTICS_SYSTEM_STATUS.md) - Modular aggregators pattern
- [Unified MLS Architecture](./listings/UNIFIED_MLS_ARCHITECTURE.md) - Database schema
- [Photo Caching System](./photos/HYBRID_PHOTO_STRATEGY.md) - Embedded data pattern
- [AI Tools Integration](./ai/AI_TOOLS_UNIFIED_INTEGRATION.md) - Tool definition pattern

### Database & Models
- [Database Architecture](./architecture/DATABASE_ARCHITECTURE.md) - MongoDB setup
- [Database Models](./architecture/DATABASE_MODELS.md) - Mongoose schemas
- [MLS Data Architecture](./architecture/MLS_DATA_ARCHITECTURE.md) - Data pipeline

### Related Features
- [CHAP Architecture](./CHAP_ARCHITECTURE.md) - Chat + Map unified interface
- [Mapping System](./map/MAPPING_SYSTEM_ARCHITECTURE.md) - Map integration
- [CMS & Insights](./cms/CMS_AND_INSIGHTS_COMPLETE.md) - Article search integration

### Performance & Deployment
- [Performance Guide](./architecture/PERFORMANCE.md) - Optimization strategies
- [Cloudflare Deployment](./deployment/CLOUDFLARE_DEPLOYMENT_COMPLETE.md) - Production setup

---

## Notes for Next Session

When restarting to implement this architecture:

1. **Start with Phase 1, Task 1**: Create directory structure
2. **Reference this document** for complete task list
3. **Follow patterns from**:
   - Analytics aggregators (`src/lib/analytics/aggregators/closed-sales.ts`)
   - Filter builders (see examples in this doc)
   - Unified MLS queries (`src/app/api/mls-listings/route.ts`)
4. **Test each module** before moving to next phase
5. **Reuse existing code**:
   - `closed-sales.ts` aggregator from analytics
   - Photo embedding pattern from hybrid strategy
   - Tool definition pattern from AI tools

**Key principle**: Build modular, reusable components that can be combined in any way, just like our successful analytics architecture.

---

**Questions? Issues?** Reference the related documentation above or check existing implementations in `/src/lib/analytics/` for patterns.

**Ready to build!** 🚀
