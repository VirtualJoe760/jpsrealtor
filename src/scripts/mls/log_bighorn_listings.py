import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
print(f"🔍 Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

def log_bighorn_active_listings():
    print("📍 Logging ACTIVE listings in Bighorn Golf Club with photos...")
    listings = []
    skiptoken = None
    page = 1

    while True:
        url = (
            f"{BASE_URL}?_limit=1000"
            f"&_filter=StandardStatus eq 'Active' and SubdivisionName eq 'Bighorn Golf Club'"
            f"&_expand=Photos"
        )
        if skiptoken:
            url += f"&_skiptoken={skiptoken}"

        print(f"📄 Page {page}: {url}")
        try:
            response = requests.get(url, headers=HEADERS)
            data = response.json()
        except Exception as e:
            print(f"❌ Failed to fetch data: {e}")
            break

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print(f"❌ Spark API error: {data}")
            break

        results = data["D"]["Results"]
        listings.extend(results)

        if len(results) < 1000:
            break

        skiptoken = results[-1].get("Id")
        page += 1

    # Save results
    output_path = Path(__file__).resolve().parents[3] / "bighorn_active_listings.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(listings, f, indent=2)

    print(f"✅ Logged {len(listings)} listings from Bighorn Golf Club to {output_path}")

if __name__ == "__main__":
    log_bighorn_active_listings()
