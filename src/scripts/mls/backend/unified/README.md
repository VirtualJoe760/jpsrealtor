# Unified MLS Data Pipeline

**Last Updated**: December 9, 2025
**Status**: ✅ Production Ready
**Coverage**: All 8 MLS Associations
- **Active Listings**: 87,562+ properties (unified_listings)
- **Closed Sales**: Past 5 years (unified_closed_listings)

---

## 🚀 Quick Start for VPS Cron Setup

**Everything is ready!** Just add this cron job:

```bash
# Open crontab editor
crontab -e
```

**Add this line** (replace `/path/to/jpsrealtor` with your actual path):

```cron
0 6 * * * cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1
```

**That's it!** The pipeline will run daily at 6:00 AM.

---

## What the Daily Job Does

1. ✅ **Fetches listings modified in last 24 hours** (incremental update)
2. ✅ **Flattens** to camelCase format
3. ✅ **Seeds** to MongoDB `unified_listings` collection
4. ✅ **Updates statuses** (Active → Pending → Closed)
5. ✅ **Moves sold listings** to `closed_listings` collection

**Time**: ~2-3 hours (runs 6:00 AM → 8:00-9:00 AM)

---

## Pipeline Components

### Active Listings (Daily Updates)

| Script | Purpose | Run Time |
|--------|---------|----------|
| **`main.py`** | Daily orchestrator - Runs all steps | ~2-3 hours |
| `unified-fetch.py` | Fetch active listings from all 8 MLSs | ~1.5 hours |
| `flatten.py` | Transform to camelCase | ~5 min |
| `seed.py` | Upsert to `unified_listings` collection | ~10 min |
| `update-status.py` | Update statuses (Active → Closed) | ~30-60 min |

### Closed Listings (Weekly/Monthly)

| Script | Purpose | Run Time |
|--------|---------|----------|
| **`closed/fetch.py`** | Fetch closed sales (past 5 years) | ~2-3 hours |
| `closed/seed.py` | Upsert to `unified_closed_listings` collection | ~15 min |

**Location**: `closed/` subdirectory
**Documentation**: See `closed/README.md`

---

## Supported MLSs

1. **GPS** - Greater Palm Springs
2. **CRMLS** - California Regional MLS
3. **CLAW** - Combined LA/Westside
4. **SOUTHLAND** - Southland Regional
5. **HIGH_DESERT** - High Desert Association
6. **BRIDGE** - Bridge MLS
7. **CONEJO_SIMI_MOORPARK** - Conejo Simi Moorpark
8. **ITECH** - iTech MLS

**Total**: 87,562+ active listings

---

## Prerequisites (Already Met)

✅ Python 3.8+ installed
✅ `.env.local` with `SPARK_ACCESS_TOKEN` and `MONGODB_URI`
✅ Python packages: `pymongo`, `python-dotenv`, `requests`
✅ All scripts created and tested

---

## Cron Job Setup

### Step 1: Find Your Python Path

```bash
which python3
# Example output: /usr/bin/python3
```

### Step 2: Find Your Project Path

```bash
pwd
# Example output: /home/user/jpsrealtor
# or: /var/www/jpsrealtor
```

### Step 3: Edit Crontab

```bash
crontab -e
```

### Step 4: Add Cron Job

Use the paths from steps 1 and 2:

```cron
# Daily MLS update at 6:00 AM
0 6 * * * cd /home/user/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1
```

**Replace**:
- `/home/user/jpsrealtor` → your actual project path
- `/usr/bin/python3` → your actual python path (if different)

### Step 5: Save and Exit

- **Vim**: Press `Esc`, type `:wq`, press Enter
- **Nano**: Press `Ctrl+X`, then `Y`, then Enter

### Step 6: Verify

```bash
# List cron jobs
crontab -l

# Check cron service is running
sudo systemctl status cron  # Ubuntu/Debian
sudo systemctl status crond # CentOS/RHEL
```

---

## Test Manually Before Cron

```bash
# Navigate to project
cd /path/to/jpsrealtor

# Test with dry run (no database writes)
python3 src/scripts/mls/backend/unified/main.py --dry-run

# Test with single MLS
python3 src/scripts/mls/backend/unified/main.py --mls GPS

# Full production test
python3 src/scripts/mls/backend/unified/main.py
```

---

## Command-Line Options

### Basic Usage

```bash
# Full daily update (default for cron)
python3 main.py

# Update specific MLSs only
python3 main.py --mls GPS CRMLS

# Skip status update (faster, fetch + seed only)
python3 main.py --skip-status-update

# Dry run (no database writes)
python3 main.py --dry-run
```

### Advanced Options

```bash
# Full refetch (not incremental) - use only for initial setup
python3 main.py --full-refetch

# Help
python3 main.py --help
```

---

## Monitoring

### View Logs

```bash
# Real-time log viewing
tail -f /var/log/mls-update.log

# View last 100 lines
tail -n 100 /var/log/mls-update.log

# Search for errors
grep -i error /var/log/mls-update.log
grep -i failed /var/log/mls-update.log
```

### Status Logs

Detailed JSON logs saved after each run:

```bash
ls -lh local-logs/status-logs/
cat local-logs/status-logs/status_update_20251207_060000.json
```

**Example**:
```json
{
  "timestamp": "2025-12-07T06:32:15Z",
  "total_checked": 87562,
  "status_updated": 234,
  "sold_moved_to_closed": 89,
  "offmarket_removed": 12,
  "unchanged": 87227,
  "elapsed_seconds": 1847.3
}
```

---

## Data Flow

```
Daily at 6:00 AM
  ↓
[Step 1] unified-fetch.py
  - Fetches listings modified in last 24 hours
  - Uses _expand=Media,OpenHouses,VirtualTours
  - Queries all 8 MLSs
  - Output: local-logs/all_*.json
  ↓
[Step 2] flatten.py
  - Converts to camelCase
  - Derives mlsSource, propertyTypeName, slugs
  - Output: local-logs/flattened_unified_*.json
  ↓
[Step 3] seed.py
  - Upserts to unified_listings collection
  - Creates/updates indexes
  - Batch size: 500 listings
  ↓
[Step 4] update-status.py
  - Checks all Active/Pending listings
  - Moves Closed → closed_listings
  - Updates timestamps
  ↓
Complete
  - unified_listings: Updated
  - closed_listings: New sold listings added
  - Logs: Saved to local-logs/status-logs/
```

---

## Database Collections

### unified_listings

Main collection - All active listings from all 8 MLSs

```javascript
{
  listingKey: "20190608182210368068000000",
  mlsId: "20190211172710340762000000",
  mlsSource: "GPS",
  standardStatus: "Active",
  listPrice: 500000,
  bedsTotal: 3,
  bathroomsTotalInteger: 2,
  unparsedAddress: "123 Main St, Palm Springs, CA 92262",
  coordinates: {
    type: "Point",
    coordinates: [-116.5453, 33.8303]
  },
  media: [
    {
      mediaKey: "...",
      uri1024: "https://photos.sparkplatform.com/...",
      order: 0
    }
  ]
}
```

### closed_listings

Archive collection - Sold/Closed listings

Same schema as `unified_listings`, but:
- `standardStatus: "Closed"`
- `closedDate: "2025-12-07T06:00:00Z"`

---

## Troubleshooting

### Cron job doesn't run

**Check**:
```bash
sudo systemctl status cron
grep CRON /var/log/syslog  # Ubuntu
grep CRON /var/log/cron    # CentOS
```

**Fix**:
```bash
sudo systemctl restart cron
```

---

### Environment variables not loaded

**Symptom**: `Missing SPARK_ACCESS_TOKEN`

**Fix**: Set variables in crontab directly:

```cron
SPARK_ACCESS_TOKEN=your_token_here
MONGODB_URI=your_mongodb_uri_here
0 6 * * * cd /path/to/jpsrealtor && python3 src/scripts/mls/backend/unified/main.py
```

---

### Rate limiting (429 errors)

**Symptom**: `⏳ Rate limited, waiting...`

**Fix**: Already handled automatically with:
- Exponential backoff
- Batch pauses every 1000 requests
- 5 concurrent workers max

---

### MongoDB connection timeout

**Check**:
```bash
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
client.admin.command('ping')
print('✅ MongoDB connected')
"
```

---

## Initial Setup (One-Time)

If running for the **first time** (no data in DB yet):

```bash
# Full population (~8-10 hours)
python3 main.py --full-refetch

# Or fetch MLSs one at a time
python3 main.py --full-refetch --mls GPS
python3 main.py --full-refetch --mls CRMLS
# ... etc
```

After initial population, switch to incremental (automatic in cron).

---

## Expected Timeline

| Step | Duration |
|------|----------|
| Fetch (incremental) | ~1.5 hours |
| Flatten | ~5 minutes |
| Seed | ~10 minutes |
| Status Update | ~30-60 minutes |
| **Total** | **~2-3 hours** |

Starts: **6:00 AM**
Finishes: **~8:00-9:00 AM**

---

## 📊 Closed Listings Pipeline (NEW!)

**Purpose**: Fetch closed sales from past 5 years for appreciation analysis, market stats, and investment calculations.

**Location**: `closed/` subdirectory
**Full Documentation**: See `closed/README.md`

### Quick Start - Closed Listings

```bash
# 1. Fetch closed sales from all 8 MLSs (past 5 years)
python3 closed/fetch.py -y

# 2. Seed to MongoDB
python3 closed/seed.py

# Done! Data is now in unified_closed_listings collection
```

### Options

```bash
# Fetch from specific MLS only
python3 closed/fetch.py --mls GPS

# Custom lookback period (default: 5 years)
python3 closed/fetch.py --years 3

# Auto-confirm all MLSs (no prompts)
python3 closed/fetch.py -y

# Seed from specific file
python3 closed/seed.py --input local-logs/closed/closed_5y_GPS_listings.json

# Recreate indexes only
python3 closed/seed.py --indexes-only
```

### Key Differences from Active Listings

| Feature | Active Listings | Closed Listings |
|---------|-----------------|-----------------|
| **Script Location** | `unified-fetch.py` (root) | `closed/fetch.py` (subdir) |
| **Filter** | `StandardStatus='Active'` | `StandardStatus='Closed'` |
| **Date Range** | All time | Past 5 years only |
| **Collection** | `unified_listings` | `unified_closed_listings` |
| **Update Frequency** | Daily (incremental) | Weekly/monthly (full refetch) |
| **TTL Index** | None | 5 years (auto-delete old data) |
| **Purpose** | Map display, search | Appreciation, CMA, market stats |

### Automation (Optional Cron)

Run weekly to refresh closed sales data:

```cron
# Every Sunday at 2:00 AM
0 2 * * 0 cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/closed/fetch.py -y && /usr/bin/python3 src/scripts/mls/backend/unified/closed/seed.py >> /var/log/mls-closed-update.log 2>&1
```

### Data Retention

The `unified_closed_listings` collection has a **TTL index** that automatically deletes sales older than 5 years. This keeps the collection size manageable while providing sufficient historical data for appreciation analysis.

**For complete documentation**, see `closed/README.md`

---

## Related Documentation

- **Photo Fix**: `docs/photos/PHOTO_FIX_COMPLETE.md`
- **Pipeline Analysis**: `PHOTO_PIPELINE_ANALYSIS.md`
- **MLS Architecture**: `docs/listings/UNIFIED_MLS_ARCHITECTURE.md`
- **Replication Guide**: `docs/misc/REPLICATION_GUIDE.md`
- **Closed Listings Architecture**: `docs/UNIFIED_CLOSED_LISTINGS_ARCHITECTURE.md`
- **Analytics System**: `docs/REAL_ESTATE_ANALYTICS_ARCHITECTURE.md`

---

## Support

For issues:
1. ✅ Check logs: `/var/log/mls-update.log` (active) or `/var/log/mls-closed-update.log` (closed)
2. ✅ Check status logs: `local-logs/status-logs/`
3. ✅ Test manually: `python3 main.py --dry-run`
4. ✅ Review this README

---

**Last Updated**: December 9, 2025
**Maintained By**: Development Team
**Status**: ✅ Production Ready
- ✅ Active listings pipeline (daily cron)
- ✅ Closed listings pipeline (weekly/monthly)
