# Backend Claude — Fix Pool/Spa on cmaStats Comp Objects

## Context

You built `build-listing-cma.py` per `docs/cma/LISTING_CMA_BACKEND_BUILDER.md`. It runs twice-weekly (Mon + Thu 1 AM) and writes a `cmaStats` subdocument to every active listing. Riverside is fully backfilled (7,073 listings, 96.4% high-confidence). Frontend integration is now wired (commit `d5844555`/`baf984e5`/`5b5c2957` on branch `chatlistings`); the listing detail page renders pre-computed CMAs in <50ms instead of the 1–20s on-demand `/api/cma/generate` call.

## The bug to fix

The CMA **comp table** column for Pool / Spa / Garage was rendering `?/?/2` for every comp, even though the same listing's subject card showed `Spa: Yes ✓` correctly. Garage rendered fine (the `2`); pool and spa came back as unknown (`?`).

I confirmed the source: **the comp objects you write into `cmaStats.activeComps[]` and `cmaStats.closedComps[]` don't carry pool/spa values reliably.** The subject sub-document does (your normalization there is solid), but the comp objects pass through with whatever the source MLS document had — which is inconsistent.

The frontend tried to mitigate by reading multiple field-name variants (`pool`, `poolYn`, `poolYN`, `Pool`, `PoolPrivateYN`, same for spa) but every comp still came back without a true/false value. Either:
1. Your script isn't writing pool/spa onto comp objects at all, OR
2. It's writing them as `null` because the source listing doc you copied them from doesn't have them populated under any of those names.

To stop the column from showing `?/?/2` and looking broken to users, **I've hidden the P/S/G column entirely on the frontend** (`src/app/components/cma/CMACompTable.tsx`). It'll come back once the comp objects carry the data correctly.

## What needs to change in `build-listing-cma.py`

**Goal:** every comp object in `cmaStats.activeComps[]` and `cmaStats.closedComps[]` should have `pool: bool | null` and `spa: bool | null` populated using the same normalization logic you already apply to the subject.

**The normalization rule** (we use this same pattern across the codebase — see `src/lib/chat-v2/listing-query.ts:194–215` and `src/lib/cma/adapt-prebuilt-stats.ts`):

```python
POOL_FIELDS = ["poolYn", "poolYN", "pool", "Pool", "PoolPrivateYN"]
SPA_FIELDS  = ["spaYn",  "spaYN",  "spa",  "Spa",  "SpaYN"]

def read_bool_flexible(doc: dict, field_names: list[str]) -> bool | None:
    """
    MLS sources populate these booleans under different field names.
    Return the first true/false found across the variants; None if none
    of the variants is a real boolean.
    """
    for name in field_names:
        v = doc.get(name)
        if v is True or v is False:
            return v
    return None

def detect_pool_from_remarks(remarks: str | None) -> bool | None:
    """Same remarks parser you use for the subject — same regexes."""
    # ... (your existing implementation)
```

**Where to apply it:**

In your `_build_comp_object()` (or whatever function constructs each comp dict for `activeComps`/`closedComps`), replace whatever currently reads `pool` / `spa` with:

```python
def _build_comp_object(comp_listing: dict) -> dict:
    # Try MLS field variants first
    pool = read_bool_flexible(comp_listing, POOL_FIELDS)
    spa  = read_bool_flexible(comp_listing, SPA_FIELDS)

    # If still unknown, fall back to remarks parsing (same fn the subject uses)
    if pool is None:
        pool = detect_pool_from_remarks(comp_listing.get("publicRemarks"))
    if spa is None:
        spa = detect_spa_from_remarks(comp_listing.get("publicRemarks"))

    return {
        "listingKey": comp_listing["listingKey"],
        # ... existing fields ...
        "pool": pool,                 # bool | None (NOT undefined / missing key)
        "spa": spa,                   # bool | None
        "view": comp_listing.get("view") or comp_listing.get("View"),
        "garageSpaces": comp_listing.get("garageSpaces", 0),
        "landType": comp_listing.get("landType", "Fee"),
        # ... rest ...
    }
```

**Important:** explicitly emit the keys with value `None` when unknown — don't omit them. The frontend distinguishes "value: null + level: unknown" (we don't know) from "value missing entirely" (we'd render `?`).

## How to verify the fix

1. Pick a Riverside listing you know has a pool (e.g., search MongoDB for `{ city: "Indian Wells", poolYn: true, standardStatus: "Active" }`, take the first listingKey).
2. Run `python build-listing-cma.py --key <listingKey> --dry-run` and inspect the printed comp objects. Each one should have `pool` and `spa` as either `true`, `false`, or `null`. Mostly `true` if the listing is in a pool-heavy community.
3. After a real run on that listing, query `db.unified_listings.findOne({listingKey: ...}, {cmaStats: 1})` and confirm `cmaStats.activeComps[0].pool` is a boolean (or null) — not missing.
4. Tell me when the run is complete and I'll un-hide the P/S/G column on the frontend (it's a 4-line revert in `CMACompTable.tsx` plus restoring the `colSpan={6}` on the median row).

## Rollout suggestion

Don't bother with a full rebuild — that's 70+ minutes per the original spec. Instead:
- Patch the script
- Run with `--limit 100` first to spot-check that comps now carry pool/spa
- If clean, run with `--city "Indian Wells"` (small high-pool subset) and verify a few listings end-to-end on the frontend (set `cmaStats.lastUpdated < some-cutoff` as a re-run filter so you don't re-process every listing)
- Then run the full rebuild on the next scheduled cron Mon/Thu 1 AM — incremental fix vs full backfill

## Frontend state when you're done

Two trivial reverts on `chatlistings`:

`src/app/components/cma/CMACompTable.tsx`:
- Line ~82: uncomment `<TableHead className={headClass}>P/S/G</TableHead>`
- Line ~111-113: uncomment `<TableCell><span title="Pool / Spa / Garage">{poolSpaGarage(comp)}</span></TableCell>`
- Line ~147: remove the comment-marked extra empty footer cell
- Line ~165: change `colSpan={5}` back to `colSpan={6}` on the Median row

Or just tell me when it's ready to flip and I'll do it.

## Why this matters

This is the third time we've hit this exact pattern (different MLS sources populate the same boolean under different field names), so it's worth standardizing:

- `src/lib/chat-v2/listing-query.ts` does it for chat-v2 search
- `src/lib/cma/adapt-prebuilt-stats.ts` does it for the frontend cmaStats adapter
- `build-listing-cma.py` should do it for the backend CMA computation

If you find a way to centralize this — e.g., a single normalization pass that runs as part of the MLS sync pipeline so `unified_listings` only ever stores `poolYn` (canonical) — that'd let everyone downstream stop carrying these flexible-field-name helpers. But that's a bigger refactor; for now, mirror the pattern in the CMA script.
