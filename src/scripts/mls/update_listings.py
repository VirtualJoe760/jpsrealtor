import os
import json
import requests
import psycopg2
import psycopg2.extras
import urllib.parse as urlparse
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
print(f"Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

# PostgreSQL connection
def get_db_conn():
    urlparse.uses_netloc.append("postgres")
    db_url = urlparse.urlparse(DATABASE_URL)
    return psycopg2.connect(
        dbname=db_url.path[1:],
        user=db_url.username,
        password=db_url.password,
        host=db_url.hostname,
        port=db_url.port,
        sslmode="require"
    )

# Sanitize value (convert "********" to None)
def clean(value):
    return None if value == "********" else value

# Upsert listings and photos
def upsert_listings(listings, conn):
    skipped = 0
    inserted = 0
    photo_inserted = 0

    with conn.cursor() as cur:
        for listing in listings:
            try:
                fields = listing.get("StandardFields", {})
                listing_id = fields.get("ListingId")
                if not listing_id:
                    skipped += 1
                    continue

                cur.execute("""
                    INSERT INTO listings (
                        listing_id, listing_key, standard_status, list_price,
                        property_type, city, state, postal_code,
                        bedrooms_total, bathrooms_total, living_area,
                        listing_contract_date, modification_timestamp
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (listing_id) DO UPDATE SET
                        standard_status = EXCLUDED.standard_status,
                        list_price = EXCLUDED.list_price,
                        property_type = EXCLUDED.property_type,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        postal_code = EXCLUDED.postal_code,
                        bedrooms_total = EXCLUDED.bedrooms_total,
                        bathrooms_total = EXCLUDED.bathrooms_total,
                        living_area = EXCLUDED.living_area,
                        listing_contract_date = EXCLUDED.listing_contract_date,
                        modification_timestamp = EXCLUDED.modification_timestamp;
                """, (
                    clean(fields.get("ListingId")),
                    clean(fields.get("ListingKey")),
                    clean(fields.get("StandardStatus")),
                    clean(fields.get("ListPrice")),
                    clean(fields.get("PropertyType")),
                    clean(fields.get("City")),
                    clean(fields.get("StateOrProvince")),
                    clean(fields.get("PostalCode")),
                    clean(fields.get("BedroomsTotal")),
                    clean(fields.get("BathroomsTotalInteger")),
                    clean(fields.get("LivingArea")),
                    clean(fields.get("ListingContractDate")),
                    clean(fields.get("ModificationTimestamp")),
                ))
                inserted += 1

                # 📸 Handle photo expansions
                photos = listing.get("Photos", [])
                print(f"Listing {listing_id} has {len(photos)} photos.")
                for p in photos:
                    cur.execute("""
                        INSERT INTO listing_photos (
                            listing_id, media_url, media_type,
                            media_description, ordinal, modification_timestamp
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (
                        listing_id,
                        clean(p.get("Uri1024") or p.get("Uri800") or p.get("UriLarge")),
                        "Photo",
                        clean(p.get("Caption") or p.get("Name")),
                        p.get("Order", None),
                        clean(fields.get("PhotosChangeTimestamp")),
                    ))
                    photo_inserted += 1

            except Exception as e:
                conn.rollback()
                skipped += 1
                print(f"Error inserting listing {listing_id}: {e}")
            else:
                conn.commit()

    print(f"Upsert complete: {inserted} inserted/updated, {skipped} skipped.")
    print(f"📸 Photos inserted: {photo_inserted}")

# Load last sync timestamp
def get_last_timestamp():
    path = "last_update_timestamp.txt"
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read().strip()
    # Default to 1 hour ago
    return (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

# Save last sync timestamp
def save_last_timestamp(ts):
    with open("last_update_timestamp.txt", "w") as f:
        f.write(ts)

# Main update function
def update_listings():
    print("Starting MLS update using ModificationTimestamp and _skiptoken...")
    conn = get_db_conn()
    listings = []
    skiptoken = None

    end_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    start_ts = get_last_timestamp()
    page = 1

    while True:
        url = f"{BASE_URL}?_limit=1000&_filter=ModificationTimestamp bt {start_ts},{end_ts}&_expand=Photos,Videos,VirtualTours,Rooms,Units,OpenHouses,Documents"
        if skiptoken:
            url += f"&_skiptoken={skiptoken}"

        print(f"Page {page}: {url}")
        response = requests.get(url, headers=HEADERS)
        data = response.json()

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print(f"❌ Error: {data}")
            break

        batch = data["D"]["Results"]
        listings.extend(batch)
        print(f"Page {page}: Retrieved {len(batch)} listings (Total so far: {len(listings)})")

        if len(batch) < 1000:
            print("✅ No more pages. Update complete.")
            break

        skiptoken = batch[-1]["Id"]
        page += 1

    if listings:
        upsert_listings(listings, conn)
        save_last_timestamp(end_ts)
    else:
        print("No listings to update.")

    conn.close()

# Run it
if __name__ == "__main__":
    update_listings()
