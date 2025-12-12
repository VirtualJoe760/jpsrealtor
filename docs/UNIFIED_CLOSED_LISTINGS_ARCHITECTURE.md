# Unified Closed Listings Architecture

**Date**: December 9, 2025
**Status**: Design Complete
**MLS Coverage**: 8 Associations (All active associations)
**Data Retention**: 5 Years (Rolling TTL)

---

## Executive Summary

This document outlines the architecture for **`unified_closed_listings`** collection - a consolidated database of closed/sold property listings from all 8 MLS associations. This mirrors the strategy used for `unified_listings` (active listings) but focuses on historical sales data for:

- **Appreciation Calculations**: Track property value changes over time
- **Comparative Market Analysis (CMA)**: Find comparable sales
- **AI Investment Analysis**: Answer questions like "Which neighborhood has better appreciation?"
- **Market Trend Analysis**: Historical pricing patterns by location/property type
- **Sales History Tracking**: Properties that sold multiple times

---

## Table of Contents

1. [MLS Data Sources](#mls-data-sources)
2. [Unified Closed Listing Schema](#unified-closed-listing-schema)
3. [Data Retention Policy](#data-retention-policy)
4. [Sales History Tracking](#sales-history-tracking)
5. [Data Ingestion Strategy](#data-ingestion-strategy)
6. [API Endpoints](#api-endpoints)
7. [Integration with Analytics](#integration-with-analytics)
8. [Migration from GPS/CRMLS Collections](#migration-from-gpscrmls-collections)

---

## MLS Data Sources

### All 8 MLS Associations

Same associations as `unified_listings`, but querying for **closed/sold** properties:

| MLS Name | Short Name | MLS ID | StandardStatus Filter |
|----------|-----------|--------|----------------------|
| **CRMLS** | `CRMLS` | `20200218121507636729000000` | `Closed` |
| **CLAW** | `CLAW` | `20200630203341057545000000` | `Closed` |
| **Southland Regional** | `SOUTHLAND` | `20200630203518576361000000` | `Closed` |
| **GPS MLS** | `GPS` | `20190211172710340762000000` | `Closed` |
| **High Desert MLS** | `HIGH_DESERT` | `20200630204544040064000000` | `Closed` |
| **Bridge MLS** | `BRIDGE` | `20200630204733042221000000` | `Closed` |
| **Conejo Simi Moorpark** | `CONEJO_SIMI_MOORPARK` | `20160622112753445171000000` | `Closed` |
| **ITECH** | `ITECH` | `20200630203206752718000000` | `Closed` |

### Spark API Filter

```python
# Fetch closed listings from past 5 years
five_years_ago = (datetime.utcnow() - timedelta(days=365.25*5)).isoformat() + "Z"

filter = f"MlsId eq '{mls_id}' and StandardStatus eq 'Closed' and CloseDate ge {five_years_ago}"
```

---

## Unified Closed Listing Schema

### Collection Name: `unified_closed_listings`

**Purpose**: Replace fragmented closed listing collections:
- ❌ `gps-closed-listings` (GPS only)
- ❌ `crmls-closed-listings` (CRMLS only)

With single unified collection:
- ✅ `unified_closed_listings` (all 8 MLSs, past 5 years)

### Core Schema

```typescript
interface IUnifiedClosedListing {
  // ========================================
  // MLS TRACKING (same as unified_listings)
  // ========================================
  mlsSource: string;                      // "GPS", "CRMLS", "CLAW", etc.
  mlsId: string;                          // 26-digit MLS ID
  propertyTypeName?: string;              // Human-readable type

  // ========================================
  // CORE IDENTIFIERS
  // ========================================
  listingId: string;
  listingKey: string;                     // Unique across all MLSs
  slug: string;
  slugAddress?: string;

  // ========================================
  // SALE INFORMATION (KEY FIELDS)
  // ========================================
  closePrice: number;                     // ⭐ ACTUAL SALE PRICE (required)
  closeDate: Date;                        // ⭐ DATE SOLD (required, indexed for TTL)
  daysOnMarket?: number;                  // Time from listing to sale

  // Original listing details
  status?: string;
  standardStatus?: string;                // "Closed"
  listPrice?: number;                     // Original asking price
  originalListPrice?: number;
  currentPrice?: number;

  // ========================================
  // PROPERTY DETAILS (for CMA matching)
  // ========================================
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  bathroomsTotalDecimal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;                    // Square footage
  buildingAreaTotal?: number;
  yearBuilt?: number;
  lotSizeSqft?: number;
  lotSizeArea?: number;
  lotSizeAcres?: number;

  // ========================================
  // LOCATION (for geospatial CMA queries)
  // ========================================
  address?: string;
  unparsedAddress?: string;
  unparsedFirstLineAddress?: string;
  streetName?: string;
  streetNumber?: string;
  subdivisionName?: string;
  apn?: string;                           // Assessor's Parcel Number
  parcelNumber?: string;

  latitude?: number;
  longitude?: number;
  coordinates?: {                         // GeoJSON for 2dsphere index
    type: "Point";
    coordinates: [number, number];        // [lng, lat]
  };

  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countyOrParish?: string;
  country?: string;

  // ========================================
  // TIMESTAMPS
  // ========================================
  modificationTimestamp?: Date;
  listingContractDate?: Date;
  statusChangeTimestamp?: Date;
  onMarketDate?: Date;
  originalOnMarketTimestamp?: Date;

  // ========================================
  // MEDIA & FEATURES (for historical reference)
  // ========================================
  publicRemarks?: string;
  supplement?: string;
  media?: IMedia[];
  primaryPhotoUrl?: string;

  poolYn?: boolean;
  spaYn?: boolean;
  viewYn?: boolean;
  view?: string;
  garageSpaces?: number;
  parkingTotal?: number;

  // ========================================
  // CLASSIFICATION
  // ========================================
  propertyType?: string;                  // A, B, C, D
  propertySubType?: string;
  propertyClass?: string;
  propertyTypeLabel?: string;

  // ========================================
  // AGENT & OFFICE (for compliance)
  // ========================================
  listAgentId?: string;
  listAgentName?: string;
  listOfficeId?: string;
  listOfficeName?: string;

  // ========================================
  // METADATA
  // ========================================
  createdAt: Date;
  updatedAt: Date;
}
```

### Key Differences from unified_listings

| Field | unified_listings | unified_closed_listings |
|-------|------------------|------------------------|
| **standardStatus** | "Active" | "Closed" |
| **closePrice** | null (not sold yet) | **REQUIRED** (actual sale price) |
| **closeDate** | null | **REQUIRED** (when it sold) |
| **daysOnMarket** | Current days on market | Total days from list to close |
| **TTL Index** | No (keep active listings) | Yes (auto-delete after 5 years) |

---

## Data Retention Policy

### 5-Year Rolling Window

**Requirement**: Only store closed listings from the past 5 years.

**Implementation**: MongoDB TTL Index

```javascript
// TTL index automatically deletes documents after 5 years
db.unified_closed_listings.createIndex(
  { closeDate: 1 },
  {
    expireAfterSeconds: 157680000,  // 5 years (365.25 * 5 * 24 * 60 * 60)
    name: 'closeDate_ttl_5years'
  }
);
```

**How It Works**:
- MongoDB checks TTL indexes approximately once per minute
- Documents where `closeDate` is older than 5 years are automatically deleted
- No manual cleanup needed
- Keeps database size manageable
- Sufficient for appreciation analysis (typically 1-5 year comparisons)

### Why 5 Years?

- **Appreciation Analysis**: Most appreciation calculations use 1-5 year windows
- **Market Relevance**: Sales older than 5 years less relevant in dynamic markets
- **CMA Standards**: Industry standard for comparable sales is 6-12 months, max 3 years
- **Database Size**: Limits collection growth while maintaining useful historical data

---

## Sales History Tracking

### Challenge: Properties Sold Multiple Times

Example: Property at `123 Main St, Palm Springs` sold in:
- 2020: $400,000
- 2023: $520,000
- 2025: $575,000

We need to track ALL three sales chronologically to calculate appreciation.

### Solution: PropertySalesHistory Collection

**Separate collection**: `property_sales_history`

```typescript
interface IPropertySalesHistory {
  address: string;                        // Canonical normalized address
  apn?: string;                           // Best unique identifier

  // Chronological array of sales
  sales: Array<{
    saleId: ObjectId;                     // Reference to unified_closed_listing
    closePrice: number;
    closeDate: Date;
    mlsSource: string;
    listingKey: string;

    // Calculated appreciation metrics
    appreciationFromPrevious?: number;    // % change from previous sale
    dollarGainFromPrevious?: number;
    yearsSincePrevious?: number;
    annualizedAppreciation?: number;      // CAGR
  }>;

  // Aggregate metrics
  totalSales: number;
  cagr?: number;                          // Overall CAGR (first to last)
  overallAppreciation?: number;           // Total % gain
  isFlip: boolean;                        // Multiple sales < 2 years apart
}
```

**Pre-save Middleware**: Automatically calculates appreciation between sales when document is saved.

See: `src/models/property-sales-history.ts`

---

## Data Ingestion Strategy

### Unified Fetch Script for Closed Listings

Similar to `unified-fetch.py` for active listings, but for closed sales.

```python
# src/scripts/fetch-closed-listings.py

MLS_IDS = {
    "CRMLS": "20200218121507636729000000",
    "CLAW": "20200630203341057545000000",
    "SOUTHLAND": "20200630203518576361000000",
    "GPS": "20190211172710340762000000",
    "HIGH_DESERT": "20200630204544040064000000",
    "BRIDGE": "20200630204733042221000000",
    "CONEJO_SIMI_MOORPARK": "20160622112753445171000000",
    "ITECH": "20200630203206752718000000"
}

def fetch_closed_listings(mls_id, mls_short_name):
    """Fetch closed listings from past 5 years for given MLS"""

    # Calculate 5 years ago
    five_years_ago = (datetime.utcnow() - timedelta(days=365.25*5)).isoformat() + "Z"

    # Build filter
    filter = f"MlsId eq '{mls_id}' and StandardStatus eq 'Closed' and CloseDate ge {five_years_ago}"

    url = f"{SPARK_BASE_URL}?_filter={filter}&_expand=Media"

    skiptoken = None
    all_listings = []

    while True:
        if skiptoken:
            request_url = f"{url}&_skiptoken={skiptoken}"
        else:
            request_url = url

        response = requests.get(request_url, headers=headers)
        data = response.json()

        response_data = data.get("D", {})
        batch = response_data.get("Results", [])
        new_skiptoken = response_data.get("SkipToken")

        if not batch:
            break

        # Transform and upsert
        transformed = [transform_to_unified_closed(listing, mls_short_name) for listing in batch]
        upsert_to_mongo(transformed)

        all_listings.extend(batch)

        if new_skiptoken == skiptoken:
            break

        skiptoken = new_skiptoken

    return len(all_listings)


def transform_to_unified_closed(raw_listing, mls_source):
    """Transform Spark API response to unified schema"""
    std = raw_listing.get("StandardFields", {})

    return {
        # MLS tracking
        "mlsSource": mls_source,
        "mlsId": std.get("MlsId"),
        "propertyTypeName": get_property_type_name(std.get("PropertyType")),

        # Identifiers
        "listingId": std.get("ListingId"),
        "listingKey": std.get("ListingKey"),
        "slug": generate_slug(std.get("UnparsedAddress"), std.get("ListingKey")),

        # SALE INFORMATION (required)
        "closePrice": std.get("ClosePrice"),
        "closeDate": parse_date(std.get("CloseDate")),
        "daysOnMarket": std.get("DaysOnMarket"),

        # Original listing details
        "standardStatus": std.get("StandardStatus"),
        "listPrice": std.get("ListPrice"),
        "originalListPrice": std.get("OriginalListPrice"),

        # Property details
        "bedroomsTotal": std.get("BedroomsTotal"),
        "bathroomsTotalInteger": std.get("BathroomsTotalInteger"),
        "livingArea": std.get("LivingArea"),
        "lotSizeSqft": std.get("LotSizeSquareFeet"),
        "yearBuilt": std.get("YearBuilt"),

        # Location
        "address": std.get("UnparsedAddress"),
        "streetNumber": std.get("StreetNumber"),
        "streetName": std.get("StreetName"),
        "subdivisionName": std.get("SubdivisionName"),
        "city": std.get("City"),
        "stateOrProvince": std.get("StateOrProvince"),
        "postalCode": std.get("PostalCode"),
        "apn": std.get("ParcelNumber"),

        # Geolocation
        "latitude": std.get("Latitude"),
        "longitude": std.get("Longitude"),
        "coordinates": {
            "type": "Point",
            "coordinates": [std.get("Longitude"), std.get("Latitude")]
        },

        # Classification
        "propertyType": std.get("PropertyType"),
        "propertySubType": std.get("PropertySubType"),

        # Metadata
        "lastSyncedAt": datetime.utcnow()
    }


def upsert_to_mongo(listings):
    """Bulk upsert to unified_closed_listings"""
    bulk_ops = []

    for listing in listings:
        # Skip if missing required fields
        if not listing.get("closePrice") or not listing.get("closeDate"):
            continue

        bulk_ops.append(
            UpdateOne(
                {"listingKey": listing["listingKey"]},
                {"$set": listing},
                upsert=True
            )
        )

    if bulk_ops:
        result = db.unified_closed_listings.bulk_write(bulk_ops)
        print(f"  Upserted: {result.upserted_count}, Modified: {result.modified_count}")


# Main execution
if __name__ == "__main__":
    for short_name, mls_id in MLS_IDS.items():
        print(f"\n🔍 Fetching {short_name} closed listings...")
        count = fetch_closed_listings(mls_id, short_name)
        print(f"✅ {short_name}: {count} closed listings")

    print("\n✅ All MLSs synced!")

    # Update PropertySalesHistory
    print("\n🔍 Building sales history...")
    build_sales_history()
    print("✅ Sales history updated!")
```

### Build Sales History

```python
def build_sales_history():
    """Group closed listings by address and create sales history documents"""

    # Aggregate by normalized address
    pipeline = [
        {
            "$match": {
                "closePrice": {"$exists": True, "$ne": None},
                "closeDate": {"$exists": True, "$ne": None},
                "address": {"$exists": True, "$ne": None, "$ne": ""}
            }
        },
        {
            "$group": {
                "_id": "$address",  # Group by address (needs normalization)
                "sales": {
                    "$push": {
                        "saleId": "$_id",
                        "closePrice": "$closePrice",
                        "closeDate": "$closeDate",
                        "mlsSource": "$mlsSource",
                        "listingKey": "$listingKey",
                        "daysOnMarket": "$daysOnMarket"
                    }
                },
                "beds": {"$first": "$bedroomsTotal"},
                "baths": {"$first": "$bathroomsTotalInteger"},
                "sqft": {"$first": "$livingArea"},
                "apn": {"$first": "$apn"},
                "city": {"$first": "$city"},
                "latitude": {"$first": "$latitude"},
                "longitude": {"$first": "$longitude"}
            }
        },
        {
            "$match": {
                "sales.1": {"$exists": True}  # Only properties with 2+ sales
            }
        }
    ]

    results = db.unified_closed_listings.aggregate(pipeline)

    for result in results:
        # Create PropertySalesHistory document
        history_doc = {
            "address": result["_id"],
            "apn": result.get("apn"),
            "city": result.get("city"),
            "beds": result.get("beds"),
            "baths": result.get("baths"),
            "sqft": result.get("sqft"),
            "latitude": result.get("latitude"),
            "longitude": result.get("longitude"),
            "coordinates": {
                "type": "Point",
                "coordinates": [result.get("longitude"), result.get("latitude")]
            } if result.get("longitude") else None,
            "sales": result["sales"],
            "totalSales": len(result["sales"])
        }

        # Upsert (model pre-save middleware will calculate appreciation)
        db.property_sales_history.update_one(
            {"address": result["_id"]},
            {"$set": history_doc},
            upsert=True
        )
```

---

## API Endpoints

### 1. Unified Closed Listings API

**Route**: `/api/unified-closed-listings`

```typescript
// src/app/api/unified-closed-listings/route.ts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Filters
  const city = searchParams.get('city');
  const subdivisionName = searchParams.get('subdivision');
  const mlsSource = searchParams.get('mls');
  const propertyType = searchParams.get('propertyType');

  // Date range
  const startDate = searchParams.get('startDate'); // Filter by closeDate
  const endDate = searchParams.get('endDate');

  // Property characteristics (for CMA matching)
  const minBeds = parseInt(searchParams.get('minBeds') || '0');
  const maxBeds = parseInt(searchParams.get('maxBeds') || '99');
  const minSqft = parseInt(searchParams.get('minSqft') || '0');
  const maxSqft = parseInt(searchParams.get('maxSqft') || '999999');

  // Price range
  const minPrice = parseInt(searchParams.get('minPrice') || '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') || '999999999');

  // Geospatial (for CMA radius search)
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusMiles = parseFloat(searchParams.get('radius') || '0');

  // Build query
  const query: any = {
    standardStatus: 'Closed',
    closePrice: { $exists: true, $ne: null },
    closeDate: { $exists: true, $ne: null }
  };

  if (city) query.city = city;
  if (subdivisionName) query.subdivisionName = subdivisionName;
  if (mlsSource) query.mlsSource = mlsSource;
  if (propertyType) query.propertyType = propertyType;

  // Date range filter
  if (startDate || endDate) {
    query.closeDate = {};
    if (startDate) query.closeDate.$gte = new Date(startDate);
    if (endDate) query.closeDate.$lte = new Date(endDate);
  }

  // Property filters
  if (minBeds > 0 || maxBeds < 99) {
    query.bedroomsTotal = {};
    if (minBeds > 0) query.bedroomsTotal.$gte = minBeds;
    if (maxBeds < 99) query.bedroomsTotal.$lte = maxBeds;
  }

  if (minSqft > 0 || maxSqft < 999999) {
    query.livingArea = {};
    if (minSqft > 0) query.livingArea.$gte = minSqft;
    if (maxSqft < 999999) query.livingArea.$lte = maxSqft;
  }

  // Price filter
  if (minPrice > 0 || maxPrice < 999999999) {
    query.closePrice.$gte = minPrice;
    query.closePrice.$lte = maxPrice;
  }

  // Geospatial filter (CMA radius search)
  if (lat && lng && radiusMiles > 0) {
    const radiusMeters = radiusMiles * 1609.34;
    query.coordinates = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusMeters
      }
    };
  }

  // Execute query
  const listings = await UnifiedClosedListing.find(query)
    .sort({ closeDate: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    success: true,
    data: listings,
    count: listings.length
  });
}
```

### 2. Sales History API

**Route**: `/api/property-sales-history`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const address = searchParams.get('address');
  const apn = searchParams.get('apn');
  const city = searchParams.get('city');
  const minSales = parseInt(searchParams.get('minSales') || '2');

  const query: any = {
    totalSales: { $gte: minSales }
  };

  if (address) query.address = address;
  if (apn) query.apn = apn;
  if (city) query.city = city;

  const histories = await PropertySalesHistory.find(query)
    .sort({ cagr: -1 })  // Top appreciating properties
    .limit(50)
    .lean();

  return NextResponse.json({
    success: true,
    data: histories
  });
}
```

---

## Integration with Analytics

### Appreciation Calculations

The appreciation module (`src/lib/analytics/calculations/appreciation.ts`) now queries `unified_closed_listings`:

```typescript
import UnifiedClosedListing from '@/models/unified-closed-listing';

export async function analyzeSubdivisionAppreciation(
  subdivisionName: string,
  period: '1y' | '3y' | '5y' = '5y'
) {
  const years = parseInt(period);
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

  // Fetch closed sales from unified collection
  const sales = await UnifiedClosedListing.find({
    subdivisionName,
    closeDate: { $gte: cutoffDate },
    closePrice: { $exists: true, $ne: null }
  }).sort({ closeDate: 1 }).lean();

  // Calculate appreciation using existing module
  return analyzeAppreciation(sales, period);
}
```

### CMA (Comparative Market Analysis)

```typescript
export async function findComparableSales(
  subjectProperty: {
    lat: number;
    lng: number;
    beds: number;
    baths: number;
    sqft: number;
  },
  radiusMiles: number = 0.5
) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const radiusMeters = radiusMiles * 1609.34;

  const comps = await UnifiedClosedListing.find({
    coordinates: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [subjectProperty.lng, subjectProperty.lat]
        },
        $maxDistance: radiusMeters
      }
    },
    closeDate: { $gte: sixMonthsAgo },
    bedroomsTotal: { $gte: subjectProperty.beds - 1, $lte: subjectProperty.beds + 1 },
    bathroomsTotalInteger: { $gte: subjectProperty.baths - 1, $lte: subjectProperty.baths + 1 },
    livingArea: { $gte: subjectProperty.sqft * 0.8, $lte: subjectProperty.sqft * 1.2 }
  }).limit(10).lean();

  return comps;
}
```

---

## Migration from GPS/CRMLS Collections

### Current State

```
gps-closed-listings collection:       ~X documents (GPS only)
crmls-closed-listings collection:     ~Y documents (CRMLS only)
```

### Migration Plan

**Phase 1**: Create `unified_closed_listings` and fetch from all 8 MLSs (past 5 years)

```bash
# Run fetch script
python src/scripts/fetch-closed-listings.py

# Expected: 100K-200K closed sales across all 8 MLSs
```

**Phase 2**: Build `property_sales_history` from new unified collection

```bash
# Aggregate by address and create sales history
python src/scripts/build-sales-history.py
```

**Phase 3**: Archive old GPS/CRMLS collections

```bash
# After validation
db.gps-closed-listings.renameCollection('gps-closed-listings-archived-2025-12-09')
db.crmls-closed-listings.renameCollection('crmls-closed-listings-archived-2025-12-09')
```

---

## Indexes

```javascript
// Core indexes
db.unified_closed_listings.createIndex({ listingKey: 1 }, { unique: true });
db.unified_closed_listings.createIndex({ mlsSource: 1, closeDate: -1 });
db.unified_closed_listings.createIndex({ city: 1, closeDate: -1 });
db.unified_closed_listings.createIndex({ subdivisionName: 1, closeDate: -1 });
db.unified_closed_listings.createIndex({ propertyType: 1, closeDate: -1 });

// Geospatial index for CMA radius searches
db.unified_closed_listings.createIndex({ coordinates: '2dsphere' });

// Price + date (for appreciation analysis)
db.unified_closed_listings.createIndex({ closePrice: 1, closeDate: -1 });

// TTL index (auto-delete after 5 years)
db.unified_closed_listings.createIndex(
  { closeDate: 1 },
  { expireAfterSeconds: 157680000, name: 'closeDate_ttl_5years' }
);

// PropertySalesHistory indexes
db.property_sales_history.createIndex({ address: 1 }, { unique: true });
db.property_sales_history.createIndex({ apn: 1 }, { sparse: true });
db.property_sales_history.createIndex({ city: 1, totalSales: -1 });
db.property_sales_history.createIndex({ cagr: -1 }); // Top appreciating
db.property_sales_history.createIndex({ isFlip: 1, 'sales.closeDate': -1 });
```

---

## Next Steps

1. ✅ Create `UnifiedClosedListing` model
2. ✅ Create `PropertySalesHistory` model
3. ⏳ Write `fetch-closed-listings.py` script
4. ⏳ Write `build-sales-history.py` script
5. ⏳ Create API routes
6. ⏳ Integrate with appreciation calculations
7. ⏳ Test with real data
8. ⏳ Migrate and archive old collections

---

**Document Version**: 1.0
**Last Updated**: December 9, 2025
