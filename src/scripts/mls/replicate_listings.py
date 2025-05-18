import os
import time
import json
import requests
import psycopg2
import psycopg2.extras
import urllib.parse as urlparse
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta

# ✅ Load environment from .env.local in project root
env_path = Path(__file__).resolve().parents[3] / ".env.local"
print(f"🔍 Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

# ✅ Read from environment
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
print("🔑 DATABASE_URL:", DATABASE_URL)  # Optional: remove later

# ✅ Spark API setup
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}
LAST_TIMESTAMP_FILE = "last_replication.txt"

SELECT_FIELDS = [
    "ListingId", "ListingKey", "StandardStatus", "ListPrice",
    "PropertyType", "City", "StateOrProvince", "PostalCode",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea",
    "ListingContractDate", "ModificationTimestamp"
]
select_query = ",".join(SELECT_FIELDS)

# ✅ Parse DATABASE_URL and return psycopg2 connection
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

# ✅ Load and save the last replication timestamp
def get_last_timestamp():
    if os.path.exists(LAST_TIMESTAMP_FILE):
        with open(LAST_TIMESTAMP_FILE, "r") as f:
            return f.read().strip()
    return None

def save_last_timestamp(timestamp):
    with open(LAST_TIMESTAMP_FILE, "w") as f:
        f.write(timestamp)

# ✅ Fetch all updated listings between timestamps
def get_updated_listings(start_ts, end_ts):
    listings = []
    next_token = None

    while True:
        url = f"{BASE_URL}?_limit=1000&_select={select_query}&_filter=ModificationTimestamp bt {start_ts},{end_ts}"
        if next_token:
            url += f"&_skiptoken={next_token}"

        response = requests.get(url, headers=HEADERS)
        data = response.json()

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print("❌ Failed to fetch updated listings:", data)
            break

        results = data["D"]["Results"]
        listings.extend(results)
        print(f"🔁 Fetched {len(results)} listings (Total: {len(listings)})")

        next_token = data["D"].get("Next")
        if not next_token:
            break
        time.sleep(0.1)

    return listings

# ✅ Upsert listings into the database
def upsert_listings(listings, conn):
    from pathlib import Path

    log_path = Path(__file__).resolve().parents[2] / "skipped_listings.jsonl"
    skipped = 0
    valid = 0

    with open(log_path, "a") as log_file:
        with conn.cursor() as cur:
            for l in listings:
                fields = l.get("StandardFields", {})
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
                    fields.get("ListingId"),
                    fields.get("ListingKey"),
                    fields.get("StandardStatus"),
                    fields.get("ListPrice"),
                    fields.get("PropertyType"),
                    fields.get("City"),
                    fields.get("StateOrProvince"),
                    fields.get("PostalCode"),
                    fields.get("BedroomsTotal"),
                    fields.get("BathroomsTotalInteger"),
                    fields.get("LivingArea"),
                    fields.get("ListingContractDate"),
                    fields.get("ModificationTimestamp"),
                ))
                valid += 1

    conn.commit()
    print(f"📥 Upserted {valid} listings. 🧾 Skipped {skipped} listings (see {log_path.name}).")

# ✅ Fetch all current listing keys from Spark
def get_active_listing_keys():
    keys = set()
    next_token = None
    while True:
        url = f"{BASE_URL}?_limit=1000&_select=ListingKey"
        if next_token:
            url += f"&_skiptoken={next_token}"

        response = requests.get(url, headers=HEADERS)
        data = response.json()

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print("❌ Failed to fetch active keys")
            break

        batch = data["D"]["Results"]
        keys.update([x["ListingKey"] for x in batch])

        next_token = data["D"].get("Next")
        if not next_token:
            break
        time.sleep(0.1)

    print(f"✅ Found {len(keys)} active listing keys.")
    return keys

# ✅ Remove listings no longer present in Spark
def purge_old_listings(conn, valid_keys):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM listings WHERE listing_key NOT IN %s;", (tuple(valid_keys),))
    conn.commit()
    print("🧹 Purged stale listings.")

# ✅ Main replication runner
def replicate():
    conn = get_db_conn()
    now = datetime.utcnow()
    end_ts = now.isoformat() + "Z"

    last_ts = get_last_timestamp()
    if not last_ts:
        print("⚠️ No previous timestamp found. Defaulting to 24 hours ago.")
        last_ts = (now - timedelta(days=1)).isoformat() + "Z"

    print(f"⏱️ Fetching updates from {last_ts} to {end_ts}")
    listings = get_updated_listings(last_ts, end_ts)

    if listings:
        upsert_listings(listings, conn)
        save_last_timestamp(end_ts)
    else:
        print("✅ No new listings found.")

    # Purge once per day at midnight UTC
    if now.hour == 0:
        print("🧹 Running daily purge...")
        active_keys = get_active_listing_keys()
        purge_old_listings(conn, active_keys)

    conn.close()

# ✅ Run script
if __name__ == "__main__":
    replicate()
