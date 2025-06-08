import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

BASE_URL = "https://replication.sparkapi.com/v1"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

LOCAL_LOGS_DIR = Path(__file__).resolve().parents[4] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
MLS_OUTPUT_FILE = LOCAL_LOGS_DIR / "mls_ids.json"
SAMPLE_LISTINGS_FILE = LOCAL_LOGS_DIR / "sample_listings_from_mls.json"

def fetch_mls_ids():
    print("📡 Fetching list of available MLS IDs via /standardfields/MlsId")
    url = f"{BASE_URL}/standardfields/MlsId"
    res = requests.get(url, headers=HEADERS)

    if res.status_code != 200:
        print(f"❌ Failed to fetch MLS IDs: {res.text}")
        return []

    data = res.json().get("D", {}).get("FieldList", [])
    with MLS_OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Saved {len(data)} MLS IDs to {MLS_OUTPUT_FILE}")
    return data

def fetch_listings_from_mls(mls_id: str):
    print(f"📦 Fetching sample listings from MLS ID: {mls_id}")
    url = f"{BASE_URL}/listings?_limit=100&_filter=MlsId eq '{mls_id}'"
    res = requests.get(url, headers=HEADERS)

    if res.status_code != 200:
        print(f"❌ Failed to fetch listings: {res.text}")
        return []

    listings = res.json().get("D", {}).get("Results", [])
    with SAMPLE_LISTINGS_FILE.open("w", encoding="utf-8") as f:
        json.dump(listings, f, indent=2)

    print(f"✅ Retrieved and saved {len(listings)} listings to {SAMPLE_LISTINGS_FILE}")
    return listings

def main():
    if not ACCESS_TOKEN:
        raise Excep
