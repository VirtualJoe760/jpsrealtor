---
title: Prompt for backend Claude — flatten script date-typing fix
status: current
last_verified: 2026-06-04
related: [./README.md]
---

# Prompt for backend Claude — flatten script date-typing fix

Copy the section below this line into the backend Claude on the PC that
owns the MLS sync pipeline. It's self-contained — no prior context needed.

---

## Task: convert ISO date strings to `datetime` in the flatten layer

### Context (what's broken and why)

The Mongoose models on the Next.js side declare `onMarketDate`,
`closeDate`, `onMarketTimestamp`, `closeDateTimestamp`,
`statusChangeTimestamp`, `modificationTimestamp`, and similar fields as
`type: Date`. The MongoDB documents written by our Python sync currently
store these as ISO 8601 **strings** (`"2026-05-07T07:18:17Z"` and the
older date-only form `"2021-06-17"`).

Mongoose's query-time auto-cast converts our incoming `Date` filter
values to `Date` objects before sending the query to MongoDB. Mongo
then compares BSON Date to BSON String — a type-ranked comparison that
silently never matches. Result: every date-range query
(`{onMarketDate: { $gte: cutoff }}`) returns zero matches for
string-typed docs.

A one-time data migration runs tonight at **2:00 AM** (Windows Task
Scheduler: `ChatRealty-DateMigration`) to convert all existing
string-typed values to BSON Date. You DO NOT need to run any
migration — the data will be normalized by tomorrow morning.

**Your job:** make the flatten/sync layer write `datetime` objects from
now on, so the migration's work isn't undone the next time the sync
runs and overwrites those docs.

### Files in scope

Apply the same fix in each. They all flatten Spark API responses (where
date fields are strings) into MongoDB documents.

```
src/scripts/mls/backend/flatten.py
src/scripts/mls/backend/unified/flatten.py
src/scripts/mls/backend/crmls/flatten.py
src/scripts/mls/backend/closed/gps/flatten.py
src/scripts/mls/backend/closed/crmls/flatten.py
```

Also (write sites that bypass flatten and assign date fields directly):

```
src/scripts/mls/backend/update-unified-closed.py       # closeDate, statusChangeTimestamp
src/scripts/mls/backend/unified/update-status.py       # statusChangeTimestamp
src/scripts/mls/backend/update.py                      # statusChangeTimestamp
src/scripts/mls/backend/crmls/update.py                # statusChangeTimestamp
src/scripts/mls/backend/master_sync.py                 # any date assignments here
```

### Helper function to add

Put this near the top of each file (or in a shared `utils.py` if you
prefer a single source — current layout suggests one helper per file
since they don't share much else):

```python
from datetime import datetime, timezone

def to_datetime(v):
    """Convert an ISO 8601 string to a Python datetime so PyMongo stores
    it as a BSON Date, not a String. Pass-through on datetime; None on
    bad input.

    Handles both forms Spark sends:
      - Full ISO with Z: "2026-05-07T07:18:17Z"
      - Date-only:       "2021-06-17"
    """
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if not isinstance(v, str):
        return v
    s = v.strip()
    if not s:
        return None
    try:
        # Python < 3.11 doesn't parse trailing Z
        iso = s[:-1] + "+00:00" if s.endswith("Z") else s
        # Date-only "YYYY-MM-DD" → assume midnight UTC
        if len(iso) == 10:
            return datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)
        return datetime.fromisoformat(iso)
    except (ValueError, TypeError):
        return None
```

### Where to apply it in the flatten files

In each flatten script, after `camelize_keys(standard)` writes the
strings into `output`, post-process the known date fields. Example
shape (adapt the field list to what each MLS source actually has):

```python
DATE_FIELDS = [
    "onMarketDate",
    "offMarketDate",
    "closeDate",
    "purchaseContractDate",
    "listingContractDate",
    "expirationDate",
    "statusChangeTimestamp",
    "modificationTimestamp",
    "originalEntryTimestamp",
    "photosChangeTimestamp",
    "priceChangeTimestamp",
    "majorChangeTimestamp",
    # Add any other *Date / *Timestamp fields the sync produces.
]

for k in DATE_FIELDS:
    if k in output:
        output[k] = to_datetime(output[k])
```

Place this block right after `output.update(camelize_keys(standard))`
in each flatten file.

### Where to apply it in the update scripts (non-flatten writes)

In `update-unified-closed.py`, `update-status.py`, etc., these scripts
sometimes assign date fields directly outside the flatten path. Wrap
each direct assignment. Example diff for `update-unified-closed.py`:

```diff
-if spark_close_date:
-    closed_doc["closeDate"] = spark_close_date
+if spark_close_date:
+    closed_doc["closeDate"] = to_datetime(spark_close_date)
 elif not closed_doc.get("closeDate"):
-    closed_doc["closeDate"] = (
-        spark_ts or
-        closed_doc.get("statusChangeTimestamp") or
-        datetime.now(timezone.utc).isoformat()
-    )
+    closed_doc["closeDate"] = to_datetime(
+        spark_ts or
+        closed_doc.get("statusChangeTimestamp")
+    ) or datetime.now(timezone.utc)
```

Same pattern for `statusChangeTimestamp` assignments wherever they
appear.

### Test plan

1. Run the flatten script on a small input set (one MLS, ~100 listings).
2. Open the produced JSON output. Confirm `onMarketDate`, `closeDate`,
   and `statusChangeTimestamp` are now `datetime` objects (or `None`),
   not strings. In a JSON dump they'll serialize as
   `"2026-05-07 07:18:17+00:00"` — the JSON serializer will need a
   default like `default=str` if you're dumping for inspection.
3. Run the sync into a staging collection (or a small live update with
   a known listingKey) and read the doc back via `mongosh`:

   ```js
   db.unified_closed_listings.findOne({ listingKey: "<known key>" }, { closeDate: 1, statusChangeTimestamp: 1 })
   ```

   Confirm both come back as `ISODate(...)`, not as plain strings.

4. Pick any one of these Next.js API endpoints and confirm it returns
   matching results in a date range:

   ```
   GET /api/skill/listings/closed/search?city=Palm+Desert&lookbackMonths=6
   ```

   It should return the recent closed sales in Palm Desert. Before the
   fix, this returned `{count: 0}` for string-typed docs.

### What's already done on the Next.js side (no action needed)

- Mongoose schemas were updated (`poolYn` → `poolYN` with aliases, plus
  matching for `spaYN`, `viewYN`, `coolingYN`, `heatingYN`,
  `seniorCommunityYN`, `associationYN`). These match what the Python
  sync has always written; the schemas had wrong casing.
- The `/api/skill/listings/search`, `/api/skill/listings/closed/search`,
  and `/api/skill/listings/[listingKey]/comparables` routes already
  handle both `Date` and `String` types via a dual-branch `$or` and
  bypass Mongoose query casting via `.collection.find()`. They keep
  working regardless of how new docs are written, but your fix lets
  us simplify those routes back to a single-branch query in a future
  cleanup.

### Don't migrate or touch existing data

A scheduled task is normalizing the existing string-typed values to
BSON Date at 2:00 AM tonight. Don't run any data migration of your own
— you'd race the scheduled job and double-update some docs. Only update
the WRITE-SIDE flatten/sync code so new writes start fresh in Date form.

### When you're done

Reply with:

1. The list of files you actually changed
2. Which DATE_FIELDS you ended up including in each flatten script (the
   list above is a starting point — adjust to what's really emitted)
3. The test output showing one doc with `ISODate(...)` after the change
