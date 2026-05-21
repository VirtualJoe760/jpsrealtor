# Expired/Cancelled Listings Implementation

Complete implementation of expired and cancelled listings system for lead generation.

**Date Created:** December 2, 2025
**Status:** Ready for Testing
**Purpose:** Fetch expired/cancelled MLS listings for lead generation via Tracerfy, Drop Cowboy, and Resend

---

## 📁 Directory Structure

```
src/scripts/mls/backend/
├── expired/
│   ├── gps/
│   │   ├── fetch.py           # Fetch GPS expired/cancelled listings
│   │   ├── flatten.py         # Flatten and add lead tracking fields
│   │   ├── seed.py            # Seed to gpsExpiredListings collection
│   │   └── cache_photos.py    # Cache photos to gpsExpiredPhotos collection
│   ├── crmls/
│   │   ├── fetch.py           # Fetch CRMLS expired/cancelled listings
│   │   ├── flatten.py         # Flatten and add lead tracking fields
│   │   ├── seed.py            # Seed to crmlsExpiredListings collection
│   │   └── cache_photos.py    # Cache photos to crmlsExpiredPhotos collection
│   └── cleanup.py             # Remove listings > 90 days old
└── main.py                    # Updated to include expired pipelines
```

---

## 🗄️ Database Collections

### New Collections Created:

1. **gpsExpiredListings** - GPS expired/cancelled listings
2. **crmlsExpiredListings** - CRMLS expired/cancelled listings
3. **gpsExpiredPhotos** - Primary photos for GPS expired listings
4. **crmlsExpiredPhotos** - Primary photos for CRMLS expired listings

### TTL Index (Auto-Cleanup):

Both `gpsExpiredListings` and `crmlsExpiredListings` collections will have a TTL index on the `expiresAt` field:

```javascript
db.gpsExpiredListings.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
)

db.crmlsExpiredListings.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
)
```

This ensures MongoDB automatically deletes listings once their `expiresAt` timestamp passes.

---

## 📋 Lead Tracking Fields

Each expired listing includes these fields for CRM lead management:

```typescript
{
  // Standard listing fields...

  // Lead tracking fields (added by flatten.py)
  leadStatus: "new" | "contacted" | "qualified" | "unqualified" | "dead",
  skipTraced: boolean,
  voicemailSent: boolean,
  emailSent: boolean,
  ownerName: string | null,
  ownerPhone: string | null,
  ownerEmail: string | null,
  notes: string | null,
  lastContactDate: string | null,  // ISO date
  expiresAt: string,  // ISO date (StatusChangeTimestamp + 90 days)
}
```

---

## 🔄 Pipeline Flow

### Updated main.py Pipeline:

```python
SCRIPT_PIPELINES = [
    # Active Listings (displayed on map)
    ("CRMLS Active", CRMLS_DIR, [
        "fetch.py", "flatten.py", "seed.py", "cache_photos.py", "update.py"
    ]),
    ("GPS Active", GPS_DIR, [
        "fetch.py", "flatten.py", "seed.py", "cache_photos.py", "update.py"
    ]),

    # Closed Listings (sold properties)
    ("GPS Closed", CLOSED_GPS_DIR, [
        "fetch.py", "flatten.py", "seed.py"
    ]),
    ("CRMLS Closed", CLOSED_CRMLS_DIR, [
        "fetch.py", "flatten.py", "seed.py"
    ]),

    # Expired/Cancelled Listings (lead generation)
    ("GPS Expired", EXPIRED_GPS_DIR, [
        "fetch.py", "flatten.py", "seed.py", "cache_photos.py"
    ]),
    ("CRMLS Expired", EXPIRED_CRMLS_DIR, [
        "fetch.py", "flatten.py", "seed.py", "cache_photos.py"
    ]),
]

# After all pipelines, run cleanup
cleanup.py  # Removes listings > 90 days old
```

---

## 🚀 How to Run

### Test Individual Scripts:

```bash
# GPS Expired
python src/scripts/mls/backend/expired/gps/fetch.py
python src/scripts/mls/backend/expired/gps/flatten.py
python src/scripts/mls/backend/expired/gps/seed.py
python src/scripts/mls/backend/expired/gps/cache_photos.py

# CRMLS Expired
python src/scripts/mls/backend/expired/crmls/fetch.py
python src/scripts/mls/backend/expired/crmls/flatten.py
python src/scripts/mls/backend/expired/crmls/seed.py
python src/scripts/mls/backend/expired/crmls/cache_photos.py

# Cleanup (removes old listings)
python src/scripts/mls/backend/expired/cleanup.py
```

### Run Full Pipeline:

```bash
python src/scripts/mls/backend/main.py
```

This will run:
1. CRMLS Active pipeline
2. GPS Active pipeline
3. GPS Closed pipeline
4. CRMLS Closed pipeline
5. **GPS Expired pipeline** (NEW)
6. **CRMLS Expired pipeline** (NEW)
7. **Expired cleanup** (NEW)

---

## 📅 Data Retention

### 90-Day Window:

- **Fetch Scripts:** Only fetch listings where `StatusChangeTimestamp >= (today - 90 days)`
- **Flatten Scripts:** Calculate `expiresAt = StatusChangeTimestamp + 90 days`
- **Cleanup Script:** Delete listings where `expiresAt < now()`
- **TTL Index:** MongoDB auto-deletes when `expiresAt` passes

### Why 90 Days?

Expired listings are most valuable as leads within the first 3 months. After that:
- Owners have likely relisted with another agent
- Owners have decided not to sell
- Listing information becomes stale

---

## 🔍 Spark API Filters

### GPS Expired Fetch Filter:

```python
mls_filter = "MlsId Eq '20190211172710340762000000'"
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "(StandardStatus Eq 'Expired' Or StandardStatus Eq 'Canceled')"
date_filter = f"StatusChangeTimestamp Ge {three_months_ago}"
```

### CRMLS Expired Fetch Filter:

```python
mls_filter = "MlsId Eq '20200218121507636729000000'"
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "(StandardStatus Eq 'Expired' Or StandardStatus Eq 'Canceled')"
date_filter = f"StatusChangeTimestamp Ge {three_months_ago}"
```

---

## 📊 Local Logs

Logs are stored separately from active/closed listings:

```
local-logs/
├── expired/
│   ├── gps/
│   │   ├── all_gps_expired_listings_with_expansions.json
│   │   └── flattened_gps_expired_listings.json
│   ├── crmls/
│   │   ├── all_crmls_expired_listings_with_expansions.json
│   │   └── flattened_crmls_expired_listings.json
│   └── photo-logs/
│       ├── gps/
│       │   ├── skip_index.json
│       │   └── run_YYYYMMDD-HHMMSS.jsonl
│       └── crmls/
│           ├── skip_index.json
│           └── run_YYYYMMDD-HHMMSS.jsonl
```

---

## 🧪 Testing Checklist

Before deploying to production, test each script individually:

### GPS Expired Pipeline:

- [ ] `fetch.py` - Verify listings are fetched with 90-day filter
- [ ] `flatten.py` - Check expiresAt calculation and lead fields
- [ ] `seed.py` - Confirm data in gpsExpiredListings collection
- [ ] `cache_photos.py` - Verify photos cached to gpsExpiredPhotos

### CRMLS Expired Pipeline:

- [ ] `fetch.py` - Verify listings are fetched with 90-day filter
- [ ] `flatten.py` - Check expiresAt calculation and lead fields
- [ ] `seed.py` - Confirm data in crmlsExpiredListings collection
- [ ] `cache_photos.py` - Verify photos cached to crmlsExpiredPhotos

### Cleanup Script:

- [ ] `cleanup.py` - Verify TTL indexes are created
- [ ] `cleanup.py` - Test deletion of expired listings
- [ ] `cleanup.py` - Verify associated photos are deleted

### Integration:

- [ ] `main.py` - Run full pipeline and verify all steps complete
- [ ] Check Windows Task Scheduler cron job timing
- [ ] Monitor MongoDB collection sizes
- [ ] Verify TTL index is working (wait 24h after expiresAt passes)

---

## 🔗 Next Steps (CRM Integration)

Once scripts are tested and working:

1. **Create API Routes** (`src/app/api/expired/`)
   - `GET /api/expired/listings` - List all expired listings
   - `GET /api/expired/listings/:id` - Get single listing with details
   - `PATCH /api/expired/listings/:id` - Update lead tracking fields
   - `POST /api/expired/skip-trace` - Integrate with Tracerfy
   - `POST /api/expired/send-voicemail` - Integrate with Drop Cowboy
   - `POST /api/expired/send-email` - Integrate with Resend

2. **Build CRM UI** (`src/app/admin/crm/`)
   - Expired listings table with filters
   - Lead status tracking
   - Skip trace integration
   - Voicemail campaign management
   - Email campaign management

3. **Integrate Third-Party Services**
   - Tracerfy API for skip tracing
   - Drop Cowboy API for voicemail drops
   - Resend API for email campaigns

---

## 🚨 Important Notes

### NOT Displayed on Website:

Expired listings are **NOT** displayed on the public map or website. They are:
- Stored in separate collections (gpsExpiredListings, crmlsExpiredListings)
- Only accessible via admin CRM dashboard
- Used exclusively for lead generation

### Security:

- Lead tracking fields contain sensitive PII (names, phones, emails)
- Ensure API routes have proper authentication/authorization
- Limit access to admin users only
- Consider GDPR/CCPA compliance for skip tracing data

### Rate Limiting:

- Photo caching uses 2 workers with 0.5s delay between requests
- Respect Spark API rate limits (currently 10 requests/second)
- Monitor logs for 429 rate limit errors

---

## 📝 Summary

All scripts have been created and are ready for testing:

✅ GPS expired fetch, flatten, seed, cache_photos
✅ CRMLS expired fetch, flatten, seed, cache_photos
✅ Cleanup script with TTL index management
✅ Updated main.py with expired pipelines

**Next Action:** Test scripts individually before running full pipeline.
