import os
import requests
import time
import json
from dotenv import load_dotenv

# Load access token from .env.local
load_dotenv(dotenv_path=".env.local")
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

# Replication endpoint
BASE_URL = "https://replication.sparkapi.com/v1/listings"

# Headers
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

# Fields to keep (customize as needed)
SELECT_FIELDS = [
    "ListingId", "ListingKey", "StandardStatus", "ListPrice",
    "PropertyType", "City", "StateOrProvince", "PostalCode",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "ListingContractDate"
]
select_query = ",".join(SELECT_FIELDS)

# Start the pagination
def replicate_all_listings():
    print("📦 Starting initial replication from Spark API...")
    all_listings = []
    next_token = ""

    while True:
        url = f"{BASE_URL}?_limit=1000&_select={select_query}"
        if next_token:
            url += f"&_skiptoken={next_token}"

        response = requests.get(url, headers=headers)
        data = response.json()

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            print("❌ Failed request:", data)
            break

        listings = data["D"]["Results"]
        all_listings.extend(listings)
        print(f"✅ Fetched {len(listings)} listings (Total: {len(all_listings)})")

        next_token = data["D"].get("Next")
        if not next_token:
            break

        # Optional delay to avoid rate limits
        time.sleep(0.2)

    print(f"🎉 Replication complete. {len(all_listings)} total listings downloaded.")
    return all_listings

# Save to JSON (or switch to CSV/DB later)
def save_to_json(listings, filename="replicated_listings.json"):
    with open(filename, "w") as f:
        json.dump(listings, f, indent=2)
    print(f"💾 Listings saved to {filename}")

if __name__ == "__main__":
    data = replicate_all_listings()
    save_to_json(data)
