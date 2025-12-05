#!/usr/bin/env python3
"""
Unified MLS Seed Script

Seeds the unified_listings MongoDB collection with listings from all 8 MLSs.

Features:
- Bulk upsert operations (500 per batch)
- Geospatial indexing (for radius queries)
- Compound indexes (for filtering by city/subdivision/MLS/PropertyType)
- Automatic index creation
- Progress tracking
- Error handling with retry

Usage:
    # Seed from auto-detected flattened file
    python src/scripts/mls/backend/unified/seed.py

    # Seed from specific file
    python src/scripts/mls/backend/unified/seed.py --input local-logs/flattened_unified_GPS_listings.json

    # Recreate indexes only
    python src/scripts/mls/backend/unified/seed.py --indexes-only
"""

import os
import json
import time
import argparse
from pathlib import Path
from pymongo import MongoClient, UpdateOne, GEOSPHERE, ASCENDING, DESCENDING
from pymongo.errors import BulkWriteError, ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[5] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise Exception("[ERROR] MONGODB_URI is not set in .env.local")


def connect_to_mongodb(retries=3):
    """Connect to MongoDB with retry logic"""
    for attempt in range(retries):
        try:
            client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=10000,
                socketTimeoutMS=20000,
            )
            # Force a server selection now (otherwise it's lazy)
            client.admin.command("ping")
            db = client.get_database()
            print("[OK] Connected to MongoDB")
            return client, db
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            if attempt == retries - 1:
                raise Exception(f"[ERROR] Failed to connect to MongoDB after {retries} attempts: {e}")
            print(f"[WARN] MongoDB connection attempt {attempt + 1} failed, retrying...")
            time.sleep(2 ** attempt)


def create_indexes(collection):
    """
    Create comprehensive indexes for unified_listings collection

    Indexes:
    1. Geospatial (2dsphere) - for radius queries (CMA, nearby listings)
    2. mlsSource + mlsId - for MLS-specific queries
    3. city + standardStatus - for city page queries
    4. subdivisionName + standardStatus - for subdivision page queries
    5. propertyType + standardStatus - for property type filtering
    6. listingKey - unique identifier (for upserts)
    7. modificationTimestamp - for incremental updates
    """
    print("\n>>> Creating indexes...")

    # 1. Geospatial index (CRITICAL for CMA radius queries)
    try:
        collection.create_index([("coordinates", GEOSPHERE)], name="coordinates_2dsphere")
        print("[OK] Created geospatial index: coordinates_2dsphere")
    except Exception as e:
        print(f"[WARN] Geospatial index creation failed: {e}")

    # 2. MLS source tracking
    try:
        collection.create_index(
            [("mlsSource", ASCENDING), ("mlsId", ASCENDING)],
            name="mlsSource_mlsId"
        )
        print("[OK] Created compound index: mlsSource_mlsId")
    except Exception as e:
        print(f"[WARN] MLS index creation failed: {e}")

    # 3. City queries (for /api/cities/[id]/listings)
    try:
        collection.create_index(
            [("city", ASCENDING), ("standardStatus", ASCENDING)],
            name="city_status"
        )
        print("[OK] Created compound index: city_status")
    except Exception as e:
        print(f"[WARN] City index creation failed: {e}")

    # 4. Subdivision queries (for /api/subdivisions/[slug]/listings)
    try:
        collection.create_index(
            [("subdivisionName", ASCENDING), ("standardStatus", ASCENDING)],
            name="subdivision_status"
        )
        print("[OK] Created compound index: subdivision_status")
    except Exception as e:
        print(f"[WARN] Subdivision index creation failed: {e}")

    # 5. PropertyType filtering
    try:
        collection.create_index(
            [("propertyType", ASCENDING), ("standardStatus", ASCENDING)],
            name="propertyType_status"
        )
        print("[OK] Created compound index: propertyType_status")
    except Exception as e:
        print(f"[WARN] PropertyType index creation failed: {e}")

    # 6. ListingKey (unique identifier for upserts)
    try:
        collection.create_index([("listingKey", ASCENDING)], unique=True, name="listingKey_unique")
        print("[OK] Created unique index: listingKey_unique")
    except Exception as e:
        print(f"[WARN] ListingKey index creation failed: {e}")

    # 7. ModificationTimestamp (for incremental updates)
    try:
        collection.create_index(
            [("modificationTimestamp", DESCENDING)],
            name="modificationTimestamp_desc"
        )
        print("[OK] Created index: modificationTimestamp_desc")
    except Exception as e:
        print(f"[WARN] ModificationTimestamp index creation failed: {e}")

    print("[OK] Index creation complete\n")


def simple_slugify(s: str) -> str:
    """Create URL-safe slug"""
    return (
        s.lower()
        .replace(",", "")
        .replace(".", "")
        .replace("/", "-")
        .replace(" ", "-")
        .strip()
    )


def seed(input_file: Path, collection):
    """Seed listings into unified_listings collection"""
    if not input_file.exists():
        raise Exception(f"[ERROR] Input file {input_file} does not exist")

    print(f">>> Loading flattened listings from {input_file}")
    try:
        with open(input_file, encoding="utf-8") as f:
            listings = json.load(f)
    except Exception as e:
        raise Exception(f"[ERROR] Failed to read {input_file}: {e}")

    print(f">>> Processing {len(listings):,} listings...")

    operations = []
    skipped = 0

    for raw in listings:
        listing_key = raw.get("listingKey")
        address = raw.get("unparsedAddress")
        slug = raw.get("slug") or listing_key

        if not listing_key or not address or not slug:
            print(f"[WARN] Skipping listing: missing required fields")
            skipped += 1
            continue

        # Normalize fields we rely on
        raw["listingKey"] = listing_key
        raw["slug"] = slug
        raw["slugAddress"] = raw.get("slugAddress") or simple_slugify(address)

        # Ensure geospatial coordinates are properly formatted
        latitude = raw.get("latitude")
        longitude = raw.get("longitude")
        if latitude and longitude:
            try:
                raw["coordinates"] = {
                    "type": "Point",
                    "coordinates": [float(longitude), float(latitude)]  # [lng, lat] order for GeoJSON
                }
            except (ValueError, TypeError):
                print(f"[WARN] Invalid coordinates for {listing_key}: lat={latitude}, lng={longitude}")

        # Remove Mongo _id if present to avoid duplicate key errors on upsert
        raw.pop("_id", None)

        operations.append(
            UpdateOne(
                {"listingKey": listing_key},
                {"$set": raw},
                upsert=True,
            )
        )

    if not operations:
        raise Exception("[ERROR] No valid listings to update")

    print(f">>> Upserting {len(operations):,} listings in batches...")
    batch_size = 500
    updated = 0
    failed = 0

    for i in range(0, len(operations), batch_size):
        chunk = operations[i : i + batch_size]
        batch_num = i // batch_size + 1
        try:
            result = collection.bulk_write(chunk, ordered=False)
            modified = result.modified_count or 0
            upserted = result.upserted_count or 0
            updated += modified + upserted
            print(f"[Batch {batch_num}] Modified: {modified}, Upserted: {upserted}")
        except BulkWriteError as e:
            batch_errors = len(e.details.get("writeErrors", [])) if e.details else 1
            failed += batch_errors
            print(f"[Batch {batch_num}] Failed with {batch_errors} errors")
        except Exception as e:
            raise Exception(f"[ERROR] Batch {batch_num} failed: {e}")

    print(f"\n[OK] Complete: Updated {updated:,} listings. Skipped: {skipped}, Failed: {failed}")
    if failed > 0:
        print(f"[WARN] {failed} operations failed during seeding")

    return updated, skipped, failed


def main():
    parser = argparse.ArgumentParser(description="Seed unified_listings MongoDB collection")
    parser.add_argument(
        "--input",
        type=str,
        help="Input JSON file path (default: auto-detect from local-logs)"
    )
    parser.add_argument(
        "--indexes-only",
        action="store_true",
        help="Only recreate indexes, don't seed data"
    )
    parser.add_argument(
        "--collection",
        type=str,
        default="unified_listings",
        help="MongoDB collection name (default: unified_listings)"
    )

    args = parser.parse_args()

    try:
        print("=" * 80)
        print("Unified MLS Seed - MongoDB Collection")
        print("=" * 80)

        # Connect to MongoDB
        client, db = connect_to_mongodb()
        collection = db[args.collection]
        print(f"[OK] Using collection: {args.collection}\n")

        # Create indexes
        create_indexes(collection)

        if args.indexes_only:
            print("[OK] Indexes recreated. Exiting (--indexes-only flag set)")
            return

        # Auto-detect input file if not specified
        if args.input:
            input_path = Path(args.input)
        else:
            project_root = Path(__file__).resolve().parents[5]
            local_logs = project_root / "local-logs"
            # Look for most recent flattened_unified_*_listings.json
            candidates = sorted(
                local_logs.glob("flattened_unified_*_listings.json"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            if not candidates:
                raise Exception("[ERROR] No flattened files found. Run flatten.py first.")
            input_path = candidates[0]

        # Seed data
        updated, skipped, failed = seed(input_path, collection)

        # Summary
        print("\n" + "=" * 80)
        print("Summary:")
        print(f"  Collection: {args.collection}")
        print(f"  Input: {input_path}")
        print(f"  Updated: {updated:,}")
        print(f"  Skipped: {skipped}")
        print(f"  Failed: {failed}")
        print("=" * 80 + "\n")

    except Exception as e:
        print(f"\n[ERROR] {e}\n")
        exit(1)


if __name__ == "__main__":
    main()
