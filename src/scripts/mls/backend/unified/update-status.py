#!/usr/bin/env python3
"""
Unified Status Update Script

Updates listing statuses (Active → Pending → Closed) across all 8 MLSs.
Moves Closed/Sold listings to a separate collection.

Features:
- Checks status changes for all Active/Pending/Hold/ComingSoon listings
- Moves Closed/Sold listings to closed_listings collection
- Updates status timestamps
- Rate limiting and batch processing
- Detailed logging

Usage:
    python src/scripts/mls/backend/unified/update-status.py
"""

import os
import json
import time
import requests
from pathlib import Path
from datetime import datetime, timezone
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────────────────────
# 🔧 ENV & CONFIG
# ──────────────────────────────────────────────────────────────────────────────

env_path = Path(__file__).resolve().parents[5] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
MONGO_URI = os.getenv("MONGODB_URI")
BASE_URL = "https://replication.sparkapi.com/v1/listings"

if not ACCESS_TOKEN or not MONGO_URI:
    raise ValueError("❌ Missing SPARK_ACCESS_TOKEN or MONGODB_URI in .env.local")

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json",
}

LOG_DIR = Path(__file__).resolve().parents[5] / "local-logs" / "status-logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# 🗃️ DATABASE
# ──────────────────────────────────────────────────────────────────────────────

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
db = client.get_database()
collection = db.unified_listings
closed_collection = db.closed_listings  # Closed/Sold listings from all MLSs
print("✅ Connected to MongoDB (unified_listings + closed_listings)")

# ──────────────────────────────────────────────────────────────────────────────
# 🌐 FETCH SINGLE LISTING STATUS
# ──────────────────────────────────────────────────────────────────────────────

def fetch_listing_status(listing_key: str, mls_id: str):
    """
    Query Spark for current StandardStatus + StatusChangeTimestamp for one listing.

    Uses MlsId filter to ensure we query the correct MLS association.
    """
    # Use filter approach (Diego's method) for multi-MLS support
    url = f"{BASE_URL}?_filter=MlsId Eq '{mls_id}' And ListingKey Eq '{listing_key}'&_select=ListingKey,StandardStatus,StatusChangeTimestamp&_limit=1"

    for attempt in range(3):
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code == 200:
                data = res.json().get("D", {}).get("Results", [])
                if data:
                    return data[0].get("StandardFields", {})
                return None  # No results = listing removed/off-market
            elif res.status_code in (403, 404):
                return None  # Listing removed/off-market
            elif res.status_code == 429:
                wait = 3 + attempt * 2
                print(f"⏳ Rate limited on {listing_key}, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"⚠️ HTTP {res.status_code}: {res.text[:120]}")
        except requests.RequestException as e:
            print(f"⚠️ Network error for {listing_key}: {e}")
        time.sleep(2 + attempt)
    return None

# ──────────────────────────────────────────────────────────────────────────────
# 🔁 CHECK & UPDATE SINGLE LISTING
# ──────────────────────────────────────────────────────────────────────────────

def check_listing(listing):
    """Compare Spark vs local StatusChangeTimestamp and update if newer."""
    listing_key = str(listing.get("listingKey"))
    mls_id = str(listing.get("mlsId"))
    mls_source = listing.get("mlsSource", "UNKNOWN")

    if not listing_key or len(listing_key) < 20 or not mls_id:
        return f"⚠️ Skipping invalid key: {listing_key} (mlsId: {mls_id})"

    local_status = listing.get("standardStatus")
    local_ts = listing.get("statusChangeTimestamp")

    spark = fetch_listing_status(listing_key, mls_id)
    if not spark:
        # Listing not found in Spark API = OffMarket or removed
        collection.update_one(
            {"listingKey": listing_key},
            {"$set": {
                "standardStatus": "OffMarket",
                "statusLastChecked": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return f"❌ [{mls_source}] {listing_key} appears OffMarket or removed"

    spark_status = spark.get("StandardStatus")
    spark_ts = spark.get("StatusChangeTimestamp")

    # Status changed?
    if spark_status != local_status:
        # CLOSED/SOLD → Move to closed_listings collection
        if spark_status == "Closed":
            full_listing = collection.find_one({"listingKey": listing_key})
            if full_listing:
                full_listing["standardStatus"] = spark_status
                full_listing["statusChangeTimestamp"] = spark_ts or full_listing.get("statusChangeTimestamp")
                full_listing["statusLastChecked"] = datetime.now(timezone.utc).isoformat()
                full_listing["closedDate"] = datetime.now(timezone.utc).isoformat()
                full_listing.pop("_id", None)  # Remove _id to avoid duplicate key error

                closed_collection.update_one(
                    {"listingKey": listing_key},
                    {"$set": full_listing},
                    upsert=True
                )
                collection.delete_one({"listingKey": listing_key})
                return f"🏠💰 [{mls_source}] {listing_key}: {local_status} → SOLD (moved to closed_listings)"
        else:
            # Other status changes (Active → Pending, etc.)
            collection.update_one(
                {"listingKey": listing_key},
                {"$set": {
                    "standardStatus": spark_status,
                    "statusChangeTimestamp": spark_ts or local_ts,
                    "statusLastChecked": datetime.now(timezone.utc).isoformat(),
                }},
            )
            return f"🔄 [{mls_source}] {listing_key}: {local_status} → {spark_status}"

    # Timestamp changed but status same?
    if spark_ts and local_ts:
        try:
            spark_dt = datetime.fromisoformat(spark_ts.replace("Z", "+00:00"))
            local_dt = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))

            if spark_dt > local_dt:
                collection.update_one(
                    {"listingKey": listing_key},
                    {"$set": {
                        "statusChangeTimestamp": spark_ts,
                        "statusLastChecked": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                return f"🔁 [{mls_source}] {listing_key}: timestamp updated"
        except Exception:
            pass

    # No changes
    return f"✅ [{mls_source}] {listing_key}: unchanged"

# ──────────────────────────────────────────────────────────────────────────────
# 🚀 MAIN EXECUTION WITH BATCH REST
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 80)
    print("Unified Status Update - Check All MLSs for Status Changes")
    print("=" * 80)

    active_statuses = ["Active", "Pending", "Hold", "ComingSoon"]
    query = {"standardStatus": {"$in": active_statuses}}

    listings = list(collection.find(query, {
        "listingKey": 1,
        "mlsId": 1,
        "mlsSource": 1,
        "standardStatus": 1,
        "statusChangeTimestamp": 1
    }))

    total = len(listings)
    print(f"\n🔍 Checking Spark status for {total:,} listings ({', '.join(active_statuses)})")

    # MLS breakdown
    mls_counts = {}
    for listing in listings:
        mls = listing.get("mlsSource", "UNKNOWN")
        mls_counts[mls] = mls_counts.get(mls, 0) + 1

    print("\nMLS Breakdown:")
    for mls, count in sorted(mls_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {mls.ljust(25)}: {count:,}")
    print()

    changed = 0
    removed = 0
    sold = 0
    checked = 0
    batch_size = 1000
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(check_listing, l): l for l in listings}

        for i, future in enumerate(as_completed(futures), 1):
            try:
                result = future.result()
                checked += 1

                if "🏠💰" in result:
                    sold += 1
                elif "🔄" in result or "🔁" in result:
                    changed += 1
                elif "❌" in result:
                    removed += 1

                print(f"[{i:,}/{total:,}] {result}")
                time.sleep(0.18)  # Micro-throttle to avoid rate limits

            except Exception as e:
                print(f"❌ Worker error: {e}")

            # ─── BATCH PAUSE ─────────────────────────────────────────────────────
            if i % batch_size == 0:
                elapsed = time.time() - start_time
                rate = i / elapsed if elapsed > 0 else 0
                print(f"\n😴 Processed {i:,} listings — resting for 60 seconds to avoid rate limits...")
                print(f"   Rate: {rate:.1f} listings/sec | Elapsed: {elapsed/60:.1f} min")
                time.sleep(60)
                print("✅ Resuming updates...\n")

    # Summary
    elapsed_total = time.time() - start_time
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    print(f"Total checked:        {checked:,}")
    print(f"Status updated:       {changed:,}")
    print(f"Sold (→ closed):      {sold:,}")
    print(f"OffMarket/Removed:    {removed:,}")
    print(f"Unchanged:            {(checked - changed - sold - removed):,}")
    print(f"Total time:           {elapsed_total/60:.1f} minutes")
    print("=" * 80)

    # Save log
    log = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_checked": checked,
        "status_updated": changed,
        "sold_moved_to_closed": sold,
        "offmarket_removed": removed,
        "unchanged": checked - changed - sold - removed,
        "elapsed_seconds": elapsed_total,
        "mls_breakdown": mls_counts,
    }

    log_path = LOG_DIR / f"status_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)
    print(f"\n🪵 Log saved → {log_path}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user, exiting gracefully.")
    except Exception as e:
        print(f"❌ Unhandled error: {e}")
        raise
