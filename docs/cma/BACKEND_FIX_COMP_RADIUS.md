# Backend Fix — Comp Radius for `build-listing-cma.py`

**For**: backend Claude / Python team
**Frontend status**: 30-mile runtime distance filter shipped as a band-aid in
`src/lib/cma/adapt-prebuilt-stats.ts` (commit pending). Backend should fix
the comp pool at source so the filter becomes a no-op.

## What's broken

`build-listing-cma.py` is writing closed comps to `cmaStats.closedComps`
that are geographically far from the subject. Real example seen on prod:

- **Subject**: 78715 Naples Drive, La Quinta, CA (Coachella Valley)
- **Closed comps written by the script**:
  - 43584 Verona Court, La Quinta ✓
  - 78572 Naples Drive, La Quinta ✓
  - 78524 San Marino Court, La Quinta ✓
  - 908 Camino Ibiza, **San Clemente** ✗ (~110 miles away, Orange County)
  - 840 28th St., **Oakland** ✗ (~415 miles away, Alameda County)

The Oakland comp is the most egregious — it shouldn't pass any reasonable
geographic filter for a Coachella Valley CMA.

## Why it matters

CMA comps drive the medians shown in the Market Snapshot, the Price
Position card, and the comp tables. An Oakland comp at $858K sale price
distorts every aggregate metric for a La Quinta subject that should be
benchmarked against ~$700K Coachella Valley sales. Sellers and buyers
making decisions off these numbers get wrong signals.

## What the frontend is doing right now

`adaptPrebuiltCmaStats(stats, listing)` runs `filterCompsByDistance(comps, subject)`
on both active and closed arrays before rendering. Filter:

- 30-mile haversine cap from `subject.latitude` / `subject.longitude`
- Comps without lat/lng pass through (we can't safely filter them)
- Subject without lat/lng → no filter applied (fail open)
- After filtering, stats are recomputed from the filtered arrays (Python's
  pre-computed avgPrice / medianPrice would otherwise still include the
  dropped comps)
- A limitation entry is added: "Trimmed N comps more than 30 miles from
  the subject."

This is a band-aid. The real fix is at the comp-pool query level in
Python.

## What to fix in `build-listing-cma.py`

Constrain the closed-comp candidate pool by geography before similarity
scoring. Recommended approach in priority order:

### Option A — radius filter via `$geoWithin` (preferred)

If `unified_closed_listings` has a 2dsphere index on a `location` GeoJSON
field (or equivalent), use `$geoWithin: { $centerSphere: [[lng, lat], radiusInRadians] }`
to query only comps within ~30 miles of the subject. This is the
fastest and most accurate filter.

```python
# Riverside / Coachella Valley subject example
center = [subject["longitude"], subject["latitude"]]
radius_miles = 30
radius_radians = radius_miles / 3963.2  # Earth radius in miles

candidates = closed_collection.find({
    "location": {
        "$geoWithin": {
            "$centerSphere": [center, radius_radians]
        }
    },
    # ... other filters: bedsTotal, livingArea, propertyType, closeDate range
})
```

### Option B — county filter

If the geo index isn't there, filter by `county` matching the subject's
county. This is coarser (Riverside County is huge) but cheap. Already
solves the Oakland (Alameda) and San Clemente (Orange) examples.

```python
candidates = closed_collection.find({
    "county": subject.get("county"),
    # ... other filters
})
```

### Option C — bounding box

If `county` isn't reliable either, compute a lat/lng bounding box from
subject coords and filter:

```python
LAT_DEGREES_PER_MILE = 1 / 69.0
LNG_DEGREES_PER_MILE = 1 / (69.0 * math.cos(math.radians(subject_lat)))
delta_lat = 30 * LAT_DEGREES_PER_MILE
delta_lng = 30 * LNG_DEGREES_PER_MILE
candidates = closed_collection.find({
    "latitude":  {"$gte": subject_lat - delta_lat, "$lte": subject_lat + delta_lat},
    "longitude": {"$gte": subject_lng - delta_lng, "$lte": subject_lng + delta_lng},
    # ... other filters
})
```

## Testing

After deploying:
1. Re-run the listing CMA build for `78715 Naples Drive, La Quinta, CA 92253`
2. Confirm the `cmaStats.closedComps` array contains zero entries with
   `city in {"Oakland", "San Clemente"}` (or any city > 30 miles from La Quinta)
3. Spot-check 5 other geographically-diverse subjects (one in west LA,
   one in Long Beach, one in Bakersfield, one in San Diego, one in
   Sacramento) — same constraint should hold
4. Once validated, the frontend filter becomes a no-op (no comps will
   ever exceed the 30-mile cap), and the limitation entry will stop
   appearing in reports

## Removing the frontend band-aid

Once the Python fix lands and prod-data is re-built (next twice-weekly
cron run after deploy), the frontend filter can be removed:

- File: `src/lib/cma/adapt-prebuilt-stats.ts`
- Functions: `haversineMiles`, `filterCompsByDistance`,
  `MAX_COMP_DISTANCE_MILES` constant
- Call sites: the 4-block of `filteredActive` / `filteredClosed` /
  `recomputedActive` / `recomputedClosed` and the limitation push

Or leave the filter in place as defense-in-depth — it adds <1ms and
guards against future regressions.

## Open questions

- Should the radius vary by tier (luxury comps may need wider net)?
- Is `subject.county` reliably populated in `unified_listings`?
- Does `unified_closed_listings` have a 2dsphere index (Option A)?
