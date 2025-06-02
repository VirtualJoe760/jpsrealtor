import os
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# 🔧 Update this to your actual project root if running as a script
project_root = Path("F:/web-clients/joseph-sardella/jpsrealtor")
env_path = project_root / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

LOCAL_LOGS_DIR = project_root / "local-logs"
LISTINGS_FILE = LOCAL_LOGS_DIR / "listings.json"
OUTPUT_FILE = LOCAL_LOGS_DIR / "listing_expansions.json"

EXPANSIONS = ["Rooms", "Units", "OpenHouses"]  # Excludes heavy ones like Photos, Videos, VirtualTours, Documents
BATCH_SIZE = 50

def fetch_batch_expansions(keys):
    key_param = ",".join(keys)
    url = f"{BASE_URL}?ListingKey={key_param}&_expand={','.join(EXPANSIONS)}"

    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            print(f"⚠️ Failed batch: {response.status_code} - {response.text}")
            return []
        return response.json().get("D", {}).get("Results", [])
    except Exception as e:
        print(f"❌ Exception while fetching batch: {e}")
        return []

def main():
    if not LISTINGS_FILE.exists():
        print(f"❌ Listings file not found: {LISTINGS_FILE}")
        return

    with open(LISTINGS_FILE, "r", encoding="utf-8") as f:
        listings = json.load(f)

    listing_keys = [l.get("StandardFields", {}).get("ListingKey") for l in listings if "StandardFields" in l]
    listing_keys = [k for k in listing_keys if k]

    if not listing_keys:
        print("⚠️ No valid ListingKeys found.")
        return

    print(f"🚀 Fetching expansions for {len(listing_keys)} listings...")

    expansions_data = {}
    for i in range(0, len(listing_keys), BATCH_SIZE):
        batch_keys = listing_keys[i:i + BATCH_SIZE]
        print(f"🔍 Fetching batch {i // BATCH_SIZE + 1}: {len(batch_keys)} keys")
        results = fetch_batch_expansions(batch_keys)

        for result in results:
            key = result.get("ListingKey")
            if key:
                expansions_data[key] = result

        time.sleep(0.5)  # Respect rate limits

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(expansions_data, f, indent=2)

    print(f"✅ Fetched expansions for {len(expansions_data)} listings.")
    print(f"✅ Expansions saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
