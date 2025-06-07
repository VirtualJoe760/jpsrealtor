import os
import json
import requests
import time
import random
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load .env
env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
SPARK_ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
BASE_URL = "https://replication.sparkapi.com/v1/listings"

if not MONGODB_URI or not SPARK_ACCESS_TOKEN:
    raise Exception("❌ Missing MONGODB_URI or SPARK_ACCESS_TOKEN")

LOCAL_LOGS_DIR = Path(__file__).resolve().parents[4] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "listing_photos.json"

client = MongoClient(MONGODB_URI)
db = client.get_database()
listings_collection = db.listings

HEADERS = {
    "Authorization": f"Bearer {SPARK_ACCESS_TOKEN}",
    "Accept": "application/json"
}

# Fetch a single listing’s photos with retry/backoff
def fetch_photos(slug: str, retries=3):
    url = f"{BASE_URL}/{slug}/photos"

    for attempt in range(retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                data = res.json().get("D", {}).get("Results", [])
                return { "listingId": slug, "photos": data }

            elif res.status_code == 429:
                wait = [1, 3, 7][attempt]
                print(f"⏳ {slug}: 429 Too Many Requests – retrying in {wait}s")
                time.sleep(wait + random.uniform(0, 1))

            else:
                print(f"❌ {slug}: {res.status_code}")
                return { "listingId": slug, "photos": [] }

        except Exception as e:
            print(f"⚠️ {slug} error: {e}")
            return { "listingId": slug, "photos": [] }

    print(f"❌ {slug}: exhausted retries")
    return { "listingId": slug, "photos": [] }

def main():
    listings = list(listings_collection.find({}, {"slug": 1}))
    print(f"📦 Found {len(listings)} listings in local DB")

    all_photos = []
    max_workers = 5  # ✅ Limit concurrency to avoid Spark rate limiting

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_photos, listing["slug"]): listing["slug"]
            for listing in listings if "slug" in listing
        }

        for i, future in enumerate(as_completed(futures), start=1):
            slug = futures[future]
            result = future.result()
            all_photos.append(result)
            print(f"📸 [{i}/{len(futures)}] {slug}: {len(result['photos'])} photos")

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(all_photos, f, indent=2)

    print(f"✅ Saved photos for {len(all_photos)} listings to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
