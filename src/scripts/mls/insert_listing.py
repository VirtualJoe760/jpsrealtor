import os
import requests
from dotenv import load_dotenv

# Load .env.local
load_dotenv(dotenv_path='.env.local')

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LISTING_ID = "20250511001803017852000000"  # Replace or pass dynamically

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

url = f"https://api.sparkapi.com/v1/listings/{LISTING_ID}/photos"

response = requests.get(url, headers=headers)
data = response.json()

if response.status_code == 200 and data.get("D", {}).get("Success"):
    photos = data["D"]["Results"]
    for photo in photos:
        print(f"Photo ID: {photo['Id']}")
        print(f"Thumb URL: {photo['UriThumb']}")
        print(f"Large URL: {photo['UriLarge']}")
        print("-" * 30)
else:
    print("❌ Failed to fetch photos:", data)
