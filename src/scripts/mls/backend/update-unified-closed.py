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

env_path = Path(__file__).resolve().parents[4] / ".env.local"
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

LOG_DIR = Path(__file__).resolve().parents[4] / "local-logs" / "status-logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────────────────────
# 🗃️ DATABASE
# ──────────────────────────────────────────────────────────────────────────────

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
db = client.get_database()
collection = db.listings  # GPS active listings
closed_collection = db.unified_closed_listings  # ⭐ NEW: Unified closed collection (all 8 MLSs)
print("✅ Connected to MongoDB (active + unified_closed_listings)")

# ──────────────────────────────────────────────────────────────────────────────
# 🌐 FETCH SINGLE LISTING STATUS
# ──────────────────────────────────────────────────────────────────────────────

def fetch_listing_status(listing_key: str):
    """Query Spark for current StandardStatus + StatusChangeTimestamp for one listing."""
    url = f"{BASE_URL}/{listing_key}?_select=ListingKey,StandardStatus,StatusChangeTimestamp,CloseDate,ClosePrice"

    for attempt in range(3):
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code == 200:
                data = res.json().get("D", {}).get("Results", [])
                if data:
                    return data[0].get("StandardFields", {})
                return None
            elif res.status_code in (403, 404):
                return None  # Listing removed/off-market
            elif res.status_code == 429:
                wait = 3 + attempt * 2  # short backoff
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
    listing_key = str(listing.get("listingKey") or listing.get("slug"))
    if not listing_key or len(listing_key) < 20:
        return f"⚠️ Skipping invalid key: {listing_key}"

    local_status = listing.get("standardStatus")
    local_ts = listing.get("statusChangeTimestamp")

    spark = fetch_listing_status(listing_key)
    if not spark:
        collection.update_one(
            {"listingKey": listing_key},
            {"$set": {
                "standardStatus": "OffMarket",
                "statusLastChecked": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return f"❌ {listing_key} appears OffMarket or removed"

    spark_status = spark.get("StandardStatus")
    spark_ts = spark.get("StatusChangeTimestamp")
    spark_close_date = spark.get("CloseDate")
    spark_close_price = spark.get("ClosePrice")

    if not spark_ts or not local_ts:
        if spark_status != local_status:
            # Check if listing is now CLOSED (sold) - move to unified_closed_listings
            if spark_status == "Closed":
                full_listing = collection.find_one({"listingKey": listing_key})
                if full_listing:
                    # Prepare document for unified_closed_listings
                    closed_doc = full_listing.copy()
                    closed_doc["standardStatus"] = spark_status
                    closed_doc["statusLastChecked"] = datetime.now(timezone.utc).isoformat()
                    closed_doc.pop("_id", None)  # Remove _id to avoid duplicate key error

                    # ⭐ REQUIRED FIELDS for unified_closed_listings
                    # closeDate: REQUIRED (TTL index depends on this)
                    if spark_close_date:
                        closed_doc["closeDate"] = spark_close_date
                    elif not closed_doc.get("closeDate"):
                        # Use statusChangeTimestamp or current date as fallback
                        closed_doc["closeDate"] = (
                            spark_ts or
                            closed_doc.get("statusChangeTimestamp") or
                            datetime.now(timezone.utc).isoformat()
                        )

                    # closePrice: Should be set (actual sale price)
                    if spark_close_price:
                        closed_doc["closePrice"] = spark_close_price
                    elif not closed_doc.get("closePrice"):
                        # Use listPrice as fallback if closePrice not available
                        closed_doc["closePrice"] = closed_doc.get("listPrice")

                    # mlsSource & mlsId: REQUIRED for tracking
                    if not closed_doc.get("mlsSource"):
                        # Extract from listing metadata or set default
                        closed_doc["mlsSource"] = closed_doc.get("mlsSource", "GPS")

                    if not closed_doc.get("mlsId"):
                        closed_doc["mlsId"] = "20190211172710340762000000"  # GPS default

                    # Insert/update in unified_closed_listings
                    closed_collection.update_one(
                        {"listingKey": listing_key},
                        {"$set": closed_doc},
                        upsert=True
                    )

                    # Remove from active listings
                    collection.delete_one({"listingKey": listing_key})
                    return f"🏠💰 {listing_key}: {local_status} → SOLD (moved to unified_closed_listings)"
            else:
                # Other status changes (Pending, Expired, etc.) - just update in place
                collection.update_one(
                    {"listingKey": listing_key},
                    {"$set": {
                        "standardStatus": spark_status,
                        "statusLastChecked": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                return f"🔄 {listing_key}: {local_status} → {spark_status}"
        return f"✅ {listing_key}: unchanged"

    try:
        spark_dt = datetime.fromisoformat(spark_ts.replace("Z", "+00:00"))
        local_dt = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))
    except Exception:
        spark_dt = datetime.now(timezone.utc)
        local_dt = datetime.now(timezone.utc)

    if spark_dt > local_dt or spark_status != local_status:
        # Check if listing is now CLOSED (sold) - move to unified_closed_listings
        if spark_status == "Closed":
            full_listing = collection.find_one({"listingKey": listing_key})
            if full_listing:
                # Prepare document for unified_closed_listings
                closed_doc = full_listing.copy()
                closed_doc["standardStatus"] = spark_status
                closed_doc["statusChangeTimestamp"] = spark_ts
                closed_doc["statusLastChecked"] = datetime.now(timezone.utc).isoformat()
                closed_doc.pop("_id", None)  # Remove _id to avoid duplicate key error

                # ⭐ REQUIRED FIELDS for unified_closed_listings
                # closeDate: REQUIRED (TTL index depends on this)
                if spark_close_date:
                    closed_doc["closeDate"] = spark_close_date
                elif not closed_doc.get("closeDate"):
                    # Use statusChangeTimestamp or current date as fallback
                    closed_doc["closeDate"] = (
                        spark_ts or
                        closed_doc.get("statusChangeTimestamp") or
                        datetime.now(timezone.utc).isoformat()
                    )

                # closePrice: Should be set (actual sale price)
                if spark_close_price:
                    closed_doc["closePrice"] = spark_close_price
                elif not closed_doc.get("closePrice"):
                    # Use listPrice as fallback if closePrice not available
                    closed_doc["closePrice"] = closed_doc.get("listPrice")

                # mlsSource & mlsId: REQUIRED for tracking
                if not closed_doc.get("mlsSource"):
                    # Extract from listing metadata or set default
                    closed_doc["mlsSource"] = closed_doc.get("mlsSource", "GPS")

                if not closed_doc.get("mlsId"):
                    closed_doc["mlsId"] = "20190211172710340762000000"  # GPS default

                # Insert/update in unified_closed_listings
                closed_collection.update_one(
                    {"listingKey": listing_key},
                    {"$set": closed_doc},
                    upsert=True
                )

                # Remove from active listings
                collection.delete_one({"listingKey": listing_key})
                return f"🏠💰 {listing_key}: {local_status} → SOLD (moved to unified_closed_listings)"
        else:
            # Other status changes (Pending, Expired, etc.) - just update in place
            collection.update_one(
                {"listingKey": listing_key},
                {"$set": {
                    "standardStatus": spark_status,
                    "statusChangeTimestamp": spark_ts,
                    "statusLastChecked": datetime.now(timezone.utc).isoformat(),
                }},
            )
            return f"🔁 {listing_key}: status updated → {spark_status}"
    else:
        return f"✅ {listing_key}: unchanged"

# ──────────────────────────────────────────────────────────────────────────────
# 🚀 MAIN EXECUTION WITH BATCH REST
# ──────────────────────────────────────────────────────────────────────────────

def main():
    active_statuses = ["Active", "Pending", "Hold", "ComingSoon"]
    query = {"standardStatus": {"$in": active_statuses}}
    listings = list(collection.find(query, {
        "listingKey": 1, "slug": 1, "standardStatus": 1, "statusChangeTimestamp": 1
    }))
    total = len(listings)
    print(f"🔍 Checking Spark status for {total} listings ({', '.join(active_statuses)})")

    changed = 0
    removed = 0
    sold = 0  # Track listings moved to unified_closed_listings
    checked = 0
    batch_size = 1000

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
                print(f"[{i}/{total}] {result}")
                time.sleep(0.18)  # micro-throttle
            except Exception as e:
                print(f"❌ Worker error: {e}")

            # Optional 30s rest every 1000
            if checked % batch_size == 0:
                print(f"\n⏸️  Batch complete ({checked}/{total}). Resting 30s...")
                time.sleep(30)

    # Final summary
    print("\n" + "="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Total checked:       {checked:>6}")
    print(f"Changed (status):    {changed:>6}")
    print(f"Removed (OffMarket): {removed:>6}")
    print(f"Sold (→ unified_closed_listings): {sold:>6}")
    print("="*80)

    # Log to file
    log_file = LOG_DIR / f"update_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    log_file.write_text(json.dumps({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_checked": checked,
        "changed": changed,
        "removed": removed,
        "sold": sold,
    }, indent=2))
    print(f"✅ Log saved: {log_file}")

if __name__ == "__main__":
    main()
