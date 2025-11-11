import os
from pathlib import Path
from dotenv import load_dotenv
from collections import Counter
from pymongo import MongoClient
import json

# Load environment variables from .env.local
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "jpsrealtor")   # default if not set
COLLECTION_NAME = "listings"

if not MONGO_URI:
    raise Exception("❌ Missing MONGODB_URI in .env.local")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

print("🔎 Counting subdivision names...")

# Aggregate subdivision counts
pipeline = [
    {"$group": {"_id": "$subdivisionName", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]

results = list(collection.aggregate(pipeline))

# Save results to local-logs
out_dir = Path(__file__).resolve().parents[3] / "local-logs"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "subdivision_counts.json"

with out_file.open("w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"✅ Found {len(results)} subdivisions. Saved breakdown to {out_file}")
