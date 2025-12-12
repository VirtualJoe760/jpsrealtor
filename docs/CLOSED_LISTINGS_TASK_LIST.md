# Unified Closed Listings - Simple Task List

**Date**: December 9, 2025
**Goal**: Create a unified closed listings system that mirrors our working unified active listings system

---

## What We Already Have (Working!)

✅ **Active Listings System:**
- File: `src/scripts/mls/backend/unified/unified-fetch.py`
- Fetches from all 8 MLSs with `StandardStatus='Active'`
- Goes into `unified_listings` MongoDB collection
- Perfect, don't touch it!

---

## What We Need to Do

### Task 1: Copy unified-fetch.py → unified-fetch-closed.py

**Location**: Same directory (`src/scripts/mls/backend/unified/`)

**Changes needed:**
1. Change default status from `['Active']` → `['Closed']`
   - Line 382: `default=["Closed"]`
2. Add 5-year date filter
   - In the `build_filter()` function, add:
   ```python
   # Only fetch closed listings from past 5 years
   five_years_ago = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%dT%H:%M:%S')
   filter_parts.append(f"CloseDate Ge {five_years_ago}")
   ```
3. Update output filenames
   - Change: `unified_listings_{mls_id}.json`
   - To: `unified_closed_listings_{mls_id}.json`
4. Update documentation strings
   - Change references from "active listings" to "closed listings"

That's literally it. It's almost the same file.

---

### Task 2: Copy seed.py → seed-closed.py

**Location**: Same directory (`src/scripts/mls/backend/unified/`)

**Changes needed:**
1. Change collection name:
   - From: `unified_listings`
   - To: `unified_closed_listings`
2. Update input filename pattern:
   - From: `unified_listings_*.json`
   - To: `unified_closed_listings_*.json`
3. Update documentation

---

### Task 3: Update README.md

Add section for closed listings:

```markdown
## Closed Listings (Past 5 Years)

# Fetch closed sales from all 8 MLSs
python unified-fetch-closed.py

# Seed to MongoDB
python seed-closed.py
```

---

## What We're NOT Doing

❌ Don't use the old `src/scripts/mls/backend/closed/gps/` directory (outdated, only 2 MLSs)
❌ Don't create new folder structures
❌ Don't change the working active listings system
❌ Don't overthink it!

---

## Expected Output

After running:
```bash
python unified-fetch-closed.py
python seed-closed.py
```

We'll have:
- `unified_closed_listings` collection in MongoDB
- Contains closed sales from all 8 MLSs
- Only past 5 years of data
- Same structure as `unified_listings` but for closed properties

---

## Why This Is Simple

The hard work is already done in `unified-fetch.py`:
- ✅ All 8 MLS IDs configured
- ✅ Pagination working
- ✅ Error handling
- ✅ Incremental updates
- ✅ Field mapping

We just need to:
1. Change `Active` → `Closed`
2. Add 5-year date filter
3. Change output collection name

That's it!

---

## Key Understanding

**Active Listings** → `StandardStatus='Active'` → `unified_listings`
**Closed Listings** → `StandardStatus='Closed'` + past 5 years → `unified_closed_listings`

Same script structure, different filter parameters.
