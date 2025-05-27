import os
import json
import time
import requests
import psycopg2
import urllib.parse as urlparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load env vars
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

SELECT_FIELDS = [
    "ListingId", "ListingKey", "StandardStatus", "ListPrice",
    "PropertyType", "City", "StateOrProvince", "PostalCode",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea",
    "ListingContractDate", "ModificationTimestamp"
]
select_query = ",".join(SELECT_FIELDS)

def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

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

def replicate_all_listings():
    print("Starting full MLS replication using _skiptoken...")
    listings = []
    skiptoken = None
    page = 1

    while True:
        url = f"{BASE_URL}?_limit=1000"
        if skiptoken:
            url += f"&_skiptoken={skiptoken}"

        response = requests.get(url, headers=HEADERS)
        data = response.json()

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print(f"Failed on page {page}: {data}")
            break

        batch = data["D"]["Results"]
        listings.extend(batch)
        print(f"Page {page}: Retrieved {len(batch)} listings (Total: {len(listings)})")

        skiptoken = data["D"].get("Next")
        if not skiptoken:
            print("No more pages. Replication complete.")
            break

        page += 1
        time.sleep(0.1)

    return listings


def upsert_listings(listings, conn):
    skipped = 0
    inserted = 0
    log_path = Path(__file__).resolve().parents[2] / "skipped_listings.jsonl"

    with open(log_path, "a") as log_file, conn.cursor() as cur:
        for l in listings:
            try:
                fields = l["StandardFields"]
                listing_id = fields.get("ListingId")
                if not listing_id:
                    skipped += 1
                    log_file.write(json.dumps(l) + "\n")
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
                        modification_timestamp = EXCLUDED.modification_timestamp;
                """, (
                    listing_id,
                    fields.get("ListingKey"),
                    fields.get("StandardStatus"),
                    safe_float(fields.get("ListPrice")),
                    fields.get("PropertyType"),
                    fields.get("City"),
                    fields.get("StateOrProvince"),
                    fields.get("PostalCode"),
                    safe_float(fields.get("BedroomsTotal")),
                    safe_float(fields.get("BathroomsTotalInteger")),
                    safe_float(fields.get("LivingArea")),
                    fields.get("ListingContractDate"),
                    fields.get("ModificationTimestamp"),
                ))
                inserted += 1
            except Exception as e:
                skipped += 1
                log_file.write(json.dumps(l) + "\n")
                print(f"Failed to insert listing {fields.get('ListingId')}: {e}")

    conn.commit()
    print(f"Upsert complete: {inserted} inserted/updated, {skipped} skipped.")

def replicate():
    conn = get_db_conn()
    listings = replicate_all_listings()
    if listings:
        upsert_listings(listings, conn)
    else:
        print("No listings retrieved.")
    conn.close()

if __name__ == "__main__":
    replicate()
