import os
import json
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from shapely.geometry import Point, MultiPoint, mapping

# Load env
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "jpsrealtor")
LISTINGS_COLLECTION = "listings"
SUBDIVISIONS_COLLECTION = "subdivisions"

if not MONGO_URI:
    raise Exception("❌ Missing MONGODB_URI in .env.local")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
listings = db[LISTINGS_COLLECTION]
subdivisions = db[SUBDIVISIONS_COLLECTION]

# Ensure index for geospatial queries
subdivisions.create_index([("geometry", "2dsphere")])

print("🔎 Generating subdivision polygons...")

# Step 1: Find all unique subdivision names
subdivision_names = listings.distinct("subdivisionName", {"subdivisionName": {"$ne": None}})

features = []  # for GeoJSON export

for name in subdivision_names:
    cursor = listings.find(
        {"subdivisionName": {"$regex": f"^{name}$", "$options": "i"}},
        {"latitude": 1, "longitude": 1}
    )

    points = []
    for doc in cursor:
        if doc.get("latitude") and doc.get("longitude"):
            points.append(Point(doc["longitude"], doc["latitude"]))  # GeoJSON order: [lng, lat]

    if not points:
        continue

    # Build geometry
    if len(points) >= 3:
        geom = MultiPoint(points).convex_hull
    elif len(points) == 2:
        # Make a thin rectangle between two points (with buffer padding)
        multi = MultiPoint(points)
        geom = multi.buffer(0.0005).envelope
    else:  # 1 point
        geom = points[0].buffer(0.0005)  # ~50m radius circle

    geojson_geom = mapping(geom)  # Shapely 2.x replacement for .to_geojson()
    count = len(points)

    # Prepare MongoDB document
    doc = {
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "geometry": geojson_geom,
        "listingsCount": count,
    }

    # Upsert into subdivisions collection
    subdivisions.update_one({"name": name}, {"$set": doc}, upsert=True)

    # Append to features for GeoJSON export
    features.append({
        "type": "Feature",
        "properties": {
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "listingsCount": count
        },
        "geometry": geojson_geom
    })

    print(f"✅ Subdivision '{name}' saved with {count} listings")

# Step 2: Save all to local-logs as a single GeoJSON file
out_dir = Path(__file__).resolve().parents[3] / "local-logs"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "subdivisions.geojson"

geojson_out = {
    "type": "FeatureCollection",
    "features": features
}

with out_file.open("w", encoding="utf-8") as f:
    json.dump(geojson_out, f, indent=2)

print(f"🎉 All subdivisions processed and saved to MongoDB.")
print(f"🗺️ GeoJSON file written to {out_file}")
