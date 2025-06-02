import os
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "listings.json"

def fetch_all_listings():
    listings = []
    skiptoken = None
    batch_size = 1000
    page = 1

    print("🚀 Starting fetching listings...")

    while True:
        url = f"{BASE_URL}?_limit={batch_size}"
        if skiptoken:
            url += f"&_skiptoken={skiptoken}"

        print(f"📄 Fetching page {page}: {url}")
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            print(f"❌ Error fetching page {page}: {response.text}")
            break

        data = response.json()
        batch = data.get("D", {}).get("Results", [])

        if not batch:
            print("🏁 No more listings found.")
            break

        listings.extend(batch)
        skiptoken = batch[-1].get("Id")
        page += 1

        # Polite pause to avoid rate limits
        time.sleep(0.2)

    print(f"✅ Finished fetching {len(listings)} listings.")

    # Save listings to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(listings, f, indent=2)

    print(f"✅ Listings saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_all_listings()
