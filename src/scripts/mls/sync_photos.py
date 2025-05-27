import os
import requests
import psycopg2
import psycopg2.extras
import urllib.parse as urlparse
from dotenv import load_dotenv
from pathlib import Path

# Load .env
env_path = Path(__file__).resolve().parents[3] / ".env.local"
print(f"📦 Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}
BASE_URL = "https://replication.sparkapi.com/v1/listings"

# Database connection
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

# Fetch listing keys from listings table
def fetch_listing_keys(conn, limit=100):
    with conn.cursor() as cur:
        cur.execute("SELECT listing_key FROM listings ORDER BY modification_timestamp DESC LIMIT %s;", (limit,))
        return [row[0] for row in cur.fetchall()]

# Insert photos into listing_photos table
def insert_photos(listing_key, photos, conn):
    inserted = 0
    with conn.cursor() as cur:
        for photo in photos:
            try:
                cur.execute("""
                    INSERT INTO listing_photos (
                        listing_id, media_url, media_type, media_description, ordinal, modification_timestamp
                    ) VALUES (%s, %s, %s, %s, %s, now())
                    ON CONFLICT DO NOTHING;
                """, (
                    listing_key,
                    photo.get("Uri1024") or photo.get("UriLarge") or photo.get("Uri640"),
                    "Photo",
                    photo.get("Name") or photo.get("Caption"),
                    photo.get("Order", 0)
                ))
                inserted += 1
            except Exception as e:
                print(f"⚠️ Error inserting photo for {listing_key}: {e}")
        conn.commit()
    print(f"✅ Inserted {inserted} photos for listing {listing_key}")

# Fetch photos from API for a listing
def fetch_photos_for_listing(listing_key):
    url = f"{BASE_URL}/{listing_key}/photos"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200 and response.json().get("D", {}).get("Success"):
        return response.json()["D"]["Results"]
    else:
        print(f"❌ Failed to fetch photos for listing {listing_key}")
        return []

# Main runner
def sync_photos():
    print("🚀 Syncing listing photos...")
    conn = get_db_conn()
    keys = fetch_listing_keys(conn)
    total = 0

    for listing_key in keys:
        photos = fetch_photos_for_listing(listing_key)
        if photos:
            insert_photos(listing_key, photos, conn)
            total += len(photos)

    conn.close()
    print(f"🏁 Done. Total photos added: {total}")

# Run
if __name__ == "__main__":
    sync_photos()
