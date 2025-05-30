import os
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

def count_all_listings():
    print("📦 Counting ALL listings in the MLS feed via API...")
    url = f"{BASE_URL}?_pagination=count"

    response = requests.get(url, headers=HEADERS)
    data = response.json()

    try:
        total = data["D"]["Pagination"]["TotalRows"]
        print(f"✅ Total listings in MLS feed: {total}")
    except Exception as e:
        print(f"❌ Failed to retrieve count: {e}")
        print("Full response:", data)

if __name__ == "__main__":
    count_all_listings()
