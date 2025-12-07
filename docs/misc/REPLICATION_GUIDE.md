# MLS Data Replication Guide
**JPSRealtor.com - Complete MLS Sync System Documentation**
**Last Updated:** December 2, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Current System Architecture](#current-system-architecture)
3. [Database Collections](#database-collections)
4. [Spark API Pagination (Diego's Method)](#spark-api-pagination-diegos-method)
5. [Scripts Breakdown](#scripts-breakdown)
6. [Windows Cron Job Setup](#windows-cron-job-setup)
7. [Expansion: Expired & Cancelled Listings](#expansion-expired--cancelled-listings)
8. [Implementation Plan](#implementation-plan)
9. [API Routes for CRM Access](#api-routes-for-crm-access)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 OVERVIEW

The JPSRealtor.com MLS replication system fetches, processes, and stores property listings from two MLS providers:
- **GPS MLS** (Greater Palm Springs MLS) - MLS ID: `20190211172710340762000000`
- **CRMLS** (California Regional MLS) - MLS ID: `20200218121507636729000000`

### Current Data Sources

| Status | GPS Collection | CRMLS Collection | Purpose |
|--------|---------------|------------------|---------|
| **Active** | `listings` | `crmlsListings` | Live properties displayed on website map |
| **Closed** | `gpsClosedListings` | `crmlsClosedListings` | Historical sold properties |
| **Expired** | ❌ Not implemented | ❌ Not implemented | Lead generation (Tracerfy + Drop Cowboy) |
| **Cancelled** | ❌ Not implemented | ❌ Not implemented | Lead generation (Tracerfy + Drop Cowboy) |

---

## 🏗️ CURRENT SYSTEM ARCHITECTURE

### Pipeline Flow

```
main.py (Entry Point)
    ↓
┌─────────────────────────────────────────────────┐
│  CRMLS Pipeline (Runs First)                    │
├─────────────────────────────────────────────────┤
│  1. fetch.py       → Fetch from Spark API       │
│  2. flatten.py     → Flatten nested JSON        │
│  3. seed.py        → Upsert to MongoDB          │
│  4. cache_photos.py → Cache photos to photos DB │
│  5. update.py      → Update existing records    │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  GPS Pipeline (Runs Second)                     │
├─────────────────────────────────────────────────┤
│  1. fetch.py       → Fetch from Spark API       │
│  2. flatten.py     → Flatten nested JSON        │
│  3. seed.py        → Upsert to MongoDB          │
│  4. cache_photos.py → Cache photos to photos DB │
│  5. update.py      → Update existing records    │
└─────────────────────────────────────────────────┘
    ↓
✅ Complete
```

### Directory Structure

```
src/scripts/mls/backend/
├── main.py                    # Pipeline orchestrator
├── fetch.py                   # GPS fetch script
├── flatten.py                 # GPS flatten script
├── seed.py                    # GPS seed script (→ listings)
├── cache_photos.py            # GPS photo caching
├── update.py                  # GPS update script
├── crmls/
│   ├── fetch.py              # CRMLS fetch script
│   ├── flatten.py            # CRMLS flatten script
│   ├── seed.py               # CRMLS seed script (→ crmlsListings)
│   ├── cache_photos.py       # CRMLS photo caching
│   └── update.py             # CRMLS update script
└── closed/
    ├── gps/
    │   └── fetch.py          # GPS closed listings
    └── crmls/
        └── fetch.py          # CRMLS closed listings
```

---

## 🔄 SPARK API PAGINATION (DIEGO'S METHOD)

### Recommended Pagination Method

**Source:** Email from Diego Hernandez (FBS Developer Support) - June 6, 2025

Diego recommends using `_skiptoken` instead of `_skip` or `_page` for reliable pagination:

#### How It Works:

1. **Initial Request:** Include `_skiptoken=` (empty value) in first request:
   ```
   https://replication.sparkapi.com/v1/listings?_filter=[filter]&_skiptoken=
   ```

2. **Get SkipToken from Response:** API returns a `SkipToken` value:
   ```json
   {
     "D": {
       "Results": [...],
       "SkipToken": "20200804193421015686000000"
     }
   }
   ```

3. **Next Request:** Use that SkipToken for the next page:
   ```
   https://replication.sparkapi.com/v1/listings?_filter=[filter]&_skiptoken=20200804193421015686000000
   ```

4. **Continue:** Repeat until you get no results OR the SkipToken stops changing.

#### End Conditions:

You've fetched all listings when EITHER:
- `Results` array is empty: `"Results": []`
- `SkipToken` value is the same as the one you just used

### Data Share Access (CRMLS)

To access CRMLS listings via GPS data share:

1. **Get Available MLSs:**
   ```
   https://sparkapi.com/v1/standardfields/MlsId
   ```

2. **Use MLS ID in Filter:**
   ```
   https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '20200218121507636729000000'
   ```

   Where `20200218121507636729000000` is the CRMLS MLS ID.

### Implementation in Fetch Scripts:

```python
skiptoken = None

while True:
    # Build URL with _skiptoken= (empty initially)
    url = f"{BASE_URL}?_filter={filter}&_skiptoken="
    if skiptoken:
        url += skiptoken

    res = requests.get(url, headers=headers)
    response_data = res.json().get("D", {})
    batch = response_data.get("Results", [])
    new_skiptoken = response_data.get("SkipToken")

    # Check if done: no results OR skiptoken unchanged
    if not batch or (skiptoken and new_skiptoken == skiptoken):
        break

    # Process batch...
    listings.extend(batch)

    # Update skiptoken for next iteration
    skiptoken = new_skiptoken
```

---

## 💾 DATABASE COLLECTIONS

### Active Listings

#### **listings** (GPS - 11,592 active)
```typescript
{
  _id: ObjectId,
  listingKey: string,           // Unique MLS identifier
  listingId: string,
  mlsStatus: string,
  standardStatus: "Active",     // Only Active listings

  // Property Details
  propertyType: "A" | "B" | "C",  // A=Sale, B=Rental, C=Multi-family
  propertySubType: string,

  // Location
  unparsedAddress: string,
  city: string,
  stateOrProvince: string,
  postalCode: string,
  latitude: number,
  longitude: number,

  // Pricing
  listPrice: number,
  originalListPrice: number,

  // Size
  bedsTotal: number,
  bathroomsTotalInteger: number,
  livingArea: number,
  yearBuilt: number,

  // Metadata
  listDate: Date,
  modificationTimestamp: Date,
  onMarketDate: Date,
  daysOnMarket: number,

  // Generated
  slugAddress: string,
  primaryPhotoUrl: string,
}
```

#### **crmlsListings** (CRMLS - 20,406 active)
Same schema as `listings`, different MLS source.

---

### Closed Listings

#### **gpsClosedListings** (11,592 sold/expired)
Same schema as `listings`, for historical sold properties.

#### **crmlsClosedListings** (30,409 sold/expired)
Same schema as `crmlsListings`, for historical sold properties.

---

### Photos Collection

#### **photos** (~40,000 cached)
```typescript
{
  _id: ObjectId,
  listingId: string,             // Links to listing
  primary: boolean,
  Order: number,

  // CDN URLs (Spark API)
  uriThumb: string,
  uri300: string,
  uri640: string,
  uri800: string,
  uri1024: string,
  uri1280: string,
  uri1600: string,
  uri2048: string,
  uriLarge: string,

  // Metadata
  caption: string,
  modificationTimestamp: Date
}
```

---

## 📜 SCRIPTS BREAKDOWN

### 1. **main.py** (Pipeline Orchestrator)

**Location:** `src/scripts/mls/backend/main.py`

**Purpose:** Entry point that runs all scripts in sequence for both CRMLS and GPS.

**Key Features:**
- Runs CRMLS pipeline first (more listings)
- Runs GPS pipeline second
- Stops entire pipeline if any script fails
- Exit code propagation for cron job monitoring

**Configuration:**
```python
SCRIPT_PIPELINES = [
    ("CRMLS", CRMLS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
    ("GPS", GPS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
]
```

**Usage:**
```bash
python src/scripts/mls/backend/main.py
```

---

### 2. **fetch.py** (Data Fetching)

**Location:**
- GPS: `src/scripts/mls/backend/fetch.py`
- CRMLS: `src/scripts/mls/backend/crmls/fetch.py`

**Purpose:** Fetch listings from Spark API replication endpoint.

**API Details:**
- **Endpoint:** `https://replication.sparkapi.com/v1/listings`
- **Authentication:** Bearer token (`SPARK_ACCESS_TOKEN` from `.env.local`)
- **Batch Size:** 500 listings per page
- **Expansions:** Rooms, Units, OpenHouses, VirtualTours
- **Rate Limiting:** 429 handling with exponential backoff
- **Retry Logic:** 3 attempts with 2^attempt delay

**Filters Applied:**
```python
# GPS
mls_filter = "MlsId Eq '20190211172710340762000000'"
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Active'"

# CRMLS
mls_filter = "MlsId Eq '20200218121507636729000000'"
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Active'"
```

**Output:**
- GPS: `local-logs/all_listings_with_expansions.json`
- CRMLS: `local-logs/crmls/all_crmls_listings_with_expansions.json`

**Data Cleaning:**
- Removes `None`, `"********"`, `[]`, `{}` values
- Preserves all other data
- Recursive cleaning for nested objects

---

### 3. **flatten.py** (Data Transformation)

**Location:** `src/scripts/mls/backend/flatten.py`

**Purpose:** Transform nested Spark API JSON into flat MongoDB-ready documents.

**Key Transformations:**
1. **Flatten StandardFields** - Extracts all standard RESO fields
2. **Convert to camelCase** - `UnparsedAddress` → `unparsedAddress`
3. **Extract boolean dictionaries** - Converts `{Pool: true, Spa: true}` → `"Pool, Spa"`
4. **Generate slugs** - Creates URL-friendly address slugs
5. **Derive land details** - Calculates lease info, expiration dates, years remaining
6. **Remove empty values** - Strips `null`, `"********"`, empty arrays/objects

**Land Details Logic:**
```python
# Derives:
- landType: "Fee" | "Lease"
- landLeaseAmount: number
- landLeasePer: "Month" | "Year"
- landLeaseExpirationDate: "YYYY-MM-DD"
- landLeaseYearsRemaining: number
```

**Output:**
- `local-logs/flattened_all_listings_preserved.json`

**Input File:** Raw JSON from `fetch.py`

---

### 4. **seed.py** (Database Insertion)

**Location:** `src/scripts/mls/backend/seed.py`

**Purpose:** Upsert flattened listings into MongoDB.

**Key Features:**
- **Batch Upsert:** 500 listings per batch
- **Upsert Strategy:** `UpdateOne` with `upsert=True`
- **Unique Key:** `listingId`
- **Connection Retry:** 3 attempts with exponential backoff
- **Error Handling:** Continues on individual failures (BulkWriteError)

**Target Collections:**
- GPS: `listings`
- CRMLS: `crmlsListings`

**Connection:**
```python
MONGODB_URI = os.getenv("MONGODB_URI")  # From .env.local
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
db = client.get_database()
collection = db.listings  # or db.crmlsListings
```

**Normalization:**
```python
# Ensures required fields
raw["listingId"] = listing_id
raw["slug"] = slug
raw["slugAddress"] = simple_slugify(address)

# Removes Mongo _id to avoid duplicate key errors
raw.pop("_id", None)
```

---

### 5. **cache_photos.py** (Photo Caching)

**Location:** `src/scripts/mls/backend/cache_photos.py`

**Purpose:** Cache listing photos to `photos` collection.

**Features:**
- Extracts photo arrays from listings
- Stores all CDN URLs (thumb, 300, 640, 800, 1024, 1280, 1600, 2048, large)
- Marks primary photo
- Maintains display order
- Links to listingId

**Photo Schema:**
```typescript
{
  listingId: string,
  primary: boolean,
  Order: number,
  uriThumb: string,
  uri300: string,
  // ... all size variants
  caption: string,
  modificationTimestamp: Date
}
```

---

### 6. **update.py** (Incremental Updates)

**Location:** `src/scripts/mls/backend/update.py`

**Purpose:** Update existing listings with latest data.

**Features:**
- Fetches only modified listings (since last sync)
- Updates price changes
- Updates status changes
- Updates days on market
- Maintains historical data integrity

---

## ⏰ WINDOWS CRON JOB SETUP

### Current Setup

**Frequency:** Daily at 2:00 AM

**Task Scheduler Configuration:**
1. **Action:** Start a program
2. **Program:** `python.exe` (full path to your Python)
3. **Arguments:** `F:\web-clients\joseph-sardella\jpsrealtor\src\scripts\mls\backend\main.py`
4. **Start in:** `F:\web-clients\joseph-sardella\jpsrealtor\src\scripts\mls\backend`

### Creating the Task

**Option 1: GUI (Task Scheduler)**
```
1. Open Task Scheduler (taskschd.msc)
2. Create Basic Task
3. Name: "JPS MLS Replication"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   Program: C:\Python312\python.exe
   Arguments: src\scripts\mls\backend\main.py
   Start in: F:\web-clients\joseph-sardella\jpsrealtor
6. Settings:
   ✓ Run whether user is logged on or not
   ✓ Run with highest privileges
   ✓ Configure for Windows 10/11
```

**Option 2: PowerShell**
```powershell
$action = New-ScheduledTaskAction `
    -Execute "C:\Python312\python.exe" `
    -Argument "src\scripts\mls\backend\main.py" `
    -WorkingDirectory "F:\web-clients\joseph-sardella\jpsrealtor"

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

Register-ScheduledTask `
    -TaskName "JPS MLS Replication" `
    -Action $action `
    -Trigger $trigger `
    -User "SYSTEM" `
    -RunLevel Highest
```

### Manual Run (Testing)

```bash
cd F:\web-clients\joseph-sardella\jpsrealtor
python src\scripts\mls\backend\main.py
```

---

## 🆕 EXPANSION: EXPIRED & CANCELLED LISTINGS

### Business Requirements

#### Purpose
- **Lead Generation:** Use Tracerfy for skip tracing expired/cancelled listing owners
- **Outreach:** Automated voicemail drops via Drop Cowboy
- **Email Campaigns:** Contact through Resend (contact@josephsardella.com)
- **CRM Integration:** Display expired/cancelled listings in admin dashboard
- **NO Map Display:** These listings should NOT appear on public website map

#### Data Retention
- **Last 3 Months Only:** Reduce payload size and focus on fresh leads
- **Rolling Window:** Auto-cleanup listings older than 90 days

---

### Proposed Database Collections

#### **gpsExpiredListings**
```typescript
{
  _id: ObjectId,

  // Same fields as listings collection
  listingKey: string,
  listingId: string,
  standardStatus: "Expired" | "Cancelled",  // Key difference

  // Additional tracking fields
  statusChangeDate: Date,        // When it expired/cancelled
  originalListDate: Date,
  totalDaysOnMarket: number,

  // Lead tracking (for CRM)
  leadStatus: "new" | "contacted" | "skipped" | "converted",
  skipTraced: boolean,
  skipTraceDate: Date,
  voicemailSent: boolean,
  voicemailSentDate: Date,
  emailSent: boolean,
  emailSentDate: Date,

  // Owner info (from Tracerfy)
  ownerName: string,
  ownerPhone: string,
  ownerEmail: string,

  // Metadata
  createdAt: Date,
  expiresAt: Date,               // TTL: 90 days from statusChangeDate
}
```

#### **crmlsExpiredListings**
Same schema as `gpsExpiredListings`, for CRMLS MLS.

#### **gpsExpiredPhotos**
Same schema as `photos`, but links to `gpsExpiredListings.listingId`.

#### **crmlsExpiredPhotos**
Same schema as `photos`, but links to `crmlsExpiredListings.listingId`.

---

### Modified Scripts Architecture

```
src/scripts/mls/backend/
├── main.py                    # Add expired/cancelled pipelines
├── expired/
│   ├── gps/
│   │   ├── fetch.py          # Fetch expired/cancelled GPS
│   │   ├── flatten.py        # Flatten (with 3-month filter)
│   │   ├── seed.py           # Seed to gpsExpiredListings
│   │   ├── cache_photos.py   # Cache to gpsExpiredPhotos
│   │   └── cleanup.py        # Remove listings > 90 days
│   └── crmls/
│       ├── fetch.py          # Fetch expired/cancelled CRMLS
│       ├── flatten.py        # Flatten (with 3-month filter)
│       ├── seed.py           # Seed to crmlsExpiredListings
│       ├── cache_photos.py   # Cache to crmlsExpiredPhotos
│       └── cleanup.py        # Remove listings > 90 days
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Fetch Expired/Cancelled Listings

#### Create `expired/gps/fetch.py`

**Key Changes from Active Fetch:**
```python
# Filter for expired AND cancelled listings from last 3 months
from datetime import datetime, timedelta

three_months_ago = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

mls_filter = "MlsId Eq '20190211172710340762000000'"
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Expired' Or StandardStatus Eq 'Cancelled'"
date_filter = f"StatusChangeTimestamp Gt {three_months_ago}"
combined_filter = f"{mls_filter} And ({property_filter}) And ({status_filter}) And {date_filter}"
```

**Output:**
- `local-logs/expired/gps_expired_listings.json`

#### Create `expired/crmls/fetch.py`

Same as GPS but with CRMLS MLS ID:
```python
mls_filter = "MlsId Eq '20200218121507636729000000'"
```

**Output:**
- `local-logs/expired/crmls_expired_listings.json`

---

### Phase 2: Flatten with Date Filter

#### Create `expired/gps/flatten.py`

**Key Changes:**
```python
from datetime import datetime, timedelta

def flatten_listing_with_date_filter(raw: dict) -> dict | None:
    """
    Same as regular flatten, but adds expiration tracking.
    """
    standard = raw.get("StandardFields", {})

    # Get status change date
    status_change_date = standard.get("StatusChangeTimestamp")
    if status_change_date:
        try:
            change_dt = datetime.fromisoformat(status_change_date.replace("Z", "+00:00"))

            # Skip if older than 90 days
            if (datetime.now() - change_dt).days > 90:
                return None

            # Calculate expiresAt (90 days from status change)
            expires_at = change_dt + timedelta(days=90)

            flat = flatten_listing(raw)  # Use existing flatten logic

            # Add tracking fields
            flat["statusChangeDate"] = status_change_date
            flat["expiresAt"] = expires_at.isoformat()
            flat["leadStatus"] = "new"
            flat["skipTraced"] = False
            flat["voicemailSent"] = False
            flat["emailSent"] = False

            return flat
        except Exception as e:
            print(f"⚠️ Date parsing error: {e}")
            return None

    return None
```

**Output:**
- `local-logs/expired/flattened_gps_expired.json`

---

### Phase 3: Seed to Expired Collections

#### Create `expired/gps/seed.py`

**Key Changes:**
```python
collection = db.gpsExpiredListings  # Different collection

# Create TTL index for auto-cleanup
collection.create_index("expiresAt", expireAfterSeconds=0)

# Upsert with same logic as active listings
operations.append(
    UpdateOne(
        {"listingId": listing_id},
        {"$set": raw},
        upsert=True,
    )
)
```

**Target Collections:**
- GPS: `gpsExpiredListings`
- CRMLS: `crmlsExpiredListings`

---

### Phase 4: Cache Photos

#### Create `expired/gps/cache_photos.py`

**Key Changes:**
```python
# Read from gpsExpiredListings
listings_collection = db.gpsExpiredListings

# Write to gpsExpiredPhotos
photos_collection = db.gpsExpiredPhotos

# Same logic as active photo caching
```

**Target Collections:**
- GPS: `gpsExpiredPhotos`
- CRMLS: `crmlsExpiredPhotos`

---

### Phase 5: Cleanup Old Listings

#### Create `expired/gps/cleanup.py`

**Purpose:** Remove expired/cancelled listings older than 90 days (backup for TTL index).

```python
from datetime import datetime, timedelta

def cleanup_old_expired():
    """
    Remove expired listings older than 90 days.
    TTL index should handle this, but this is a safety net.
    """
    cutoff_date = datetime.now() - timedelta(days=90)

    result = db.gpsExpiredListings.delete_many({
        "statusChangeDate": {"$lt": cutoff_date.isoformat()}
    })

    print(f"🗑️ Removed {result.deleted_count} old expired GPS listings")

    # Also cleanup photos for deleted listings
    remaining_listing_ids = db.gpsExpiredListings.distinct("listingId")
    photo_result = db.gpsExpiredPhotos.delete_many({
        "listingId": {"$nin": remaining_listing_ids}
    })

    print(f"🗑️ Removed {photo_result.deleted_count} orphaned photos")
```

**Run:** Daily after seed completes

---

### Phase 6: Update main.py Pipeline

```python
SCRIPT_PIPELINES = [
    # ... existing CRMLS and GPS active pipelines ...

    # Add expired/cancelled pipelines
    ("GPS Expired", BASE_DIR / "expired" / "gps", [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "cleanup.py",
    ]),
    ("CRMLS Expired", BASE_DIR / "expired" / "crmls", [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "cleanup.py",
    ]),
]
```

---

## 🔌 API ROUTES FOR CRM ACCESS

### GET /api/expired-listings

**Purpose:** Fetch expired/cancelled listings for CRM dashboard

**Endpoint:** `src/app/api/expired-listings/route.ts`

```typescript
import { connectToDatabase } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const leadStatus = searchParams.get('leadStatus'); // "new" | "contacted" | "skipped" | "converted"
  const city = searchParams.get('city');

  await connectToDatabase();

  const query: any = {};

  if (leadStatus) query.leadStatus = leadStatus;
  if (city) query.city = city;

  // Fetch from both GPS and CRMLS
  const gpsListings = await db.gpsExpiredListings
    .find(query)
    .sort({ statusChangeDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  const crmlsListings = await db.crmlsExpiredListings
    .find(query)
    .sort({ statusChangeDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  // Merge and deduplicate by listingKey
  const allListings = [...gpsListings, ...crmlsListings];
  const uniqueListings = deduplicateByListingKey(allListings);

  return NextResponse.json({
    listings: uniqueListings,
    total: uniqueListings.length,
    page,
    limit,
  });
}
```

### GET /api/expired-listings/[listingId]

**Purpose:** Get single expired listing with photos

```typescript
export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  await connectToDatabase();

  // Try GPS first
  let listing = await db.gpsExpiredListings.findOne({
    listingId: params.listingId
  });

  let photos = [];

  if (listing) {
    photos = await db.gpsExpiredPhotos
      .find({ listingId: params.listingId })
      .sort({ Order: 1 })
      .toArray();
  } else {
    // Try CRMLS
    listing = await db.crmlsExpiredListings.findOne({
      listingId: params.listingId
    });

    if (listing) {
      photos = await db.crmlsExpiredPhotos
        .find({ listingId: params.listingId })
        .sort({ Order: 1 })
        .toArray();
    }
  }

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({
    listing,
    photos,
  });
}
```

### PATCH /api/expired-listings/[listingId]

**Purpose:** Update lead status and tracking fields

```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const body = await request.json();

  const allowedUpdates = {
    leadStatus: body.leadStatus,
    skipTraced: body.skipTraced,
    skipTraceDate: body.skipTraceDate,
    voicemailSent: body.voicemailSent,
    voicemailSentDate: body.voicemailSentDate,
    emailSent: body.emailSent,
    emailSentDate: body.emailSentDate,
    ownerName: body.ownerName,
    ownerPhone: body.ownerPhone,
    ownerEmail: body.ownerEmail,
  };

  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key =>
    allowedUpdates[key] === undefined && delete allowedUpdates[key]
  );

  await connectToDatabase();

  // Update in both collections (one will succeed)
  await db.gpsExpiredListings.updateOne(
    { listingId: params.listingId },
    { $set: allowedUpdates }
  );

  await db.crmlsExpiredListings.updateOne(
    { listingId: params.listingId },
    { $set: allowedUpdates }
  );

  return NextResponse.json({ success: true });
}
```

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. **No listings fetched**
```
❌ No listings fetched
```

**Causes:**
- SPARK_ACCESS_TOKEN is missing/invalid
- MLS ID filter is wrong
- API is down

**Solution:**
```bash
# Check token in .env.local
echo $SPARK_ACCESS_TOKEN

# Test API manually
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://replication.sparkapi.com/v1/listings?_limit=1"
```

---

#### 2. **Rate limited (429)**
```
⏳ Rate limited, waiting 3s...
```

**Causes:**
- Too many requests in short time
- Batch size too large

**Solution:**
- Script already handles this with exponential backoff
- Reduce batch size in fetch.py from 500 to 200
- Increase throttle delay from 0.3s to 1s

---

#### 3. **MongoDB connection timeout**
```
❌ Failed to connect to MongoDB after 3 attempts
```

**Causes:**
- Wrong MONGODB_URI in .env.local
- Network issues
- DigitalOcean database is down

**Solution:**
```bash
# Test connection
python -c "from pymongo import MongoClient; client = MongoClient('YOUR_URI'); client.admin.command('ping'); print('Connected!')"
```

---

#### 4. **Flatten script skips all listings**
```
⚠️ Skipped 10000 listings with no ListingKey
```

**Causes:**
- Spark API response structure changed
- StandardFields is missing

**Solution:**
- Inspect raw JSON: `local-logs/all_listings_with_expansions.json`
- Check if `StandardFields.ListingKey` exists
- Update flatten.py logic if API structure changed

---

#### 5. **Photos not caching**
```
❌ No photos found for listingId: 12345
```

**Causes:**
- Photo array is missing in listing data
- Photo expansion not requested in fetch

**Solution:**
- Check expansions in fetch.py: `EXPANSIONS = ["Rooms", "Units", "OpenHouses", "VirtualTours"]`
- Add `"Media"` to expansions if photos are in Media field

---

#### 6. **TTL index not auto-deleting**
```
Old expired listings still in database after 90 days
```

**Causes:**
- TTL index not created
- expiresAt field is string instead of Date

**Solution:**
```javascript
// In MongoDB shell
db.gpsExpiredListings.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Verify index
db.gpsExpiredListings.getIndexes()

// Check expiresAt field type
db.gpsExpiredListings.findOne({}, { expiresAt: 1 })
```

---

## 📊 MONITORING & LOGS

### Pipeline Success Indicators

```
🏠  JPS Realtor MLS Pipeline

============================================================
🏢  Starting CRMLS MLS Pipeline
============================================================

➡️  Running CRMLS/fetch.py...
✅ CRMLS/fetch.py completed successfully.

➡️  Running CRMLS/flatten.py...
✅ CRMLS/flatten.py completed successfully.

➡️  Running CRMLS/seed.py...
✅ CRMLS/seed.py completed successfully.

➡️  Running CRMLS/cache_photos.py...
✅ CRMLS/cache_photos.py completed successfully.

➡️  Running CRMLS/update.py...
✅ CRMLS/update.py completed successfully.

✅ CRMLS pipeline completed successfully.

============================================================
🏢  Starting GPS MLS Pipeline
============================================================

➡️  Running GPS/fetch.py...
✅ GPS/fetch.py completed successfully.

... (same for all GPS scripts)

🎉 All MLS pipelines finished successfully.
```

### Failure Detection

**Exit Code:** Non-zero exit code indicates failure

```bash
# Check last task run status
echo $LASTEXITCODE  # Windows PowerShell
echo $?  # Linux/Mac
```

### Log Files

**Logs Location:** `local-logs/`

```
local-logs/
├── all_listings_with_expansions.json      # GPS raw
├── flattened_all_listings_preserved.json  # GPS flattened
├── crmls/
│   ├── all_crmls_listings_with_expansions.json  # CRMLS raw
│   └── flattened_crmls_listings.json            # CRMLS flattened
└── expired/
    ├── gps_expired_listings.json          # GPS expired raw
    ├── flattened_gps_expired.json         # GPS expired flattened
    ├── crmls_expired_listings.json        # CRMLS expired raw
    └── flattened_crmls_expired.json       # CRMLS expired flattened
```

---

## 📚 RELATED DOCUMENTATION

- **[DATABASE_MODELS.md](./DATABASE_MODELS.md)** - MongoDB schema reference
- **[CRM_OVERVIEW.md](./CRM_OVERVIEW.md)** - CRM system architecture
- **[MLS_DATA_ARCHITECTURE.md](./platform/MLS_DATA_ARCHITECTURE.md)** - Multi-tenant MLS design

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Setup Expired Collections
- [ ] Create `gpsExpiredListings` collection in MongoDB
- [ ] Create `crmlsExpiredListings` collection in MongoDB
- [ ] Create `gpsExpiredPhotos` collection in MongoDB
- [ ] Create `crmlsExpiredPhotos` collection in MongoDB
- [ ] Create TTL index on `expiresAt` field (90 days)

### Phase 2: Create Fetch Scripts
- [ ] Create `src/scripts/mls/backend/expired/gps/fetch.py`
- [ ] Create `src/scripts/mls/backend/expired/crmls/fetch.py`
- [ ] Test fetch scripts manually
- [ ] Verify 3-month date filter works

### Phase 3: Create Flatten Scripts
- [ ] Create `src/scripts/mls/backend/expired/gps/flatten.py`
- [ ] Create `src/scripts/mls/backend/expired/crmls/flatten.py`
- [ ] Add date filter logic (skip > 90 days)
- [ ] Add `expiresAt` calculation
- [ ] Add lead tracking fields

### Phase 4: Create Seed Scripts
- [ ] Create `src/scripts/mls/backend/expired/gps/seed.py`
- [ ] Create `src/scripts/mls/backend/expired/crmls/seed.py`
- [ ] Update target collections to expired collections
- [ ] Test upsert logic

### Phase 5: Create Photo Cache Scripts
- [ ] Create `src/scripts/mls/backend/expired/gps/cache_photos.py`
- [ ] Create `src/scripts/mls/backend/expired/crmls/cache_photos.py`
- [ ] Update target to expired photos collections
- [ ] Test photo caching

### Phase 6: Create Cleanup Scripts
- [ ] Create `src/scripts/mls/backend/expired/gps/cleanup.py`
- [ ] Create `src/scripts/mls/backend/expired/crmls/cleanup.py`
- [ ] Add orphaned photo cleanup logic
- [ ] Test cleanup (don't delete too much!)

### Phase 7: Update Pipeline
- [ ] Update `main.py` to include expired pipelines
- [ ] Test full pipeline manually
- [ ] Verify cron job still works
- [ ] Monitor first automated run

### Phase 8: API Routes
- [ ] Create `GET /api/expired-listings` route
- [ ] Create `GET /api/expired-listings/[listingId]` route
- [ ] Create `PATCH /api/expired-listings/[listingId]` route
- [ ] Test all routes with Postman/Insomnia

### Phase 9: CRM Integration
- [ ] Build `/admin/crm/leads` page
- [ ] Display expired listings table
- [ ] Add filters (leadStatus, city, date)
- [ ] Add "Skip Trace" button (calls Tracerfy API)
- [ ] Add "Send Voicemail" button (calls Drop Cowboy)
- [ ] Add "Send Email" button (calls Resend)
- [ ] Track all actions in database

### Phase 10: Testing
- [ ] Test with 10 sample expired listings
- [ ] Verify TTL cleanup after 90 days
- [ ] Test skip trace workflow end-to-end
- [ ] Test voicemail drop workflow
- [ ] Test email send workflow
- [ ] Monitor for 1 week before full launch

---

**Last Updated:** December 2, 2025
**Status:** Current system documented, expansion plan defined
**Next Steps:** Begin Phase 1 implementation
