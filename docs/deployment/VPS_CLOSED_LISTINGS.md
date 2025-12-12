# VPS Deployment Guide - Closed Listings Pipeline

**Date**: December 9, 2025
**For**: VPS Claude / Deployment Agent
**Purpose**: Deploy closed listings pipeline to production VPS

---

## 📋 Overview

Deploy the new **closed listings pipeline** to the production VPS and set up weekly cron job for automatic updates.

**What's New**:
- `closed/` subdirectory with fetch and seed scripts
- Weekly cron job to refresh 5 years of closed sales data
- TTL index that auto-deletes sales older than 5 years

---

## 🚀 Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /path/to/jpsrealtor
git pull origin main
```

### Step 2: Verify Directory Structure

```bash
ls -la src/scripts/mls/backend/unified/closed/
```

**Expected output**:
```
README.md
fetch.py
seed.py
```

### Step 3: Test Scripts

```bash
# Test environment loading
python3 src/scripts/mls/backend/unified/closed/fetch.py --help

# Expected: Help text with options
```

### Step 4: Verify Environment Variables

```bash
# Check .env.local has required vars
grep -E "SPARK_ACCESS_TOKEN|MONGODB_URI" .env.local
```

**Required variables**:
- `SPARK_ACCESS_TOKEN` - Spark API token
- `MONGODB_URI` - MongoDB connection string

---

## 🧪 Test Run (GPS Only)

Before running all 8 MLSs, test with GPS:

```bash
# Navigate to project root
cd /path/to/jpsrealtor

# Fetch GPS closed sales (past 5 years)
python3 src/scripts/mls/backend/unified/closed/fetch.py --mls GPS

# Expected output:
# - Progress bar showing fetch
# - ~6-8 minutes
# - File saved to local-logs/closed/closed_5y_GPS_listings.json

# Verify file exists
ls -lh local-logs/closed/closed_5y_GPS_listings.json

# Seed to MongoDB
python3 src/scripts/mls/backend/unified/closed/seed.py

# Expected output:
# - Indexes created (9 total)
# - Bulk upsert progress
# - Success message with document count
```

### Verify in MongoDB

```bash
# Connect to MongoDB and verify
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()

# Count documents
count = db.unified_closed_listings.count_documents({})
print(f'Total closed listings: {count:,}')

# Check indexes
indexes = db.unified_closed_listings.list_indexes()
print(f'\\nIndexes:')
for idx in indexes:
    print(f'  - {idx[\"name\"]}')

# Sample document
sample = db.unified_closed_listings.find_one()
if sample:
    print(f'\\nSample document has closePrice: {sample.get(\"closePrice\")}')
    print(f'Sample document has closeDate: {sample.get(\"closeDate\")}')
"
```

**Expected output**:
```
Total closed listings: 15,000-20,000
Indexes:
  - _id_
  - coordinates_2dsphere
  - mlsSource_closeDate
  - city_closeDate
  - subdivisionName_closeDate
  - propertyType_closeDate
  - listingKey_unique
  - closePrice_closeDate
  - address_closeDate
  - closeDate_ttl_5years

Sample document has closePrice: 525000
Sample document has closeDate: 2024-03-15T00:00:00Z
```

---

## ✅ Full Production Run

Once GPS test succeeds:

```bash
# Fetch all 8 MLSs (takes ~2-3 hours)
python3 src/scripts/mls/backend/unified/closed/fetch.py -y

# Seed to MongoDB (takes ~15 minutes)
python3 src/scripts/mls/backend/unified/closed/seed.py
```

**Expected data volume**: ~445,000-555,000 closed sales total

---

## 📅 Cron Job Setup

### Weekly Refresh (Recommended)

Run every Sunday at 2:00 AM to refresh closed sales data:

```bash
# Open crontab
crontab -e
```

Add this line:

```cron
# Closed Listings Weekly Refresh - Every Sunday at 2:00 AM
0 2 * * 0 cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/closed/fetch.py -y && /usr/bin/python3 src/scripts/mls/backend/unified/closed/seed.py >> /var/log/mls-closed-update.log 2>&1
```

**Replace `/path/to/jpsrealtor`** with actual project path.

### Monthly Refresh (Alternative)

If weekly is too frequent, run monthly on first Sunday:

```cron
# Closed Listings Monthly Refresh - First Sunday of month at 2:00 AM
0 2 1-7 * 0 cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/closed/fetch.py -y && /usr/bin/python3 src/scripts/mls/backend/unified/closed/seed.py >> /var/log/mls-closed-update.log 2>&1
```

### Verify Cron Job

```bash
# List cron jobs
crontab -l | grep closed

# Expected output:
# 0 2 * * 0 cd /path/to/jpsrealtor && ...
```

---

## 📊 Monitoring

### Check Logs

```bash
# View closed listings cron log
tail -f /var/log/mls-closed-update.log

# Check for errors
grep -i error /var/log/mls-closed-update.log

# Check last run
tail -100 /var/log/mls-closed-update.log
```

### Monitor Collection Size

```bash
# Check collection stats
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()

stats = db.command('collStats', 'unified_closed_listings')
print(f'Documents: {stats[\"count\"]:,}')
print(f'Size: {stats[\"size\"] / 1024 / 1024:.2f} MB')
print(f'Indexes: {stats[\"nindexes\"]}')
print(f'Total Index Size: {stats[\"totalIndexSize\"] / 1024 / 1024:.2f} MB')
"
```

### TTL Index Monitoring

The TTL index auto-deletes sales older than 5 years. MongoDB runs this cleanup every 60 seconds.

```bash
# Check TTL index
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()

indexes = list(db.unified_closed_listings.list_indexes())
for idx in indexes:
    if 'expireAfterSeconds' in idx:
        print(f'TTL Index: {idx[\"name\"]}')
        print(f'  Field: {idx[\"key\"]}')
        print(f'  Expires after: {idx[\"expireAfterSeconds\"]} seconds ({idx[\"expireAfterSeconds\"] / 86400 / 365.25:.1f} years)')
"
```

---

## 🔧 Troubleshooting

### Issue: Script can't find .env.local

**Solution**: Verify path depth

```bash
# Check script path depth
pwd
# /path/to/jpsrealtor

# Scripts are 6 levels deep:
# src/scripts/mls/backend/unified/closed/fetch.py
#  1    2      3    4       5       6

# Verify parents[6] points to project root
python3 -c "
from pathlib import Path
script_path = Path('src/scripts/mls/backend/unified/closed/fetch.py')
root = script_path.resolve().parents[5]  # 0-indexed, so parents[5] = 6 levels up
print(f'Project root: {root}')
print(f'.env.local path: {root / \".env.local\"}')
print(f'Exists: {(root / \".env.local\").exists()}')
"
```

###Issue: MongoDB connection fails

**Solution**: Check MongoDB URI

```bash
# Test MongoDB connection
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'), serverSelectionTimeoutMS=5000)
client.admin.command('ping')
print('✅ MongoDB connected successfully')
"
```

### Issue: Spark API rate limiting

**Solution**: The script has built-in retry logic and 200ms delays between requests. If you still hit rate limits, increase batch delay:

```python
# In fetch.py, line ~295
time.sleep(0.5)  # Increase from 0.2 to 0.5 seconds
```

### Issue: Cron job not running

**Solution**: Check cron logs

```bash
# Check if cron service is running
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Test cron command manually
cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/closed/fetch.py --mls GPS
```

---

## 📈 Success Criteria

After deployment, verify:

- [ ] GPS test completed successfully
- [ ] All 8 MLSs fetched successfully
- [ ] MongoDB collection `unified_closed_listings` created
- [ ] 9 indexes created (including TTL)
- [ ] Document count: ~445,000-555,000 total
- [ ] Cron job added and scheduled
- [ ] Log file created: `/var/log/mls-closed-update.log`
- [ ] TTL index configured (5 years)

---

## 🔄 Existing Active Listings Cron Job

**No changes needed!**

The existing daily active listings cron job continues to run unchanged:

```cron
# Daily Active Listings (6:00 AM)
0 6 * * * cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1
```

Now you have **two separate pipelines**:
1. **Active listings** - Daily updates (6:00 AM)
2. **Closed listings** - Weekly/monthly updates (Sunday 2:00 AM)

---

## 📝 Summary

**New files deployed**:
- `src/scripts/mls/backend/unified/closed/README.md`
- `src/scripts/mls/backend/unified/closed/fetch.py`
- `src/scripts/mls/backend/unified/closed/seed.py`

**New cron job**:
- Weekly refresh of closed sales (past 5 years)
- Runs Sunday at 2:00 AM

**New MongoDB collection**:
- `unified_closed_listings`
- 9 indexes (including TTL for auto-cleanup)
- ~445K-555K documents

**No impact on existing systems**:
- Active listings pipeline unchanged
- Daily cron job unchanged
- Existing collections unchanged

---

## 🎯 Next Steps After Deployment

1. Monitor first cron run (check logs Sunday morning)
2. Verify collection size growth over time
3. Build analytics APIs to use this data:
   - `/api/analytics/appreciation`
   - `/api/analytics/compare`
   - `/api/analytics/cma`

---

## 📞 Support

**Documentation**:
- `src/scripts/mls/backend/unified/closed/README.md` - Pipeline docs
- `docs/CLOSED_LISTINGS_COMPLETE.md` - Complete guide
- `docs/UNIFIED_CLOSED_LISTINGS_ARCHITECTURE.md` - Architecture

**Questions?**
- Check logs: `/var/log/mls-closed-update.log`
- Test manually: `python3 closed/fetch.py --mls GPS`
- Verify MongoDB: Collection `unified_closed_listings`

---

**Deployment Date**: _____________
**Deployed By**: VPS Claude
**Status**: ⬜ Pending / ✅ Complete
