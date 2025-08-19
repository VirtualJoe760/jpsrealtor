import os
import json
import time  # Added to fix Pylance error
from pathlib import Path
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError, ConnectionError
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise Exception("❌ MONGODB_URI is not set in .env.local")

# Connect to MongoDB with retry
retries = 3
for attempt in range(retries):
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000, socketTimeoutMS=20000)
        db = client.get_database()
        collection = db.listings
        print("✅ Connected to MongoDB")
        break
    except ConnectionError as e:
        if attempt == retries - 1:
            raise Exception(f"❌ Failed to connect to MongoDB after {retries} attempts: {e}")
        print(f"⚠️ MongoDB connection attempt {attempt + 1} failed, retrying...")
        time.sleep(2 ** attempt)

# File to load listings from
INPUT_FILE = Path(__file__).resolve().parents[4] / "local-logs" / "flattened_all_listings_preserved.json"

# Utilities
def simple_slugify(s: str) -> str:
    return (
        s.lower()
        .replace(",", "")
        .replace(".", "")
        .replace("/", "-")
        .replace(" ", "-")
        .strip()
    )

def seed():
    if not INPUT_FILE.exists():
        raise Exception(f"❌ Input file {INPUT_FILE} does not exist")

    print(f"📄 Loading flattened listings from {INPUT_FILE}")
    try:
        with open(INPUT_FILE, encoding="utf-8") as f:
            listings = json.load(f)
    except Exception as e:
        raise Exception(f"❌ Failed to read {INPUT_FILE}: {e}")

    operations = []
    skipped = 0

    for raw in listings:
        listing_id = raw.get("listingId")
        address = raw.get("unparsedAddress")
        slug = raw.get("slug") or listing_id

        if not listing_id or not address or not slug:
            print(f"⚠️ Skipping listing: missing required fields: {raw.get('id') or '[no id]'}")
            skipped += 1
            continue

        raw["listingId"] = listing_id
        raw["slug"] = slug
        raw["slugAddress"] = simple_slugify(address)

        raw.pop("_id", None)

        operations.append(UpdateOne(
            {"listingId": listing_id},
            {"$set": raw},
            upsert=True
        ))

    if not operations:
        raise Exception("❌ No valid listings to update")

    print(f"🔁 Updating {len(operations)} listings in batches...")
    batch_size = 500
    updated = 0
    failed = 0

    for i in range(0, len(operations), batch_size):
        chunk = operations[i:i + batch_size]
        try:
            result = collection.bulk_write(chunk, ordered=False)
            updated += result.upserted_count + result.modified_count
            print(f"✅ Batch {i // batch_size + 1}: Modified {result.modified_count}, Upserted {result.upserted_count}")
        except BulkWriteError as e:
            failed += len(e.details.get("writeErrors", []))
            print(f"⚠️ Batch {i // batch_size + 1} failed with {failed} errors")
        except Exception as e:
            raise Exception(f"❌ Batch {i // batch_size + 1} failed: {e}")

    print(f"🏁 Complete: Updated {updated} listings. Skipped: {skipped}, Failed: {failed}")
    if failed > 0:
        raise Exception(f"❌ {failed} operations failed during seeding")

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"❌ Error in seed.py: {e}")
        exit(1)
