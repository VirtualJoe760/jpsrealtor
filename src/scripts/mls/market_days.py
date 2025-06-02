import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LISTING_KEY = "20250523203116930819000000"
BASE_URL = f"https://replication.sparkapi.com/v1/listings/{LISTING_KEY}"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

# Only select the fields we care about
SELECT_FIELDS = "DaysOnMarket,CumulativeDaysOnMarket,DaysOffMarket"

def fetch_days_on_market():
    url = f"{BASE_URL}&_expand={SELECT_FIELDS}"
    print(f"🔍 Fetching DaysOnMarket fields for listing {LISTING_KEY}...")
    
    try:
        res = requests.get(url, headers=HEADERS)
        res.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return

    try:
        data = res.json()
        sf = data.get("D", {}).get("StandardFields", {})

        print("📊 Days on Market Info:")
        print(f"  DaysOnMarket: {sf.get('DaysOnMarket')}")
        print(f"  CumulativeDaysOnMarket: {sf.get('CumulativeDaysOnMarket')}")
        print(f"  DaysOffMarket: {sf.get('DaysOffMarket')}")
    except Exception as e:
        print(f"❌ Failed to parse response: {e}")
        print(f"🔎 Raw response: {res.text}")

if __name__ == "__main__":
    fetch_days_on_market()
