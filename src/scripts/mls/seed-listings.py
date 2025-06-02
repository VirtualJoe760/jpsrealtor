import os
import json
from pathlib import Path
from pymongo import MongoClient, UpdateOne
from slugify import slugify
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise Exception("MONGODB_URI is not set in .env.local")

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_database()
listings_collection = db.listings

def generate_slug_address(address: str) -> str:
    if not address:
        return ""
    return slugify(address)

def safe_int(value):
    try:
        if value is None or value == "********":
            return None
        return int(float(value))
    except:
        return None

def seed_listings():
    listings_path = Path(__file__).resolve().parents[3] / "local-logs" / "listings.json"
    print(f"📦 Loading listings from {listings_path}")

    with open(listings_path, "r", encoding="utf-8") as f:
        listings = json.load(f)

    print(f"📦 Seeding {len(listings)} listings into MongoDB...")

    operations = []
    for listing in listings:
        standard_fields = listing.get("StandardFields", {})

        listing_id = standard_fields.get("ListingId") or listing.get("Id")
        if not listing_id:
            print("⚠️ Skipping a listing without a listingId")
            continue

        address = standard_fields.get("UnparsedAddress") or ""
        slug_address = generate_slug_address(address)

        doc = {
            "listingId": listing_id,
            "slug": listing.get("Id") or listing_id,
            "slugAddress": slug_address,
            "address": address,
            "bedroomsTotal": safe_int(standard_fields.get("BedsTotal")),
            "bathroomsFull": safe_int(standard_fields.get("BathsTotal")),
            "listPrice": safe_int(standard_fields.get("ListPrice")),
            "livingArea": safe_int(standard_fields.get("LivingArea")),
            "latitude": standard_fields.get("Latitude"),
            "longitude": standard_fields.get("Longitude"),
            "modificationTimestamp": standard_fields.get("ModificationTimestamp"),
            "status": standard_fields.get("StandardStatus"),
            "propertyType": standard_fields.get("PropertyType"),
            "propertySubType": standard_fields.get("PropertySubType"),
            "daysOnMarket": safe_int(standard_fields.get("DaysOnMarket")),
            "cumulativeDaysOnMarket": safe_int(standard_fields.get("CumulativeDaysOnMarket")),
            "daysOffMarket": safe_int(standard_fields.get("DaysOffMarket")),
        }

        operations.append(UpdateOne({"listingId": listing_id}, {"$set": doc}, upsert=True))

    if operations:
        result = listings_collection.bulk_write(operations)
        print(f"✅ Upserted: {result.upserted_count}, Modified: {result.modified_count}")
    else:
        print("⚠️ No listings to upsert.")

    client.close()
    print("✅ MongoDB connection closed.")

if __name__ == "__main__":
    seed_listings()
