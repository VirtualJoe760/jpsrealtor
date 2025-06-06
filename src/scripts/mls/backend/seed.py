import os
import json
from pathlib import Path
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise Exception("MONGODB_URI is not set in .env.local")

# Connect to MongoDB
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000, socketTimeoutMS=20000)
db = client.get_database()
collection = db.listings

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
    print(f"📄 Loading flattened listings from {INPUT_FILE}")
    with open(INPUT_FILE, encoding="utf-8") as f:
        listings = json.load(f)

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

        # Clean MongoDB-conflicting or deprecated keys
        raw.pop("_id", None)

        operations.append(UpdateOne(
            {"listingId": listing_id},
            {"$set": raw},
            upsert=True
        ))

    if not operations:
        print("⚠️ No valid listings to update.")
        return

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

    print(f"🏁 Complete: Updated {updated} listings. Skipped: {skipped}, Failed: {failed}")

if __name__ == "__main__":
    seed()
