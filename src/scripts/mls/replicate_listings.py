import os
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import re

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
print(f"🔍 Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

LIMIT = 1000

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

def get_listing_count():
    print("📊 Counting ALL listings in the MLS feed...")
    url = f"{BASE_URL}?_pagination=count"
    response = requests.get(url, headers=HEADERS)
    data = response.json()
    try:
        total = data["D"]["Pagination"]["TotalRows"]
        print(f"✅ Total listings in MLS feed: {total}")
        return total
    except Exception as e:
        print(f"❌ Failed to retrieve count: {e}")
        print("Full response:", data)
        return 0

def listing_batches():
    """Generator that yields listing batches from the API, paginated via SkipToken."""
    skip_token = None

    while True:
        if skip_token:
            url = f"{BASE_URL}?_limit={LIMIT}&_skiptoken={skip_token}"
        else:
            url = f"{BASE_URL}?_limit={LIMIT}"

        res = requests.get(url, headers=HEADERS)
        data = res.json()

        results = data.get("D", {}).get("Results", [])
        new_skip_token = data.get("D", {}).get("SkipToken")

        if not results or new_skip_token == skip_token:
            print("🏁 No more listings to process.")
            break

        skip_token = new_skip_token
        yield results

def upsert_listings(records, show_example=False):
    if not records:
        return

    if show_example:
        print("🔍 Example record being inserted:")
        from pprint import pprint
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

def fetch_and_upsert_all_listings():
    print("🚀 Starting full replication with batch upserts...")
    total_inserted = 0

    for batch in listing_batches():
        records = []
        for listing in batch:
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

        show_example = total_inserted == 0
        upsert_listings(records, show_example=show_example)
        total_inserted += len(records)
        print(f"✅ Upserted {len(records)} listings (Total so far: {total_inserted})")

if __name__ == "__main__":
    total = get_listing_count()
    if total > 0:
        fetch_and_upsert_all_listings()
