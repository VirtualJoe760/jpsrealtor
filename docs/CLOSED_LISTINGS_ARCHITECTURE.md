# Closed Listings & Sales History Architecture

**Purpose**: Unified system for tracking sold properties with complete sales history, enabling accurate appreciation analysis and market trend calculations.

**Last Updated**: December 8, 2025
**Status**: Architecture Design

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Problems to Solve](#problems-to-solve)
3. [Proposed Architecture](#proposed-architecture)
4. [Data Models](#data-models)
5. [Migration Strategy](#migration-strategy)
6. [Sync Script Updates](#sync-script-updates)
7. [Implementation Plan](#implementation-plan)

---

## Current State Analysis

### Existing Collections

**GPS Closed Listings** (`gps-closed-listings`)
- Separate collection for GPS MLS closed sales
- Has `closePrice` and `closeDate`
- Single sale per document
- No historical sales tracking

**CRMLS Closed Listings** (`crmls-closed-listings`)
- Separate collection for CRMLS closed sales
- Has `closePrice` and `closeDate`
- Single sale per document
- No historical sales tracking

**Unified Listing** (`unified-listing`)
- Active listings only
- No closed/sold status handling
- Missing: Status transition tracking

### Key Issues

1. **Fragmented Data**: Closed sales split across GPS and CRMLS collections
2. **No Sales History**: Can't track properties that sold multiple times
3. **No Status Transitions**: Don't track when active → pending → closed
4. **No Unified Structure**: Different schemas for GPS vs CRMLS closed
5. **Missing Analytics Data**: Need chronological sales for appreciation

---

## Problems to Solve

### Problem 1: Multiple Sales Per Property
**Scenario**: Property at "123 Main St" sold in:
- 2020 for $450k
- 2022 for $520k
- 2024 for $615k

**Current Issue**: We might only have the most recent sale

**Need**: Track ALL sales chronologically to:
- Calculate accurate appreciation between sales
- Understand flip frequency
- Detect market trends
- Generate complete property history

### Problem 2: Status Transitions
**Lifecycle**: Active → Pending → Closed → Off Market

**Current Issue**: Don't track when listings change status

**Need**:
- Detect when active listing becomes pending
- Capture when pending becomes closed
- Move closed listings to closed collection
- Keep active collection clean

### Problem 3: Unified Structure
**Current Issue**: Separate GPS and CRMLS closed collections

**Need**: Single unified closed listings collection
- Consistent schema
- Easy querying for analytics
- MLS source tracking
- Deduplicated data

### Problem 4: Data Integrity
**Challenges**:
- Same property might appear in both GPS and CRMLS
- Need to detect duplicates
- Must maintain data quality
- Validate close prices and dates

---

## Proposed Architecture

### New Collections

```
┌─────────────────────────────────────────────────────────┐
│          UnifiedListing (Active Listings)                │
│  Current inventory, standardStatus = "Active"            │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Status changes to Closed/Sold
                         ▼
┌─────────────────────────────────────────────────────────┐
│      UnifiedClosedListing (All Closed Sales)             │
│  Single document per sale event                          │
│  Includes: closePrice, closeDate, daysOnMarket          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Group by address
                         ▼
┌─────────────────────────────────────────────────────────┐
│      PropertySalesHistory (Multiple Sales)               │
│  One document per unique property                        │
│  Array of all sales chronologically                      │
│  Used for: Appreciation, flip analysis, trends          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
MLS API Update
    │
    ▼
┌─────────────────────────────────────────┐
│   Sync Script Detects Status Change     │
│   standardStatus: Active → Closed       │
└─────────────────────────────────────────┘
    │
    ├──► Create UnifiedClosedListing document
    │    - Copy all listing data
    │    - Add closePrice, closeDate
    │    - Add mlsSource, listingKey
    │
    ├──► Update PropertySalesHistory
    │    - Find by address or create new
    │    - Append sale to chronological array
    │    - Update appreciation metrics
    │
    └──► Remove from UnifiedListing (optional)
         - Keep active collection clean
         - Or update status to "Closed"
```

---

## Data Models

### 1. UnifiedClosedListing

**Purpose**: Single record for each individual sale event

**Collection**: `unified-closed-listings`

```typescript
interface IUnifiedClosedListing extends Document {
  // Identifiers
  _id: ObjectId;
  listingId: string;           // Original MLS listing ID
  listingKey: string;          // Unique MLS key
  mlsSource: 'GPS' | 'CRMLS';  // Which MLS
  slug: string;                // URL slug

  // Address (for linking to sales history)
  address: string;             // Full address
  unparsedAddress: string;     // Raw address
  streetNumber: string;
  streetName: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;

  // Geolocation
  latitude: number;
  longitude: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  // Sale Information
  closePrice: number;          // ⭐ Actual sale price
  closeDate: Date;             // ⭐ Date sold
  originalListPrice: number;   // Initial asking price
  listPrice: number;           // Final listing price (before sale)
  daysOnMarket: number;        // Time from listing to sale

  // Property Details
  propertyType: 'A' | 'B' | 'C' | 'D';
  propertySubType: string;
  bedsTotal: number;
  bedroomsTotal: number;
  bathroomsTotalInteger: number;
  bathroomsFull: number;
  bathroomsHalf: number;
  livingArea: number;          // Square footage
  lotSizeArea: number;
  lotSizeSqft: number;
  yearBuilt: number;

  // Location Context
  subdivisionName: string;
  countyOrParish: string;
  mlsAreaMajor: string;

  // Features
  poolYn: boolean;
  spaYn: boolean;
  viewYn: boolean;
  associationYN: boolean;
  associationFee: number;

  // Metadata
  standardStatus: string;      // "Closed", "Sold"
  statusChangeTimestamp: Date; // When it changed to closed
  modificationTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;

  // Data Quality
  isDuplicate: boolean;        // Flagged as potential duplicate
  duplicateOf: ObjectId;       // Reference to primary record
  dataQualityScore: number;    // 0-100 confidence score
}
```

### 2. PropertySalesHistory

**Purpose**: Chronological record of ALL sales for a single property

**Collection**: `property-sales-history`

```typescript
interface IPropertySalesHistory extends Document {
  // Identifiers
  _id: ObjectId;
  address: string;             // Canonical address (normalized)
  addressVariations: string[]; // Different address formats

  // Geolocation (consistent across sales)
  latitude: number;
  longitude: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  // Property Characteristics (from most recent)
  propertyType: 'A' | 'B' | 'C' | 'D';
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  subdivisionName: string;
  city: string;
  postalCode: string;

  // Sales History (chronological array)
  sales: Array<{
    saleId: ObjectId;          // Reference to UnifiedClosedListing
    closePrice: number;
    closeDate: Date;
    daysOnMarket: number;
    listPrice: number;
    mlsSource: 'GPS' | 'CRMLS';
    listingKey: string;

    // Calculated fields
    pricePerSqft: number;
    appreciationFromPrevious: number;  // % change from last sale
    yearsSincePrevious: number;
    annualizedAppreciation: number;    // % per year since last sale
  }>;

  // Aggregated Metrics
  totalSales: number;          // Count of sales
  firstSaleDate: Date;
  lastSaleDate: Date;
  firstSalePrice: number;
  lastSalePrice: number;

  // Calculated Appreciation
  overallAppreciation: number; // Total % from first to last
  cagr: number;                // Compound annual growth rate
  avgDaysBetweenSales: number;
  avgAppreciationPerSale: number;

  // Property Classification
  isFlip: boolean;             // Sold within 2 years
  flipCount: number;           // Times flipped

  // Metadata
  lastUpdated: Date;
  dataQualityScore: number;
}
```

### 3. Address Normalization Table

**Purpose**: Map address variations to canonical form

**Collection**: `address-canonical`

```typescript
interface IAddressCanonical extends Document {
  canonicalAddress: string;    // "123 Main Street, Palm Desert, CA 92260"
  variations: Array<{
    address: string;           // "123 Main St, Palm Desert"
    source: string;            // "GPS", "CRMLS"
    confidence: number;        // Match confidence
  }>;

  latitude: number;
  longitude: number;

  // Links
  propertyHistoryId: ObjectId; // Reference to PropertySalesHistory

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Migration Strategy

### Phase 1: Create New Models
1. Define `UnifiedClosedListing` schema
2. Define `PropertySalesHistory` schema
3. Define `AddressCanonical` schema
4. Add indexes for performance

### Phase 2: Migrate Existing Data
1. **Audit existing collections**
   ```bash
   db.gps_closed_listings.count()
   db.crmls_closed_listings.count()
   ```

2. **Extract and transform**
   - Read from `gps-closed-listings`
   - Read from `crmls-closed-listings`
   - Normalize addresses
   - Detect duplicates
   - Transform to `UnifiedClosedListing` schema

3. **Group by property**
   - Group sales by normalized address
   - Sort chronologically
   - Calculate appreciation between sales
   - Create `PropertySalesHistory` documents

4. **Validate**
   - Check all sales migrated
   - Verify calculations
   - Test data quality

### Phase 3: Update Sync Scripts
1. Add status change detection
2. Implement closed listing creation
3. Update property sales history
4. Add duplicate detection

### Phase 4: Cleanup (Optional)
1. Archive old GPS/CRMLS closed collections
2. Remove from active use
3. Update all queries to use new collections

---

## Sync Script Updates

### Current Flow
```
MLS API → Fetch Listings → Save to GPS/CRMLS collections
```

### New Flow
```
MLS API
  │
  ▼
Fetch Listings
  │
  ├──► Active Listings → UnifiedListing
  │
  └──► Status = Closed/Sold
        │
        ├──► Create UnifiedClosedListing
        │
        └──► Update PropertySalesHistory
             │
             ├──► Find existing by address
             │
             ├──► Append new sale
             │
             └──► Recalculate metrics
```

### Status Detection Logic

```typescript
// Pseudo-code for sync script
async function handleListingUpdate(mlsListing: any) {
  const previousListing = await UnifiedListing.findOne({
    listingKey: mlsListing.ListingKey
  });

  const currentStatus = mlsListing.StandardStatus;
  const previousStatus = previousListing?.standardStatus;

  // Detect status change to closed
  if (
    previousStatus === 'Active' &&
    (currentStatus === 'Closed' || currentStatus === 'Sold')
  ) {
    console.log(`Listing ${mlsListing.ListingKey} changed to ${currentStatus}`);

    // 1. Create closed listing record
    await createClosedListing(mlsListing, previousListing);

    // 2. Update sales history
    await updatePropertySalesHistory(mlsListing);

    // 3. Remove from active or update status
    await UnifiedListing.findByIdAndUpdate(previousListing._id, {
      standardStatus: currentStatus,
      statusChangeTimestamp: new Date()
    });
  }
}

async function createClosedListing(mlsListing: any, previousListing: any) {
  const closedListing = new UnifiedClosedListing({
    ...mlsListing,
    closePrice: mlsListing.ClosePrice,
    closeDate: mlsListing.CloseDate,
    originalListPrice: previousListing?.originalListPrice || mlsListing.OriginalListPrice,
    daysOnMarket: mlsListing.DaysOnMarket,
    statusChangeTimestamp: new Date(),
    mlsSource: detectMLSSource(mlsListing),
  });

  await closedListing.save();
  return closedListing;
}

async function updatePropertySalesHistory(mlsListing: any) {
  const normalizedAddress = normalizeAddress(mlsListing.UnparsedAddress);

  let history = await PropertySalesHistory.findOne({
    address: normalizedAddress
  });

  if (!history) {
    history = new PropertySalesHistory({
      address: normalizedAddress,
      addressVariations: [mlsListing.UnparsedAddress],
      latitude: mlsListing.Latitude,
      longitude: mlsListing.Longitude,
      sales: []
    });
  }

  // Calculate appreciation from previous sale
  const previousSale = history.sales[history.sales.length - 1];
  let appreciationFromPrevious = 0;
  let yearsSincePrevious = 0;

  if (previousSale) {
    const priceDiff = mlsListing.ClosePrice - previousSale.closePrice;
    appreciationFromPrevious = (priceDiff / previousSale.closePrice) * 100;

    const timeDiff = new Date(mlsListing.CloseDate).getTime() - new Date(previousSale.closeDate).getTime();
    yearsSincePrevious = timeDiff / (1000 * 60 * 60 * 24 * 365.25);
  }

  // Add new sale
  history.sales.push({
    closePrice: mlsListing.ClosePrice,
    closeDate: mlsListing.CloseDate,
    daysOnMarket: mlsListing.DaysOnMarket,
    listPrice: mlsListing.ListPrice,
    mlsSource: detectMLSSource(mlsListing),
    listingKey: mlsListing.ListingKey,
    pricePerSqft: mlsListing.ClosePrice / mlsListing.LivingArea,
    appreciationFromPrevious,
    yearsSincePrevious,
    annualizedAppreciation: yearsSincePrevious > 0 ? appreciationFromPrevious / yearsSincePrevious : 0
  });

  // Recalculate aggregates
  history.totalSales = history.sales.length;
  history.lastSaleDate = mlsListing.CloseDate;
  history.lastSalePrice = mlsListing.ClosePrice;

  if (history.sales.length === 1) {
    history.firstSaleDate = mlsListing.CloseDate;
    history.firstSalePrice = mlsListing.ClosePrice;
  }

  // Calculate overall CAGR
  if (history.totalSales > 1) {
    const years = (new Date(history.lastSaleDate).getTime() - new Date(history.firstSaleDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    history.cagr = (Math.pow(history.lastSalePrice / history.firstSalePrice, 1 / years) - 1) * 100;
    history.overallAppreciation = ((history.lastSalePrice - history.firstSalePrice) / history.firstSalePrice) * 100;
  }

  await history.save();
}
```

---

## Implementation Plan

### Week 1: Foundation
- [ ] Create `UnifiedClosedListing` model
- [ ] Create `PropertySalesHistory` model
- [ ] Create `AddressCanonical` model
- [ ] Add MongoDB indexes
- [ ] Write address normalization utility

### Week 2: Migration
- [ ] Audit existing closed listings data
- [ ] Write migration script for GPS closed
- [ ] Write migration script for CRMLS closed
- [ ] Detect and handle duplicates
- [ ] Run migration on test database
- [ ] Validate migrated data

### Week 3: Grouping & History
- [ ] Group sales by normalized address
- [ ] Calculate appreciation between sales
- [ ] Generate PropertySalesHistory documents
- [ ] Validate calculations
- [ ] Test with properties that sold multiple times

### Week 4: Sync Script Updates
- [ ] Add status change detection logic
- [ ] Implement UnifiedClosedListing creation
- [ ] Implement PropertySalesHistory updates
- [ ] Add duplicate detection
- [ ] Test with recent sales
- [ ] Monitor for errors

### Week 5: Integration & Testing
- [ ] Update appreciation API to use new collections
- [ ] Test appreciation calculations
- [ ] Update analytics queries
- [ ] Performance optimization
- [ ] Documentation

### Week 6: Production & Cleanup
- [ ] Deploy to production
- [ ] Monitor data quality
- [ ] Archive old collections
- [ ] Update all dependent code
- [ ] Final documentation

---

## Data Quality Measures

### Duplicate Detection
```typescript
// Check for duplicates by address + close date + price
const potential Duplicates = await UnifiedClosedListing.aggregate([
  {
    $group: {
      _id: {
        address: '$address',
        closeDate: '$closeDate',
        closePrice: '$closePrice'
      },
      count: { $sum: 1 },
      docs: { $push: '$$ROOT' }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
]);
```

### Address Normalization
- Remove punctuation variations ("St" vs "Street")
- Standardize abbreviations
- Handle unit numbers consistently
- Use geocoding for validation

### Data Validation
- Close price > 0
- Close date within reasonable range
- Property characteristics present
- Address components valid
- Coordinates within California

---

## Benefits

### For Analytics
- Accurate appreciation calculations
- Property-level history
- Market trend analysis
- Flip detection

### For AI
- Answer "how much has this property appreciated?"
- Compare properties over time
- Predict future values

### For Users
- See complete property history
- Understand market trends
- Make informed decisions

---

## Next Steps

1. **Review & Approve** this architecture
2. **Create** the three new models
3. **Write** migration scripts
4. **Test** on sample data
5. **Deploy** to production

---

**Questions**:
1. Should we keep GPS/CRMLS closed collections or archive after migration?
2. What's the minimum time between sales to not consider it a duplicate?
3. How do we handle properties with missing close prices?
4. Should we backfill historical data beyond what's in current collections?
5. What's the priority: migration first or new sync logic first?

