import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load env
env_path = Path(__file__).resolve().parents[5] / ".env.local"
load_dotenv(dotenv_path=env_path)

BASE_URL = "https://replication.sparkapi.com/v1/listings"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

def count_listings_spark():
    if not ACCESS_TOKEN:
        raise Exception("❌ SPARK_ACCESS_TOKEN missing in .env.local")

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    url = f"{BASE_URL}?_pagination=count"

    print(f"🚀 Requesting total listing count: {url}")

    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        raise Exception(f"❌ Error {res.status_code}: {res.text}")

    data = res.json().get("D", {})
    count = data.get("Count", 0)

    print(f"\n🎉 TOTAL LISTINGS IN MLS (ALL STATUSES): {count}\n")
    return count

if __name__ == "__main__":
    try:
        count_listings_spark()
    except Exception as e:
        print(f"❌ Error: {e}")
