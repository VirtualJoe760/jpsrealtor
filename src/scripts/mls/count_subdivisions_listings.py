import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load env
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "jpsrealtor")
COLLECTION_NAME = "listings"

if not MONGO_URI:
    raise Exception("❌ Missing MONGODB_URI in .env.local")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Subdivision to check
TARGET_SUBDIVISION = "BDCC Bellissimo"

print(f"🔎 Checking listings in subdivision: {TARGET_SUBDIVISION}")

# Case-insensitive exact match
count = collection.count_documents({
    "subdivisionName": {"$regex": f"^{TARGET_SUBDIVISION}$", "$options": "i"}
})

# Fetch sample listings (just first 5 for preview)
sample = list(collection.find(
    {"subdivisionName": {"$regex": f"^{TARGET_SUBDIVISION}$", "$options": "i"}},
    {"listingId": 1, "address": "$unparsedAddress", "currentPrice": 1}
).limit(5))

print(f"✅ Found {count} listings in subdivision '{TARGET_SUBDIVISION}'")

if sample:
    print("Here are a few sample listings:")
    for s in sample:
        print(f" - Listing {s.get('listingId')}, {s.get('address')} | ${s.get('currentPrice')}")
else:
    print("⚠️ No sample listings found.")
