import os
import json
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from datetime import datetime
import re

DATABASE_URL = os.getenv("DATABASE_URL")
LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local_logs"

def safe_float(value):
    try:
        if value is None or value == "********":
            return None
        return float(value)
    except:
        return None

def safe_int(value):
    try:
        if value is None or value == "********":
            return None
        return int(float(value))
    except:
        return None

def parse_datetime(value):
    try:
        if not value or value == "********":
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except:
        return None

def slugify(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def upsert_listings(records, show_example=False):
    if not records:
        return

    if show_example:
        from pprint import pprint
        print("🔍 Example record being inserted:")
        pprint(records[0])

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    query = """
    INSERT INTO listings_index (
        listing_id, slug, status, list_price, bedrooms_total, bathrooms_full,
        living_area, address, latitude, longitude, modification_timestamp
    )
    VALUES %s
    ON CONFLICT (listing_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        status = EXCLUDED.status,
        list_price = EXCLUDED.list_price,
        bedrooms_total = EXCLUDED.bedrooms_total,
        bathrooms_full = EXCLUDED.bathrooms_full,
        living_area = EXCLUDED.living_area,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        modification_timestamp = EXCLUDED.modification_timestamp
    ;
    """
    execute_values(cur, query, records)
    conn.commit()
    cur.close()
    conn.close()

def process_local_logs():
    total_upserted = 0
    batch_files = sorted(LOCAL_LOGS_DIR.glob("listings_batch_*.json"))
    for idx, batch_file in enumerate(batch_files):
        with open(batch_file, "r", encoding="utf-8") as f:
            listings = json.load(f)

        records = []
        for listing in listings:
            listing_id = listing.get("Id")
            standard = listing.get("StandardFields", {})

            if not listing_id:
                continue

            records.append((
                listing_id,
                slugify(listing_id),
                standard.get("StandardStatus"),
                safe_int(standard.get("ListPrice")),
                safe_int(standard.get("BedsTotal")),
                safe_int(standard.get("BathsFull")),
                safe_float(standard.get("LivingArea")),
                standard.get("UnparsedAddress"),
                safe_float(standard.get("Latitude")),
                safe_float(standard.get("Longitude")),
                parse_datetime(standard.get("ModificationTimestamp")),
            ))

        show_example = total_upserted == 0 and idx == 0
        upsert_listings(records, show_example=show_example)
        total_upserted += len(records)
        print(f"✅ Upserted {len(records)} listings from {batch_file.name} (Total so far: {total_upserted})")

if __name__ == "__main__":
    process_local_logs()
