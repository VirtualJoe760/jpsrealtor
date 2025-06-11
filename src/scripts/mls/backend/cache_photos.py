import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load .env.local
env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
MONGO_URI = os.getenv("MONGODB_URI")

if not ACCESS_TOKEN:
    raise ValueError("❌ Missing SPARK_ACCESS_TOKEN in .env.local")
if not MONGO_URI:
    raise ValueError("❌ Missing MONGODB_URI in .env.local")

client = MongoClient(MONGO_URI)
db = client.get_database()
photos_collection = db.photos
listings_collection = db.listings

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

def fetch_listing_photos(slug, retries=3):
    url = f"https://replication.sparkapi.com/v1/listings/{slug}/photos"
    for attempt in range(retries):
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            return res.json().get("D", {}).get("Results", [])
        elif res.status_code == 429 or "over rate" in res.text.lower():
            wait = 3 + attempt * 2
            print(f"⏳ Rate limited on {slug}, waiting {wait}s...")
            time.sleep(wait)
        else:
            raise Exception(res.text)
    raise Exception("❌ Max retries reached")

def cache_photo_for_listing(listing):
    slug = listing.get("slug")
    listing_id = listing.get("listingId")
    if not slug or not listing_id:
        return

    # ✅ Skip if already cached
    if photos_collection.find_one({"listingId": listing_id}):
        return f"⏩ Skipped {slug} (already cached)"

    try:
        photos = fetch_listing_photos(slug)
        if not photos:
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
            "primary": primary.get("Primary", True)
        }

        photos_collection.update_one(
            {"photoId": doc["photoId"]},
            {"$set": doc},
            upsert=True
        )

        # 🌿 Soft throttle: short pause per request
        time.sleep(0.3)

        return f"✅ Cached photo for {slug}"
    except Exception as e:
        return f"❌ Failed for {slug}: {e}"

def main():
    print("🚀 Starting throttled photo caching...")
    listings = list(listings_collection.find({}, {"slug": 1, "listingId": 1}))

    with ThreadPoolExecutor(max_workers=3) as executor:  # ⬅️ Drop to 3 threads
        futures = [executor.submit(cache_photo_for_listing, l) for l in listings]

        for future in as_completed(futures):
            result = future.result()
            if result:
                print(result)

if __name__ == "__main__":
    main()
