# src/scripts/mls/backend/crmls/cache_photos.py
# CRMLS Photo Caching Script
#
# Rate Limiting Strategy:
# - 4 concurrent workers (balanced speed/safety)
# - 0.3s sleep between requests
# - 60s pause every 1000 items
# - Exponential backoff on 429 errors (5s, 10s, 20s, 40s, 80s)
# - Expected rate: ~3-4 items/sec, ~2.5 hours for 33k listings

import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, UTC
from typing import Dict, Any, Set, Optional

# ──────────────────────────────────────────────────────────────────────────────
# 🔧 ENV & CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

# Load .env.local
env_path = Path(__file__).resolve().parents[5] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
MONGO_URI = os.getenv("MONGODB_URI")

if not ACCESS_TOKEN:
    raise ValueError("❌ Missing SPARK_ACCESS_TOKEN in .env.local")
if not MONGO_URI:
    raise ValueError("❌ Missing MONGODB_URI in .env.local")

# Logs live here: F:\web-clients\joseph-sardella\jpsrealtor\local-logs\crmls\photo-logs
LOG_DIR = Path(__file__).resolve().parents[5] / "local-logs" / "crmls" / "photo-logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# A single, ever-growing index of listingIds we should skip next runs
SKIP_INDEX_PATH = LOG_DIR / "skip_index.json"

# Per-run JSONL for auditability
RUN_ID = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
RUN_LOG_PATH = LOG_DIR / f"run_{RUN_ID}.jsonl"

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json",
}

# ──────────────────────────────────────────────────────────────────────────────
# 🗃️ DB
# ──────────────────────────────────────────────────────────────────────────────

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000, socketTimeoutMS=20000)
    db = client.get_database()
    photos_collection = db.photos
    listings_collection = db.crmls_listings  # CRMLS collection
    print("✅ Connected to MongoDB (CRMLS)")
except Exception as e:
    raise Exception(f"❌ Failed to connect to MongoDB: {e}")

# ──────────────────────────────────────────────────────────────────────────────
# 🧾 Skip Index Helpers
# ──────────────────────────────────────────────────────────────────────────────

def load_skip_index() -> Set[str]:
    if not SKIP_INDEX_PATH.exists():
        return set()
    try:
        with SKIP_INDEX_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and "listingIds" in data:
                return set(str(x) for x in data["listingIds"])
            if isinstance(data, list):
                return set(str(x) for x in data)
    except Exception as e:
        print(f"⚠️ Could not read skip index ({SKIP_INDEX_PATH}): {e}")
    return set()

def persist_skip_index(skip_ids: Set[str]) -> None:
    tmp_path = SKIP_INDEX_PATH.with_suffix(".json.tmp")
    payload = {"listingIds": sorted(list(skip_ids))}
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    tmp_path.replace(SKIP_INDEX_PATH)

def append_run_log(entry: Dict[str, Any]) -> None:
    entry = {"ts": datetime.now(UTC).isoformat(), **entry}
    with RUN_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

def mark_skipped(listing_id: str, slug: Optional[str], reason: str, extra: Optional[Dict[str, Any]] = None) -> None:
    global _skip_ids, _skip_persist_counter
    _skip_ids.add(str(listing_id))
    append_run_log({
        "event": "skipped",
        "listingId": listing_id,
        "slug": slug,
        "reason": reason,
        **(extra or {}),
    })
    # Batch persist: only write to disk every 100 skips
    _skip_persist_counter += 1
    if _skip_persist_counter >= 100:
        persist_skip_index(_skip_ids)
        _skip_persist_counter = 0

def mark_success(listing_id: str, slug: Optional[str], photo_id: Optional[str]) -> None:
    append_run_log({
        "event": "cached",
        "listingId": listing_id,
        "slug": slug,
        "photoId": photo_id,
    })

def mark_error(listing_id: Optional[str], slug: Optional[str], msg: str) -> None:
    append_run_log({
        "event": "error",
        "listingId": listing_id,
        "slug": slug,
        "message": msg,
    })

# ──────────────────────────────────────────────────────────────────────────────
# 🌐 Spark API
# ──────────────────────────────────────────────────────────────────────────────

def fetch_listing_photos(slug: str, retries: int = 5):
    url = f"https://replication.sparkapi.com/v1/listings/{slug}/photos"
    for attempt in range(retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code == 200:
                return res.json().get("D", {}).get("Results", [])
            elif res.status_code == 403:
                # Permanent permission denied → return marker
                return {"_403": True, "body": res.text}
            elif res.status_code == 429 or "over rate" in res.text.lower():
                # Exponential backoff for rate limits: 5s, 10s, 20s, 40s, 80s
                wait = 5 * (2 ** attempt)
                print(f"⏳ RATE LIMITED on {slug}, waiting {wait}s... (attempt {attempt+1}/{retries})")
                time.sleep(wait)
            else:
                # Other errors: short retry
                if attempt < retries - 1:
                    print(f"⚠️ HTTP {res.status_code} on {slug}, retrying...")
                    time.sleep(2 ** attempt)
                else:
                    raise Exception(f"HTTP {res.status_code}: {res.text[:200]}")
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise Exception(f"❌ Max retries reached for {slug}: {e}")
            time.sleep(2 ** attempt)
    raise Exception(f"❌ Max retries reached for {slug}")

# ──────────────────────────────────────────────────────────────────────────────
# 📦 Worker
# ──────────────────────────────────────────────────────────────────────────────

def cache_photo_for_listing(listing: Dict[str, Any]) -> str:
    slug = listing.get("slug")
    listing_id = str(listing.get("listingId")) if listing.get("listingId") else None

    if not slug or not listing_id:
        mark_skipped(listing_id or "unknown", slug, reason="missing-required-fields")
        return f"⚠️ Skipped: missing slug or listingId for {listing.get('_id', 'unknown')}"

    if listing_id in _skip_ids:
        return f"⏭️ Pre-skipped {slug} (in skip_index)"

    # Fast lookup: check against pre-fetched cached set
    if listing_id in _already_cached:
        mark_skipped(listing_id, slug, reason="already-cached")
        return f"⏩ Skipped {slug} (already cached)"

    try:
        photos = fetch_listing_photos(slug)

        # Handle permanent 403 denial
        if isinstance(photos, dict) and photos.get("_403"):
            mark_skipped(listing_id, slug, reason="permission-denied", extra={"response": photos["body"]})
            return f"🚫 Permission denied for {slug} (skipped permanently)"

        if not photos:
            mark_skipped(listing_id, slug, reason="no-photos")
            return f"⚠️ No photos for {slug}"

        primary = photos[0]
        doc = {
            "listingId": listing_id,
            "photoId": primary.get("Id"),
            "caption": primary.get("Caption"),
            "uriThumb": primary.get("UriThumb"),
            "uri300": primary.get("Uri300"),
            "uri640": primary.get("Uri640"),
            "uri800": primary.get("Uri800"),
            "uri1024": primary.get("Uri1024"),
            "uri1280": primary.get("Uri1280"),
            "uri1600": primary.get("Uri1600"),
            "uri2048": primary.get("Uri2048"),
            "uriLarge": primary.get("UriLarge"),
            "primary": primary.get("Primary", True),
        }

        if not doc["photoId"]:
            mark_skipped(listing_id, slug, reason="no-photo-id")
            return f"⚠️ No valid photoId for {slug}"

        photos_collection.update_one({"photoId": doc["photoId"]}, {"$set": doc}, upsert=True)
        mark_success(listing_id, slug, photo_id=doc["photoId"])
        # Conservative 0.3s sleep to avoid rate limits (still faster than original 0.5s)
        time.sleep(0.3)
        return f"✅ Cached photo for {slug}"
    except Exception as e:
        mark_error(listing_id, slug, msg=str(e))
        return f"❌ Failed for {slug}: {e}"

# ──────────────────────────────────────────────────────────────────────────────
# 🚀 Main
# ──────────────────────────────────────────────────────────────────────────────

_skip_ids: Set[str] = set()
_already_cached: Set[str] = set()
_skip_persist_counter: int = 0

def main():
    global _skip_ids, _already_cached

    print("🚀 Starting SAFE & FAST photo caching for CRMLS listings...")
    print("⚙️  Settings: 4 workers, 0.3s sleep, 60s pause every 1000 items")
    _skip_ids = load_skip_index()
    print(f"🧾 Loaded skip index with {len(_skip_ids)} listingIds")

    # Pre-fetch already cached listingIds for fast lookup
    print("🔍 Pre-fetching already cached photos...")
    try:
        cached_cursor = photos_collection.find({}, {"listingId": 1})
        _already_cached = set(str(doc["listingId"]) for doc in cached_cursor if "listingId" in doc)
        print(f"✅ Found {len(_already_cached)} already cached photos")
    except Exception as e:
        print(f"⚠️ Failed to fetch cached photos: {e}")

    try:
        listings_cursor = listings_collection.find({}, {"slug": 1, "listingId": 1})
        listings = list(listings_cursor)
        if not listings:
            print("❌ No CRMLS listings found in MongoDB")
            return
    except Exception as e:
        print(f"❌ Failed to query CRMLS listings: {e}")
        return

    total = len(listings)
    print(f"📊 Total CRMLS listings: {total}")

    # Filter out already processed
    listings = [l for l in listings if l.get("listingId") and str(l["listingId"]) not in _skip_ids and str(l.get("listingId")) not in _already_cached]
    print(f"🧹 After filtering: {len(listings)} listings to process")

    if len(listings) == 0:
        print("✅ All CRMLS listings already processed!")
        return

    failed = 0
    processed = 0
    cached = 0
    batch_size = 1000  # Conservative batch size
    start_time = time.time()

    # Increased workers from 2 to 4 (balanced speed/rate-limit safety)
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(cache_photo_for_listing, l) for l in listings]

        for i, future in enumerate(as_completed(futures), 1):
            try:
                result = future.result()
            except Exception as e:
                failed += 1
                print(f"❌ Worker crashed: {e}")
                continue

            processed += 1
            if result and "✅" in result:
                cached += 1
            elif result and "❌" in result:
                failed += 1

            # Progress indicator every 100 items
            if processed % 100 == 0:
                elapsed = time.time() - start_time
                rate = processed / elapsed
                eta = (len(listings) - processed) / rate if rate > 0 else 0
                print(f"📈 Progress: {processed}/{len(listings)} ({processed/len(listings)*100:.1f}%) | "
                      f"Cached: {cached} | Failed: {failed} | "
                      f"Rate: {rate:.1f}/s | ETA: {eta/60:.1f}m")

            # Batch pause every 1000 items to avoid rate limits
            if processed % batch_size == 0 and processed < len(listings):
                print(f"😴 Processed {processed} items — pausing 60s to avoid rate limits...")
                persist_skip_index(_skip_ids)  # Save progress
                time.sleep(60)  # Longer pause for safety
                print("✅ Resuming...\n")

    # Final persist
    persist_skip_index(_skip_ids)

    elapsed = time.time() - start_time
    append_run_log({
        "event": "run_complete",
        "processed": processed,
        "cached": cached,
        "failed": failed,
        "skip_index_size": len(_skip_ids),
        "duration_seconds": elapsed,
    })

    print(f"\n🏁 CRMLS Run complete!")
    print(f"   Processed: {processed}/{total}")
    print(f"   Cached: {cached}")
    print(f"   Failed: {failed}")
    print(f"   Duration: {elapsed/60:.1f} minutes")
    print(f"   Rate: {processed/elapsed:.1f} items/sec")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Unhandled error in CRMLS cache_photos.py: {e}")
