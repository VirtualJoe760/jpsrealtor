import os
import json
import requests
import psycopg2
import psycopg2.extras
import urllib.parse as urlparse
from dotenv import load_dotenv
from pathlib import Path

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

# Sanitize fields (replace "********" with None)
def sanitize_fields(fields):
    return {k: (None if v == "********" else v) for k, v in fields.items()}

# Upsert listings
def upsert_listings(listings, conn):
    skipped = 0
    inserted = 0
    error_log_path = Path(__file__).resolve().parents[2] / "listing_log_error.json"

    with open(error_log_path, "a", encoding="utf-8") as error_log:
        with conn.cursor() as cur:
            for listing in listings:
                try:
                    fields = sanitize_fields(listing.get("StandardFields", {}))
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

                    inserted += 1

                except Exception as e:
                    conn.rollback()
                    skipped += 1
                    print(f"Error inserting listing {listing_id}: {e}")
                    error_log.write(json.dumps(listing) + "\n")
                else:
                    conn.commit()

    print(f"Upsert complete: {inserted} inserted/updated, {skipped} skipped.")

# Replicate listings using _skiptoken
def replicate():
    print("Starting full MLS replication using _skiptoken...")
    conn = get_db_conn()
    listings = []
    skiptoken = None
    page = 1

    while True:
        url = f"{BASE_URL}?_limit=1000"
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
            print("✅ No more pages. Replication complete.")
            break

        skiptoken = batch[-1]["Id"]
        page += 1

    if listings:
        upsert_listings(listings, conn)
    else:
        print("No listings retrieved.")

    conn.close()

# Run the script
if __name__ == "__main__":
    replicate()
