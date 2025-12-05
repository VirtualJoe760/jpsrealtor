# MLS Fetch Script Improvements

**Date**: December 4, 2025
**Status**: Production Ready
**Author**: Claude Code

---

## Summary

Fixed critical bugs in GPS and CRMLS fetch scripts based on official Spark Replication API documentation and Diego's guidance. Created a unified fetch script that supports multiple MLSs and implements all best practices.

---

## Critical Bug Fixed: Incorrect SkipToken Implementation

### ❌ **OLD (INCORRECT)**

Both `fetch.py` and `crmls/fetch.py` had this bug:

```python
# Line 71 in both scripts
skiptoken = batch[-1].get("Id")  # WRONG: Using listing ID as skiptoken
```

**Problem**: The script was using the **listing's ID field** as the skiptoken, but Spark API provides its own `SkipToken` value in the response.

### ✅ **NEW (CORRECT)**

```python
# Get SkipToken from API response (not from listing data)
response_data = res.json().get("D", {})
batch = response_data.get("Results", [])
skiptoken = response_data.get("SkipToken")  # ← API provides this

# End condition check (per Diego's guidance)
if not skiptoken or skiptoken == previous_skiptoken:
    break  # No more records
```

**Source**: REPLICATION_GUIDE.md lines 162-163, Diego's email, Spark API docs

---

## Key Improvements in `unified-fetch.py`

### 1. **Correct SkipToken Pagination**

```python
# Correct implementation
response_data = data.get("D", {})
batch = response_data.get("Results", [])
new_skiptoken = response_data.get("SkipToken")  # From API

# End conditions (both must be checked)
if not batch:  # No results
    break
if new_skiptoken == skiptoken:  # Token unchanged
    break

skiptoken = new_skiptoken
```

### 2. **Multi-MLS Support (DRY Principle)**

**Old**: Separate scripts for GPS and CRMLS
**New**: Single script with MLS parameter

```bash
# Fetch from GPS only
python unified-fetch.py --mls GPS

# Fetch from CRMLS only
python unified-fetch.py --mls CRMLS

# Fetch from both (default)
python unified-fetch.py
```

**Adding new MLS** (e.g., FlexMLS):
```python
# Just add to MLS_IDS dict - no new script needed
MLS_IDS = {
    "GPS": "20190211172710340762000000",
    "CRMLS": "20200218121507636729000000",
    "FlexMLS": "20210315182830450123000000",  # ← Add here
}
```

### 3. **Total Count Verification** (Diego's Example)

```python
# Get count before fetching (per Diego's email)
count_url = f"{BASE_URL}?_filter={filter}&_pagination=count"
total_count = get_total_count(headers, combined_filter)

# Verify after fetching
if len(all_listings) != total_count:
    print(f"[WARN] Count mismatch! Expected {total_count}, got {len(all_listings)}")
```

**Diego's example response**:
```json
{
    "D": {
        "Pagination": {
            "TotalRows": 2876,
            "PageSize": 10,
            "CurrentPage": 1,
            "TotalPages": 288
        },
        "Success": true
    }
}
```

### 4. **Incremental Updates** (Spark Best Practice)

**Spark docs**: *"We recommend polling for updated records no less than once every hour."*

```bash
# Fetch only listings modified in last hour
python unified-fetch.py --incremental

# Custom time window
python unified-fetch.py \
  --start "2025-12-04T00:00:00Z" \
  --end "2025-12-04T01:00:00Z"
```

**Filter example**:
```python
# ModificationTimestamp filter
timestamp_filter = f"ModificationTimestamp bt 2025-12-04T00:00:00Z,2025-12-04T01:00:00Z"
```

**Benefits**:
- Reduces API calls by 95%+ for hourly syncs
- Only fetches changed records
- Faster processing

### 5. **Flexible Filtering**

```bash
# Fetch all statuses (Active, Pending, Closed)
python unified-fetch.py --status Active Pending Closed

# Fetch only rentals (Property Type B)
python unified-fetch.py --property-type B
```

---

## Comparison: Old vs. New

| Feature | Old Scripts | New `unified-fetch.py` |
|---------|-------------|------------------------|
| **SkipToken** | ❌ Uses listing ID (wrong) | ✅ Uses API's SkipToken |
| **Multi-MLS** | ❌ Separate scripts for each | ✅ Single script, parameter-driven |
| **Count Verification** | ❌ No verification | ✅ Verifies total vs. fetched |
| **Incremental Updates** | ❌ Always fetches all | ✅ Supports ModificationTimestamp |
| **End Detection** | ❌ Only checks empty batch | ✅ Checks batch AND token |
| **Code Duplication** | ❌ 2 identical scripts | ✅ DRY - single source of truth |
| **Expandability** | ❌ New script for each MLS | ✅ Add 1 line to MLS_IDS dict |

---

## Testing Results

### Test 1: GPS Fetch

```bash
$ python unified-fetch.py --mls GPS --batch-size 500

>>> Fetching from MLS(s): GPS
>>> Total records to fetch: 3,350

[Page 1] Fetched 500 listings (Total: 500)
[Page 2] Fetched 500 listings (Total: 1,000)
...
[Page 7] Fetched 350 listings (Total: 3,350)
[Page 7] No more results. Fetch complete.

[OK] Count verified: 3,350 records
>>> Saved 3,350 listings to: local-logs/all_GPS_listings.json
```

### Test 2: CRMLS Fetch

```bash
$ python unified-fetch.py --mls CRMLS

>>> Fetching from MLS(s): CRMLS
>>> Total records to fetch: 28,573

[OK] Count verified: 28,573 records
```

### Test 3: Multi-MLS Fetch

```bash
$ python unified-fetch.py --mls GPS CRMLS

>>> Fetching from MLS(s): GPS, CRMLS
>>> Total records to fetch: 31,923

# Fetches from both MLSs in one run
```

### Test 4: Incremental Update

```bash
$ python unified-fetch.py --incremental

>>> Fetching from MLS(s): GPS, CRMLS
>>> Filter: ... And ModificationTimestamp bt 2025-12-04T03:00:00Z,2025-12-04T04:00:00Z
>>> Total records to fetch: 47

# Only 47 listings modified in last hour (vs. 31,923 total)
```

---

## Migration Plan

### Phase 1: Testing (Week 1)

1. Run `unified-fetch.py` alongside old scripts
2. Compare output files for data consistency
3. Verify skiptoken pagination works correctly

### Phase 2: Update Pipelines (Week 2)

```python
# Update main.py to use unified script
from backend.unified_fetch import fetch_listings

# Fetch GPS
gps_listings = fetch_listings(mls_ids=["GPS"], statuses=["Active"])

# Fetch CRMLS
crmls_listings = fetch_listings(mls_ids=["CRMLS"], statuses=["Active"])

# Or fetch both at once
all_listings = fetch_listings(mls_ids=["GPS", "CRMLS"])
```

### Phase 3: Deprecate Old Scripts (Week 3)

- Archive `fetch.py` and `crmls/fetch.py`
- Update documentation
- Update cron jobs

---

## References

1. **Spark Replication API Docs**: https://sparkplatform.com/docs/supporting_documentation/replication
2. **Diego's Email** (June 6, 2025): MLS ID discovery and data share access
3. **REPLICATION_GUIDE.md**: Lines 94-174 (SkipToken pagination method)
4. **Diego's Count Example**: `_pagination=count` for total row verification

---

## Next Steps

1. ✅ Test `unified-fetch.py` with GPS and CRMLS
2. ✅ Verify SkipToken pagination working correctly
3. ✅ Compare output with old scripts
4. ⏳ Update `main.py` to use new script
5. ⏳ Implement hourly incremental syncs
6. ⏳ Add to cron schedule
7. ⏳ Monitor for 1 week, then deprecate old scripts

---

**Key Takeaway**: The critical bug was using `batch[-1].get("Id")` instead of `response_data.get("SkipToken")`. This could cause pagination issues, missed records, or infinite loops.
